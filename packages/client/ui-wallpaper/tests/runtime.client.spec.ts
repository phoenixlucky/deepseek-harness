// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { stubSettingsScope, type StubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import type { WallpaperSettings } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import { WallpaperRuntime, type WallpaperSnapshot } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import type { WallpaperListResponse } from '../src/wallpaper-contract.ts'

const LIST: WallpaperListResponse = {
  wallpapers: [
    { name: 'b.webp', url: '/wallpapers/b.webp' },
    { name: 'a.png', url: '/wallpapers/a.png' },
  ],
}

const make = (host = stubSettingsScope<WallpaperSettings>(), fetchList = vi.fn(async () => LIST)): {
  ctx: Context
  runtime: WallpaperRuntime
  events: WallpaperSnapshot[]
  host: StubSettingsScope<WallpaperSettings>
  fetchList: ReturnType<typeof vi.fn>
} => {
  const ctx = new Context()
  const events: WallpaperSnapshot[] = []
  ctx.on('wallpaper/change', (snapshot) => { events.push(snapshot) })
  const runtime = new WallpaperRuntime(ctx, host.scope, fetchList)
  return { ctx, runtime, events, host, fetchList }
}

describe('WallpaperRuntime', () => {
  it('defaults to no selection and no wallpapers until refresh', () => {
    const { runtime } = make()
    const snapshot = runtime.getWallpaper()
    expect(snapshot.selected).toBeNull()
    expect(snapshot.wallpapers).toEqual([])
    expect(snapshot.revision).toBe(0)
  })

  it('refresh loads the list, publishes, and keeps the selection', async () => {
    const { runtime, events } = make()
    await runtime.refresh()
    const snapshot = runtime.getWallpaper()
    expect(snapshot.wallpapers.map(w => w.name)).toEqual(['b.webp', 'a.png'])
    expect(snapshot.selected).toBeNull()
    expect(events).toHaveLength(1)
  })

  it('refresh failure keeps the current list (optional Host route)', async () => {
    const failing = vi.fn(async () => { throw new Error('network down') })
    const { runtime, events } = make(stubSettingsScope<WallpaperSettings>(), failing)
    await runtime.refresh()
    expect(runtime.getWallpaper().wallpapers).toEqual([])
    expect(events).toHaveLength(0)
  })

  it('setWallpaper selects, persists through the scope, and publishes', async () => {
    const { runtime, host, events } = make()
    await runtime.refresh()
    runtime.setWallpaper('a.png')
    expect(runtime.getWallpaper().selected).toBe('a.png')
    expect(host.set).toHaveBeenCalledWith('selected', 'a.png')
    expect(events).toHaveLength(2)
  })

  it('setWallpaper(null) clears to the default background', async () => {
    const { runtime, host } = make()
    await runtime.refresh()
    runtime.setWallpaper('b.webp')
    runtime.setWallpaper(null)
    expect(runtime.getWallpaper().selected).toBeNull()
    expect(host.set).toHaveBeenCalledWith('selected', null)
  })

  it('rejects an unknown wallpaper name', async () => {
    const { runtime } = make()
    await runtime.refresh()
    expect(() => { runtime.setWallpaper('missing.jpg') }).toThrow(/not in the wallpaper directory/)
  })

  it('adopts a Host-published selection and republishes', async () => {
    const { runtime, host, events } = make()
    await runtime.refresh()
    host.publish({ value: { selected: 'b.webp' }, status: 'ready' })
    expect(runtime.getWallpaper().selected).toBe('b.webp')
    expect(events.at(-1)?.selected).toBe('b.webp')
  })
})
