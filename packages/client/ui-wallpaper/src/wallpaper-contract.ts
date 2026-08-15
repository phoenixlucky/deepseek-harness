/**
 * Wallpaper wire contract shared by the Host routes and the browser runtime:
 * the route prefix and the JSON list envelope. Dependency-free so the client
 * bundle can import it without dragging node:fs (the directory machinery
 * stays Host-side).
 * @module @deepseek-ai/dsh-client-ui-wallpaper
 */

/** URL prefix owning the wallpaper list and every wallpaper file. */
export const WALLPAPER_ROUTE = '/wallpapers'

/** One wallpaper entry in the JSON list. */
export interface WallpaperEntry {
  /** File name (the `selected` value and the URL path segment). */
  name: string
  /** Absolute URL path serving this wallpaper's bytes. */
  url: string
}

/** Wire envelope of the wallpaper list route. */
export interface WallpaperListResponse {
  wallpapers: WallpaperEntry[]
}
