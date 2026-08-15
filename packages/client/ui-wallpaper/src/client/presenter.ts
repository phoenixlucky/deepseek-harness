/**
 * Global wallpaper DOM applier: projects the resolved WallpaperSnapshot onto
 * the document — the selected wallpaper as the app background on body, or
 * cleared for the default background. Pure DOM writes, no React involvement;
 * the presenter only ever retracts what it wrote itself, so foreign inline
 * styles survive.
 */

import { WALLPAPER_ROUTE, type WallpaperEntry } from '../wallpaper-contract.ts'
import type { WallpaperSnapshot } from './runtime.ts'

/** Background style properties this presenter owns, as kebab-case CSS names
 * (the form `removeProperty` matches). Set with the camelCase setters,
 * retracted by CSS name. */
const OWNED_PROPERTIES = [
  'background-image', 'background-size', 'background-position', 'background-repeat',
] as const

/** URL serving one wallpaper's bytes. */
export function wallpaperUrl(entry: WallpaperEntry): string {
  return `${WALLPAPER_ROUTE}/${encodeURIComponent(entry.name)}`
}

/** Applies wallpaper snapshots to the document; one instance per plugin fiber. */
export class WallpaperPresenter {
  /** True while a wallpaper background is applied. */
  private applied = false

  /**
   * Project a snapshot onto the document: set the body background from the
   * selected wallpaper, or clear the owned properties for the default
   * background. The cover/fixed presentation keeps the image behind the app
   * columns rather than scrolling with the conversation.
   * @param snapshot - resolved wallpaper snapshot from ctx.wallpaper.
   */
  apply(snapshot: WallpaperSnapshot): void {
    const body = document.body
    const entry = snapshot.wallpapers.find(w => w.name === snapshot.selected)
    if (entry === undefined) {
      for (const property of OWNED_PROPERTIES) body.style.removeProperty(property)
      this.applied = false
      return
    }
    const dark = document.body.hasAttribute('data-ds-dark-theme')
    const overlay = dark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(255, 255, 255, 0.38)'
    body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), url("${wallpaperUrl(entry)}")`
    body.style.backgroundSize = 'cover'
    body.style.backgroundPosition = 'center'
    body.style.backgroundRepeat = 'no-repeat'
    this.applied = true
  }

  /** Retract the owned background properties. */
  dispose(): void {
    if (!this.applied) return
    for (const property of OWNED_PROPERTIES) document.body.style.removeProperty(property)
    this.applied = false
  }
}
