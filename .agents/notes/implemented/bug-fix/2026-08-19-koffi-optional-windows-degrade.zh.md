# Agent Note: koffi 原生边界改为可选，并在无法构建时降级为纯 Node 回退

Status: implemented

English | [English](2026-08-19-koffi-optional-windows-degrade.md)

## Problem

`koffi` 是 `dsh-fs-local`、`dsh-session-persistence-jsonl`、`dsh-host-directory-picker-native` 三个包的硬 `dependencies` 依赖。其预编译原生绑定在构建它的工具链缺失的 Windows 主机上无法加载——例如 `npm i -g --ignore-scripts` 安装。三个包假设绑定必然加载，加载失败即崩溃，社区因此用 issue #197 提供了一个绕过方案：手动修补已安装的包，把所有 koffi 调用改写为纯 Node。该补丁无文档、无维护，且与真实源码脱节。

Win32 FIDO DACL 复制（`fs-local`）、`MoveFileExW` 写透发布（`jsonl`）、原生目录对话框共享同一根因：原生边界被当作强制项，缺失即成致命错误，而非一种受支持的配置。

## Decision

`koffi` 成为三个包的 `optionalDependencies` 条目；harness 在绑定可加载处保留原生能力，在不可加载处降级为纯 Node 回退。调用方注入的文件操作不变：降级仅在调用方把操作留给包默认实现时生效。

- `fs-local` 缓存 `win32()` 的绑定结果（undefined = 尚未尝试，null = 加载失败），并在默认 Win32 写入/原子路径上回退：DACL 复制为 no-op，`replaceFile` 退化为 `rename(replacement, replaced)`——即纯覆盖写。`win32BoundariesAvailable()` 暴露默认原生边界是否可用。
- `jsonl` 在绑定为 null 时，`publishNewFileWin32` 与 `ensureDurableDirectoryWin32` 回退为 `rename`；`rejectExistingLog` 继续保持单进程日志独占；`MoveFileExW` 写透路径仅在 koffi 无法加载时丢失。
- `directory-picker-native` 新增 `nativePickerAvailable(platform)`；`directory-picker-auto` 在它返回 false 时路由到 `browse` 后端，auto 选择器因此绝不挂载不可用的原生对话框。macOS/Linux 本无原生选择器，`browse` 本就是其路径。

## Alternatives considered

**彻底移除 koffi，只保留纯 Node 路径。** 否决：这会删除一项可用能力与既有的 koffi 集成，而 optional 依赖方案能将其保留；同时会连带 `dsh-sandbox-windows-acl`，后者仍把 koffi 作为硬依赖。

**保持 koffi 强制并要求每个主机自行构建。** 否决：这不能修复报告的缺陷，反而迫使受影响用户继续使用无维护的社区补丁。

## Consequences

- 在绑定可加载的主机上，行为不变。在不可加载的主机上，三个包都能正常加载与运行。
- 回退放弃了仅 Windows 才有的保证：DACL 复制、原子覆盖语义（纯覆盖会替换已存在目标，在 OS 层面丢失并发 no-REPLACE 保护，而单进程 `rejectExistingLog` 守卫仍保留）、以及日志发布与目录创建所依赖的 `MoveFileExW` 写透耐久。
- `dsh-sandbox-windows-acl` 仍是 koffi 的硬消费方；其用户仍需可构建的绑定，optional 依赖并未软化这一点。
