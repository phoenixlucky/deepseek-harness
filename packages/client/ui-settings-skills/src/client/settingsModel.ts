/** Settings model for the official skill catalog and fixed-source Figma updates. */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormShell,
  type SettingsFieldSpec,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchSkillUpdate } from './updates.ts'

/** One Settings row, drawn from the provider's restored catalog. */
export interface OfficialSkillRow {
  /** Stable bundled skill identifier. */
  readonly name: string
  /** Upstream description, also used by catalog search. */
  readonly description: string
  /** Origin label shown in Settings. */
  readonly source: 'WJ Forge' | 'Figma'
  /** Whether the package has a reviewed update source for this skill. */
  readonly updateable?: true
}

/** The exact Settings catalog; Chrome MCP Bridge is intentionally absent. */
export const OFFICIAL_SKILLS: readonly OfficialSkillRow[] = Object.freeze([
  { name: 'bug-hunt', description: 'Reproduce a defect, find its cause, and make a focused repair.', source: 'WJ Forge' },
  { name: 'code-review', description: 'Review changes for defects, regressions, and missing verification.', source: 'WJ Forge' },
  { name: 'figma-design-skill', description: '给 AI 用的软件界面设计规范 skill，蓝本是 Claude 官方 UI kit——取出 Claude 的 UI 细节（变量 token、组件几何、动效数值、硬规则），并照着它直接改或做软件页面：产出可落地的代码（HTML/CSS/组件）或逐层改稿方案。当用户要求"按 Claude 的界面风格做/改页面""提取 Claude UI 的细节/token/组件数值"时使用。', source: 'Figma', updateable: true },
  { name: 'github', description: 'Organize repository collaboration around issues, pull requests, checks, and CI evidence.', source: 'WJ Forge' },
  { name: 'moon-lovers', description: 'Use gentle, restrained prose with room for silence when the task calls for it.', source: 'WJ Forge' },
  { name: 'officecli', description: 'Guide structured document review and targeted edits when a compatible host adapter is available.', source: 'WJ Forge' },
  { name: 'ponytail', description: 'Prefer the smallest clear implementation that fully solves the task.', source: 'WJ Forge' },
  { name: 'release-notes', description: 'Write user-facing release notes from verified changes.', source: 'WJ Forge' },
  { name: 'superpowers', description: 'Clarify the request, plan the work, and verify the finished change.', source: 'WJ Forge' },
  { name: 'taste-skill', description: 'Give interfaces a considered visual identity instead of a generic template feel.', source: 'WJ Forge' },
  { name: 'ui-ux-pro-max', description: 'Apply usability, responsive design, accessibility, and visual-system checks.', source: 'WJ Forge' },
  { name: 'vision-liao-memory', description: 'Recall relevant workspace memory during planning and save verified project facts after successful completion.', source: 'WJ Forge' },
  { name: 'weiliaozi-skill', description: 'Structure strategic analysis around essence, conditions, tradeoffs, sequence, and counterparties.', source: 'WJ Forge' },
  { name: 'zerotoken-skill', description: 'Control context growth through concise notes, deduplication, and progressive reading.', source: 'WJ Forge' },
])

/** Persisted provider settings owned by the official skill provider. */
export interface OfficialSkillsConfig {
  /** Skill names hidden from model and user catalogs. */
  readonly disabledSkills?: readonly string[]
  /** Full validated upstream documents installed by the user. */
  readonly updatedSkills?: Readonly<Record<string, string>>
}

/** Current update action state for the Figma row. */
export type SkillUpdateStatus = 'idle' | 'checking' | 'available' | 'installing' | 'current' | 'failed'

/** Data rendered by the Settings tab. */
export interface OfficialSkillsState extends SettingsFormShell {
  /** Skill names disabled by the provider, including any existing unknown names preserved from settings. */
  readonly disabledSkills: readonly string[]
  /** Figma source check or installation state. */
  readonly updateStatus: SkillUpdateStatus
}

/** Data and actions supplied to the Settings tab. */
export interface OfficialSkillsFace extends Pick<SettingsFormActions, 'save' | 'discard'> {
  /** Snapshot hook bound by the renderer as `useSkillsSettings`. */
  hooks: { skillsSettings: SnapshotStore<OfficialSkillsState> }
  /** Stage enablement for one reviewed official skill. */
  toggle: (name: string, enabled: boolean) => void
  /** Download the current Figma document from its fixed reviewed source. */
  checkUpdate: () => void
  /** Save the last validated Figma document as the provider's update. */
  installUpdate: () => void
}

const SKILL_NAMES = new Set(OFFICIAL_SKILLS.map(skill => skill.name))

const disabledSkillsSpec: SettingsFieldSpec = {
  field: 'disabledSkills',
  format: value => JSON.stringify(Array.isArray(value) ? value : []),
  parse: (text) => {
    try {
      const value: unknown = JSON.parse(text)
      if (!Array.isArray(value) || value.some(name => typeof name !== 'string')) return undefined
      return { kind: 'set', value }
    } catch {
      return undefined
    }
  },
}

/** Own staged enablement, Figma update checks, and the Settings tab snapshot. */
export class OfficialSkillsSettingsController {
  private readonly form: SettingsFormModel<OfficialSkillsConfig>
  private readonly store: SnapshotStore<OfficialSkillsState>
  private updateStatus: SkillUpdateStatus = 'idle'
  private pendingUpdate: string | undefined
  private updateController: AbortController | undefined
  private updateSequence = 0
  private disposed = false

  /**
   * @param scope - the provider configuration form shared by ui-settings.
   * @param fetcher - optional fetch implementation for the fixed-source request.
   */
  constructor(
    private readonly scope: SettingsFormScope<OfficialSkillsConfig>,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.form = new SettingsFormModel(scope, [disabledSkillsSpec])
    this.store = this.form.bind(() => this.project())
  }

  /** @returns the current Settings snapshot. */
  state(): OfficialSkillsState {
    return this.store.getSnapshot()
  }

  /** @returns the values and callbacks bound to the Settings tab. */
  inject(): OfficialSkillsFace {
    return {
      hooks: { skillsSettings: this.store },
      toggle: (name, enabled) => { this.toggle(name, enabled) },
      checkUpdate: () => { void this.checkUpdate() },
      installUpdate: () => { void this.installUpdate() },
      save: () => { void this.form.actions().save() },
      discard: () => { this.form.actions().discard() },
    }
  }

  /** Release form subscriptions and cancel an outstanding source check. */
  dispose(): void {
    this.disposed = true
    this.updateSequence += 1
    this.updateController?.abort(new Error('official skill settings disposed'))
    this.form.dispose()
  }

  private project(): OfficialSkillsState {
    const disabled = this.form.field('disabledSkills').text
    let disabledSkills: string[] = []
    try {
      const parsed: unknown = JSON.parse(disabled)
      if (Array.isArray(parsed) && parsed.every(name => typeof name === 'string')) disabledSkills = parsed
    } catch {
      disabledSkills = [...(this.scope.getSnapshot().value?.disabledSkills ?? [])]
    }
    return { ...this.form.shell(), disabledSkills, updateStatus: this.updateStatus }
  }

  private toggle(name: string, enabled: boolean): void {
    if (!SKILL_NAMES.has(name)) return
    const next = new Set(this.state().disabledSkills)
    if (enabled) next.delete(name)
    else next.add(name)
    this.form.actions().edit('disabledSkills', JSON.stringify([...next].sort()))
  }

  private async checkUpdate(): Promise<void> {
    if (this.disposed || !this.state().writable || this.state().saving) return
    this.updateController?.abort(new Error('a newer skill update check started'))
    const controller = new AbortController()
    const sequence = ++this.updateSequence
    this.updateController = controller
    this.pendingUpdate = undefined
    this.updateStatus = 'checking'
    this.publish()
    try {
      const update = await fetchSkillUpdate('figma-design-skill', controller.signal, this.fetcher)
      if (this.disposed || sequence !== this.updateSequence) return
      this.pendingUpdate = update.content
      this.updateStatus = this.scope.getSnapshot().value?.updatedSkills?.['figma-design-skill'] === update.content
        ? 'current'
        : 'available'
    } catch {
      if (this.disposed || sequence !== this.updateSequence) return
      this.pendingUpdate = undefined
      this.updateStatus = 'failed'
    } finally {
      if (sequence === this.updateSequence) this.updateController = undefined
      if (!this.disposed && sequence === this.updateSequence) this.publish()
    }
  }

  private async installUpdate(): Promise<void> {
    const content = this.pendingUpdate
    const snapshot = this.scope.getSnapshot()
    if (content === undefined || !snapshot.writable || this.state().dirty || this.state().saving || this.disposed) return
    const updatedSkills = { ...snapshot.value?.updatedSkills, 'figma-design-skill': content }
    this.updateStatus = 'installing'
    this.publish()
    try {
      const installed = await this.scope.mutate([
        { op: 'set', path: ['updatedSkills'], value: updatedSkills },
      ], snapshot.revision)
      if (!this.disposed) this.updateStatus = installed ? 'current' : 'failed'
    } catch {
      if (!this.disposed) this.updateStatus = 'failed'
    } finally {
      if (!this.disposed) this.publish()
    }
  }

  private publish(): void {
    if (!this.disposed) this.store.set(this.project())
  }
}
