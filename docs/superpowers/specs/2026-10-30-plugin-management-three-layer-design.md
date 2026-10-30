# Three-Layer Plugin Management and Health

English | [中文](2026-10-30-plugin-management-three-layer-design.zh.md)

## Summary

This design extends the read-only WJ registration bundle into a plugin health and management surface across Harness Core, Management API, and Management Plugin. It reuses the Host's Loader, profile resolver, lifecycle, dependency, configuration-form, and plugin-management capabilities, adding provenance, conflict diagnosis, and risk-bounded remediation.

## Table of Contents

- [Problem](#problem)
- [Existing capabilities](#existing-capabilities)
- [Architecture](#architecture)
- [Management API](#management-api)
- [Management Plugin](#management-plugin)
- [Safety and privacy](#safety-and-privacy)
- [Failure behavior](#failure-behavior)
- [Validation](#validation)
- [Out of scope](#out-of-scope)

<a id="problem"></a>
## Problem

The independent `dsh-plugin-manager-wj` bundle currently reads tool and MCP registration snapshots. It cannot enable or disable plugins, explain which configuration layer supplies an effective value, query actionable conflicts, or guide safe repair.

Harness already owns plugin registration, profile composition, package resolution, plugin lifecycle, configuration forms, and plugin enablement. The implementation should add the missing diagnostic and repair path without creating a second registry or a second configuration writer.

<a id="existing-capabilities"></a>
## Existing capabilities

Cordis Loader owns runtime plugin entries and lifecycle. `app-boot` resolves and composes profile layers and performs compatibility preflight. `plugin-manager` reads and changes plugin and bundle enablement, reports protected targets and operation outcomes, and installs or removes bundles. `settings` exposes schema-derived configuration forms with revision-checked writes. The official Web Plugins panel already manages bundles and their rows.

The new work extends these owners and keeps `dsh-plugin-manager-wj` as the independent Management Plugin. The bundle focuses on status, diagnostics, configuration provenance, schema forms, and safe remediation; it does not duplicate bundle installation or package removal.

<a id="architecture"></a>
## Architecture

### Layer 1: Harness Core

Cordis Loader remains the registry and lifecycle authority. `app-boot` records configuration provenance while it resolves bundle, profile, home, and invocation layers. Provenance identifies the source layer, entry, and field path, including shadowed definitions, while the effective configuration remains the value consumed by the Loader.

The Host-side diagnostic provider derives health findings from authoritative state already owned by Loader, profile resolution, compatibility preflight, plugin management, and available tool/MCP registries. It reports evidence-backed activation failures, compatibility or dependency problems, registration conflicts, and configuration overrides. It does not infer a conflict from a name or report missing evidence as healthy.

Findings use stable codes, severity, affected plugin identities, evidence references, and available typed remediation options. The provider keeps no second copy of plugin state. Current findings and process-local lifecycle events are queryable; this phase adds no durable conflict history.

### Layer 2: Management API

The existing `pluginManager` Remote remains the canonical management namespace. It exposes a health snapshot, conflict query, configuration provenance query, remediation preview, and remediation execution alongside its existing list and enablement operations. Diagnostic rules remain in a Host-side provider; the Remote delegates to that provider and to existing write owners.

Remediation requests name a finding and a typed operation. The Host returns a preview with its target, expected state, risk class, reversibility, and effect summary. Execution re-reads the finding and target, checks the preview revision, and calls the existing profile-safe operation. It rejects stale, protected, ambiguous, or unsupported targets. It never accepts arbitrary file paths, YAML fragments, or plugin code from the Client.

### Layer 3: Management Plugin

The standalone WJ bundle becomes a health dashboard in the existing Settings → Plugins area. It consumes the inventory and management Remotes, plus the existing configuration-form service. The page groups plugin status, health findings, configuration source details, and repair actions without replacing the official Plugins panel.

The page supports plugin enablement controls when the Host marks a row writable, schema-derived configuration forms with source indicators, conflict detail views, health summaries, and repair previews. It refreshes after Host changes and shows the Host's actual saved and applied outcome.

<a id="management-api"></a>
## Management API

Status and enablement continue to use `listPlugins()` and `setPluginEnabled()`. The health snapshot includes current plugin and bundle status and typed findings. Conflict queries return current evidence and process-local events without storing a second durable log. Provenance queries return effective and shadowed sources for schema-known configuration fields.

Provenance identifies layer, stable entry identity, and field path. It does not return absolute Host paths, raw configuration documents, or secret values. Schema forms remain the only configuration write path; they preserve existing validation, revision conflict handling, and user-layer semantics.

Remediation previews are immutable, short-lived descriptions of a specific action against a finding revision. A low-risk action may execute without a confirmation step only when a Host rule classifies it as deterministic, reversible, profile-owned, and safe for the exact target. High-risk and unclassified actions require an explicit confirmation after preview. The Host rechecks eligibility at execution time, so a confirmation cannot authorize a different action or target.

The initial low-risk allowlist is limited to a writable, optional, non-infrastructure plugin toggle that resolves a diagnosed conflict without changing dependencies or secrets. Installation, removal, package updates, version exemptions, credential edits, core-service changes, arbitrary configuration replacement, and any action with unknown impact require confirmation or remain unavailable as automatic fixes.

<a id="management-plugin"></a>
## Management Plugin

The overview presents counts by status and severity rather than an opaque numeric health score. Plugin rows show enabled state, runtime phase, owner, and whether the Host allows changes. Protected or unaddressable rows remain visible with their reason and have no active switch.

Conflict details show the affected entries, evidence, configuration layers involved, current effective source, and a typed repair when available. Configuration editing uses existing schema-derived forms. Each field can show the winning source and shadowed sources without exposing raw secrets. Revision conflicts preserve the form draft and prompt a refresh.

Repair actions show their target, effect, risk, and reversibility before execution. Low-risk allowlisted repairs can run directly and report their result. High-risk or unclassified repairs require confirmation. The UI distinguishes saved changes from changes applied to the live composition, including restart requirements and higher-priority overrides.

<a id="safety-and-privacy"></a>
## Safety and privacy

The Host is the enforcement boundary. A disabled Client control is only presentation; the Host independently rejects protected, stale, or unauthorized operations. Every write goes through the existing manager or schema-form mutation path, preserving profile patch semantics and revision checks.

The diagnostic API returns the minimum evidence needed to explain a finding. It omits credentials, secret values, executable callbacks, raw plugin configuration, absolute Host paths, and opaque scope or Agent identifiers. Missing source metadata is reported as unknown rather than guessed.

<a id="failure-behavior"></a>
## Failure behavior

A Host without the new diagnostic capability continues to show the existing registration inventory and reports diagnostics as unavailable; it never displays an empty result as a healthy report. Remote failures preserve the last successful snapshot and expose retry. Stale repair previews are refused and must be regenerated.

Configuration revision conflicts preserve the user's draft. A failed or partially applied profile change reports whether the configuration was saved, whether the live composition changed, and any restart or override reason. The UI does not claim rollback when the Host retained a saved profile change.

<a id="validation"></a>
## Validation

Core coverage verifies provenance across precedence layers, redaction, conflict evidence, protected targets, risk classification, stale-preview rejection, and operation outcomes. API coverage verifies the Remote contract and current-state refresh after a mutation. The standalone bundle covers health, loading, unsupported Host, search, schema-form edits, conflict details, repair confirmation, and failure recovery.

The combined Web profile must demonstrate a complete flow from a real Loader state through the Host API to the independent bundle, including one writable repair and one refused protected target. Existing plugin registration, configuration precedence, lifecycle, and bundle-management behavior remain covered by their owning packages.

<a id="out-of-scope"></a>
## Out of scope

This phase adds no package marketplace, installer, updater, remover, arbitrary YAML/JSON editor, generic filesystem repair endpoint, credential editor, or durable audit log. It does not change configuration precedence, compatibility policy, or the existing bundle-management UI. Agent-preset compositions remain read-only unless a later design gives them an explicit profile-safe write contract.
