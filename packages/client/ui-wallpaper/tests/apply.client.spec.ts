// @vitest-environment jsdom
/** ui-wallpaper apply wiring: service provision, settings dictionaries riding
 * the locale service, declaration-aware Wallpaper row registration, and
 * snapshot projection into the row store. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { SettingsScopeBinder } from '@deepseek-ai/dsh-client-ui-settings/client'
import { apply, inject, SETTINGS_NS } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import { WallpaperRuntime } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import type { WallpaperRowInjected } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import { WALLPAPER_SETTINGS_NAMESPACE, WallpaperSettingsSchema } from '../src/wallpaper-settings.ts'
import { WallpaperRow } from '../src/client/WallpaperRow.tsx'
import type { createWallpaperRowStore } from '../src/client/settings-store.ts'

// The service reads its initial locale from the browser; these specs assert
// the shipped Chinese copy, so they state the browser they assume.
usePinnedBrowserLanguages('zh-CN')

const SLOT = 'settings.general.item'

/** The wallpaper list served by the Host route (stubbed in jsdom). */
const WALLPAPER_LIST = { wallpapers: [{ name: 'a.webp', url: '/wallpapers/a.webp' }] }

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  // jsdom has no fetch; the runtime's list refresh rides this stub.
  vi.stubGlobal('fetch', vi.fn(async () => ({
    json: async () => WALLPAPER_LIST,
  })))
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  let selected: string | null = null
  const namespace = () => ({
    ns: WALLPAPER_SETTINGS_NAMESPACE,
    schema: WallpaperSettingsSchema.toJSON(),
    value: { selected },
    applies: 'live' as const,
    secrets: [],
    revision: 0,
  })
  const describe = vi.fn(() => Promise.resolve({
    rpcId: 'wallpaper-describe' as never,
    result: {
      ok: true as const,
      value: { writable: true, hasDocument: true, namespaces: [namespace()] },
    },
  }))
  const mutate = vi.fn((request: { ops: { value: { selected: string | null } }[] }) => {
    selected = request.ops[0]!.value.selected
    return Promise.resolve({
      rpcId: 'wallpaper-mutate' as never,
      result: { ok: true as const, value: namespace() },
    })
  })
  ctx.provide('connection', { api: { settings: { describe, mutate } }, isLoopback: true } as never)
  // The settings transport and the forwarded-event port the plugin injects.
  new TestRemote(ctx)
  await ctx.plugin(SettingsScopeBinder).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, describe, mutate }
}

/** Stand in for the settings shell: declare the General item slot from root. */
function declareItems(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

/** Mirror the framework's inject choreography: bake a real instance from the
 * declared handle and hand its actions to the entry's inject factory. */
function faceOf(slots: SlotRegistry) {
  const entry = slots.entries(SLOT).find(e => e.component === WallpaperRow)!
  const handle = entry.store as ReturnType<typeof createWallpaperRowStore>
  const instance = handle.create()
  const face = (entry.inject as unknown as (a: typeof instance.actions) => WallpaperRowInjected)(instance.actions)
  return { entry, instance, face }
}

describe('ui-wallpaper apply', () => {
  it('declares the slot and locale services', () => {
    expect(inject).toContain('slots')
    expect(inject).toContain('locale')
  })

  it('provides the service, registers localized copy, and registers the row', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.locale.bind(SETTINGS_NS)('wallpaper.title')).toBe('壁纸')
    b.locale.setLocale('en')
    expect(b.locale.bind(SETTINGS_NS)('wallpaper.title')).toBe('Wallpaper')
    const entry = b.slots.entries(SLOT).find(e => e.component === WallpaperRow)!
    expect(entry.options).toMatchObject({ id: 'wallpaper', order: 20 })
    expect(b.ctx.get('wallpaper')).toBeInstanceOf(WallpaperRuntime)
  })

  it('projects service snapshots into the row store and routes face writes back', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const runtime = b.ctx.get('wallpaper') as WallpaperRuntime
    await runtime.refresh()
    runtime.setWallpaper('a.webp')

    const { instance, face } = faceOf(b.slots)
    // The inject-time re-sync sealed the init window: the mirror is current.
    expect(instance.getSnapshot().selected).toBe('a.webp')

    face.setWallpaper(null)
    expect(runtime.getWallpaper().selected).toBeNull()
    expect(instance.getSnapshot().selected).toBeNull()
  })

  it('teardown removes the row and the dictionaries', async () => {
    const b = await bench()
    declareItems(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.slots.entries(SLOT)).toHaveLength(1)
    await fiber.dispose()
    expect(b.slots.entries(SLOT)).toHaveLength(0)
    // Dictionary disposal: translation falls back to the bare key.
    expect(b.locale.bind(SETTINGS_NS)('wallpaper.title')).toBe('wallpaper.title')
  })
})
