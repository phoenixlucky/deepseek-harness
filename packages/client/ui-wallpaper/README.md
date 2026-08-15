# @deepseek-ai/dsh-client-ui-wallpaper

English | [中文](README.zh.md)

Wallpaper plugin: an app-background wallpaper for the Web client. The Host half scans the configured wallpaper directory (webp/png/jpg/jpeg/gif/bmp/svg), publishes the JSON list over the `/wallpapers` route and serves each file's bytes over `/wallpapers/<file>`, and persists the selection in the user-settings document under `ui-wallpaper.selected`; the browser half provides the `ctx.wallpaper` service (wallpaper list + selection), and this package's own presenter projects the selected wallpaper onto the `document.body` background (cover, centered, no-repeat) and registers a Wallpaper row (a "None" option plus one thumbnail per wallpaper) into the General settings section. Wallpaper is pure presentation: it produces no session events and adds no model-visible input.

The wallpaper directory ships no images itself — a deployment drops pictures into it; a missing or empty directory is a valid no-wallpapers state, not a boot failure. The list loads when the browser plugin activates and refreshes on every `connection/reset`, so a wallpaper dropped into the directory mid-session becomes selectable after a reconnect. A remote browser without access to the privileged Host settings API keeps its selection process-local.

## Configuration

The Host half requires `root`, the absolute path of the wallpaper directory. It deliberately has no default — a `process.cwd()`-relative fallback would scatter user images; the shipped web-app composition supplies `process.cwd() + '/wallpapers'` (i.e. the `wallpapers/` directory at the project root, created on first activation).

## Routes

- `GET /wallpapers` — JSON list `{ wallpapers: [{ name, url }] }`, restricted to the supported image extensions and sorted by file name.
- `GET /wallpapers/<file>` — serves the wallpaper file's bytes with its image MIME type; directory traversal answers 403, a missing file 404, and non-GET/HEAD 405.

## Export shape

A function plugin (Host half): it exports `name` / `inject` / `apply` / `Config` and no default. The browser half exports `apply` / `inject` plus the store-factory type.

## Model Experience

None, as the wallpaper plugin manages a browser preference and HTTP-served images; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Flat wallpaper directory only** — subdirectories are not scanned recursively; extending `listWallpapers` is required for nested organization.
- **List refresh is reconnect-driven, not live** — a wallpaper dropped into the directory mid-session appears only after the next `connection/reset`; there is no filesystem watcher.
- **Remote browsers keep the selection process-local** — a non-loopback browser cannot reach the Host settings API, so its selection does not persist (the same persistence boundary as ui-theme).
