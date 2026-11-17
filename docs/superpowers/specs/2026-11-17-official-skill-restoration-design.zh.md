# 恢复官方技能 Provider

[English](2026-11-17-official-skill-restoration-design.md) | 中文

## Summary

本设计从历史集成中恢复官方技能 Provider 及其设置控件，同时排除 Chrome MCP Bridge 和同一提交中的无关改动。该 Provider 通过现有技能注册表提供 13 个 WJ Forge 技能和 Figma 设计技能。

## Table of Contents

- [问题](#problem)
- [现有能力](#existing-capabilities)
- [恢复的技能](#restored-skills)
- [架构](#architecture)
- [设置与更新](#settings-and-updates)
- [失败行为](#failure-behavior)
- [验证](#validation)
- [不在范围内](#out-of-scope)

-----

<a id="problem"></a>
## 问题

当前代码树已有共享技能注册表、文件系统和 Office Provider，以及面向模型的技能加载器，但不含历史版本中的官方 Provider 和对应设置控件。因此，当前产品无法发现或启用十月集成的技能。

只复制技能文档无法让技能投入使用。恢复内容需要包含 Provider、逐项启用设置、现有设置扩展点，以及加载这些技能所需的包注册。

<a id="existing-capabilities"></a>
## 现有能力

`dsh-skill` 合并多个 Provider，并按需加载选中的技能。`dsh-tool-skill` 提供技能目录和加载工具。设置配置表单已能保存插件自己的值，客户端设置中的 Plugins 区域也支持功能自有标签页。

官方 Provider 将复用这些现有服务，不会新增另一套技能注册表、新的模型工具或独立的设置存储机制。

<a id="restored-skills"></a>
## 恢复的技能

Provider 将捆绑 WJ Forge 的 `bug-hunt`、`code-review`、`github`、`moon-lovers`、`officecli`、`ponytail`、`release-notes`、`superpowers`、`taste-skill`、`ui-ux-pro-max`、`vision-liao-memory`、`weiliaozi-skill` 和 `zerotoken-skill`，以及附带已审核参考文件和 Apache-2.0 许可证的 `figma-design-skill`。

Provider 目录、包文档、测试和设置搜索均不会包含 `chrome-mcp-bridge-2026-skill`。其余 WJ Forge 条目保留来源标注和已审核的内嵌文本。Figma 技能仍是唯一支持固定来源更新的技能。

<a id="architecture"></a>
## 架构

`@deepseek-ai/dsh-skill-official` 将通过 `ctx.skills.registerProvider()` 注册内嵌技能。它会在加载资源时校验技能名称和描述，只在消费者请求某项技能时返回完整指令，并且不声明工具或权限授予。

Provider 通过自己的 `disabledSkills` 配置筛选技能，并使用现有内置技能优先级和 Provider 生命周期。销毁 Provider 会移除其候选项，并通过现有注册表 API 使目录缓存失效。

`@deepseek-ai/dsh-client-ui-settings-skills` 将通过现有 Settings Plugins 扩展点添加功能自有标签页。该标签页会搜索已审核目录、显示各技能的启用状态，并且只更新官方 Provider 的配置表单。

包清单、工作区聚合配置和所属包组 README 将注册 Provider 与设置包。现有技能子系统类型和调用规则保持不变。

<a id="settings-and-updates"></a>
## 设置与更新

用户可以逐项启用或禁用捆绑技能。禁用的技能仍显示在设置搜索中，但不会进入面向模型的目录。启用状态变更会使 Provider 目录失效，以便消费者读取保存后的选择。

Figma 技能只能从其固定的已审核 HTTPS 来源检查和安装更新。更新流程会拒绝重定向、超大内容、身份变更和未批准的前置元数据，不接受调用方提供的 URL。其他技能继续使用固定捆绑版本。

所有可见文案都使用现有的中英文 locale 字典。设置界面会报告更新或保存失败，不会把失败操作显示为成功。

<a id="failure-behavior"></a>
## 失败行为

缺失或无效的捆绑资源会使 Provider 激活失败，并报告对应路径。被禁用或不可用的 Provider 不会贡献目录条目；`dsh-skill` 中的其他 Provider 仍可用。

更新失败会保留当前 Figma 技能内容和启用状态。更新成功只会替换通过校验的 Figma 文档。销毁 Provider 会移除其注册，不影响其他 Provider。

<a id="validation"></a>
## 验证

Provider 测试将覆盖恢复后的精确技能集合、排除 Chrome MCP Bridge、来源标签、各 Provider 独立启用、技能加载和销毁行为。更新测试将覆盖固定来源校验、重定向与大小限制、身份和元数据检查，以及失败后保留旧版本。

设置测试将覆盖搜索、本地化显示、启用状态写入、更新状态和失败报告。包检查将验证工作区注册、README 归属、双语配对，以及 Web 组合中设置标签页和技能 Provider 的接线。

<a id="out-of-scope"></a>
## 不在范围内

本次恢复不包含 Chrome MCP Bridge、MCP 服务包或设置卡片、桌面配置文件初始化、主题资源、社区插件改动，或历史提交中的其他无关文件。产品捆绑不会加入宿主个人技能目录的技能，也不会改变技能优先级、调用策略或注册表 API。
