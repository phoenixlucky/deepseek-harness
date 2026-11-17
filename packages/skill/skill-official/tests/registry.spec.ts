import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import type { SkillCandidate, SkillProvider } from '@deepseek-ai/dsh-skill'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'

const EXPECTED = [
  'bug-hunt', 'code-review', 'figma-design-skill', 'github', 'moon-lovers', 'officecli', 'ponytail',
  'release-notes', 'superpowers', 'taste-skill', 'ui-ux-pro-max', 'vision-liao-memory', 'weiliaozi-skill',
  'zerotoken-skill',
]
const temporaryRoots: string[] = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function withRegistry(run: (ctx: Context) => Promise<void>): Promise<void> {
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry)
    await run(ctx)
  } finally {
    await ctx.fiber.dispose()
  }
}

function temporaryAssets(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-skill-official-'))
  temporaryRoots.push(root)
  const bundledRoot = fileURLToPath(new URL('../assets/', import.meta.url))
  for (const name of EXPECTED) {
    const relative = name === 'figma-design-skill' ? name : `wj-forge/${name}`
    const source = join(bundledRoot, relative, 'SKILL.md')
    const target = join(root, relative, 'SKILL.md')
    mkdirSync(join(root, relative), { recursive: true })
    writeFileSync(target, readFileSync(source))
  }
  return root
}

function registerOtherProvider(ctx: Context): () => void {
  const candidate: SkillCandidate = {
    name: 'other-skill', description: 'Other provider skill', invocation: { modelInvocable: true, userInvocable: true },
    provider: 'other-provider', source: 'custom', rank: 600, locator: 'other-skill',
  }
  const provider: SkillProvider = {
    name: 'other-provider',
    list: () => Promise.resolve([candidate]),
    get: () => Promise.resolve({ ...candidate, content: 'Other skill body' }),
  }
  return ctx.skills.registerProvider(() => provider)
}

describe('official skill provider', () => {
  it('exposes exactly the thirteen WJ Forge and Figma skills without Chrome', async () => {
    await withRegistry(async (ctx) => {
      apply(ctx)
      const skills = await ctx.skills.list()
      expect(skills.map(skill => skill.name).sort()).toEqual([...EXPECTED].sort())
      expect(skills.every(skill => skill.source === 'bundled' && skill.provider === 'dsh-official')).toBe(true)
      for (const summary of skills) {
        const definition = await ctx.skills.get(summary.name)
        expect(definition?.metadata).toBeUndefined()
        expect(definition?.content).not.toMatch(/(?:tool|permission)[_-]?(?:grant|allow|access)/i)
      }
    })
  })

  it('filters disabled entries and invalidates the catalog', async () => {
    await withRegistry(async (ctx) => {
      let disabled: readonly string[] = []
      apply(ctx, { disabledSkills: { get: () => disabled } })
      expect((await ctx.skills.list()).map(skill => skill.name)).toContain('bug-hunt')
      disabled = ['bug-hunt']
      ctx.emit('settings/document-updated', 'skill-official' as never, 1)
      expect((await ctx.skills.list()).map(skill => skill.name)).not.toContain('bug-hunt')
    })
  })

  it('keeps other providers available when the official provider is disabled or disposed', async () => {
    await withRegistry(async (ctx) => {
      let disabled: readonly string[] = []
      const disposeOther = registerOtherProvider(ctx)
      apply(ctx, { disabledSkills: { get: () => disabled } })
      disabled = EXPECTED
      ctx.emit('settings/document-updated', 'skill-official' as never, 1)
      expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['other-skill'])
      disposeOther()
      expect((await ctx.skills.list()).map(skill => skill.name)).toEqual([])
    })
  })

  it('rejects missing or malformed bundle assets with the affected path', async () => {
    const root = temporaryAssets()
    const missingRoot = join(root, 'missing')
    expect(() => apply(new Context(), { assetRoot: missingRoot, disabledSkills: { get: () => [] } }))
      .toThrow(/skill-official: .*SKILL\.md/)
    const brokenPath = join(root, 'wj-forge', 'bug-hunt', 'SKILL.md')
    writeFileSync(brokenPath, '---\nname: [invalid\ndescription: broken\n---\nBody')
    expect(() => apply(new Context(), { assetRoot: root, disabledSkills: { get: () => [] } }))
      .toThrow(new RegExp(brokenPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  })

  it('loads provider-owned skill bodies without adding tool grants', async () => {
    await withRegistry(async (ctx) => {
      apply(ctx)
      const definition = await ctx.skills.get('zerotoken-skill')
      expect(definition?.content).toContain('Keep working context compact')
      expect(definition?.provider).toBe('dsh-official')
      expect(definition?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
      expect(definition?.metadata).toBeUndefined()
    })
  })
})
