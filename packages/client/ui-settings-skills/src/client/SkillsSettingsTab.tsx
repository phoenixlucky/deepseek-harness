/** Searchable controls for bundled skills and the reviewed Figma update source. */

import { useMemo, useState } from 'react'
import { Button, SettingsForm, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { formLabels, type SkillsSettingsLocaleKey } from './locales.ts'
import { OFFICIAL_SKILLS, type OfficialSkillsFace, type SkillUpdateStatus } from './settingsModel.ts'
import css from './skills-settings.module.css'

/** Props the renderer binds for the Skills Settings tab. */
export type SkillsSettingsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.skills'>
  & InjectFace<OfficialSkillsFace>

const UPDATE_MESSAGES: Record<SkillUpdateStatus, SkillsSettingsLocaleKey | undefined> = {
  idle: undefined,
  checking: 'updateChecking',
  available: 'updateAvailable',
  installing: 'updateInstalling',
  current: 'updateCurrent',
  failed: 'updateFailed',
}

/** Search the reviewed bundled catalog and change its provider-owned settings. */
export function SkillsSettingsTab(props: SkillsSettingsTabProps) {
  const state = props.useSkillsSettings(snapshot => snapshot)
  const [query, setQuery] = useState('')
  const loweredQuery = query.trim().toLocaleLowerCase()
  const filtered = useMemo(() => OFFICIAL_SKILLS.filter((skill) => {
    const source = skill.source === 'Figma' ? props.t('sourceFigma') : props.t('sourceWjForge')
    return `${skill.name} ${skill.description} ${skill.source} ${source}`.toLocaleLowerCase().includes(loweredQuery)
  }), [loweredQuery, props.t])
  const updateMessageKey = UPDATE_MESSAGES[state.updateStatus]
  const updateMessage = updateMessageKey === undefined ? undefined : props.t(updateMessageKey)
  return (
    <SettingsForm labels={formLabels(props.t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <section className={css.root} aria-labelledby="official-skills-heading">
        <header className={css.heading}>
          <h3 id="official-skills-heading">{props.t('sectionTitle')}</h3>
          <p>{props.t('intro')}</p>
        </header>
        <search className={css.search}>
          <label htmlFor="official-skills-search">{props.t('search')}</label>
          <input
            id="official-skills-search"
            name="query"
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.currentTarget.value) }}
          />
        </search>
        {filtered.length === 0 ? <p className={css.empty}>{props.t('none')}</p> : (
          <ul className={css.list}>
            {filtered.map((skill) => {
              const enabled = !state.disabledSkills.includes(skill.name)
              const isUpdateable = skill.updateable === true
              return (
                <li key={skill.name} className={css.row}>
                  <div className={css.info}>
                    <strong>{skill.name}</strong>
                    <p>{skill.description}</p>
                    <small>{skill.source === 'Figma' ? props.t('sourceFigma') : props.t('sourceWjForge')}
                      <span aria-hidden="true"> · </span>{props.t(enabled ? 'enabled' : 'disabled')}
                    </small>
                    {isUpdateable && updateMessage !== undefined ? <p className={css.updateStatus} role="status">{updateMessage}</p> : null}
                  </div>
                  <div className={css.actions}>
                    {isUpdateable ? (
                      <>
                        <Button variant="outline" disabled={!state.writable || state.saving || state.updateStatus === 'checking' || state.updateStatus === 'installing'}
                          onClick={props.checkUpdate}>{props.t('checkUpdate')}</Button>
                        {state.updateStatus === 'available' ? (
                          <Button variant="primary" disabled={!state.writable || state.saving || state.dirty}
                            onClick={props.installUpdate}>{props.t('installUpdate')}</Button>
                        ) : null}
                      </>
                    ) : null}
                    <Switch
                      checked={enabled}
                      label={`${skill.name} ${props.t(enabled ? 'enabled' : 'disabled')}`}
                      disabled={!state.writable || state.saving}
                      onChange={(value) => { props.toggle(skill.name, value) }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </SettingsForm>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Search and enable the bundled official skills. */
    'settings.skills': SkillsSettingsLocaleKey
  }
}
