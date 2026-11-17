---
kind: upgrade-guide
description: "随附的 Web profile 不再挂载插件清单和 MCP 设置页面。"
---

# 插件清单与 MCP 设置页面改由插件提供

[English](guide.md) | 中文

## 变更

随附的 Web profile 不再挂载 `ui-settings-plugin-inventory` 或 `ui-settings-mcp`。插件清单和 MCP 服务器设置页面由 `@tinyforge/dsh-plugin-manager-wj` 与 `@tinyforge/dsh-mcp-settings` 提供。宿主清单、插件管理和 MCP 运行时服务仍可供插件使用。

## 迁移

1. 使用 `dsh plugin --profile web add <package>` 将 `@tinyforge/dsh-plugin-manager-wj` 和 `@tinyforge/dsh-mcp-settings` 安装到 Web profile。
2. 重启 Web profile，使其插件组合加载新包。
3. 确认 Web 客户端中出现插件管理页和 MCP 设置页。若页面缺失，请检查对应包是否已安装到 `web` profile。
