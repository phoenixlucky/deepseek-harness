# 三层插件管理实施计划

[English](2026-10-30-plugin-management-three-layer.md) | 中文

> **面向代理执行者：** 使用 executing-plans 工作流逐项执行本计划。各步骤使用 `- [ ]` 复选框跟踪。

**目标：** 扩展 Harness 和独立 WJ bundle，提供三层插件健康与管理能力，包括可核查的诊断和受风险约束的修复。

**架构：** Loader、`app-boot`、`plugin-manager` 和 schema 设置表单继续拥有权威状态与写入流程。添加配置来源信息和 Host 诊断服务，通过现有 `pluginManager` Remote 暴露，并把 WJ bundle 扩展为 Settings → Plugins 健康管理页面。

**技术栈：** TypeScript、Cordis Loader 服务与 Remote、现有 schema 配置表单、独立 WJ JavaScript bundle 和 locale JSON。

**设计稿：** [2026-10-30-plugin-management-three-layer-design.md](../specs/2026-10-30-plugin-management-three-layer-design.zh.md)

## 全局约束

- Cordis Loader 继续拥有插件注册表和生命周期；不创建第二份插件状态或配置状态。
- 配置来源信息覆盖 bundle、profile、home 和 invocation 层，并包含 schema 已知字段的被覆盖来源。
- `pluginManager` 保持为唯一管理 Remote；变更使用现有的 profile 安全管理器和 schema 表单写入流程。
- 诊断响应不返回 Host 绝对路径、凭据、秘密值、原始插件配置、可执行回调或不透明的 scope/Agent 标识。
- 执行修复前重新检查 finding、目标、资格和预览版本；拒绝过期、受保护、有歧义和不支持的操作。
- 自动修复仅限于可写、可选、非基础设施插件的开关，且只处理无需改依赖或密钥的已诊断冲突；高风险或未分类修复需要确认，或保持不可用。
- 配置编辑使用 schema 表单，保留现有校验、版本冲突检查和用户层语义。
- 不支持诊断的 Host 继续显示注册清单，并明确报告诊断不可用；缺少证据时状态为未知，而非健康。
- 不增加插件市场、安装/更新/移除、任意 YAML/JSON、文件系统修复、凭据编辑、持久审计日志或 Agent preset 写入行为。

## 审查重点

- 受保护或过期的插件条目仍可见且不可修改；覆盖见 `packages/boot/plugin-manager/tests/health.spec.ts` 和 `packages/boot/plugin-manager/tests/manager.spec.ts`。
- 秘密值或被覆盖配置值不得通过来源信息泄露；覆盖见 `packages/boot/app-boot/tests/config-sources.spec.ts` 和 `packages/boot/plugin-manager/tests/manager.spec.ts`。
- finding 或目标改变后，旧的低风险预览必须被拒绝；覆盖见 `packages/boot/plugin-manager/tests/manager.spec.ts`。
- 不支持诊断方法的旧 Host 应显示诊断不可用，而不是显示健康的空结果；覆盖见 WJ bundle 的 UI 行为检查。
- 配置版本冲突后保留编辑草稿，并区分已保存的 profile 变更与实时应用结果；使用 schema 表单流程和 WJ bundle UI 检查覆盖。

---

### 任务 1：在 `app-boot` 记录配置来源

**文件：**

- 修改：`packages/boot/app-boot/src/profile-context.ts`
- 修改：`packages/boot/app-boot/src/index.ts`
- 新建：`packages/boot/app-boot/src/types.ts`
- 测试：`packages/boot/app-boot/tests/config-sources.spec.ts`
- 修改：`packages/boot/plugin-manager/src/index.ts`，暴露不含路径的来源信息
- 测试：`packages/boot/plugin-manager/tests/manager.spec.ts`，覆盖 schema 字段和密钥路径
- 修改：app-boot 与 plugin-manager 的中英文 README 及配对记录

**接口：**

- 从 app-boot 导出 `readConfigSourceLayers()` 和 `describeConfigSources()`。plugin-manager 根据当前 schema 校验请求路径，并省略密钥字段的来源标识。
- 来源查询读取当前 bundle、profile、home 和 invocation 补丁；不重新读取或返回解析后的配置值。

- [x] 添加优先级、未知来源、值与路径隐藏、schema 已知路径及密钥路径的定向用例。
- [x] 确认初始 app-boot 测试因来源 helper 不存在而失败。
- [x] 基于现有来源层实现无路径的字段来源查询；不返回值并隐藏 schema 密钥。
- [x] 运行 app-boot 和 manager 定向测试，并检查 README 双语配对。

### 任务 2：在 `plugin-manager` 添加 Host 诊断与类型化修复

**文件：**

- 新建：`packages/boot/plugin-manager/src/health.ts`
- 修改：`packages/boot/plugin-manager/src/types.ts`
- 修改：`packages/boot/plugin-manager/src/index.ts`
- 测试：`packages/boot/plugin-manager/tests/health.spec.ts`
- 扩展：`packages/boot/plugin-manager/tests/manager.spec.ts`，增加健康与修复用例
- 修改：`packages/boot/plugin-manager/README.md`、`README.zh.md` 和 `README.i18n.yaml`

**接口：**

- 添加 `PluginManager.getHealthSnapshot(): Promise<PluginHealthSnapshot>` 和 `getConflicts(query?: ConflictQuery): Promise<PluginFinding[]>`。
- 添加 `PluginManager.previewRemediation(request: PluginRemediationRequest): Promise<PluginRemediationPreview>` 和 `applyRemediation(previewId: PluginRemediationPreviewId, confirmed: boolean): Promise<ChangeResult>`。
- Finding 携带稳定代码、严重性、受影响条目标识、最少证据引用和类型化修复选项。预览携带预览 ID/版本、finding 版本、目标条目 ID、预期状态、风险、可逆性和效果摘要。
- 服务从 Loader、profile、兼容性、依赖、插件、工具和 MCP 的所属服务读取当前状态；进程内事件随 Host 进程结束，不新建重复的持久历史。

- [x] 覆盖激活失败、兼容性/依赖 finding、注册冲突和诊断信息隐藏。
- [x] 覆盖低风险执行、高风险确认、受保护目标和过期预览拒绝。
- [x] 确认健康测试在诊断服务实现前失败。
- [x] 实现当前状态诊断和带重新检查的 profile 开关修复。
- [x] 运行 manager/health 定向测试并更新包 README 双语版本。

### 任务 3：通过现有 Remote 暴露诊断接口

**文件：**

- 修改：`packages/api/remotes/src/client/index.ts`
- 修改：`packages/boot/plugin-manager/src/index.ts` 的 Remote 声明和访问策略
- 测试：`packages/boot/plugin-manager/tests/manager.spec.ts`，覆盖 Remote 方法和策略
- 如需说明 Remote 归属，修改 `packages/boot/plugin-manager/README.md` 和 `README.zh.md`

**接口：**

- Remote 命名空间继续为 `pluginManager`，并暴露 `getHealthSnapshot`、`getConflicts`、`getConfigSources`、`previewRemediation` 和 `applyRemediation`。
- `getConfigSources(fields)` 委托任务 1 的 app-boot 服务；服务缺失时返回类型化不可用结果，不伪造来源数据。
- Remote 访问检查沿用现有 plugin-manager 权限模式；Host 与已有变更服务负责执行端强制检查。

- [ ] 增加 wire-level Host Remote 测试，覆盖权限和序列化结果（现有行为测试直接调用 Loader 管理器）。
- [x] 在现有 `pluginManager` Remote 注册方法，并重新导出 Client 可用类型。
- [x] 编译 app-boot、plugin-manager 和 api-remotes 类型项目。
- [x] 更新 Remote JSDoc 和 plugin-manager 文档，不新增第二个命名空间。

### 任务 4：将 WJ bundle 改为独立的健康管理页面

**文件：**

- 修改：`E:/home/dsh_plugin_manager_wj/client.js`
- 修改：`E:/home/dsh_plugin_manager_wj/locale/en.json`
- 修改：`E:/home/dsh_plugin_manager_wj/locale/zh.json`
- 修改：`E:/home/dsh_plugin_manager_wj/README.md` 和 `README.zh.md`
- 仅在需要挂载独立 bundle 时，修改 `packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` 及其 locale 文案

**接口：**

- 消费现有清单、任务 3 的 `remote.pluginManager` 方法和 `configForms` 服务。schema 表单仍是唯一配置写入接口。
- 展示状态/严重性数量、可搜索插件行、可写启停开关、findings/证据、配置来源详情、schema 配置表单、修复预览、结果状态和重试/不可用状态。
- 修复预览显示准确目标、效果、风险、可逆性；高风险或未分类操作需要明确确认。不可写或无法定位的 Host 条目不提供活动控制。

- [x] 加载清单、健康状态、findings 和配置来源；刷新失败时保留上次快照，并明确区分诊断不可用。
- [ ] 为旧 Host 不可用状态和完整的修复/配置交互增加自动化 UI 行为检查。
- [x] 添加无依赖 bundle 回归检查，确认 schema 编辑器隐藏密钥节点和子字段。
- [x] 在独立 bundle 中实现管理页面、schema 表单和双语元数据。
- [x] 变更后刷新 Host 状态，并呈现实时、需重启、被覆盖和拒绝的结果。
- [x] 检查响应式字段、键盘原生控件、禁用原因和本地化标签；当前 checkout 无法进行浏览器截图审查。

### 任务 5：验证完整三层流程并更新集成文档

**文件：**

- 扩展：`packages/boot/plugin-manager/tests/manager.spec.ts`，覆盖真实组合下的管理流程
- 修改：合并 Web profile 使用的 owner-local 测试 `cordis.yml` fixture
- 仅为新服务/Remote 接口修改 `docs/architecture.md` 和 package subsystem references
- 修改：WJ bundle 文档，说明 Host 兼容性和支持的管理操作

**接口：**

- 通过 profile composition、`pluginManager` Remote 和独立 WJ bundle 检查真实 Loader 条目；产品可见流程不得只使用手工构造的 Context。
- 展示一次可写的低风险修复、一次拒绝受保护目标，并读取一个 schema 已知设置的来源详情。

- [ ] 组装一个真实 Web composition fixture，通过 Remote 驱动独立 WJ bundle。
- [ ] 对完整操作和配置流程运行 Web 浏览器冒烟检查。
- [x] 更新 package contract 文档和配对的 architecture references。

## 计划自查

- 设计稿覆盖：任务 1 负责来源信息与密钥隐藏；任务 2 负责当前 finding 与类型化修复；任务 3 负责 Remote 接口和过期检查；任务 4 负责健康 UI、schema 表单和兼容性行为；任务 5 负责真实组合验证和架构文档。
- 独立 bundle 当前没有本地测试 harness。Host 定向行为测试和语法/类型检查覆盖已实现端点；单一真实浏览器组合测试仍未完成。
- Harness 和 WJ checkout 还有无关的用户修改；按要求在现有工作树中实施并保留这些修改。
