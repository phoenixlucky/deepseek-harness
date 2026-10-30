---
description: "DeepSeek Harness 设置中的 MCP 服务器配置页面，支持本地草稿及 JSON 或 Cordis 导出。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-mcp

[English](README.md) | 中文

## 概述

在 Harness 设置中添加「MCP 服务器」分区。页面可编辑 Streamable HTTP 和 stdio 服务草稿，将草稿保存在当前浏览器，并导出 JSON 或 Cordis 配置补丁供 Harness 配置文件使用。

## 目录

- [使用本包](#use-this-package)
- [了解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [开发备注](#dev-note)
- [模型体验](#model-experience)
- [已知限制和后续工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

Web 应用组合会自动挂载此页面。打开「设置」并选择「MCP 服务器」。可导入 `{ "servers": [...] }` 管理配置或 `{ "mcpServers": { ... } }` MCP 配置，再导出供配置文件使用。敏感值应保存在 Harness 凭据存储中并按名称引用；页面草稿不会保存密钥明文。

浏览器草稿不会更改正在运行的 Host 配置。将 Cordis 补丁应用到配置文件并重启 Host 后，配置的服务才会启动。

<a id="understand-the-implementation"></a>
## 了解实现

Client 页面把草稿保存在浏览器存储中，并导出 profile 配置。用户应用配置后，Host 才会读取 profile 中的设置；MCP 服务启动和凭据仍由 [MCP 客户端](../../mcp/mcp-client/README.zh.md)负责。

<a id="further-exploration"></a>
## 延伸阅读

- [MCP 客户端](../../mcp/mcp-client/README.zh.md)——运行时传输与服务行为。
- [设置 slot](../ui-settings/README.zh.md)——设置分区的注册方式。

<a id="dev-note"></a>
## 开发备注

<details>
<summary>维护者工作说明 — 点击展开</summary>

此包只包含浏览器端 Settings 分区；Host 侧 MCP 生命周期仍由 `dsh-mcp-client` 管理。

</details>

<a id="model-experience"></a>
## 模型体验

间接影响：通过 MCP 客户端在应用 profile 并重启 Host 后提供已配置的 MCP 工具。

#### KV Cache effect

此页面不添加模型上下文，也不会改变缓存前缀。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制和后续工作

- 草稿只保存在当前浏览器，不会在设备间同步。导出的 JSON 和 Cordis 补丁不会自动应用到 Host。
