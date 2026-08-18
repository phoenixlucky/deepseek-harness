# Agent Note: 快速访问列表为每次驱动器探测设置超时界，且其停滞探测测试改用真实计时器

Status: implemented

English | [English](2026-08-18-list-roots-stalled-probe-bound.md)

## 问题

`directory-picker-browse` 的快速访问枚举在其文档中声称"探测全程有界且容错"，但释放界只存在于默认的 `probeDriveLetter` 内部。调用方注入的 `probeDrive` 若永不 settle（例如断开的映射网络驱动器停滞时），会使整个列表永久挂起，违背了文档契约。固定该行为的测试将 `vi.useFakeTimers()` 与枚举前对常规文件夹执行的三次真实 `stat` 调用混用：绑定计时器只在这三次 stat 完成之后才创建，而假时钟推进不会让真实文件系统 I/O 落地，因此在较慢的平台上计时器排入调度时最后一次 `advanceTimersByTimeAsync` 已经返回：测试超时而非通过。

## 决策

`listRoots` 现在将每次驱动器探测——默认的 stat 探测与调用方注入的探测——都经由共享的 `driveProbeWithinBound(probe)` 辅助函数，该函数将探测与既有的 400ms `DRIVE_PROBE_TIMEOUT_MS` 释放界竞争，探测超时则解析为 `false`。`probeDriveLetter` 复用同一辅助函数，使超时界逻辑只有一处归属。默认路径行为不变：`probeDriveLetter` 本就带界，对其结果再包一层只是对同一竞争重复一次。

停滞探测测试不再使用假计时器：注入永不 settle 的探测，断言枚举经由真实的 400ms 界完成；home 指向按进程区分的临时路径，使常规文件夹的 stat 确定性返回 `ENOENT`。

## 备选方案

**保留假计时器并推进更远或多次推进。** 被否决：探测只在前三次真实 `stat` 完成后才创建，而 `advanceTimersByTimeAsync` 在其窗口期间不会让真实文件系统 I/O 落地，因此任何推进预算都无法可靠覆盖已存在的计时器，测试仍依赖时序。

**通过 `DirectoryRootsInternals` 让常规文件夹的 `stat` 可注入。** 被否决：这仅为满足测试而扩大公开 internals 面，而真实计时器测试已以近乎零成本固定了同一契约。

## 后果

- 停滞的用户注入驱动器探测与默认探测在同一边界处释放快速访问列表；枚举契约现对每种探测来源成立。
- `probeDriveLetter` 为直接调用方保留自身边界，`listRoots` 在默认路径上额外添加一次相同的竞争——行为等价，只是每个字母多一个在探测完成时被清除的计时器。
- 停滞探测测试改用真实计时器，耗时约 0.4s；在包括 Windows 在内的每个平台上都确定性通过，此前假时钟与真实 I/O 的交错在 Windows 上会让它卡死。