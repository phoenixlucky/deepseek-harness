# `@deepseek-ai/dsh-desktop`

English | [中文](README.zh.md)

The Electron desktop client for DeepSeek Harness. It boots the ordinary `dsh --profile web` server as a child utility process (the same build artifacts and profile composition the CLI uses) and renders the web surface in a dedicated `BrowserWindow`. Closing the window terminates the server and its process tree; a server that dies on its own quits the client with the server log on the console.

## Running

From the repository root:

```
start-client.bat            # Windows: installs, builds what is missing, and launches
```

or manually:

```sh
pnpm run build                                      # once: CLI lib + web UI dist
pnpm --filter @deepseek-ai/dsh-desktop start        # builds the main process and starts Electron
```

The client needs Node.js >= 22.19 and pnpm on `PATH`. On the first run the CLI and web UI must be built (`start-client.bat` does this automatically, including `pnpm install`; pass `--skip-build` to reuse existing artifacts). The dsh server prints its readiness line to the console, and the client opens the window as soon as it appears.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DSH_DESKTOP_PROFILE` | `web` | Profile the client boots (advanced). |
| `DEEPSEEK_API_KEY` | — | API key for the model provider; set it in `.env` at the repository root, or configure a provider in the client's onboarding UI. |
| `ELECTRON_MIRROR` | official | Electron binary download mirror; set to `https://npmmirror.com/mirrors/electron/` if the install-time download fails. |

## Notes

- The server binds `127.0.0.1` on an OS-assigned port (`--port 0`); nothing is exposed to the network.
- The window runs with `contextIsolation`, `sandbox`, and `nodeIntegration: false`; external links open in the system browser.
- Packaging into an installer (e.g. via electron-builder) is out of scope for this package for now; `start-client.bat` launches from the repository.
