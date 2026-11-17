// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindSnapshotSelector, stubConfigForm } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsFormScopeSnapshot } from '@deepseek-ai/dsh-client-ui-primitives'
import { SkillsSettingsTab, type SkillsSettingsTabProps } from '../src/client/SkillsSettingsTab.tsx'
import { OfficialSkillsSettingsController, OFFICIAL_SKILLS, type OfficialSkillsConfig } from '../src/client/settingsModel.ts'
import { en, zh } from '../src/client/locales.ts'

afterEach(cleanup)

const FETCHED = '---\nname: figma-design-skill\ndescription: Updated design guide\nversion: 2.4.3\ncategory: 前端与设计\nsource-url: https://github.com/phoenixlucky/figma-design-skill\nrunAs: inline\n---\nUpdated Figma instructions.'

function initialState(overrides: Partial<ReturnType<OfficialSkillsSettingsController['state']>> = {}) {
  return {
    available: true, writable: true, dirty: false, invalid: false, saving: false, failed: false,
    disabledSkills: [], updateStatus: 'idle' as const, ...overrides,
  }
}

function renderTab(state = initialState(), language: 'en' | 'zh' = 'en') {
  const store = createSnapshotStore(state)
  const t = (key: keyof typeof en) => (language === 'en' ? en : zh)[key]
  const actions = { toggle: vi.fn(), checkUpdate: vi.fn(), installUpdate: vi.fn(), save: vi.fn(), discard: vi.fn() }
  const props = { ...actions, t, useSkillsSettings: bindSnapshotSelector(store) } as SkillsSettingsTabProps
  render(<SkillsSettingsTab {...props} />)
  return { actions, store }
}

function readyScope(initial: OfficialSkillsConfig = {}) {
  const host = stubConfigForm<OfficialSkillsConfig>()
  host.publish({
    status: 'ready', writable: true, revision: 1,
    value: { disabledSkills: [], updatedSkills: {}, ...initial },
    base: { disabledSkills: [], updatedSkills: {} }, user: {},
  } satisfies Partial<SettingsFormScopeSnapshot<OfficialSkillsConfig>>)
  return host
}

describe('official Skills Settings tab', () => {
  it('renders exactly the reviewed official catalog without Chrome MCP Bridge', () => {
    renderTab()
    expect(screen.getAllByRole('listitem').map(row => row.querySelector('strong')?.textContent).sort())
      .toEqual([
        'bug-hunt', 'code-review', 'figma-design-skill', 'github', 'moon-lovers', 'officecli',
        'ponytail', 'release-notes', 'superpowers', 'taste-skill', 'ui-ux-pro-max',
        'vision-liao-memory', 'weiliaozi-skill', 'zerotoken-skill',
      ])
    expect(OFFICIAL_SKILLS.map(skill => skill.name).sort()).toEqual([
      'bug-hunt', 'code-review', 'figma-design-skill', 'github', 'moon-lovers', 'officecli',
      'ponytail', 'release-notes', 'superpowers', 'taste-skill', 'ui-ux-pro-max',
      'vision-liao-memory', 'weiliaozi-skill', 'zerotoken-skill',
    ])
    expect(OFFICIAL_SKILLS).toHaveLength(14)
    expect(screen.queryByText(/chrome-mcp-bridge-2026-skill/i)).toBeNull()
    expect(screen.getAllByRole('switch')).toHaveLength(14)
  })

  it('filters by skill name, description, and source', () => {
    renderTab()
    const search = screen.getByRole('searchbox', { name: en.search })
    fireEvent.change(search, { target: { value: 'repository collaboration' } })
    expect(screen.getByRole('listitem').textContent).toContain('github')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(search, { target: { value: 'Figma' } })
    expect(screen.getByRole('listitem').textContent).toContain('figma-design-skill')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(search, { target: { value: 'not-present' } })
    expect(screen.getByText(en.none)).toBeTruthy()
  })

  it('writes only official enablement and saves only the disabledSkills field', async () => {
    const host = readyScope()
    const controller = new OfficialSkillsSettingsController(host.scope)
    try {
      const face = controller.inject()
      face.toggle('bug-hunt', false)
      face.save()
      await waitFor(() => { expect(host.mutate).toHaveBeenCalledTimes(1) })
      expect(host.mutate.mock.calls[0]).toEqual([[{ op: 'set', path: ['disabledSkills'], value: ['bug-hunt'] }], 1])
      expect(controller.state().disabledSkills).toEqual([])
    } finally {
      controller.dispose()
    }
  })

  it('installs a validated Figma update without changing disabled skills or other update entries', async () => {
    const host = readyScope({ disabledSkills: ['figma-design-skill'], updatedSkills: { 'other-update': 'keep' } })
    const fetcher = vi.fn(async () => new Response(FETCHED)) as typeof fetch
    const controller = new OfficialSkillsSettingsController(host.scope, fetcher)
    try {
      const face = controller.inject()
      face.checkUpdate()
      await waitFor(() => { expect(controller.state().updateStatus).toBe('available') })
      face.installUpdate()
      await waitFor(() => { expect(host.mutate).toHaveBeenCalledTimes(1) })
      expect(host.mutate.mock.calls[0]?.[0]).toEqual([{
        op: 'set', path: ['updatedSkills'], value: { 'other-update': 'keep', 'figma-design-skill': FETCHED },
      }])
      expect(host.scope.getSnapshot().value?.disabledSkills).toEqual(['figma-design-skill'])
    } finally {
      controller.dispose()
    }
  })

  it('reports a failed Figma update write and keeps installed settings intact', async () => {
    const host = readyScope({ disabledSkills: ['figma-design-skill'], updatedSkills: { previous: 'keep' } })
    host.mutate.mockResolvedValue(false)
    const controller = new OfficialSkillsSettingsController(host.scope, vi.fn(async () => new Response(FETCHED)) as typeof fetch)
    try {
      const face = controller.inject()
      face.checkUpdate()
      await waitFor(() => { expect(controller.state().updateStatus).toBe('available') })
      face.installUpdate()
      await waitFor(() => { expect(controller.state().updateStatus).toBe('failed') })
      expect(host.scope.getSnapshot().value).toMatchObject({
        disabledSkills: ['figma-design-skill'], updatedSkills: { previous: 'keep' },
      })
      renderTab(initialState({ updateStatus: 'failed' }))
      expect(screen.getByText(en.updateFailed)).toBeTruthy()
    } finally {
      controller.dispose()
    }
  })

  it('keeps enablement unchanged and reports failed saves and updates', async () => {
    const host = readyScope({ disabledSkills: ['figma-design-skill'] })
    host.mutate.mockResolvedValue(false)
    const controller = new OfficialSkillsSettingsController(host.scope, vi.fn(async () => { throw new Error('offline') }) as typeof fetch)
    try {
      const face = controller.inject()
      face.toggle('bug-hunt', false)
      face.save()
      await waitFor(() => { expect(controller.state().failed).toBe(true) })
      expect(host.scope.getSnapshot().value?.disabledSkills).toEqual(['figma-design-skill'])
      face.checkUpdate()
      await waitFor(() => { expect(controller.state().updateStatus).toBe('failed') })
      expect(host.mutate).toHaveBeenCalledTimes(1)
      expect(controller.state().disabledSkills).toEqual(['bug-hunt', 'figma-design-skill'])

      renderTab(initialState({ failed: true, updateStatus: 'failed' }))
      expect(screen.getByText(en.saveFailed)).toBeTruthy()
      expect(screen.getByText(en.updateFailed)).toBeTruthy()
    } finally {
      controller.dispose()
    }
  })

  it('uses locale dictionaries for visible English and Chinese copy', () => {
    renderTab(initialState(), 'zh')
    expect(screen.getByRole('heading', { name: zh.sectionTitle })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: zh.search })).toBeTruthy()
    expect(zh.enabled).not.toBe(en.enabled)
  })
})
