# Tool Registration Ownership and Management Plugin Implementation Plan

English | [中文](2026-10-30-tool-registration-ownership.zh.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose owning plugins and lifecycle status for tool and MCP registrations through the Harness inventory Remote, then ship an independently installable Web plugin that displays the data.

**Architecture:** `dsh-tools` reports active tool registrations with scope and owner metadata. `dsh-mcp-client` publishes connection state to a lifecycle-owned registry mounted by the shared base profile. Host Plugin Inventory combines both snapshots into its existing Remote response; the standalone project contributes a read-only Settings tab and uses that Remote.

**Tech Stack:** TypeScript, Cordis, Typert Remote, pnpm workspaces in Harness, React and the DSH Web module loader in the standalone plugin.

**Spec:** [2026-10-30-tool-registration-ownership-design.md](../specs/2026-10-30-tool-registration-ownership-design.md)

## Global Constraints

- Preserve current duplicate-tool and duplicate-`serverName` rejection, scope shadowing, and effect-owned disposal.
- Expose metadata snapshots only; never expose plugin config, credentials, tool definitions, execution functions, or opaque scope keys.
- Report owners only when Cordis Loader identity is available; do not infer owners from names or stack traces.
- Keep the new management plugin read-only and independently installable from the Harness core.
- Keep snapshot fields optional for profiles that do not compose the corresponding registry.

## Review Focus

- Tool registrations made without a Loader entry report an absent owner.
- Same-name scoped tools in distinct scopes remain separate inventory rows without exposing scope IDs.
- MCP startup failure, reconnect exhaustion, disposal, and HMR each report the correct state and leave no stale record.
- A profile without MCP instances returns the prior Plugin Inventory data and an empty or omitted MCP list.
- A Host version without the expanded optional fields is reported as unsupported inventory data, not as a healthy empty inventory.
- The standalone plugin displays only data returned by the Remote and remains usable in loading, empty, error, and retry states.

---

### Task 1: Add tool-registration snapshots to `dsh-tools`

**Files:**
- Modify: `E:\home\deepseek-harness\packages\core\tools\src\contracts.ts`
- Modify: `E:\home\deepseek-harness\packages\core\tools\src\index.ts`
- Modify: `E:\home\deepseek-harness\packages\core\scope\src\store.ts`
- Modify: `E:\home\deepseek-harness\packages\core\tools\package.json`
- Modify: `E:\home\deepseek-harness\packages\core\tools\tsconfig.json`
- Test: `E:\home\deepseek-harness\packages\core\tools\tests\tools.spec.ts`
- Modify: `E:\home\deepseek-harness\packages\core\tools\README.md`
- Modify: `E:\home\deepseek-harness\packages\core\scope\README.md`
- Modify: `E:\home\deepseek-harness\docs\subsystems\tools.md`

**Interfaces:**
- Add `ToolRegistrationSnapshot` with `name: string`, `owner: { entryId: string; moduleName: string } | null`, `scope: 'global' | 'scoped'`, and `conditional: boolean`.
- Add `ToolsService.registrations(): readonly ToolRegistrationSnapshot[]`; each call returns detached frozen rows from all active global and scoped layers.
- Capture the registering Cordis fiber's Loader entry through the traced service context; represent a missing Loader entry as `owner: null`.

- [ ] **Step 1: Add failing cases** named `lists global registrations with their Loader owner`, `lists scoped registrations separately without exposing scope identity`, `reports no owner for programmatic registrations without a Loader entry`, and `returns frozen snapshots without tool definitions`.
- [ ] **Step 2: Run the focused test** with `pnpm exec vitest run packages/core/tools/tests/tools.spec.ts` and confirm the new assertions fail.
- [ ] **Step 3: Implement `ToolRegistrationSnapshot` and `ToolsService.registrations()`** without changing `get()`, `definitions()`, `schemas()`, or duplicate-name behavior.
- [ ] **Step 4: Update the package README and subsystem reference** with the snapshot fields, scope semantics, and privacy limits.
- [ ] **Step 5: Run the focused test** with `pnpm exec vitest run packages/core/tools/tests/tools.spec.ts` and confirm it passes.

### Task 2: Add the MCP client status registry

**Files:**
- Create: `E:\home\deepseek-harness\packages\mcp\mcp-client\src\registry.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\tsconfig.json`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\src\index.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\src\connection.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\package.json`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\tsdown.config.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\tests\apply.spec.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\tests\reconnect.spec.ts`
- Modify: `E:\home\deepseek-harness\packages\mcp\mcp-client\README.md`
- Modify: `E:\home\deepseek-harness\scripts\gen-cordis-catalog.ts`
- Modify: `E:\home\deepseek-harness\scripts\type-equiv.manifest.json`
- Modify: `E:\home\deepseek-harness\packages\bundle\base\cordis.patch.yml`
- Modify: `E:\home\deepseek-harness\packages\bundle\base\package.json`

**Interfaces:**
- Add `McpClientState = 'starting' | 'connected' | 'reconnecting' | 'failed' | 'stopped'`.
- Add `McpClientSnapshot` with `serverName`, `owner` (same nullable owner record as Task 1), `scope: 'global' | 'scoped'`, `state`, and readonly public `toolNames`.
- Add `McpClientRegistry.list(): readonly McpClientSnapshot[]` and `register(serverName): { update(state, toolNames): void; dispose(): void }`.
- Export the registry as `@deepseek-ai/dsh-mcp-client/registry`; mount one provider row in `dsh-base` before the optional per-server rows.
- Require `mcpClientRegistry` from each `mcp-client` instance; publish state transitions from the connection supervisor and remove its row after teardown settles.

- [ ] **Step 1: Add failing lifecycle cases** named `tracks startup and connected state`, `tracks reconnecting and exhausted failure`, `updates public tool names after sync`, and `removes records after disposal and HMR`.
- [ ] **Step 2: Run focused MCP tests** with `pnpm exec vitest run packages/mcp/mcp-client/tests/apply.spec.ts packages/mcp/mcp-client/tests/reconnect.spec.ts` and confirm the new assertions fail.
- [ ] **Step 3: Implement the effect-owned registry and connection-state updates** while retaining existing namespace reservations and connection disposal semantics.
- [ ] **Step 4: Export and compose the registry provider** through the package build, base bundle manifest, and base patch row.
- [ ] **Step 5: Document the state meanings and omitted configuration fields** in the MCP Client README.
- [ ] **Step 6: Run the focused MCP tests** and confirm all new lifecycle cases pass.

### Task 3: Extend the Host Plugin Inventory Remote

**Files:**
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\src\types.ts`
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\src\index.ts`
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\package.json`
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\tsconfig.json`
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\tests\inventory.spec.ts`
- Modify: `E:\home\deepseek-harness\packages\host\plugin-inventory\README.md`
- Modify: `E:\home\deepseek-harness\packages\api\remotes\src\client\index.ts`
- Modify: `E:\home\deepseek-harness\packages\bundle\web-app\package.json`

**Interfaces:**
- Extend `PluginInventorySnapshot` with optional `toolRegistrations` and `mcpClients` arrays, using the existing branded `PluginEntryId` for Remote owner IDs.
- Keep `pluginInventory/list` as the only Remote method; return omitted or empty optional fields if a runtime registry is absent.
- `readPluginInventory(ctx)` reads `ctx.tools.registrations()` and `ctx.mcpClientRegistry.list()`, maps internal owners to Loader entry IDs, and returns only the declared snapshot fields.

- [ ] **Step 1: Add failing Remote cases** named `adds tool and MCP rows to pluginInventory/list`, `maps registry owners to Loader entry IDs`, and `omits optional inventory fields when services are absent`.
- [ ] **Step 2: Run `pnpm exec vitest run packages/host/plugin-inventory/tests/inventory.spec.ts`** and confirm the new assertions fail.
- [ ] **Step 3: Add the optional snapshot fields and aggregate both core registries** without changing the current Loader or preset projection.
- [ ] **Step 4: Update Remote type exports, package references, and the Host inventory README** to describe the expanded read-only payload.
- [ ] **Step 5: Run the focused Host inventory test** and confirm it passes.

### Task 4: Create the standalone plugin bundle in the empty project

**Files:**
- Create: `E:\home\dsh_plugin_manager_wj\package.json`
- Create: `E:\home\dsh_plugin_manager_wj\cordis.patch.yml`
- Create: `E:\home\dsh_plugin_manager_wj\index.js`
- Create: `E:\home\dsh_plugin_manager_wj\client.js`
- Create: `E:\home\dsh_plugin_manager_wj\locale\en.json`
- Create: `E:\home\dsh_plugin_manager_wj\locale\zh.json`
- Create: `E:\home\dsh_plugin_manager_wj\README.md`
- Create: `E:\home\dsh_plugin_manager_wj\README.zh.md`

**Interfaces:**
- Name the package `dsh-plugin-manager-wj` and declare both `dsh.bundle.patch` and a Web `dsh.client` entry.
- Set `locale/zh.json` `meta.title` to `WJ 插件终极调度中心`; set the English `meta.title` to `WJ plugin control center`.
- The bundle patch inserts one Host no-op plugin row; `client.js` registers the browser half into the existing `settings.plugins.tab` slot.
- The browser half consumes `remote.pluginInventory.list()` from `@deepseek-ai/dsh-api-remotes`; it adds no Host service or Remote namespace.
- The package remains plain ESM JavaScript and needs no local build step; the Harness Web module loader provides React and the declared DSH client services.

- [ ] **Step 1: Create the package manifest and bundle patch** with exports for the Host and Client halves, supported locale files, and the DSH client dependencies declared by the plugin manifest.
- [ ] **Step 2: Add the empty Host entry and client module-loader entry** using the repository's Cordis plugin template conventions.
- [ ] **Step 3: Add English and Simplified Chinese dictionaries** with matching keys for product title, tab, search, statuses, empty state, load failure, and retry; use the exact approved Chinese title.
- [ ] **Step 4: Write the paired package README** with bundle installation, Harness version compatibility, displayed fields, and read-only limits.

### Task 5: Render tool and MCP status in the standalone Settings tab

**Files:**
- Modify: `E:\home\dsh_plugin_manager_wj\client.js`
- Modify: `E:\home\dsh_plugin_manager_wj\locale\en.json`
- Modify: `E:\home\dsh_plugin_manager_wj\locale\zh.json`
- Test: `E:\home\dsh_plugin_manager_wj\tests\inventory-tab.test.js`

**Interfaces:**
- The tab reads the expanded `PluginInventorySnapshot` returned by `pluginInventory/list` and presents `toolRegistrations` and `mcpClients` as separate groups.
- Search matches tool name, owner module, MCP `serverName`, connection state, and public tool names.
- Manual refresh issues one new Remote call; the UI does not poll or perform mutations.

- [ ] **Step 1: Add failing component cases** named `shows loading and empty inventory states`, `retries a failed inventory request`, `filters tools and MCP servers by owner and name`, `renders conditional tool and MCP lifecycle states`, and `explains when the Host does not provide runtime inventory fields`.
- [ ] **Step 2: Run the standalone project test** with `pnpm test -- tests/inventory-tab.test.js` and confirm the new assertions fail.
- [ ] **Step 3: Render the two read-only inventory groups** with localized labels and the shared DSH UI primitives.
- [ ] **Step 4: Add search and manual refresh behavior** while preserving the last successful snapshot during a failed refresh.
- [ ] **Step 5: Run the standalone project test** and confirm all cases pass.

### Task 6: Validate both projects as one installable feature

**Files:**
- Modify: `E:\home\deepseek-harness\packages\bundle\web-app\cordis.patch.yml` only if the base registry row is not visible to Web Host composition.
- Modify: `E:\home\dsh_plugin_manager_wj\README.md`
- Modify: `E:\home\dsh_plugin_manager_wj\README.zh.md`

**Interfaces:**
- The Host bundle supplies `tools`, `mcpClientRegistry`, and `pluginInventory/list` before the standalone Client bundle is enabled.
- A Web profile without MCP entries starts normally and serves an empty MCP inventory; existing plugin and tool registrations retain their current behavior.

- [ ] **Step 1: Run the focused Harness suites** for tool registry, MCP connection lifecycle, and Host Plugin Inventory.
- [ ] **Step 2: Run the Harness artifact build and typecheck** for changed Host and Client package references.
- [ ] **Step 3: Install the standalone bundle into a local Web profile** and verify the tab shows live tool and MCP inventory, then uninstall it and confirm core registrations remain unchanged.
- [ ] **Step 4: Review both repository diffs** for leaked config values, secrets, scope identifiers, unused files, and generated artifacts.
