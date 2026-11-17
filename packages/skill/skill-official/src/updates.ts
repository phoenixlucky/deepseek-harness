/** Validate fixed-source updates for the Figma design skill. */

import { parse as parseYaml } from 'yaml'

const MAX_SKILL_BYTES = 256 * 1024
const FIGMA_SOURCE = 'https://raw.githubusercontent.com/phoenixlucky/figma-design-skill/main/SKILL.md'
const FIGMA_REPOSITORY = 'https://github.com/phoenixlucky/figma-design-skill'
const FIGMA_CATEGORY = '前端与设计'
const ALLOWED_FRONTMATTER = new Set(['name', 'description', 'version', 'category', 'source-url', 'runAs'])
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u

/** A Figma update that passed fixed-source and metadata validation. */
export interface SkillUpdate {
  /** Reviewed skill identity. */
  readonly name: 'figma-design-skill'
  /** Validated upstream version. */
  readonly version: string
  /** Full Markdown document including its validated frontmatter. */
  readonly content: string
}

/** Return whether the package has a reviewed fixed update source for a skill.
 * @param name - Bundled skill identity to check.
 * @returns Whether the Figma update source is approved for that identity.
 */
export function isUpdateableSkill(name: string): name is SkillUpdate['name'] {
  return name === 'figma-design-skill'
}

/** Download and validate an update from the fixed reviewed Figma source.
 * @param name - Reviewed skill identity.
 * @param signal - Optional cancellation signal.
 * @param fetcher - Fetch implementation, injectable for deterministic tests.
 * @returns The validated document and its upstream version.
 */
export async function fetchSkillUpdate(
  name: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<SkillUpdate> {
  if (!isUpdateableSkill(name)) throw new TypeError(`skill ${name} is not updateable`)
  const response = await fetcher(FIGMA_SOURCE, {
    method: 'GET',
    redirect: 'error',
    ...(signal === undefined ? {} : { signal }),
  })
  if ((response.status >= 300 && response.status < 400) || response.redirected) {
    throw new Error('skill update rejected a redirect')
  }
  if (!response.ok) throw new Error(`skill update source returned HTTP ${response.status}`)
  if (response.url !== '' && response.url !== FIGMA_SOURCE) throw new Error('skill update final URL changed')
  const announcedSize = Number.parseInt(response.headers.get('content-length') ?? '0', 10)
  if (Number.isFinite(announcedSize) && announcedSize > MAX_SKILL_BYTES) throw new Error('skill update exceeded the size limit')
  const content = await response.text()
  if (new TextEncoder().encode(content).byteLength > MAX_SKILL_BYTES) throw new Error('skill update exceeded the size limit')
  return validateSkillUpdateContent(name, content)
}

/** Validate content already stored as an update against the reviewed metadata.
 * @param name - Reviewed skill identity.
 * @param content - Full Markdown document to validate.
 * @returns The validated document and its upstream version.
 */
export function validateSkillUpdateContent(name: string, content: string): SkillUpdate {
  if (!isUpdateableSkill(name)) throw new TypeError(`skill ${name} is not updateable`)
  if (new TextEncoder().encode(content).byteLength > MAX_SKILL_BYTES) throw new Error('skill update exceeded the size limit')
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content.replace(/^\uFEFF/u, ''))
  if (frontmatter?.[1] === undefined) throw new Error('skill update has invalid frontmatter')
  let metadata: unknown
  try {
    metadata = parseYaml(frontmatter[1])
  } catch (error) {
    throw new Error('skill update has invalid frontmatter', { cause: error })
  }
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new Error('skill update has invalid frontmatter')
  }
  const fields = Object.keys(metadata)
  if (fields.some(field => !ALLOWED_FRONTMATTER.has(field))) throw new Error('skill update contains disallowed frontmatter')
  const value = metadata as Record<string, unknown>
  if (value.name !== name) throw new Error('skill update identity changed')
  if (value['source-url'] !== FIGMA_REPOSITORY || value.category !== FIGMA_CATEGORY || value.runAs !== 'inline') {
    throw new Error('skill update source metadata changed')
  }
  if (typeof value.description !== 'string' || value.description.trim() === '') throw new Error('skill update has no description')
  if (typeof value.version !== 'string' || !VERSION.test(value.version)) throw new Error('skill update has an invalid version')
  if (content.slice(frontmatter[0].length).trim() === '') throw new Error('skill update has no instructions')
  return { name, version: value.version, content }
}
