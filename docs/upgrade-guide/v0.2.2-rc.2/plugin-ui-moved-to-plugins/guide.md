---
kind: upgrade-guide
description: "The shipped Web profile removes its plugin inventory and MCP settings pages."
---

# Plugin inventory and MCP settings pages move to plugins

English | [中文](guide.zh.md)

## Change

The shipped Web profile no longer mounts `ui-settings-plugin-inventory` or `ui-settings-mcp`. The plugin inventory and MCP server settings pages are provided by `@tinyforge/dsh-plugin-manager-wj` and `@tinyforge/dsh-mcp-settings`. Host inventory, plugin management, and MCP runtime services remain available to plugins.

## Migration

1. Install `@tinyforge/dsh-plugin-manager-wj` and `@tinyforge/dsh-mcp-settings` in the Web profile with `dsh plugin --profile web add <package>`.
2. Restart the Web profile so its plugin composition loads the new packages.
3. Confirm the plugin manager page and MCP settings page appear in the Web client. If either is missing, check that its package is installed in the `web` profile.
