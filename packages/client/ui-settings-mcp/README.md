---
description: "MCP server configuration page in DeepSeek Harness Settings, with local drafts and JSON or Cordis exports."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-mcp

English | [中文](README.zh.md)

## Summary

Adds an **MCP servers** section to Harness Settings. It edits Streamable HTTP and stdio server drafts, stores them in the current browser, and exports JSON or a Cordis patch for a Harness profile.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

## Use this package

The web app composition mounts this page automatically. Open Settings and choose **MCP servers**. Import a managed `{ "servers": [...] }` export or an MCP `{ "mcpServers": { ... } }` config, then export the result for your profile. Sensitive values must be stored in the Harness credential store and referenced by name; they are not saved in page drafts.

These browser drafts do not change the running Host configuration. Apply the exported Cordis patch to the profile and restart the Host to start the configured servers.

## Understand the implementation

The Client page keeps drafts in browser storage and exports profile input. The Host reads only the profile configuration after the user applies it; MCP server startup and credentials remain owned by the [MCP client](../../mcp/mcp-client/README.md).

## Further Exploration

- [MCP client](../../mcp/mcp-client/README.md) — runtime transport and server behavior.
- [Settings slots](../ui-settings/README.md) — how Settings sections register.

## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The package contains only the browser Settings section; Host-side MCP lifecycle remains in `dsh-mcp-client`.

</details>

## Model Experience

Indirectly, through the MCP client, which exposes configured MCP tools after the profile is applied and the Host restarts.

#### KV Cache effect

This page adds no model context and does not change cached prefixes.

## Known Limitations and Deferred Work

- Drafts are local to the current browser and do not synchronize between devices. Exported JSON and Cordis patches are not applied to the Host automatically.
