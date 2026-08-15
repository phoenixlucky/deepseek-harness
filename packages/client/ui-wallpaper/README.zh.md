# @deepseek-ai/dsh-client-ui-wallpaper

[English](README.md) | 中文

壁纸插件：为 Web 客户端提供应用背景壁纸。Host 半区扫描配置的壁纸目录（webp/png/jpg/jpeg/gif/bmp/svg），通过 `/wallpapers` 路由发布 JSON 列表、通过 `/wallpapers/<file>` 路由按字节服务图片，并把选中项持久化到用户设置文档的 `ui-wallpaper.selected` 字段；浏览器半区提供 `ctx.wallpaper` 服务（壁纸列表 + 选中项），由本包自己的 presenter 把选中的壁纸投影到 `document.body` 背景（cover 铺满、居中、不重复），并在设置 General 区注册一行壁纸选择器（"无" + 每张壁纸的缩略图）。壁纸是纯展示层：不产生会话事件，不影响模型可见输入。

壁纸目录本身不随产品发布图片——部署方把图片放入配置的目录即可；目录缺失或为空是合法的"无壁纸"状态，不是启动失败。列表在浏览器插件激活时加载，并在每次 `connection/reset` 时刷新，因此会话中途放入目录的壁纸在重连后可选。远程浏览器无法访问宿主的设置 API 时，其选择保持进程本地。

## Configuration

Host 半区需要 `root`（壁纸目录的绝对路径）。它刻意没有默认值——`process.cwd()` 相对的回退会把用户图片散落到各处；随附的 web-app 组合提供 `process.cwd() + '/wallpapers'`（即项目根下的 `wallpapers/` 目录，首次激活时自动创建）。

## Routes

- `GET /wallpapers` — JSON 列表 `{ wallpapers: [{ name, url }] }`，仅含受支持的图片扩展名，按文件名排序。
- `GET /wallpapers/<file>` — 按字节服务壁纸文件，带图片 MIME 类型；目录穿越返回 403，缺失文件返回 404，非 GET/HEAD 返回 405。

## Export shape

函数插件（host 半区）：导出 `name` / `inject` / `apply` / `Config`，无 default 导出。浏览器半区导出 `apply` / `inject` 以及 store 工厂类型。

## Model Experience

None, as the wallpaper plugin manages a browser preference and HTTP-served images; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **壁纸目录仅支持扁平文件** — 子目录不会递归扫描；需要子目录组织时需自行扩展 `listWallpapers`。
- **列表在重连时刷新，非实时监听** — 会话中途放入目录的壁纸要等下一次 `connection/reset` 才出现；当前没有文件系统 watcher。
- **远程浏览器选择进程本地** — 非 loopback 浏览器无法访问宿主的设置 API，选中项不会持久化（与 ui-theme 的持久化边界一致）。
