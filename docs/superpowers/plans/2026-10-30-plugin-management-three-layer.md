# Three-Layer Plugin Management Implementation Plan

English | [中文](2026-10-30-plugin-management-three-layer.zh.md)

> **For agentic workers:** Use the executing-plans workflow to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Harness and the independent WJ bundle into a three-layer plugin health and management system with evidence-based diagnostics and risk-bounded repair.

**Architecture:** Keep Loader, `app-boot`, `plugin-manager`, and schema-derived settings forms as the authoritative state and write owners. Add configuration source details and a Host diagnostic provider, expose them through the existing `pluginManager` Remote, and evolve the WJ bundle into a Settings → Plugins health and management page.

**Tech Stack:** TypeScript, Cordis Loader services and Remotes, existing schema configuration forms, independent WJ JavaScript bundle and locale JSON.

**Spec:** [2026-10-30-plugin-management-three-layer-design.md](../specs/2026-10-30-plugin-management-three-layer-design.md)

## Global Constraints

- Cordis Loader remains the plugin registry and lifecycle authority; no second plugin or configuration state store.
- Configuration source details cover bundle, profile, home, and invocation layers and include shadowed schema-known fields.
- `pluginManager` remains the canonical management Remote; mutations use existing profile-safe manager and schema-form write paths.
- Diagnostic responses omit absolute Host paths, credentials, secret values, raw plugin configuration, executable callbacks, and opaque scope or Agent identifiers.
- Remediation execution rechecks the finding, target, eligibility, and preview revision; it rejects stale, protected, ambiguous, and unsupported operations.
- Automatic remediation is limited to a writable, optional, non-infrastructure plugin toggle that resolves the diagnosed conflict without changing dependencies or secrets; high-risk and unclassified repairs require explicit confirmation or remain unavailable.
- Configuration edits use schema-derived forms and preserve their existing validation, revision checks, and user-layer semantics.
- A Host without diagnostics continues to show registration inventory and clearly reports diagnostics unavailable; missing evidence is unknown, never healthy.
- Do not add marketplace, install/update/remove, arbitrary YAML/JSON, filesystem repair, credential edit, durable audit-log, or Agent-preset write behavior.

## Review Focus

- A protected or stale plugin entry must remain visible and must not be mutated; pin in `packages/boot/plugin-manager/tests/health.spec.ts` and the Remote contract test.
- A secret or shadowed config value must not leak through source details; pin in `packages/boot/app-boot/tests/config-sources.spec.ts` and `packages/boot/plugin-manager/tests/manager.spec.ts`.
- A low-risk preview whose finding or target changes before apply must be rejected; pin in `packages/boot/plugin-manager/tests/manager.spec.ts`.
- An older Host without diagnostic methods must show unavailable diagnostics instead of a healthy empty report; pin in the WJ bundle's local UI behavior checks.
- A configuration revision conflict must preserve the edited draft and distinguish saved profile changes from live application; pin using the existing schema-form flow and the WJ bundle UI behavior checks.

---

### Task 1: Record configuration sources in `app-boot`

**Files:**
- Modify: `packages/boot/app-boot/src/profile-context.ts`
- Modify: `packages/boot/app-boot/src/index.ts`
- Create: `packages/boot/app-boot/src/types.ts`
- Test: `packages/boot/app-boot/tests/config-sources.spec.ts`
- Modify: `packages/boot/plugin-manager/src/index.ts` to expose path-redacted source details
- Test: `packages/boot/plugin-manager/tests/manager.spec.ts` for schema-known and secret paths
- Modify: both app-boot and plugin-manager README pairs and their `README.i18n.yaml`

**Interfaces:**
- Exposes `readConfigSourceLayers()` and `describeConfigSources()` from app-boot. The plugin-manager verifies requested paths against the active schema and omits secret-field source identities.
- Source lookup projects the current bundle, profile, home, and invocation patches. It does not reread or return resolved values.

- [x] Add focused cases for precedence, unknown sources, value/path redaction, schema-known paths, and secret paths.
- [x] Verify the initial app-boot test failed because the source helper did not exist.
- [x] Implement path-free field sources over the existing layers; omit values and suppress schema secrets.
- [x] Run focused app-boot and manager tests; verify the README translation pairing.

### Task 2: Add Host diagnostics and typed remediation to `plugin-manager`

**Files:**
- Create: `packages/boot/plugin-manager/src/health.ts`
- Modify: `packages/boot/plugin-manager/src/types.ts`
- Modify: `packages/boot/plugin-manager/src/index.ts`
- Test: `packages/boot/plugin-manager/tests/health.spec.ts`
- Extend: `packages/boot/plugin-manager/tests/manager.spec.ts` with health/remediation cases
- Modify: `packages/boot/plugin-manager/README.md`, `README.zh.md`, and `README.i18n.yaml`

**Interfaces:**
- Add `PluginManager.getHealthSnapshot(): Promise<PluginHealthSnapshot>` and `getConflicts(query?: ConflictQuery): Promise<ConflictFinding[]>`.
- Add `PluginManager.previewRemediation(request: RemediationRequest): Promise<RemediationPreview>` and `applyRemediation(previewId: RemediationPreviewId, confirmed: boolean): Promise<ChangeResult>`.
- A finding carries stable code, severity, affected entry identities, minimum evidence references, and typed remediation options. A preview carries preview id/revision, finding revision, target entry id, expected state, risk, reversibility, and effect summary.
- Provider reads current Loader, profile, compatibility, dependency, plugin, tool, and MCP state from their owning services; process-local events expire with the Host process and no duplicate durable history is introduced.

- [x] Add cases for activation failure, compatibility/dependency findings, registration conflicts, and diagnostic redaction.
- [x] Add remediation cases for low-risk execution, high-risk confirmation, protected targets, and stale-preview rejection.
- [x] Verify focused health tests failed before the provider existed.
- [x] Implement current-state diagnostics and rechecked profile-toggle remediation.
- [x] Run focused manager/health tests and update the package README pair.

### Task 3: Expose the diagnostic contract through the existing Remote

**Files:**
- Modify: `packages/api/remotes/src/client/index.ts`
- Modify: `packages/boot/plugin-manager/src/index.ts` (Remote declarations and access policy)
- Test: `packages/boot/plugin-manager/tests/manager.spec.ts` for the Remote methods and policy
- Modify: `packages/boot/plugin-manager/README.md` and `README.zh.md` if Remote ownership docs require detail

**Interfaces:**
- Remote namespace remains `pluginManager`; it exposes `getHealthSnapshot`, `getConflicts`, `getConfigSources`, `previewRemediation`, and `applyRemediation` in addition to existing methods.
- `getConfigSources(fields)` delegates to the `app-boot` service from Task 1. If unavailable, the method returns a typed unavailable result rather than fabricated source data.
- Remote access checks follow the existing plugin-manager permission pattern. Host enforcement remains in the Host provider and existing mutation owners.

- [ ] Add a wire-level Host Remote contract test for permissions and serialized results (current behavior tests call the real Loader-backed manager directly).
- [x] Register the methods on the existing decorated `pluginManager` Remote; re-export the new Client-safe types.
- [x] Compile app-boot, plugin-manager, and api-remotes type projects.
- [x] Update Remote JSDoc and plugin-manager docs without creating a second namespace.

### Task 4: Turn the WJ bundle into the independent health and management page

**Files:**
- Modify: `E:/home/dsh_plugin_manager_wj/client.js`
- Modify: `E:/home/dsh_plugin_manager_wj/locale/en.json`
- Modify: `E:/home/dsh_plugin_manager_wj/locale/zh.json`
- Modify: `E:/home/dsh_plugin_manager_wj/README.md` and `README.zh.md`
- Modify: `packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` and its locale-owned presentation only if needed to mount or link the independent bundle entry

**Interfaces:**
- Consume existing inventory, `remote.pluginManager` methods from Task 3, and existing `configForms` service. Schema forms remain the only configuration mutation interface.
- Render status/severity counts, searchable plugin rows, writable enablement switches, findings/evidence, configuration source details, schema configuration forms, repair previews, result state, and retry/unavailable states.
- Repair preview display includes exact target, effect, risk, reversibility, and explicit confirmation for high-risk or unclassified operations. Disabled/unaddressable Host rows have no active control.

- [x] Load inventory, health, findings, and configuration sources; preserve the last snapshot during refresh and report diagnostics unavailable distinctly.
- [ ] Add automated WJ behavior checks for unavailable Host and the complete repair/configuration interaction paths.
- [x] Add a dependency-free bundle regression test proving secret object nodes and descendants are omitted from schema editors.
- [x] Implement the management page in the independent bundle with schema-driven, secret-free forms and bilingual package metadata.
- [x] Refresh Host state after mutations and display live, restart-required, overridden, and refused outcomes.
- [x] Review the interface source for responsive fields, keyboard-native controls, disabled reasons, and translated labels; browser screenshot review remains unavailable in this checkout.

### Task 5: Verify the complete three-layer flow and update integration documentation

**Files:**
- Extend: `packages/boot/plugin-manager/tests/manager.spec.ts` for a real-composition management flow
- Modify: the owner-local test-only `cordis.yml` fixture used by the combined Web profile
- Modify: `docs/architecture.md` and the package subsystem references only for the new service/Remote contract
- Modify: WJ bundle docs to describe Host compatibility and supported management operations

**Interfaces:**
- Exercise a real Loader entry through profile composition, `pluginManager` Remote, and the independent WJ bundle; avoid hand-built Context-only composition for product-visible paths.
- Demonstrate one writable low-risk repair and one refused protected target, plus source details for a schema-known setting.

- [ ] Assemble a single real Web composition fixture that drives the independent WJ bundle through the Remote.
- [ ] Run a browser Web smoke for the full action and configuration flows.
- [x] Update package contract docs and paired architecture references.

## Plan self-review

- Spec coverage: source details and redaction are in Task 1; current findings and typed repair are in Task 2; Remote contract and stale checks are in Task 3; health UI, schema forms, and compatibility behavior are in Task 4; real-composition validation and architecture documentation are in Task 5.
- The standalone bundle has no local test harness today. Focused Host behavior tests and syntax/type checks cover the implemented endpoints, but a single real browser composition test remains open.
- The Harness and WJ checkouts contain unrelated user modifications; this implementation was done in place as requested, preserving them.
