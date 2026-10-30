import { describe, expect, it } from 'vitest'
import { describeConfigSources } from '../src/profile-context.ts'

describe('describeConfigSources', () => {
  it('reports the winning and shadowed source for a nested field without returning config values', () => {
    const result = describeConfigSources([
      { layer: 'bundle', identity: 'dsh-base', patches: [{ id: 'worker', config: { model: { name: 'base-secret' } } }] },
      { layer: 'profile', identity: 'profile:default', patches: [{ id: 'worker', config: { model: { name: 'profile-secret' } } }] },
      { layer: 'home', identity: 'home-patch', patches: [] },
      { layer: 'invocation', identity: 'invocation', patches: [{ id: 'worker', config: { model: { name: 'cli-secret' } } }] },
    ], 'worker', ['model', 'name'])

    expect(result).toEqual({
      fieldPath: ['model', 'name'],
      effective: { layer: 'invocation', identity: 'invocation' },
      shadowed: [
        { layer: 'bundle', identity: 'dsh-base' },
        { layer: 'profile', identity: 'profile:default' },
      ],
    })
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('reports unknown when no layer provides the requested field', () => {
    expect(describeConfigSources([
      { layer: 'profile', identity: 'profile:default', patches: [{ id: 'worker', config: { other: true } }] },
    ], 'worker', ['model', 'name'])).toEqual({
      fieldPath: ['model', 'name'],
      effective: null,
      shadowed: [],
    })
  })
})
