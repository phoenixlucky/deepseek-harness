/**
 * Browser wallpaper runtime: owns the wallpaper list and the selected
 * wallpaper, persisted through the settings scope, and publishes immutable
 * snapshots on `wallpaper/change`. It never touches the DOM — the wallpaper
 * presenter (this package's client apply) consumes the snapshot. The list
 * loads from the Host `/wallpapers` route on activation and on every
 * `connection/reset` (a wallpaper dropped into the directory mid-session
 * becomes selectable after a reconnect).
 * @module @deepseek-ai/dsh-client-ui-wallpaper/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the connection/reset event declaration into this program.
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import { WALLPAPER_ROUTE, type WallpaperEntry, type WallpaperListResponse } from '../wallpaper-contract.ts'
import { WALLPAPER_SELECTED_FIELD, type WallpaperSettings } from '../wallpaper-settings.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    wallpaper: WallpaperRuntime
  }
  interface Events {
    /**
     * Wallpaper state changed (list refreshed or selection switched).
     * @param snapshot - Current immutable wallpaper snapshot.
     * @mode emit
     */
    'wallpaper/change'(snapshot: WallpaperSnapshot): void
  }
}

/** Immutable wallpaper state published on every change. */
export interface WallpaperSnapshot {
  /** Selected wallpaper file name, or null for the default background. */
  selected: string | null
  /** Wallpapers from the Host directory, sorted by name. */
  wallpapers: readonly WallpaperEntry[]
  /** Monotonic change counter. */
  revision: number
}

/** Default wallpaper list when the route is unreachable (broken composition). */
const EMPTY_LIST: readonly WallpaperEntry[] = Object.freeze([])

/**
 * Wallpaper registry and selection owner. Selection writes go through the
 * settings scope; continuous sync only through the `wallpaper/change` event.
 * @param ctx - owning context (change events are emitted on it).
 * @param host - durable selection scope owned by the same plugin.
 * @param fetchList - list loader; defaults to the Host `/wallpapers` route.
 */
export class WallpaperRuntime {
  private readonly ctx: Context
  private readonly host: SettingsScope<WallpaperSettings>
  private readonly fetchList: () => Promise<WallpaperListResponse>
  private wallpapers: readonly WallpaperEntry[] = EMPTY_LIST
  private selected: string | null = null
  private revision = 0
  private snapshot: WallpaperSnapshot

  /**
   * @param ctx - owning context (change events are emitted on it).
   * @param host - durable selection scope owned by the same plugin.
   * @param fetchList - list loader (default: Host `/wallpapers` route).
   */
  constructor(
    ctx: Context,
    host: SettingsScope<WallpaperSettings>,
    fetchList: () => Promise<WallpaperListResponse> = () =>
      fetch(WALLPAPER_ROUTE).then(response => response.json() as Promise<WallpaperListResponse>),
  ) {
    this.ctx = ctx
    this.host = host
    this.fetchList = fetchList
    this.snapshot = this.buildSnapshot()
    ctx.effect(() => host.subscribe(() => { this.adopt() }), 'ui-wallpaper: settings scope adoption')
    this.adopt()
  }

  /**
   * Read the current immutable wallpaper snapshot.
   * @returns the current snapshot (stable reference until the next change).
   */
  getWallpaper(): WallpaperSnapshot {
    return this.snapshot
  }

  /**
   * Subscribe to wallpaper state changes. The callback fires immediately
   * with the current snapshot, then on every subsequent change — the same
   * contract as the `wallpaper/change` event, without relying on event
   * listener registration order at plugin activation (a publish that lands
   * before this subscriber exists is not missed, because the immediate
   * call replays the latest state).
   * @param listener - receives the current snapshot on subscribe and change.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: (snapshot: WallpaperSnapshot) => void): () => void {
    listener(this.snapshot)
    return this.ctx.on('wallpaper/change', listener)
  }

  /**
   * Refresh the wallpaper list from the Host directory. Emits
   * `wallpaper/change` when the list differs; a failed load keeps the current
   * list and revision (the route is optional Host infrastructure).
   */
  async refresh(): Promise<void> {
    try {
      const { wallpapers } = await this.fetchList()
      this.wallpapers = Object.freeze(wallpapers)
      this.publish()
    } catch {
      // The Host route is optional (a remote browser without the wallpaper
      // plugin); keep the current list.
    }
  }

  /**
   * Select a wallpaper by file name, or clear to the default background.
   * Persists through the settings scope and emits `wallpaper/change`.
   * @param name - an entry's file name, or null to clear.
   */
  setWallpaper(name: string | null): void {
    if (name !== null && !this.wallpapers.some(entry => entry.name === name)) {
      throw new Error(`wallpaper "${name}" is not in the wallpaper directory`)
    }
    if (this.selected === name) return
    this.selected = name
    void this.host.set(WALLPAPER_SELECTED_FIELD, name)
    this.publish()
  }

  /** Adopt the scope's accepted durable selection without writing it back. */
  private adopt(): void {
    const section = this.host.getSnapshot().value
    if (section === undefined || this.selected === section.selected) return
    this.selected = section.selected
    this.publish()
  }

  private buildSnapshot(): WallpaperSnapshot {
    return Object.freeze({
      selected: this.selected,
      wallpapers: this.wallpapers,
      revision: this.revision,
    })
  }

  private publish(): void {
    this.revision += 1
    this.snapshot = this.buildSnapshot()
    this.ctx.emit('wallpaper/change', this.snapshot)
  }
}

/** Required services: settings transport, plus connection for list refresh. */
export const inject = ['settingsScope', 'connection']
