---
description: "在 Web 设置中搜索并启用恢复的官方技能目录，并检查 Figma 设计技能是否有经过验证的更新。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-skills

[English](README.md) | 中文

## 概述

在设置中的**官方技能**分区搜索内置目录，并暂存技能的启用或停用状态。保存后，启用状态变更才会生效。页面会从固定上游来源检查 Figma 设计技能的更新，并且只安装通过官方提供方验证的内容；安装更新不会改变技能启用状态。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在设置中打开**官方技能**分区，管理官方技能提供方的目录。

搜索框会匹配技能名称、说明和来源标签。每行都有一个开关；变更会保留为草稿，直到点击**保存**。保存失败会继续显示错误，Host 已保存的配置不会改变。此分区列出十三个 WJ Forge 技能和 `figma-design-skill`。

只有 Figma 行提供更新控件。**检查更新**会获取经过审阅的固定 GitHub raw URL；只有返回有效内容后才会显示**安装更新**。本包会拒绝重定向、失败响应、过大的文档、变更后的技能身份或未批准的元数据。检查或写入失败会在分区中显示，安装更新不会改变停用的技能。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

当 Host 服务 `official-skills` 配置命名空间时，浏览器插件会注册一个 `settings.section` 条目。`OfficialSkillsSettingsController` 使用共享的 `SettingsFormModel` 管理 `disabledSkills`；Figma 更新单独写入 `updatedSkills`，保留其他更新项，并使用 scope revision。Host 入口为空操作，仅用于让 Web Loader 服务客户端模块。

技能目录与固定来源验证由 [skill-official](../../skill/skill-official/README.zh.md) 负责。此页面维护与提供方同步的可搜索目录，不为 WJ Forge 技能提供更新操作。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [skill-official](../../skill/skill-official/README.zh.md)——管理恢复的技能目录与 Figma 更新验证。
- [ui-settings](../ui-settings/README.zh.md)——提供配置表单与服务命名空间跟踪。
- [ui-plugin-manager](../ui-plugin-manager/README.zh.md)——在插件页显示与组合包关联的设置分区。
- [ui-primitives](../ui-primitives/README.zh.md)——提供共享设置表单行为。

-----

<a id="model-experience"></a>
## 模型体验

无；本包只注册浏览器侧设置分区，不添加模型可见内容。

#### KV 缓存影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **只有 Figma 提供更新操作**——本包没有为其他内置技能提供更新路径。
- **分区取决于提供方配置是否可用**——Host 未服务 `official-skills` 时不会显示。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
