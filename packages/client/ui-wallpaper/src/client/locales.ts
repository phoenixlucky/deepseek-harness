/** `settings.wallpaper` namespace dictionaries (the Wallpaper row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'wallpaper.title': '壁纸',
  'wallpaper.none': '无',
} satisfies Record<string, string>

/** The settings.wallpaper namespace key union. */
export type WallpaperKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'wallpaper.title': 'Wallpaper',
  'wallpaper.none': 'None',
} satisfies Record<WallpaperKey, string>
