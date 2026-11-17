---
description: "为用户和维护者介绍内置且经过审阅的 WJ Forge 与 Figma 技能及其启用设置。"
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-official

[English](README.md) | 中文

<a id="summary"></a>
## 概述

此提供方随包内置 13 项 WJ Forge 技能和 Figma 设计技能，可离线通过 `ctx.skills` 发现。设置标签页支持搜索，并在该提供方自己的配置中逐项保存启用状态。技能只提供工作流程指导，不授予工具或权限。

技能文档的 frontmatter 保留了上游来源。Figma 设计技能配置了一个固定且经过审阅的 HTTPS 来源；下载更新必须通过身份与允许元数据校验后，才可由用户安装。

## 目录

- [概述](#summary)
- [模型体验](#model-experience)
- [已知限制与待办](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="model-experience"></a>
## 模型体验

### 启用的技能指令

#### 模型看到的内容

provider 会通过现有技能加载器提供每份已启用指令文档。模型选中技能后，其注册来源中的完整内容会内联；例如 [`figma-design-skill/SKILL.md`](assets/figma-design-skill/SKILL.md)。

#### Token 影响

所选技能的指令文本会加入当前模型上下文。实际长度取决于选择的技能和任务。

#### KV Cache 影响

技能启用期间，其文本属于上下文前缀。切换技能或更新内容会改变此前缀。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与待办

- 目前只有 Figma 设计技能配置了更新来源，其他内置技能继续使用随包内容。

<a id="dev-note"></a>
### 开发备注

技能内容保存在 `assets/`，并可通过易变设置字段逐项停用。
