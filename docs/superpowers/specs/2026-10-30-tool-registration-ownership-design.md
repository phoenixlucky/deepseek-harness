# Tool Registration Ownership and Status

English | [中文](2026-10-30-tool-registration-ownership-design.zh.md)

## Summary

This design adds read-only runtime inventories for tool registrations and MCP client instances. Each inventory identifies the owning plugin when Cordis provides that identity, reports lifecycle state, and omits configuration values and executable callbacks. Existing registration, conflict, scope, and disposal behavior remains authoritative.

## Table of Contents

- [Problem](#problem)
- [Design](#design)
- [Data and lifecycle](#data-and-lifecycle)
- [Compatibility and privacy](#compatibility-and-privacy)
- [Validation](#validation)
- [Out of scope](#out-of-scope)

## Problem

The Harness already rejects duplicate tool names within a registration scope, reserves MCP `serverName` values for the lifetime of an instance, and removes registrations through Cordis effects. Those mechanisms prevent several conflicts, but callers cannot query a unified view of the registered tool owners or the live state of MCP connections.

The first phase supplies that view to future management surfaces. It does not change which registration wins or whether a conflict prevents plugin activation.

## Design

`dsh-tools` exposes immutable snapshots of active tool registrations through its existing `ctx.tools` service. Each row contains the tool name, optional Cordis plugin identity, whether the registration is global or scoped, and whether it has a conditional activation callback. The API returns registrations, not the scope's effective visible tool list; existing `get()`, `definitions()`, and `schemas()` keep their current meanings.

`dsh-mcp-client` exposes a separate read-only inventory of live MCP client instances. Each row contains `serverName`, optional Cordis plugin identity, the connection lifecycle state, and the currently registered public tool names. The connection supervisor owns state transitions and updates the inventory as connections start, reconnect, fail, or dispose. MCP inventory registration uses the same Cordis effect lifetime as the client instance.

Both inventories are core package APIs. A later management plugin may read them to render diagnostics, but it does not own conflict enforcement or registration cleanup.

## Data and lifecycle

Tool snapshots include only active registry rows. Their owner is taken from the registering Cordis fiber's Loader entry when available; programmatic registrations without a Loader entry report no owner instead of inventing one. Scope is reported as `global` or `scoped`; opaque scope keys and Agent identifiers are not exposed. Conditional activation is reported as a declaration, not as a claim that the tool passed a particular step's condition.

MCP snapshots use the states `starting`, `connected`, `reconnecting`, `failed`, and `stopped`. A server enters `connected` only after connection and initial tool synchronization succeed. A disconnect enters `reconnecting` when another attempt is scheduled; exhaustion or a non-retrying failure enters `failed`. Disposal removes the row after owned tools and transport work have been cleaned up. The inventory never includes command arguments, environment variables, endpoint URLs, headers, or instructions.

Snapshot methods return detached immutable values. Changes become visible after each synchronous registry mutation or connection-state transition. Existing disposal functions remain the only way to remove registrations; the inventory API does not add an alternate mutation path.

## Compatibility and privacy

The addition is backward compatible: existing registration calls, duplicate-name errors, scoped shadowing, MCP namespace checks, and HMR disposal retain their behavior. Existing consumers need not read the new APIs. The snapshots contain no plugin config, secrets, tool definitions, execution functions, or opaque scope IDs.

When Cordis cannot identify an owner, the API represents that absence explicitly. It does not inspect stack traces or infer ownership from a tool name. The API reports current runtime state only; it does not retain history across reloads.

## Validation

Tests cover global and scoped tool ownership, owner absence, immutable snapshots, duplicate rejection, conditional registration metadata, MCP state transitions, unique `serverName` ownership, and row removal after disposal and HMR. Package documentation describes the snapshot fields and privacy limits. Existing tool and MCP lifecycle tests remain unchanged unless their assertions need to cover the new read-only views.

## Out of scope

This phase does not add a management UI, plugin enable or disable controls, automatic conflict repair, configuration-source tracing, persistent conflict history, a generic registry for every Harness service, or new configuration precedence rules.
