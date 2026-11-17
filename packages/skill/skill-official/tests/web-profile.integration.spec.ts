import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { afterEach, describe, expect, it } from 'vitest'
import * as SkillOfficial from '../src/index.ts'

const webPatch = fileURLToPath(new URL('../../../bundle/web-app/cordis.patch.yml', import.meta.url))
const webPackagePath = fileURLToPath(new URL('../../../bundle/web-app/package.json', import.meta.url))
const expected = [
  'bug-hunt', 'code-review', 'figma-design-skill', 'github', 'moon-lovers', 'officecli', 'ponytail',
  'release-notes', 'superpowers', 'taste-skill', 'ui-ux-pro-max', 'vision-liao-memory', 'weiliaozi-skill',
  'zerotoken-skill',
]

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

function webRows() {
  return loadOverlayPatches('official-skill-provider', webPatch).flatMap(patch => patch.insert ?? [])
}

function presetPlugins(preset: string) {
  const path = fileURLToPath(new URL(`../../../bundle/web-app/presets/${preset}.patch.yml`, import.meta.url))
  const row = loadOverlayPatches(preset, path).flatMap(patch => patch.insert ?? [])
    .find(candidate => candidate.id === `preset-${preset}`)
  return (row?.config as { plugins: { id: string; name: string }[] } | undefined)?.plugins ?? []
}

describe('Web official skill composition', () => {
  it('declares the Host provider, Settings tab, Web dependency, and skill-capable presets', () => {
    const rows = webRows()
    expect(rows.find(row => row.id === 'official-skills')).toMatchObject({ name: '@deepseek-ai/dsh-skill-official' })
    expect(rows.find(row => row.id === 'ui-settings-skills')).toMatchObject({ name: '@deepseek-ai/dsh-client-ui-settings-skills' })
    const manifest = JSON.parse(readFileSync(webPackagePath, 'utf8')) as { dependencies: Record<string, string> }
    expect(manifest.dependencies['@deepseek-ai/dsh-skill-official']).toBe('workspace:*')
    expect(manifest.dependencies['@deepseek-ai/dsh-client-ui-settings-skills']).toBe('workspace:*')
    for (const preset of ['standard', 'ptc', 'cordis']) {
      expect(presetPlugins(preset).some(plugin => plugin.id === 'tool-skill')).toBe(true)
    }
    expect(presetPlugins('minimal').some(plugin => plugin.id === 'tool-skill')).toBe(false)
    expect(expected).toHaveLength(14)
  })

  it('loads the restored catalog and instruction through the Web Loader', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    ctx.baseUrl = 'file:///'
    await ctx.plugin(Loader).await()
    ctx.loader.builtins.officialSkills = SkillOfficial
    const row = webRows().find(candidate => candidate.id === 'official-skills')
    if (!row) throw new Error('Web composition has no official skill provider row')
    await ctx.loader.root.update([{ ...row, name: 'cordis:officialSkills' }])
    await ctx.loader.await()

    expect((await ctx.skills.list()).map(skill => skill.name).sort()).toEqual([...expected].sort())
    expect((await ctx.skills.get('bug-hunt'))?.content).toContain('Start from the reported behavior.')
  })
})
