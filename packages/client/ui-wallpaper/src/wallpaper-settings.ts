/** Durable wallpaper selection stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the wallpaper plugin. */
export const WALLPAPER_SETTINGS_NAMESPACE = 'ui-wallpaper'

/** Field carrying the selected wallpaper file name (null = system background). */
export const WALLPAPER_SELECTED_FIELD = 'selected'

/** Durable wallpaper section shared by the Host schema and the browser scope. */
export interface WallpaperSettings {
  /** Selected wallpaper file name, or null for the default background. */
  selected: string | null
}

/** Durable wallpaper schema; also the wire envelope the browser scope validates against. */
export const WallpaperSettingsSchema = z.object({
  // schemastery treats a non-required string as accepting null input (the
  // top-level isNullable path returns the null unchanged), so `default(null)`
  // expresses `string | null` at runtime while still rejecting non-string,
  // non-null values. The generic cannot encode the union, hence the casts.
  [WALLPAPER_SELECTED_FIELD]: z.string().default(null as unknown as string),
}) as unknown as z<WallpaperSettings>
