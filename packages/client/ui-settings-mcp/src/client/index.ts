/** MCP server configuration page in Harness Settings. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { McpSettingsSection } from './McpSettingsSection.tsx'
import { en, zh } from './locales.ts'
import type { McpSettingsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** MCP settings page copy. */
    'settings.mcp': McpSettingsLocaleKey
  }
}

const NS = 'settings.mcp'
export const inject = ['slots', 'locale']

/** Register MCP servers as a first-class Settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'ui-settings-mcp: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp',
    order: 25,
    label: () => t('nav'),
    locale: NS,
  }, McpSettingsSection))
}
