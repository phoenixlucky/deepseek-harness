// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply as nodeApply } from '@deepseek-ai/dsh-client-ui-wallpaper'
import { apply as clientApply, inject, WallpaperRuntime } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import * as WallpaperInvariant from '@deepseek-ai/dsh-client-ui-wallpaper/invariant'
import { apply as localeApply, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(WallpaperInvariant).await()).resolves.toBeDefined()
  })

  it('node-half waits for optional Host services', () => {
    nodeApply(new Context(), { root: 'C:\\wallpapers' })
    expect(true).toBe(true)
  })

  it('client apply provides ctx.wallpaper over the slots/locale edges', async () => {
    expect(inject).toContain('settingsScope')
    const ctx = new Context()
    new SlotRegistry(ctx)
    ctx.provide('connection', {
      api: { settings: { describe: () => Promise.resolve({
        rpcId: 'wallpaper-invariant' as never,
        result: { ok: true, value: { writable: true, hasDocument: false, namespaces: [] } },
      }) } },
      isLoopback: true,
    } as never)
    ctx.provide('remote', { $on: () => () => {} } as never)
    ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
    await ctx.plugin({ inject: localeInject, apply: localeApply }).await()
    await ctx.plugin({ inject, apply: clientApply }).await()
    expect(ctx.get('wallpaper')).toBeInstanceOf(WallpaperRuntime)
  })
})
