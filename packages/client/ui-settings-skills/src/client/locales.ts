/** English and Simplified Chinese copy for the official skills Settings tab. */

import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'

/** User-visible keys rendered by the Skills Settings tab. */
export type SkillsSettingsLocaleKey = keyof typeof en

/** English copy. */
export const en = {
  title: 'Skills',
  description: 'Search and enable bundled WJ Forge and Figma skills.',
  sectionTitle: 'Official skills',
  intro: 'Choose which bundled skills are available to the model and direct skill commands.',
  search: 'Search skills',
  none: 'No skills match this search.',
  sourceWjForge: 'WJ Forge',
  sourceFigma: 'Figma',
  enabled: 'Enabled',
  disabled: 'Disabled',
  checkUpdate: 'Check for updates',
  installUpdate: 'Install update',
  updateChecking: 'Checking for a Figma skill update.',
  updateAvailable: 'A Figma skill update is available.',
  updateInstalling: 'Installing the Figma skill update.',
  updateCurrent: 'The installed Figma skill is up to date.',
  updateFailed: 'The Figma skill update failed. The installed content was kept.',
  readOnly: 'This deployment stores settings as read-only.',
  unavailable: 'The official skills settings are not available.',
  save: 'Save changes',
  saving: 'Saving…',
  saveFailed: 'The deployment did not accept these settings. Your changes are still here to edit.',
} satisfies Record<string, string>

/** Simplified Chinese copy, checked against the English keys. */
export const zh = {
  title: '技能',
  description: '搜索并启用内置的 WJ Forge 和 Figma 技能。',
  sectionTitle: '官方技能',
  intro: '选择哪些内置技能可供模型和直接技能命令使用。',
  search: '搜索技能',
  none: '没有符合搜索条件的技能。',
  sourceWjForge: 'WJ Forge',
  sourceFigma: 'Figma',
  enabled: '已启用',
  disabled: '已停用',
  checkUpdate: '检查更新',
  installUpdate: '安装更新',
  updateChecking: '正在检查 Figma 技能更新。',
  updateAvailable: 'Figma 技能有可用更新。',
  updateInstalling: '正在安装 Figma 技能更新。',
  updateCurrent: '当前安装的 Figma 技能已是最新版本。',
  updateFailed: 'Figma 技能更新失败，已保留现有内容。',
  readOnly: '此部署以只读方式保存设置。',
  unavailable: '官方技能设置当前不可用。',
  save: '保存更改',
  saving: '保存中…',
  saveFailed: '部署未接受这些设置；更改仍保留，可继续修改。',
} satisfies Record<SkillsSettingsLocaleKey, string>

/** The shared SettingsForm's copy from this page's dictionary.
 * @param t - the page's locale reader.
 * @returns the localized form labels.
 */
export function formLabels(t: (key: SkillsSettingsLocaleKey) => string): SettingsFormLabels {
  return {
    unavailable: t('unavailable'),
    readOnly: t('readOnly'),
    saveFailed: t('saveFailed'),
    save: t('save'),
    saving: t('saving'),
  }
}
