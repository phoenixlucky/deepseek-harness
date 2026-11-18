/** Register the official skills Settings section while its provider configuration is served. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { SkillsSettingsTab } from './SkillsSettingsTab.tsx'
import { en, zh, type SkillsSettingsLocaleKey } from './locales.ts'
import { OfficialSkillsSettingsController, type OfficialSkillsConfig } from './settingsModel.ts'

/** Locale namespace this feature owns. */
export const NS = 'settings.skills'

/** Services used by the Settings section. */
export const inject = ['slots', 'locale', 'configForms']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Official skill Settings copy. */
    'settings.skills': SkillsSettingsLocaleKey
  }
}

/** Register the feature-owned section in Settings.
 * @param ctx - browser plugin context with locale, slots, and configuration forms.
 * @returns nothing; all feature resources follow the plugin fiber lifecycle.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'ui-settings-skills: dictionaries')
  const controller = new OfficialSkillsSettingsController(ctx.configForms.get<OfficialSkillsConfig>('official-skills'))
  ctx.effect(() => () => { controller.dispose() }, 'ui-settings-skills: form subscriptions')
  ctx.effect(
    () => ctx.configForms.whileServed(['official-skills'], () => ctx.slots.register({
      name: 'settings.section', id: 'skills', order: 20, label: () => t('title'), locale: NS,
      inject: () => controller.inject(),
    }, SkillsSettingsTab)),
    'ui-settings-skills: section',
  )
}
