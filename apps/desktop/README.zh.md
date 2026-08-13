# `@deepseek-ai/dsh-desktop`

[English](README.md) | 中文

DeepSeek Harness 的 Electron 桌面客户端。它以子进程方式启动常规的 `dsh --profile web` 服务（复用 CLI 使用的同一套构建产物与 profile 组合），并在独立的 `BrowserWindow` 中渲染 Web 界面。关闭窗口即终止服务及其进程树；服务自身异常退出时，客户端会连同控制台中的服务日志一起退出。

## 运行方式

在仓库根目录：

```
start-client.bat            # Windows: installs, builds what is missing, and launches
```

或手动执行：

```sh
pnpm run build                                      # once: CLI lib + web UI dist
pnpm --filter @deepseek-ai/dsh-desktop start        # builds the main process and starts Electron
```

客户端需要 `PATH` 中存在 Node.js >= 22.19 与 pnpm。首次运行时需要先构建 CLI 与 Web UI（`start-client.bat` 会自动完成，包括 `pnpm install`；传入 `--skip-build` 可复用已有产物）。dsh 服务会把就绪信息打印到控制台，客户端一旦检测到即打开窗口。

## 配置

| 变量 | 默认值 | 用途 |
|---|---|---|
| `DSH_DESKTOP_PROFILE` | `web` | 客户端启动的 profile（高级用法）。 |
| `DEEPSEEK_API_KEY` | — | 模型提供方的 API 密钥；可在仓库根目录 `.env` 中设置，或在客户端的 onboarding 界面配置提供方。 |
| `ELECTRON_MIRROR` | 官方源 | Electron 二进制下载镜像；若安装时下载失败，可设为 `https://npmmirror.com/mirrors/electron/`。 |

## 说明

- 服务仅绑定 `127.0.0.1` 并使用系统分配的空闲端口（`--port 0`），不向网络暴露任何内容。
- 窗口启用 `contextIsolation`、`sandbox`，且 `nodeIntegration: false`；外链在系统浏览器中打开。
- 打包为安装程序（例如通过 electron-builder）暂不属于本包范围；`start-client.bat` 从仓库直接启动。
