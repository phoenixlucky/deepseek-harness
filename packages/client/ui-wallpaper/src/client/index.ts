/**
 * Wallpaper plugin, browser half: provides the wallpaper service, projects
 * the selected wallpaper onto the app background through the presenter, and
 * registers the feature-owned Wallpaper row into the General section's item
 * slot (a feature owns its settings surface). The list refreshes on every
 * `connection/reset` so wallpapers dropped into the Host directory mid-session
 * become selectable.
 * @module @deepseek-ai/dsh-client-ui-wallpaper/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { WallpaperRow, type WallpaperRowInjected } from './WallpaperRow.tsx'
import { createWallpaperRowStore } from './settings-store.ts'
import { en, zh, type WallpaperKey } from './locales.ts'
import { WallpaperPresenter } from './presenter.ts'
import { WallpaperRuntime } from './runtime.ts'
import type { WallpaperSettings } from '../wallpaper-settings.ts'

export type { WallpaperRowComponentProps, WallpaperRowInjected } from './WallpaperRow.tsx'
export type { WallpaperRowState } from './settings-store.ts'
export type { WallpaperKey } from './locales.ts'
export type { WallpaperSnapshot } from './runtime.ts'
export type { WallpaperSettings } from '../wallpaper-settings.ts'
export { WallpaperPresenter, wallpaperUrl } from './presenter.ts'
export { WallpaperRuntime } from './runtime.ts'

/** Namespace owning this feature's settings-row copy. */
export const SETTINGS_NS = 'settings.wallpaper'

/** Durable wallpaper section namespace (mirrors the Host registration). */
const SETTINGS_NAMESPACE = 'ui-wallpaper'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Wallpaper settings row's copy. */
    'settings.wallpaper': WallpaperKey
  }
}

/** Required services: settings transport plus slots/locale for the row. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Client plugin body: provide the wallpaper service, seat the background
 * presenter, and register the Wallpaper row.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const host = ctx.settingsScope.bind<WallpaperSettings>({ namespace: SETTINGS_NAMESPACE })
  const runtime = new WallpaperRuntime(ctx, host)
  ctx.provide('wallpaper', runtime)
  ctx.effect(() => ctx.on('connection/reset', () => { void runtime.refresh() }), 'ui-wallpaper: list refresh on reconnect')
  void runtime.refresh()

  ctx.effect(() => {
    const presenter = new WallpaperPresenter()
    // subscribe() replays the current snapshot immediately, then every
    // change — no event-ordering race at activation (a publish landing
    // before this listener registers is replayed, not missed).
    const off = runtime.subscribe((snapshot) => { presenter.apply(snapshot) })
    return () => {
      off()
      presenter.dispose()
    }
  }, 'ui-wallpaper: background presenter')

  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-wallpaper: settings row dictionaries')

  const store = createWallpaperRowStore()
  let bound: BoundActions<typeof store> | undefined
  const sync = (snapshot: ReturnType<WallpaperRuntime['getWallpaper']>): void => {
    bound?.sync(snapshot)
  }
  ctx.on('wallpaper/change', sync)
  const injected = (actions: BoundActions<typeof store>): WallpaperRowInjected => {
    bound = actions
    // Re-sync from the getter so no event is lost between registration and
    // first render (the store's revision guard drops stale duplicates).
    sync(runtime.getWallpaper())
    return {
      setWallpaper: (name) => { runtime.setWallpaper(name) },
    }
  }
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'wallpaper',
    order: 20,
    store,
    locale: SETTINGS_NS,
    inject: injected,
  }, WallpaperRow))
}
