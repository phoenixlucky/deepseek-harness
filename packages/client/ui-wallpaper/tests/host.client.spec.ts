import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  apply, Config, WALLPAPER_SETTINGS_NAMESPACE, WALLPAPER_SELECTED_FIELD,
} from '@deepseek-ai/dsh-client-ui-wallpaper'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

let root: string | undefined

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function tempRoot(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'dsh-wallpaper-host-'))
  return root
}

describe('ui-wallpaper host', () => {
  it('registers, validates, and disposes the durable wallpaper namespace with its fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = await ctx.plugin({ apply, Config, inject: ['settings'] }, { root: await tempRoot() })
    const ns = settingsNamespace(WALLPAPER_SETTINGS_NAMESPACE)
    // A null default simplifies away (schemastery drops fields equal to their
    // default), so the fresh namespace is empty until a selection is written.
    expect(ctx.settings.get(ns)).toEqual({})
    await ctx.settings.update(ns, { selected: 'a.webp' })
    expect(ctx.settings.get(ns)).toEqual({ selected: 'a.webp' })
    await expect(ctx.settings.update(ns, { selected: 42 })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })

  it('registers both wallpaper routes and disposes them with the fiber', async () => {
    root = await tempRoot()
    await writeFile(join(root, 'a.webp'), 'WEBP')
    const ctx = new Context()
    const routes: { kind: string; path: string }[] = []
    ctx.provide('webServer', {
      register: (route: { kind: string; path: string }) => {
        routes.push(route)
        return () => undefined
      },
    } as unknown as WebServer)
    const fiber = await ctx.plugin({ apply, Config, inject: ['webServer'] }, { root })
    expect(routes.some(r => r.kind === 'exact' && r.path === '/wallpapers')).toBe(true)
    expect(routes.some(r => r.kind === 'prefix' && r.path === '/wallpapers')).toBe(true)
    await fiber.dispose()
  })

  it('serves an empty list from a missing wallpaper directory', async () => {
    root = join(await tempRoot(), 'missing')
    const ctx = new Context()
    let listBody = ''
    type FakeRes = { writeHead: (code: number, headers?: Record<string, string>) => void; end: (body: string) => void }
    type FakeRoute = { kind: string; path: string; handler: (req: { method?: string }, res: FakeRes) => Promise<void> }
    const registered: FakeRoute[] = []
    ctx.provide('webServer', {
      register: (route: FakeRoute) => {
        registered.push(route)
        return () => undefined
      },
    } as unknown as WebServer)
    const fiber = await ctx.plugin({ apply, Config, inject: ['webServer'] }, { root })
    // apply ensures the directory exists so the user can find where to drop
    // images (the missing-directory no-wallpapers state is created, not fatal).
    expect(await stat(root)).toBeTruthy()
    const listRoute = registered.find(r => r.kind === 'exact' && r.path === '/wallpapers')
    expect(listRoute).toBeDefined()
    await listRoute!.handler({}, { writeHead: () => undefined, end: (body) => { listBody = body } })
    expect(JSON.parse(listBody)).toEqual({ wallpapers: [] })
    await fiber.dispose()
  })

  it('round-trips a persisted selection through the namespace field', async () => {
    root = await tempRoot()
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = await ctx.plugin({ apply, Config, inject: ['settings'] }, { root })
    await ctx.settings.update(settingsNamespace(WALLPAPER_SETTINGS_NAMESPACE), { [WALLPAPER_SELECTED_FIELD]: 'b.png' })
    expect(ctx.settings.get(settingsNamespace(WALLPAPER_SETTINGS_NAMESPACE))).toEqual({ selected: 'b.png' })
    await fiber.dispose()
  })
})
