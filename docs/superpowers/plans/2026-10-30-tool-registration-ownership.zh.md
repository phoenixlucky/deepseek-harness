# 工具注册所有权与管理插件实施计划

[English](2026-10-30-tool-registration-ownership.md) | 中文

> **面向代理执行者：** 必须使用 superpowers:executing-plans 技能，按任务逐步实施。各步骤使用复选框（`- [ ]`）跟踪。

**目标：** 通过 Harness Inventory Remote 暴露工具和 MCP 注册的所属插件与生命周期状态，并交付可独立安装的 Web 插件来展示这些数据。

**架构：** `dsh-tools` 报告带有作用域和所有者元数据的活动工具注册。`dsh-mcp-client` 将连接状态发布到由共享 base profile 挂载、并由实例生命周期管理的注册表。Host Plugin Inventory 将两个快照合并到现有 Remote 响应中；独立项目添加只读 Settings 标签页并调用该 Remote。

**技术栈：** TypeScript、Cordis、Typert Remote、Harness 中的 pnpm workspace、React 和 DSH Web 模块加载器。

**设计稿：** [2026-10-30-tool-registration-ownership-design.md](../specs/2026-10-30-tool-registration-ownership-design.zh.md)

## 全局约束

- 保留当前重复工具名和重复 `serverName` 的拒绝行为、作用域覆盖规则及 effect 所有的清理。
- 只公开元数据快照；不公开插件配置、凭据、工具定义、执行函数或不透明的作用域 key。
- 仅在 Cordis Loader 提供身份时报告所有者；不得根据名称或调用栈推测所有者。
- 新管理插件保持只读，并且可以独立于 Harness 本体安装。
- 未组合对应注册表的 profile 可以省略新快照字段。

## 审查重点

- 没有 Loader entry 的工具注册应报告所有者缺失。
- 不同作用域中同名的工具仍作为不同记录显示，且不暴露作用域 ID。
- MCP 启动失败、重连耗尽、卸载和 HMR 都报告正确状态，且不留下陈旧记录。
- 未配置 MCP 实例的 profile 仍返回原有 Plugin Inventory 数据和空或省略的 MCP 列表。
- 缺少扩展字段的旧版 Host 应提示当前不支持运行时清单，而不是显示健康的空清单。
- 独立插件只展示 Remote 返回的数据，并正确呈现加载、空、错误和重试状态。

---

### 任务 1：为 `dsh-tools` 增加工具注册快照

**文件：**
- 修改：`E:\home\deepseek-harness\packages\core\tools\src\contracts.ts`
- 修改：`E:\home\deepseek-harness\packages\core\tools\src\index.ts`
- 修改：`E:\home\deepseek-harness\packages\core\scope\src\store.ts`
- 修改：`E:\home\deepseek-harness\packages\core\tools\package.json`
- 修改：`E:\home\deepseek-harness\packages\core\tools\tsconfig.json`
- 测试：`E:\home\deepseek-harness\packages\core\tools\tests\tools.spec.ts`
- 修改：`E:\home\deepseek-harness\packages\core\tools\README.md`
- 修改：`E:\home\deepseek-harness\packages\core\scope\README.md`
- 修改：`E:\home\deepseek-harness\docs\subsystems\tools.md`

**接口：**
- 添加 `ToolRegistrationSnapshot`，字段为 `name: string`、`owner: { entryId: string; moduleName: string } | null`、`scope: 'global' | 'scoped'` 和 `conditional: boolean`。
- 添加 `ToolsService.registrations(): readonly ToolRegistrationSnapshot[]`；每次调用都从所有活动的全局和作用域层返回分离且冻结的记录。
- 通过可追踪的服务上下文获取注册工具的 Cordis fiber Loader entry；没有 Loader entry 时返回 `owner: null`。

- [ ] **步骤 1：添加失败用例**，覆盖全局和作用域所有者、所有者缺失、条件元数据、不同作用域中的同名注册，以及分离和冻结的快照。
- [ ] **步骤 2：运行定向测试**：`pnpm exec vitest run packages/core/tools/tests/tools.spec.ts`，确认新增断言失败。
- [ ] **步骤 3：实现 `ToolRegistrationSnapshot` 和 `ToolsService.registrations()`**，不改变 `get()`、`definitions()`、`schemas()` 或重复名称行为。
- [ ] **步骤 4：更新包 README 和 subsystem 参考文档**，说明快照字段、作用域语义和隐私限制。
- [ ] **步骤 5：重新运行定向测试**，确认新增用例通过。

### 任务 2：增加 MCP Client 状态注册表

**文件：**
- 新建：`E:\home\deepseek-harness\packages\mcp\mcp-client\src\registry.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\tsconfig.json`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\src\index.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\src\connection.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\package.json`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\tsdown.config.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\tests\apply.spec.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\tests\reconnect.spec.ts`
- 修改：`E:\home\deepseek-harness\packages\mcp\mcp-client\README.md`
- 修改：`E:\home\deepseek-harness\scripts\gen-cordis-catalog.ts`
- 修改：`E:\home\deepseek-harness\scripts\type-equiv.manifest.json`
- 修改：`E:\home\deepseek-harness\packages\bundle\base\cordis.patch.yml`
- 修改：`E:\home\deepseek-harness\packages\bundle\base\package.json`

**接口：**
- 添加 `McpClientState = 'starting' | 'connected' | 'reconnecting' | 'failed' | 'stopped'`。
- 添加 `McpClientSnapshot`，字段为 `serverName`、同任务 1 一致的可空 `owner`、`scope: 'global' | 'scoped'`、`state` 和只读公开 `toolNames`。
- 添加 `McpClientRegistry.list(): readonly McpClientSnapshot[]` 和 `register(serverName): { update(state, toolNames): void; dispose(): void }`。
- 将注册表导出为 `@deepseek-ai/dsh-mcp-client/registry`；在 `dsh-base` 中、可选的各 Server entry 之前挂载一个提供方。
- 每个 `mcp-client` 实例都要求 `mcpClientRegistry`，由连接 supervisor 发布状态变化，并在 teardown 完成后移除实例记录。

- [ ] **步骤 1：添加失败的生命周期用例**，覆盖启动、同步成功、重连、重试耗尽、HMR 卸载、公开工具名更新，以及不同作用域中的同名 Server。
- [ ] **步骤 2：运行 MCP 定向测试**：`pnpm exec vitest run packages/mcp/mcp-client/tests/apply.spec.ts packages/mcp/mcp-client/tests/reconnect.spec.ts`，确认新增断言失败。
- [ ] **步骤 3：实现 effect 所有的注册表和连接状态更新**，同时保留现有命名空间预留和连接清理语义。
- [ ] **步骤 4：通过包构建、base bundle manifest 和 base patch row 导出并组合注册表提供方**。
- [ ] **步骤 5：更新 MCP Client README**，说明状态含义以及不会返回的配置字段。
- [ ] **步骤 6：重新运行 MCP 定向测试**，确认所有新增生命周期用例通过。

### 任务 3：扩展 Host Plugin Inventory Remote

**文件：**
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\src\types.ts`
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\src\index.ts`
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\package.json`
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\tsconfig.json`
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\tests\inventory.spec.ts`
- 修改：`E:\home\deepseek-harness\packages\host\plugin-inventory\README.md`
- 修改：`E:\home\deepseek-harness\packages\api\remotes\src\client\index.ts`
- 修改：`E:\home\deepseek-harness\packages\bundle\web-app\package.json`

**接口：**
- 为 `PluginInventorySnapshot` 增加可选 `toolRegistrations` 和 `mcpClients` 数组，并在 Remote 所有者 ID 上使用现有的 branded `PluginEntryId`。
- `pluginInventory/list` 仍是唯一的 Remote 方法；运行时注册表不存在时，新字段省略或返回空数组。
- `readPluginInventory(ctx)` 读取 `ctx.tools.registrations()` 和 `ctx.mcpClientRegistry.list()`，将内部所有者映射到 Loader entry ID，并只返回声明过的快照字段。

- [ ] **步骤 1：添加失败的 Remote 用例**，覆盖所有者映射、所有者缺失、服务缺失、作用域记录、MCP 状态和未配置 MCP Server 的情况。
- [ ] **步骤 2：运行 `pnpm exec vitest run packages/host/plugin-inventory/tests/inventory.spec.ts`**，确认新增断言失败。
- [ ] **步骤 3：增加可选快照字段并聚合两个核心注册表**，不改变现有 Loader 和 preset 投影。
- [ ] **步骤 4：更新 Remote 类型导出、包引用和 Host Inventory README**，说明扩展后的只读 payload。
- [ ] **步骤 5：重新运行 Host Inventory 定向测试**，确认用例通过。

### 任务 4：在空项目中创建独立插件 bundle

**文件：**
- 新建：`E:\home\dsh_plugin_manager_wj\package.json`
- 新建：`E:\home\dsh_plugin_manager_wj\cordis.patch.yml`
- 新建：`E:\home\dsh_plugin_manager_wj\index.js`
- 新建：`E:\home\dsh_plugin_manager_wj\client.js`
- 新建：`E:\home\dsh_plugin_manager_wj\locale\en.json`
- 新建：`E:\home\dsh_plugin_manager_wj\locale\zh.json`
- 新建：`E:\home\dsh_plugin_manager_wj\README.md`
- 新建：`E:\home\dsh_plugin_manager_wj\README.zh.md`

**接口：**
- 包名为 `dsh-plugin-manager-wj`，并声明 `dsh.bundle.patch` 和 Web `dsh.client` 入口。
- 将 `locale/zh.json` 的 `meta.title` 设为 `WJ 插件终极调度中心`；英文 `meta.title` 使用 `WJ plugin control center`。
- bundle patch 插入一个 Host 空操作插件行；`client.js` 将浏览器端注册到现有 `settings.plugins.tab` 插槽。
- 浏览器端通过 `@deepseek-ai/dsh-api-remotes` 调用 `remote.pluginInventory.list()`；不添加 Host 服务或 Remote 命名空间。
- 包保持为原生 ESM JavaScript，无需本地构建步骤；Harness Web 模块加载器提供 React 与清单声明的 DSH Client 服务。

- [ ] **步骤 1：创建包 manifest 和 bundle patch**，声明 Host 与 Client 导出、locale 文件和插件清单所需的 DSH Client 依赖。
- [ ] **步骤 2：添加 Host 空操作入口和 Client 模块加载器入口**，遵循仓库 Cordis 插件模板。
- [ ] **步骤 3：添加英文和简体中文文案**，为产品名称、标签、搜索、状态、空状态、加载错误和重试提供匹配的 key，并使用已确认的中文名称。
- [ ] **步骤 4：编写中英文配对 README**，说明 bundle 安装、Harness 版本要求、显示字段和只读限制。

### 任务 5：在独立 Settings 标签页展示工具和 MCP 状态

**文件：**
- 修改：`E:\home\dsh_plugin_manager_wj\client.js`
- 修改：`E:\home\dsh_plugin_manager_wj\locale\en.json`
- 修改：`E:\home\dsh_plugin_manager_wj\locale\zh.json`
- 测试：`E:\home\dsh_plugin_manager_wj\tests\inventory-tab.test.js`

**接口：**
- 标签页读取 `pluginInventory/list` 返回的扩展版 `PluginInventorySnapshot`，并分组展示 `toolRegistrations` 和 `mcpClients`。
- 搜索匹配工具名、所有者模块名、MCP `serverName`、连接状态和公开工具名。
- 手动刷新只发起一次 Remote 调用；UI 不轮询，也不执行修改操作。

- [ ] **步骤 1：添加失败的组件用例**，覆盖加载、空清单、Remote 失败与重试、搜索、工具所有者和作用域、条件激活、MCP 状态及无障碍名称。
- [ ] **步骤 2：运行独立项目测试**：`pnpm test -- tests/inventory-tab.test.js`，确认新增断言失败。
- [ ] **步骤 3：使用本项目化的 DSH UI 基础组件呈现两组只读数据**，并提供本地化标签。
- [ ] **步骤 4：实现搜索和手动刷新**，刷新失败时保留上次成功的快照。
- [ ] **步骤 5：重新运行独立项目测试**，确认全部用例通过。

### 任务 6：将两个项目作为一个可安装功能验证

**文件：**
- 仅在 Web Host composition 看不到 base 注册表 row 时修改：`E:\home\deepseek-harness\packages\bundle\web-app\cordis.patch.yml`
- 修改：`E:\home\dsh_plugin_manager_wj\README.md`
- 修改：`E:\home\dsh_plugin_manager_wj\README.zh.md`

**接口：**
- Host bundle 在启用独立 Client bundle 前提供 `tools`、`mcpClientRegistry` 和 `pluginInventory/list`。
- 没有 MCP entry 的 Web profile 正常启动，返回空 MCP 清单；现有插件和工具注册行为不变。

- [ ] **步骤 1：运行 Harness 定向套件**，覆盖工具注册表、MCP 连接生命周期和 Host Plugin Inventory。
- [ ] **步骤 2：运行 Harness 产物构建和类型检查**，检查变更包的 Host 和 Client 引用。
- [ ] **步骤 3：将独立 bundle 安装到本地 Web profile**，确认标签页显示实时工具和 MCP 清单，再卸载该 bundle 并确认核心注册未改变。
- [ ] **步骤 4：审查两个项目的 diff**，检查是否泄漏配置值、秘密、作用域标识、无用文件或生成产物。
