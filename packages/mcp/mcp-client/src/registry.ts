/** Lifecycle-owned MCP client inventory. */
import { Context, Service } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context { mcpClientRegistry: McpClientRegistry }
}

/** Connection lifecycle state exposed by the MCP client registry. */
export type McpClientState = 'starting' | 'connected' | 'reconnecting' | 'failed' | 'stopped'
/** Point-in-time metadata for one MCP client instance. */
export interface McpClientSnapshot {
  readonly serverName: string
  readonly owner: { readonly entryId: string; readonly moduleName: string } | null
  readonly scope: 'global' | 'scoped'
  readonly state: McpClientState
  readonly toolNames: readonly string[]
}

interface RecordValue extends McpClientSnapshot { readonly token: symbol }

/** Read metadata for active MCP connections without exposing configuration. */
export class McpClientRegistry extends Service {
  private readonly records = new Map<symbol, RecordValue>()

  constructor(ctx: Context) {
    super(ctx, 'mcpClientRegistry')
  }

  /**
   * List detached, immutable snapshots in registration order.
   * @returns Frozen snapshots without transport configuration or scope identities.
   */
  list(): readonly McpClientSnapshot[] {
    return Object.freeze([...this.records.values()].map(({ token: _token, ...row }) => Object.freeze({
      ...row, toolNames: Object.freeze([...row.toolNames]),
    })))
  }

  /**
   * Register one connection and return its state publisher and disposer.
   * @param serverName - stable server namespace used by this instance.
   * @param owner - Loader identity when available, otherwise null.
   * @param scoped - whether the client belongs to an Agent scope.
   * @returns State publisher and idempotent record disposer.
   */
  register(
    serverName: string,
    owner: McpClientSnapshot['owner'],
    scoped: boolean,
  ): { update(state: McpClientState, toolNames?: readonly string[]): void; dispose(): void } {
    const token = Symbol(serverName)
    const safeOwner = owner === null ? null : Object.freeze({ ...owner })
    let active = true
    const write = (state: McpClientState, toolNames: readonly string[] = []): void => {
      if (!active) return
      this.records.set(token, Object.freeze({ serverName, owner: safeOwner, scope: scoped ? 'scoped' : 'global', state, toolNames: Object.freeze([...toolNames]), token }))
    }
    write('starting')
    return {
      update: write,
      dispose: () => { if (active) { active = false; this.records.delete(token) } },
    }
  }
}

/** Mount the shared registry provider. */
export function apply(ctx: Context): void {
  new McpClientRegistry(ctx)
}
