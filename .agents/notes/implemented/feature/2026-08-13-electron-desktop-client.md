# Agent Note: Electron desktop client and one-click launcher

Status: implemented

English | [中文](2026-08-13-electron-desktop-client.zh.md)

## Problem

The product surfaces are a browser UI (`dsh web`) and a headless job runner (`dsh --profile headless`); there is no desktop-app-shaped entry, and on Windows a user has to open a terminal, install, build, and start the web profile by hand.

## Decision

Add `apps/desktop` (`@deepseek-ai/dsh-desktop`, private, not published): an Electron main process that boots the ordinary `dsh --profile web` server as a child `utilityProcess` and renders the web surface in a dedicated `BrowserWindow`.

The server is spawned, not imported: the desktop client reuses the product's own CLI path (`apps/cli/lib/bin.js`), its build artifacts, and its profile composition, instead of duplicating the web profile's patch-layer assembly inside the Electron process. `--port 0` lets the OS assign a free port; the client matches the `dsh web: http://...` readiness line on stdout (the web-app `printUrl` contract, already the RPC trigger for supervisors) and loads that URL.

Lifecycle is owned by the window: closing it terminates the server process tree (Windows uses `taskkill /pid <pid> /T /F` so shell sessions and watchers do not orphan), a server that dies on its own quits the app with its log on the console, and a 60s readiness timeout fails loud. The window runs `contextIsolation`, `sandbox`, and `nodeIntegration: false`; external links open in the system browser.

`start-client.bat` at the repository root is the one-click launcher: it checks Node/pnpm, runs `pnpm install` when `node_modules` is absent, builds only what is missing (full `pnpm run build` when the CLI lib is absent, `build:web` when only the dist is missing; `--skip-build` to skip both), then runs `pnpm --filter @deepseek-ai/dsh-desktop start`.

## Alternatives considered

**Import the Cordis web assembly inside the Electron process** — rejected. It duplicates the web profile's patch-layer composition and couples the client to internal boot APIs, while a spawn keeps the desktop client on the product's documented CLI path and isolates crashes.

**A hardcoded port** — rejected. `--port 0` with readiness-line discovery avoids conflicts with any other local service; the URL line is already a stable product contract.

**No client mode at all, only a browser shortcut** — rejected. The user asked for a client-shaped mode; the Electron window is the deliverable and the bat is its launcher.

## Consequences

A Windows user can double-click `start-client.bat` and get the harness in a native window, with the server bound to `127.0.0.1` on an OS-assigned port. The client is not packaged into an installer yet; packaging (e.g. electron-builder) is deferred and documented as out of scope. The extra surface adds one devDependency (`electron`) and a new workspace under `apps/`, which the root workspace glob already covers.

## Verification

`extractWebUrl` is unit-tested (canonical line, LAN suffix, chunk-boundary tail rescan, unrelated output). The built main process compiles under the repo's host tsconfig; end-to-end launch needs a display and is exercised manually via `start-client.bat`.
