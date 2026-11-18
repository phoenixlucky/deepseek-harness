/** Browser-side fixed-source Figma update checks before Settings writes them. */

const MAX_SKILL_BYTES = 256 * 1024
const FIGMA_SOURCE = 'https://raw.githubusercontent.com/phoenixlucky/figma-design-skill/main/SKILL.md'
const FIGMA_REPOSITORY = 'https://github.com/phoenixlucky/figma-design-skill'
const FIGMA_CATEGORY = '前端与设计'
const ALLOWED_FRONTMATTER = new Set(['name', 'description', 'version', 'category', 'source-url', 'runAs'])
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u

/** A fixed-source Figma document that passed browser-side validation. */
export interface SkillUpdate {
  /** Reviewed skill identity. */
  readonly name: 'figma-design-skill'
  /** Validated upstream version. */
  readonly version: string
  /** Full Markdown document including its validated frontmatter. */
  readonly content: string
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
  if (name !== 'figma-design-skill') throw new TypeError(`skill ${name} is not updateable`)
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

/** Validate content before the browser stores an update in Host settings.
 * @param name - Reviewed skill identity.
 * @param content - Full Markdown document to validate.
 * @returns The validated document and its upstream version.
 */
export function validateSkillUpdateContent(name: string, content: string): SkillUpdate {
  if (name !== 'figma-design-skill') throw new TypeError(`skill ${name} is not updateable`)
  if (new TextEncoder().encode(content).byteLength > MAX_SKILL_BYTES) throw new Error('skill update exceeded the size limit')
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content.replace(/^\uFEFF/u, ''))
  if (frontmatter?.[1] === undefined) throw new Error('skill update has invalid frontmatter')
  const value = frontmatterFields(frontmatter[1])
  const fields = Object.keys(value)
  if (fields.some(field => !ALLOWED_FRONTMATTER.has(field))) throw new Error('skill update contains disallowed frontmatter')
  if (value.name !== name) throw new Error('skill update identity changed')
  if (value['source-url'] !== FIGMA_REPOSITORY || value.category !== FIGMA_CATEGORY || value.runAs !== 'inline') {
    throw new Error('skill update source metadata changed')
  }
  if (typeof value.description !== 'string' || value.description.trim() === '') throw new Error('skill update has no description')
  if (typeof value.version !== 'string' || !VERSION.test(value.version)) throw new Error('skill update has an invalid version')
  if (content.slice(frontmatter[0].length).trim() === '') throw new Error('skill update has no instructions')
  return { name, version: value.version, content }
}

/**
 * Read the frontmatter block as a flat map of single-line scalar fields.
 *
 * The reviewed upstream document declares only `key: value` lines, so every
 * other YAML form — block scalars, flow collections, anchors, aliases, tags,
 * multi-line continuations, comments carrying values, duplicate keys — is
 * refused instead of guessed at. That keeps this browser copy exactly as strict
 * as the Host's, with no YAML parser in the Client bundle (a YAML package's
 * Node build reaches for `process`, which the module table cannot answer).
 * @param block - Frontmatter text between the `---` delimiters.
 * @returns The declared fields.
 * @throws {Error} when the block is not a sequence of single-line scalar fields.
 */
function frontmatterFields(block: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const line of block.split('\n')) {
    const text = line.endsWith('\r') ? line.slice(0, -1) : line
    const trimmed = text.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const match = /^([A-Za-z][A-Za-z0-9-]*):(?: (.*))?$/u.exec(text)
    if (match === null) throw new Error('skill update has invalid frontmatter')
    const key = match[1] as string
    // YAML rejects a repeated key, so this refuses one instead of keeping the last.
    if (Object.hasOwn(fields, key)) throw new Error('skill update has invalid frontmatter')
    fields[key] = scalarField(match[2] ?? '')
  }
  return fields
}

/**
 * Read one single-line scalar: plain, double-quoted, or single-quoted.
 * @param raw - Text after the `key:` separator.
 * @returns The scalar's string value.
 * @throws {Error} when the text opens a YAML construct or holds an indicator the reviewed document does not use.
 */
function scalarField(raw: string): string {
  const text = raw.trim()
  if (text === '') return ''
  if (text.startsWith('"')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('skill update has invalid frontmatter')
    }
    if (typeof parsed !== 'string') throw new Error('skill update has invalid frontmatter')
    return parsed
  }
  if (text.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/u.test(text)) throw new Error('skill update has invalid frontmatter')
    return text.slice(1, -1).replace(/''/gu, "'")
  }
  // A plain scalar opens no YAML construct and carries no mapping, comment, or
  // flow indicator; the reviewed document uses none of them.
  if (/^[|>[\]{}&*!%@`#]/u.test(text) || text.includes(': ') || text.includes(' #')) {
    throw new Error('skill update has invalid frontmatter')
  }
  return text
}
