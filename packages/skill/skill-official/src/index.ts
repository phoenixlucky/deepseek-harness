/** Official reviewed WJ Forge and Figma skill provider. */

import { readFileSync } from 'node:fs'
import { isAbsolute, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings/types'
import z from '@deepseek-ai/schemastery'
import { parse as parseYaml } from 'yaml'
import { BUNDLED_SKILL_RANK, isSkillName } from '@deepseek-ai/dsh-skill'
import type { SkillCandidate, SkillProvider, SkillSource } from '@deepseek-ai/dsh-skill'
import { validateSkillUpdateContent } from './updates.ts'

const PROVIDER = 'dsh-official'
const DEFAULT_DISABLED: string[] = []
const DEFAULT_ASSET_ROOT = fileURLToPath(new URL('../assets/', import.meta.url))
const SKILL_DIRS = [
  ...['bug-hunt', 'code-review', 'github', 'moon-lovers', 'officecli', 'ponytail', 'release-notes', 'superpowers', 'taste-skill', 'ui-ux-pro-max', 'vision-liao-memory', 'weiliaozi-skill', 'zerotoken-skill']
    .map(name => `wj-forge/${name}`),
  'figma-design-skill',
] as const

/** Runtime configuration, including live enablement edited in Settings. */
export interface Config {
  /** Absolute asset root used by relocated app packages. */
  assetRoot?: string
  /** Disabled built-ins; provider metadata remains available for Settings search. */
  disabledSkills: Volatile<readonly string[]>
  /** User-installed Figma Markdown after fixed-source validation. */
  updatedSkills?: Volatile<Readonly<Record<string, string>>>
}

/** Schema for relocatable assets and user-controlled skill enablement. */
export const Config = z.object({
  assetRoot: z.string().min(1).default(DEFAULT_ASSET_ROOT),
  disabledSkills: z.array(z.string()).default(DEFAULT_DISABLED).volatile(),
  updatedSkills: z.dict(z.string()).default({}).volatile(),
})

export const name = 'skill-official'
export const inject = ['skills']

interface Parsed { name: string; description: string; content: string }

function parseSkill(raw: string, path: string): Parsed {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw.replace(/^\uFEFF/u, ''))
  if (match?.[1] === undefined) throw new Error(`skill-official: ${path} has no YAML frontmatter`)
  let header: unknown
  try {
    header = parseYaml(match[1])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`skill-official: ${path} has invalid YAML frontmatter: ${reason}`, { cause: error })
  }
  if (typeof header !== 'object' || header === null || Array.isArray(header)) throw new Error(`skill-official: ${path} has invalid frontmatter`)
  const name: unknown = Reflect.get(header, 'name')
  const description: unknown = Reflect.get(header, 'description')
  if (typeof name !== 'string' || !isSkillName(name)) throw new Error(`skill-official: ${path} has invalid skill name`)
  if (typeof description !== 'string' || description.trim() === '') throw new Error(`skill-official: ${path} has no description`)
  return { name, description: description.trim(), content: raw.slice(match[0].length).trim() }
}

function readSkill(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`skill-official: unable to read ${path}: ${reason}`, { cause: error })
  }
}

/**
 * Register reviewed embedded skills; no skill adds tool or permission grants.
 * @param ctx - Cordis context with the skill registry injected.
 * @param config - asset location and live per-skill enablement settings.
 * @returns nothing; the registry registration follows the plugin fiber lifecycle.
 */
export function apply(
  ctx: Context,
  config: Config = { disabledSkills: { get: () => DEFAULT_DISABLED }, updatedSkills: { get: () => ({}) } },
): void {
  const root = config.assetRoot ?? DEFAULT_ASSET_ROOT
  if (!isAbsolute(root)) throw new Error('skill-official: assetRoot must be absolute')
  const entries = SKILL_DIRS.map((directory) => {
    const path = join(root, directory, 'SKILL.md')
    const skill = parseSkill(readSkill(path), path)
    return { directory, path, skill }
  })
  const byName = new Map(entries.map(entry => [entry.skill.name, entry]))
  if (byName.size !== entries.length) throw new Error('skill-official: duplicate bundled skill identity')
  const controlRef: { invalidate: (() => void) | undefined } = { invalidate: undefined }
  const provider: SkillProvider = {
    name: PROVIDER,
    list: () => Promise.resolve((() => {
      const disabled = new Set(config.disabledSkills.get())
      return entries.filter(entry => !disabled.has(entry.skill.name)).map(({ directory, path, skill: bundled }) => {
        const override = config.updatedSkills?.get()[bundled.name]
        const skill = override === undefined ? bundled : parseSkill(validateSkillUpdateContent(bundled.name, override).content, path)
        return {
          name: skill.name,
          description: skill.description,
          invocation: { modelInvocable: true, userInvocable: true },
          provider: PROVIDER,
          source: 'bundled' satisfies SkillSource,
          rank: BUNDLED_SKILL_RANK,
          path,
          resourceBase: { kind: 'directory' as const, path: join(root, directory).split(sep).join('/') },
          locator: path,
        } satisfies SkillCandidate
      })
    })()),
    get(candidate, options) {
      if (options.signal?.aborted) throw options.signal.reason
      const entry = byName.get(candidate.name)
      if (entry === undefined || candidate.provider !== PROVIDER) return Promise.resolve(undefined)
      const { rank: _rank, locator: _locator, ...summary } = candidate
      const override = config.updatedSkills?.get()[candidate.name]
      const content = override === undefined
        ? entry.skill.content
        : parseSkill(validateSkillUpdateContent(candidate.name, override).content, entry.path).content
      return Promise.resolve({ ...summary, content })
    },
  }
  ctx.skills.registerProvider((control) => {
    controlRef.invalidate = control.invalidate
    return provider
  })
  ctx.effect(() => () => { controlRef.invalidate = undefined }, 'skill-official: provider invalidation')
  ctx.on('settings/document-updated', (ns) => {
    if (ns === 'skill-official') controlRef.invalidate?.()
  })
}
