# Agent Note：Electron 桌面客户端与一键启动脚本

Status: implemented

[English](2026-08-13-electron-desktop-client.md) | 中文

## 问题

产品现有的入口是浏览器 UI（`dsh web`）与 headless 任务模式（`dsh --profile headless`），缺少桌面应用形态的入口；在 Windows 上用户需要手动打开终端、安装、构建并启动 web profile。

## 决策

新增 `apps/desktop`（`@deepseek-ai/dsh-desktop`，private，不发布）：一个 Electron 主进程，以子进程 `utilityProcess` 方式启动常规的 `dsh --profile web` 服务，并在独立的 `BrowserWindow` 中渲染 Web 界面。

服务采用 spawn 而非进程内导入：桌面客户端复用产品自身的 CLI 路径（`apps/cli/lib/bin.js`）、构建产物与 profile 组合，而不是在 Electron 进程内重复 web profile 的 patch 层装配。`--port 0` 让操作系统分配空闲端口；客户端匹配 stdout 上的 `dsh web: http://...` 就绪行（即 web-app 的 `printUrl` 契约，本就是 supervisor 的 RPC 触发信号）并加载该 URL。

生命周期由窗口所有：关闭窗口即终止服务进程树（Windows 上使用 `taskkill /pid <pid> /T /F`，避免 shell 会话与 watcher 成为孤儿进程）；服务自身异常退出时，客户端连同控制台中的服务日志一起退出；60 秒就绪超时则明确报错。窗口启用 `contextIsolation`、`sandbox`，且 `nodeIntegration: false`；外链在系统浏览器中打开。

仓库根目录的 `start-client.bat` 即一键启动脚本：检查 Node/pnpm，`node_modules` 缺失时执行 `pnpm install`，只构建缺失的部分（CLI lib 缺失时全量 `pnpm run build`，仅 dist 缺失时 `build:web`；`--skip-build` 跳过两者），随后运行 `pnpm --filter @deepseek-ai/dsh-desktop start`。

## 备选方案

**在 Electron 进程内导入 Cordis web 装配** —— 已否决。它会在客户端中重复 web profile 的 patch 层组合并把客户端耦合到内部启动 API；spawn 方式让桌面客户端停留在产品文档化的 CLI 路径上并隔离崩溃。

**固定端口** —— 已否决。`--port 0` 加就绪行发现可避免与其他本地服务冲突；URL 行本就是稳定的产品契约。

**完全不提供客户端模式，仅浏览器快捷方式** —— 已否决。用户要求的是客户端形态的模式；Electron 窗口即交付物，bat 是其启动器。

## 影响

Windows 用户双击 `start-client.bat` 即可在原生窗口中启动 harness，服务仅绑定 `127.0.0.1` 且使用系统分配的空闲端口。客户端目前尚未打包为安装程序；打包（如 electron-builder）已推迟并记录为范围外。新增表面只增加一个 devDependency（`electron`）和 `apps/` 下的一个新 workspace，根 workspace 通配已覆盖。

## 验证

`extractWebUrl` 有单元测试（标准行、LAN 后缀、跨 chunk 尾部重扫、无关输出）。构建后的主进程在仓库 host tsconfig 下可编译；端到端启动需要显示环境，通过 `start-client.bat` 手动验证。
