import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { stubConfigForm } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('en')
  ctx.provide('locale', locale)
  const scope = stubConfigForm().scope
  ctx.provide('configForms', {
    get: () => scope,
    whileServed: (_names: string[], register: () => () => void) => register(),
  } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry }
}

function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'settings.plugins.tab': { kind: 'list', scope: 'root' } },
  } as never, () => null)
}

describe('ui-settings-skills apply', () => {
  it('keeps the Host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'configForms'])
  })

  it('registers the official skills tab in the Plugins Settings slot', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)

    await ctx.plugin({ inject: [...inject], apply }).await()

    const entry = slots.entries('settings.plugins.tab')[0]!
    expect(entry.options).toMatchObject({ id: 'skills', order: 20 })
    expect(entry.locale).toBe('settings.skills')
  })

  it('removes its tab and controller subscriptions on teardown', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('settings.plugins.tab')).toHaveLength(1)

    await fiber.dispose()

    expect(slots.entries('settings.plugins.tab')).toHaveLength(0)
  })
})
