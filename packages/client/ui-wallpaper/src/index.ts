/**
 * Host registration for the wallpaper capability: a durable selection in the
 * user-settings document and two `/wallpapers` web routes (the JSON list and
 * the byte-serving route) over the configured wallpaper directory. The
 * directory ships no images itself — a deployment drops webp/png/jpg/etc.
 * files into it; a missing or empty directory is a valid no-wallpapers
 * state.
 * @module @deepseek-ai/dsh-client-ui-wallpaper
 */

import type { Context } from '@deepseek-ai/cordis'
import { mkdir } from 'node:fs/promises'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  WALLPAPER_SETTINGS_NAMESPACE, WallpaperSettingsSchema,
} from './wallpaper-settings.ts'
import { listWallpapers, serveWallpaperFile } from './wallpaper-directory.ts'
import { WALLPAPER_ROUTE } from './wallpaper-contract.ts'

export {
  WALLPAPER_EXTENSIONS, listWallpapers, resolveWallpaperPath, serveWallpaperFile,
  type WallpaperEntry,
} from './wallpaper-directory.ts'
export { WALLPAPER_ROUTE, type WallpaperListResponse } from './wallpaper-contract.ts'
export {
  WALLPAPER_SELECTED_FIELD, WALLPAPER_SETTINGS_NAMESPACE, WallpaperSettingsSchema,
  type WallpaperSettings,
} from './wallpaper-settings.ts'

/** Stable Cordis plugin name. */
export const name = 'client-ui-wallpaper'

/** Host plugin config: the wallpaper directory anchor. */
export interface Config {
  /**
   * Absolute path of the wallpaper directory. Has no default on purpose — a
   * `process.cwd()`-relative fallback would scatter user images; the shipped
   * composition supplies `!!js dshHomePath('wallpapers')`.
   */
  root: string
}

export const Config: z<Config> = z.object({
  root: z.string().required(),
})

/**
 * Register the durable wallpaper section and the `/wallpapers` routes when
 * their optional Host services are composed.
 * @param ctx - Host context that may acquire settings and HTTP services.
 * @param config - validated {@link Config}.
 */
export function apply(ctx: Context, config: Config): void {
  const root = config.root
  // Ensure the wallpaper directory exists so the user can find where to drop
  // images (the directory ships no images itself; a missing or empty
  // directory is a valid no-wallpapers state). Created lazily at apply —
  // never at config time — so a bare import of the plugin never touches disk.
  ctx.effect(async () => {
    await mkdir(root, { recursive: true })
    // The created directory outlives the plugin; nothing to retract.
    return () => undefined
  }, 'client-ui-wallpaper: ensure wallpaper directory')
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(WALLPAPER_SETTINGS_NAMESPACE), WallpaperSettingsSchema)
  })
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.register({
        kind: 'exact',
        path: WALLPAPER_ROUTE,
        handler: async (_req, res) => {
          const wallpapers = await listWallpapers(root)
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ wallpapers }))
        },
      }),
      'client-ui-wallpaper: list route',
    )
    httpCtx.effect(
      () => httpCtx.webServer.register({
        kind: 'prefix',
        path: WALLPAPER_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405)
            res.end()
            return
          }
          /* v8 ignore next -- node:http always sets url on server requests */
          const rawPath = new URL(req.url ?? '/', 'http://x').pathname
          // The prefix route matches `/wallpapers/<file>`; strip the route
          // prefix so only the file segment reaches the resolver.
          const filePath = rawPath.startsWith(`${WALLPAPER_ROUTE}/`)
            ? rawPath.slice(WALLPAPER_ROUTE.length)
            : rawPath
          await serveWallpaperFile(decodeURIComponent(filePath), res, root)
        },
      }),
      'client-ui-wallpaper: file route',
    )
  })
}
