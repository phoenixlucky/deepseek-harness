/** Current plugin-health findings derived from Host-owned Loader and registration state. */
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import type { BundleInfo, PluginFinding, PluginInfo } from './types.ts'

/**
 * Project the current Host records into bounded, non-executable health findings.
 * @param plugins - Current managed plugin rows, including read-only reasons.
 * @param inventory - Current Loader and tool/MCP registration inventory.
 * @param bundles - Current managed bundles, including compatibility failures.
 * @returns Findings with evidence metadata only; startup exception text is omitted.
 */
export function buildPluginFindings(
  plugins: readonly PluginInfo[], inventory: PluginInventorySnapshot, bundles: readonly BundleInfo[] = [],
): PluginFinding[] {
  const writable = new Set(plugins.filter(row => row.enabled && row.readOnlyReason === undefined).map(row => row.entryId))
  const findings: PluginFinding[] = []
  for (const row of plugins) {
    if (row.fiberPhase !== 'failed') continue
    findings.push({
      id: `plugin.activation-failed:${row.entryId}`,
      code: 'plugin.activation-failed',
      severity: 'error',
      affectedEntryIds: [row.entryId],
      evidence: { kind: 'lifecycle', phase: 'failed' },
      remediationEntryIds: [],
    })
  }

  const tools = groupBy(inventory.toolRegistrations?.filter(row => row.scope === 'global' && row.owner !== null) ?? [], row => row.name)
  for (const [name, rows] of tools) {
    const owners = [...new Set(rows.flatMap(row => row.owner === null ? [] : [row.owner.entryId]))]
    if (owners.length < 2) continue
    findings.push({
      id: `tool.duplicate-name:${name}`,
      code: 'tool.duplicate-name',
      severity: 'warning',
      affectedEntryIds: owners,
      evidence: { kind: 'tool-name', name, registrations: rows.length },
      remediationEntryIds: owners.filter(id => writable.has(id)),
    })
  }

  const clients = inventory.mcpClients ?? []
  for (const [serverName, rows] of groupBy(clients.filter(row => row.scope === 'global' && row.owner !== null), row => row.serverName)) {
    const owners = [...new Set(rows.flatMap(row => row.owner === null ? [] : [row.owner.entryId]))]
    if (owners.length < 2) continue
    findings.push({
      id: `mcp.duplicate-name:${serverName}`,
      code: 'mcp.duplicate-name',
      severity: 'warning',
      affectedEntryIds: owners,
      evidence: { kind: 'mcp-name', serverName, registrations: rows.length },
      remediationEntryIds: owners.filter(id => writable.has(id)),
    })
  }
  for (const row of clients) {
    if (row.state !== 'failed' && row.state !== 'reconnecting') continue
    const owners = row.owner === null ? [] : [row.owner.entryId]
    findings.push({
      id: `mcp.connection-failed:${row.serverName}:${owners[0] ?? 'unknown'}`,
      code: 'mcp.connection-failed',
      severity: row.state === 'failed' ? 'error' : 'warning',
      affectedEntryIds: owners,
      evidence: { kind: 'mcp-state', serverName: row.serverName, state: row.state },
      remediationEntryIds: [],
    })
  }
  for (const bundle of bundles) {
    if (bundle.error?.code !== 'incompatible-version' && !(bundle.enabled && bundle.error?.code === 'not-bundle')) continue
    const incompatible = bundle.error.incompatible
    const compatibility = bundle.error.code === 'incompatible-version'
    findings.push({
      id: `bundle.${compatibility ? 'compatibility-rejected' : 'dependency-invalid'}:${bundle.name}`,
      code: compatibility ? 'bundle.compatibility-rejected' : 'bundle.dependency-invalid',
      severity: 'error',
      affectedEntryIds: bundle.rows.flatMap(row => row.entryId === undefined ? [] : [row.entryId]),
      evidence: {
        kind: 'bundle', packageName: bundle.name, reason: compatibility ? 'compatibility' : 'dependency',
        ...(incompatible === undefined ? {} : { incompatible }),
      },
      remediationEntryIds: [],
    })
  }
  return findings
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const rows = groups.get(key)
    if (rows === undefined) groups.set(key, [item])
    else rows.push(item)
  }
  return groups
}
