import { describe, expect, it } from 'vitest'
import { buildPluginFindings } from '../src/health.ts'
import type { BundleInfo, PluginEntryId, PluginInfo } from '../src/types.ts'

const a = 'plugin-a' as PluginEntryId
const b = 'plugin-b' as PluginEntryId

function plugin(entryId: PluginEntryId, patchId: string, extras: Omit<Partial<PluginInfo>, 'patchId'> = {}): PluginInfo {
  const row = { entryId, moduleName: `@example/${patchId}`, enabled: true, fiberPhase: 'active' as const, ...extras }
  const { readOnlyReason, ...base } = row
  return readOnlyReason === undefined ? { ...base, patchId } : { ...base, readOnlyReason }
}

describe('buildPluginFindings', () => {
  it('reports failed activation without leaking the loader diagnostic', () => {
    const findings = buildPluginFindings([
      plugin(a, 'plugin-a', { fiberPhase: 'failed', diagnostic: 'secret-token C:\\private\\path' }),
    ], { entries: [] })

    expect(findings).toEqual([{
      id: `plugin.activation-failed:${a}`,
      code: 'plugin.activation-failed',
      severity: 'error',
      affectedEntryIds: [a],
      evidence: { kind: 'lifecycle', phase: 'failed' },
      remediationEntryIds: [],
    }])
    expect(JSON.stringify(findings)).not.toContain('secret-token')
    expect(JSON.stringify(findings)).not.toContain('private')
  })

  it('identifies duplicate global registrations and offers only writable plugin owners for repair', () => {
    const findings = buildPluginFindings([
      plugin(a, 'plugin-a'),
      plugin(b, 'plugin-b', { readOnlyReason: 'management-required' }),
    ], {
      entries: [],
      toolRegistrations: [
        { name: 'same-tool', scope: 'global', conditional: false, owner: { entryId: a, moduleName: '@example/a' } },
        { name: 'same-tool', scope: 'global', conditional: false, owner: { entryId: b, moduleName: '@example/b' } },
      ],
    })

    expect(findings).toEqual([{
      id: 'tool.duplicate-name:same-tool',
      code: 'tool.duplicate-name',
      severity: 'warning',
      affectedEntryIds: [a, b],
      evidence: { kind: 'tool-name', name: 'same-tool', registrations: 2 },
      remediationEntryIds: [a],
    }])
  })

  it('does not treat scoped tools as conflicts because their scope identity is intentionally private', () => {
    const findings = buildPluginFindings([plugin(a, 'plugin-a'), plugin(b, 'plugin-b')], {
      entries: [],
      toolRegistrations: [
        { name: 'local-tool', scope: 'scoped', conditional: false, owner: { entryId: a, moduleName: '@example/a' } },
        { name: 'local-tool', scope: 'scoped', conditional: false, owner: { entryId: b, moduleName: '@example/b' } },
      ],
    })
    expect(findings).toEqual([])
  })

  it('reports compatibility and invalid selected dependencies without copying raw diagnostics', () => {
    const bundles: BundleInfo[] = [
      {
        name: 'incompatible', official: false, availability: 'profile', enabled: true, installed: true,
        optional: false, removable: true, updatable: false,
        error: { code: 'incompatible-version', diagnostic: 'C:\\private\\path', incompatible: [
          { name: 'incompatible', version: '1.0.0', runtimeVersion: '2.0.0', requirements: { 'engines.dsh': '^3' } },
        ] },
        rows: [], overrides: [],
      },
      {
        name: 'dependency-only', official: false, availability: 'profile', enabled: true, installed: true,
        optional: false, removable: true, updatable: false, error: { code: 'not-bundle' }, rows: [], overrides: [],
      },
    ]
    const findings = buildPluginFindings([], { entries: [] }, bundles)
    expect(findings.map(({ code }) => code)).toEqual(['bundle.compatibility-rejected', 'bundle.dependency-invalid'])
    expect(JSON.stringify(findings)).not.toContain('private')
  })
})
