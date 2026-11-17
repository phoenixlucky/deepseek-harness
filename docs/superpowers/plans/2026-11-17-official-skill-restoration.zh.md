# 恢复官方技能 Provider 实施计划

[English](2026-11-17-official-skill-restoration.md) | 中文

> **供智能体执行：** 必须使用 `executing-plans` 子技能逐项执行本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 恢复官方技能 Provider 及其 Web 设置控件，包含 13 个 WJ Forge 技能和 Figma 设计技能，并排除 Chrome MCP Bridge。

**架构：** 添加一个 Cordis Provider，通过现有 `dsh-skill` 注册表注册已审核的内嵌技能；再添加一个 Client 插件，通过功能自有的设置标签页提供控制。通过 Web 应用现有的包与 preset 组合挂载二者，并复用配置表单、本地化字典、内置技能优先级和现有技能加载器。

**技术栈：** TypeScript ESM、Cordis、React、YAML 前置元数据解析、Vitest、pnpm 工作区包、无密钥录制会话快照。

**规格：** [恢复官方技能 Provider](../specs/2026-11-17-official-skill-restoration-design.zh.md)

## 全局约束

- Provider 目录、包文档、测试和设置搜索都将省略 `chrome-mcp-bridge-2026-skill`。
- Figma 技能仍是唯一具有固定来源更新路径的技能。
- 所有可见文案使用现有的中英文 locale 字典。
- 现有技能子系统类型和调用规则保持不变。

## 审查重点

- 缺失或无效的捆绑资源会使 Provider 激活失败并报告路径；测试无效前置元数据和缺失资源。
- 禁用或销毁官方 Provider 不影响其他 Provider；测试独立注册和目录失效。
- Figma 更新遇到重定向、HTTP 失败或超大响应时保留已安装内容；逐类测试响应。
- Figma 身份变更或未批准的前置元数据会被拒绝；测试身份和元数据修改。
- 设置保存或更新失败不会显示为成功，也不会改变启用状态；分别测试两种失败结果。

---

### 任务 1：恢复官方 Provider 和技能资源

**文件：**
- 新建：`packages/skill/skill-official/package.json`
- 新建：`packages/skill/skill-official/tsconfig.json`
- 新建：`packages/skill/skill-official/src/index.ts`
- 新建：`packages/skill/skill-official/tests/registry.spec.ts`
- 新建：`packages/skill/skill-official/assets/wj-forge/{bug-hunt,code-review,github,moon-lovers,officecli,ponytail,release-notes,superpowers,taste-skill,ui-ux-pro-max,vision-liao-memory,weiliaozi-skill,zerotoken-skill}/SKILL.md`
- 新建：`packages/skill/skill-official/assets/figma-design-skill/{SKILL.md,LICENSE,references/anthropic-mcp-apps-design.md,references/browser-recipes.md,references/claude-design-system-storybook.md}`
- 新建：`packages/skill/skill-official/README.md`、`README.zh.md` 和 `README.i18n.yaml`
- 修改：`packages/skill/README.md`、`README.zh.md` 和 `README.i18n.yaml`

**接口：**
- 使用：`@deepseek-ai/dsh-skill` 中的 `ctx.skills.registerProvider()` 及现有 `SkillProvider`、`SkillCandidate` 和 `SkillSource` 类型。
- 提供：`@deepseek-ai/dsh-skill-official`。其 `apply(ctx, config)` 注册且只注册 13 个 WJ Forge 技能和 `figma-design-skill`；`Config.disabledSkills` 仅筛选此 Provider 的候选技能。

- [ ] **步骤 1：编写失败的 Provider 测试**

添加 `exposesExactlyTheThirteenWjForgeAndFigmaSkillsWithoutChrome`、`filtersDisabledEntriesAndInvalidatesCatalog`、`disablingAndDisposingOfficialProviderLeavesOtherProvidersAvailable`、`rejectsMissingOrInvalidBundleAssetsWithPath` 和 `loadsOnlyValidatedReplacementsWithoutToolGrants`。断言 14 个准确名称、`source: 'bundled'`、Provider 身份、无模型元数据或工具授予、指定技能加载和 Provider 销毁行为。`disabledSkills` 默认值为空，与历史集成一致。

- [ ] **步骤 2：运行 Provider 测试并确认失败**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/registry.spec.ts`

预期：失败，因为 Provider 包和资源尚不存在。

- [ ] **步骤 3：添加 Provider 和已审核资源**

恢复历史 Provider 实现和资源，并按当前工作区规范调整导入与包元数据。保留列出的 13 个 WJ Forge 资源及带许可证的 Figma 资源；不创建 Chrome MCP Bridge 资源，也不在任何目录中包含其名称。

- [ ] **步骤 4：运行 Provider 测试**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/registry.spec.ts`

预期：通过，准确返回 14 个官方候选技能，不包含 Chrome MCP Bridge。

- [ ] **步骤 5：提交 Provider 包**

```sh
git add packages/skill/skill-official packages/skill/README.md packages/skill/README.zh.md packages/skill/README.i18n.yaml
git commit -m "feat(skill): restore official skill provider"
```

### 任务 2：校验 Figma 固定来源更新

**文件：**
- 新建：`packages/skill/skill-official/src/updates.ts`
- 新建：`packages/skill/skill-official/tests/updates.spec.ts`
- 修改：`packages/skill/skill-official/src/index.ts`

**接口：**
- 使用：固定 Figma 来源 `https://raw.githubusercontent.com/phoenixlucky/figma-design-skill/main/SKILL.md`。
- 提供：`fetchSkillUpdate(name, signal?, fetcher?)` 和 `validateSkillUpdateContent(name, content)`。二者仅接受 `figma-design-skill`，并校验其身份、来源元数据、版本和允许的前置元数据。

- [ ] **步骤 1：编写失败的更新测试**

添加 `downloadsOnlyTheReviewedFigmaSource`、`rejectsRedirectsOversizeAndChangedMetadata` 和 `preservesInstalledContentWhenValidationFails`。覆盖未知技能名称、重定向、非成功响应、最终 URL 变化、超过 256 KiB 的内容、身份变化、无效版本、未批准的前置元数据、取消操作和保留现有内容。

- [ ] **步骤 2：运行更新测试并确认失败**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/updates.spec.ts`

预期：失败，因为固定来源更新辅助函数尚不存在。

- [ ] **步骤 3：实现固定来源校验**

在包内允许列表固定 URL；拒绝重定向和响应 URL 变化，限制 UTF-8 内容在 256 KiB 以内，并在返回内容前校验批准的元数据。不接受调用方提供的 URL，安装更新时也不改变技能启用状态。

- [ ] **步骤 4：运行更新测试**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/updates.spec.ts`

预期：通过；校验失败时保留已安装内容。

- [ ] **步骤 5：提交更新校验**

```sh
git add packages/skill/skill-official/src/index.ts packages/skill/skill-official/src/updates.ts packages/skill/skill-official/tests/updates.spec.ts
git commit -m "feat(skill): validate fixed-source Figma updates"
```

### 任务 3：添加官方技能设置标签页

**文件：**
- 新建：`packages/client/ui-settings-skills/package.json`
- 新建：`packages/client/ui-settings-skills/tsconfig.json`、`tsconfig.client.json` 和 `tsconfig.host.json`
- 新建：`packages/client/ui-settings-skills/src/index.ts`
- 新建：`packages/client/ui-settings-skills/src/{client/index.ts,client/SkillsSettingsTab.tsx,client/settingsModel.ts,client/locales.ts,client/skills-settings.module.css}`
- 新建：`packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`
- 新建：`packages/client/ui-settings-skills/README.md`、`README.zh.md` 和 `README.i18n.yaml`
- 修改：`packages/client/README.md`、`README.zh.md` 和 `README.i18n.yaml`

**接口：**
- 使用：`ctx.configForms.get('official-skills')`、`settings.plugins.tab` slot 和类型化的 `settings.skills` locale 字典。
- 提供：`@deepseek-ai/dsh-client-ui-settings-skills`。它只搜索和切换官方技能，并且只为 Figma 提供更新控件。

- [ ] **步骤 1：编写失败的设置测试**

添加 `rendersOnlyTheReviewedSkillCatalog`、`filtersBySkillNameDescriptionAndSource`、`writesOnlyOfficialEnablement`、`preservesEnablementWhenInstallingAnUpdate`、`preservesEnablementAfterFailedSaveOrUpdate` 和 `reportsFailedSaveAndUpdate`。断言不显示 Chrome MCP Bridge、英文和中文文案来自字典、失败写入仍显示失败，以及安装 Figma 更新会保留禁用技能和其他更新。

- [ ] **步骤 2：运行设置测试并确认失败**

运行：`pnpm exec vitest run packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`

预期：失败，因为设置包尚不存在。

- [ ] **步骤 3：实现功能自有的设置标签页**

使用现有 Slots、locale 和配置表单服务。让已审核的设置目录与 14 个 Provider 名称一致，省略 Chrome MCP Bridge，并且只更新官方 Provider 配置；保存和更新失败要清晰可见，不能修改其他 Provider 设置。

- [ ] **步骤 4：运行设置测试**

运行：`pnpm exec vitest run packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`

预期：搜索、启用状态、更新状态和失败报告测试通过。

- [ ] **步骤 5：提交设置包**

```sh
git add packages/client/ui-settings-skills packages/client/README.md packages/client/README.zh.md packages/client/README.i18n.yaml
git commit -m "feat(client): add official skills settings"
```

### 任务 4：接入 Web 组合并验证真实入口

**文件：**
- 修改：`packages/bundle/web-app/package.json`
- 修改：`packages/bundle/web-app/presets/standard.patch.yml`、`ptc.patch.yml` 和 `cordis.patch.yml`
- 修改：`packages/bundle/web-app/README.md`、`README.zh.md` 和 `README.i18n.yaml`
- 新建：`packages/skill/skill-official/tests/web-profile.integration.spec.ts`
- 新建或更新：由录制会话快照测试拥有的 `snapshots/web/official-skill-provider/` 场景文件
- 修改：`pnpm-lock.yaml`

**接口：**
- 使用：工作区依赖 `@deepseek-ai/dsh-skill-official` 和 `@deepseek-ai/dsh-client-ui-settings-skills`。
- 提供：Web 组合加载官方 Provider、现有技能注册表和加载器，并渲染功能自有设置标签页。

- [ ] **步骤 1：编写失败的 Web 组合测试和快照场景**

通过 Loader 和 app/process 启动一个测试专用 Web profile `cordis.yml`。断言面向模型的目录准确包含恢复的技能，且 `skill` 能加载恢复的指令。添加一个无密钥录制会话场景，覆盖相同的用户可见技能加载流程；设置标签页渲染由设置包测试负责。

- [ ] **步骤 2：运行聚焦集成测试并确认失败**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/web-profile.integration.spec.ts`

预期：失败，因为 Web profile 尚未解析或挂载官方 Provider 和设置包。

- [ ] **步骤 3：接入 Provider 和设置包**

在 Web 应用清单中添加包依赖，并在 `standard`、`ptc` 和 `cordis` preset 中，将插件条目添加到现有技能 Provider 和加载器旁边。保持 `minimal` 不变。运行 `pnpm install` 更新 lockfile。

- [ ] **步骤 4：运行集成测试和快照检查**

运行：`pnpm exec vitest run packages/skill/skill-official/tests/web-profile.integration.spec.ts`

预期：真实 Web Loader 组合测试通过。

运行：`pnpm run test:snapshot -t official-skill-provider`

预期：无密钥录制会话输出包含恢复技能的加载结果。

- [ ] **步骤 5：运行相关仓库检查**

运行 `pnpm run verify-cordis-config`、`pnpm run verify-client-ui-i18n`、`pnpm run test:docs`、`pnpm run doc-sync`、`pnpm run build:artifacts`，然后在最新 artifacts 构建后运行 `pnpm run build:check`。运行 `git diff --check` 并审阅完整 diff；确认没有加入 Chrome MCP Bridge 引用或历史提交中的无关文件。

- [ ] **步骤 6：提交 Web 接线和验证材料**

```sh
git add packages/bundle/web-app packages/skill/skill-official/tests/web-profile.integration.spec.ts snapshots/web/official-skill-provider pnpm-lock.yaml
git commit -m "feat(web): expose official skills"
```
