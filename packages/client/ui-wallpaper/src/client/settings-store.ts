/**
 * Wallpaper row slot store: a mirror of the wallpaper service snapshot. The
 * plugin's apply-world change listener is the only writer; the row component
 * reads via props.useStore.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { WallpaperEntry } from '../wallpaper-contract.ts'

/** Store state mirrored from the wallpaper snapshot. */
export interface WallpaperRowState {
  /** Selected wallpaper file name, or null for the default background. */
  selected: string | null
  /** Wallpapers from the Host directory. */
  wallpapers: readonly WallpaperEntry[]
  /** Service revision; -1 until first sync so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type WallpaperRowActions = {
  sync: (draft: WallpaperRowState, snapshot: { selected: string | null; wallpapers: readonly WallpaperEntry[]; revision: number }) => void
}

/**
 * Declares the Wallpaper row state and write surface.
 * @returns the store handle.
 */
export function createWallpaperRowStore(): EngineStoreHandle<WallpaperRowState, WallpaperRowActions> {
  return defineStore({
    init: (): WallpaperRowState => ({ selected: null, wallpapers: [], revision: -1 }),
    actions: {
      sync: (d, { selected, wallpapers, revision }) => {
        if (revision <= d.revision) return
        d.selected = selected
        d.wallpapers = wallpapers
        d.revision = revision
      },
    },
  })
}
