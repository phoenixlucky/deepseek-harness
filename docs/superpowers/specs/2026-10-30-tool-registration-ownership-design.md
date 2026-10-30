# Tool Registration Ownership and Status

English | [中文](2026-10-30-tool-registration-ownership-design.zh.md)

## Summary

This design adds read-only runtime inventories for tool registrations and MCP client instances. Each inventory identifies the owning plugin when Cordis provides that identity, reports lifecycle state, and omits configuration values and executable callbacks. Existing registration, conflict, scope, and disposal behavior remains authoritative.

## Table of Contents

- [Problem](#problem)
- [Design](#design)
- [Management plugin](#management-plugin)
- [Data and lifecycle](#data-and-lifecycle)
- [Compatibility and privacy](#compatibility-and-privacy)
- [Validation](#validation)
- [Out of scope](#out-of-scope)

<a id="problem"></a>
## Problem

The Harness already rejects duplicate tool names within a registration scope, reserves MCP `serverName` values for the lifetime of an instance, and removes registrations through Cordis effects. Those mechanisms prevent several conflicts, but callers cannot query a unified view of the registered tool owners or the live state of MCP connections.

The first phase supplies that view to future management surfaces. It does not change which registration wins or whether a conflict prevents plugin activation.

<a id="design"></a>
## Design

`dsh-tools` exposes immutable snapshots of active tool registrations through its existing `ctx.tools` service. Each row contains the tool name, optional Cordis plugin identity, whether the registration is global or scoped, and whether it has a conditional activation callback. The API returns registrations, not the scope's effective visible tool list; existing `get()`, `definitions()`, and `schemas()` keep their current meanings.

`dsh-mcp-client` adds a `mcpClientRegistry` service for live MCP client instances. It exposes detached read-only snapshots; each row contains `serverName`, optional Cordis plugin identity, the connection lifecycle state, and the currently registered public tool names. The connection supervisor owns state transitions and updates the registry as connections start, reconnect, fail, or dispose. Each instance's record uses the same Cordis effect lifetime as its connection. The registry provider is composed in the shared base profile so the Host inventory can query it even when no MCP server is configured.

The existing Host `pluginInventory/list` Remote combines both inventories with the Loader and preset data it already returns. Its tool and MCP fields are optional so a profile that does not compose a registry can still return its existing snapshot.

<a id="management-plugin"></a>
## Management plugin

Its Chinese package display title is “WJ 插件终极调度中心”; its English package title is “WJ plugin control center”. The runtime-registration tab uses a separate task-specific label.

The independent project in `E:\home\dsh_plugin_manager_wj` becomes a client-only DSH plugin. It adds a runtime-registration view to the existing Built-in plugins Settings section and reads the combined data through `pluginInventory/list`; it adds no Host data cache or second Remote protocol. The view presents tool names, owners, scope, conditional activation, MCP server names, connection state, and public tool names. It supports search and manual refresh, and remains read-only.

The plugin uses the existing Settings slot and locale service with standard React elements. Its package declares the `dsh.client` entry and the DSH Remote dependency, so users can install or remove the view independently after running a Harness version that supplies the expanded inventory. The plugin does not change plugin composition, MCP configuration, tool registrations, or conflict decisions.

<a id="data-and-lifecycle"></a>
## Data and lifecycle

Tool snapshots include only active registry rows. Their owner is taken from the registering Cordis fiber's Loader entry when available; programmatic registrations without a Loader entry report no owner instead of inventing one. Scope is reported as `global` or `scoped`; opaque scope keys and Agent identifiers are not exposed. Conditional activation is reported as a declaration, not as a claim that the tool passed a particular step's condition.

MCP snapshots use the states `starting`, `connected`, `reconnecting`, `failed`, and `stopped`. A server enters `connected` only after connection and initial tool synchronization succeed. A disconnect enters `reconnecting` when another attempt is scheduled; exhaustion or a non-retrying failure enters `failed`. Disposal removes the row after owned tools and transport work have been cleaned up. The inventory never includes command arguments, environment variables, endpoint URLs, headers, or instructions.

Snapshot methods return detached immutable values. Changes become visible after each synchronous registry mutation or connection-state transition. Existing disposal functions remain the only way to remove registrations; the inventory API does not add an alternate mutation path.

<a id="compatibility-and-privacy"></a>
## Compatibility and privacy

The addition is backward compatible: existing registration calls, duplicate-name errors, scoped shadowing, MCP namespace checks, and HMR disposal retain their behavior. Existing consumers need not read the new APIs. The snapshots contain no plugin config, secrets, tool definitions, execution functions, or opaque scope IDs.

When Cordis cannot identify an owner, the API represents that absence explicitly. It does not inspect stack traces or infer ownership from a tool name. The API reports current runtime state only; it does not retain history across reloads.

<a id="validation"></a>
## Validation

Tests cover global and scoped tool ownership, owner absence, immutable snapshots, duplicate rejection, conditional registration metadata, MCP state transitions, unique `serverName` ownership, and row removal after disposal and HMR. Host inventory tests verify the combined payload and profiles without MCP instances. The independent plugin tests cover the loading, empty, error, retry, search, and rendered-state cases. Its package documentation describes installation and the displayed data. Core package documentation describes snapshot fields and privacy limits.

<a id="out-of-scope"></a>
## Out of scope

This phase does not add plugin enable or disable controls, automatic conflict repair, configuration-source tracing, persistent conflict history, a generic registry for every Harness service, or new configuration precedence rules.
