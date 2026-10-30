import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './McpSettingsSection.module.css'

const STORAGE_KEY = 'dsh-mcp-settings.v1'
const NAME = /^[A-Za-z0-9_-]{1,32}$/
const REF = /^[A-Za-z_][A-Za-z0-9_]*$/
const HEADER = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const SECRET_HEADER = /^(authorization|cookie|proxy-authorization|x-api-key)$/i

type Purpose = 'model-tools' | 'project-memory'
type HttpServer = {
  id: string
  serverName: string
  enabled: boolean
  purpose: Purpose
  transport: 'streamable-http'
  url: string
  headers: Record<string, string>
  headerRefs: Record<string, string>
}
type StdioServer = {
  id: string
  serverName: string
  enabled: boolean
  purpose: Purpose
  transport: 'stdio'
  command: string
  args: string[]
  cwd: string
  envRefs: Record<string, string>
}
type McpServer = HttpServer | StdioServer
type Transport = McpServer['transport']
type Form = {
  id: string
  serverName: string
  enabled: boolean
  purpose: Purpose
  transport: Transport
  url: string
  headers: string
  headerRefs: string
  command: string
  args: string
  cwd: string
  envRefs: string
}

type Props = PropsRuntime<'settings.section'> & PropsLocale<'settings.mcp'>

function emptyForm(): Form {
  return { id: '', serverName: '', enabled: true, purpose: 'model-tools', transport: 'streamable-http', url: '', headers: '{}', headerRefs: '{}', command: '', args: '[]', cwd: '', envRefs: '{}' }
}

function format(value: unknown): string { return JSON.stringify(value, null, 2) }
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function makeId(): string { return randomUUID() }
function mapText(text: string, label: string, errors: string[]): Record<string, string> {
  let value: unknown
  try { value = JSON.parse(text) } catch { errors.push(`${label}: JSON 格式错误`); return {} }
  if (!isRecord(value) || Object.values(value).some(item => typeof item !== 'string')) {
    errors.push(`${label}: 必须是字符串键值对象`)
    return {}
  }
  return value as Record<string, string>
}

function validate(server: McpServer, existing: readonly McpServer[], editingId: string): string[] {
  const errors: string[] = []
  if (!NAME.test(server.serverName)) errors.push('服务名称须为 1–32 位英文字母、数字、下划线或连字符')
  if (existing.some(row => row.id !== editingId && row.id === server.id)) errors.push('服务 ID 重复')
  if (existing.some(row => row.id !== editingId && row.serverName === server.serverName)) errors.push('服务名称已存在')
  if (server.transport === 'streamable-http') {
    let url: URL | undefined
    try { url = new URL(server.url) } catch { /* validation below reports invalid URLs */ }
    const host = url?.hostname.toLowerCase() ?? ''
    const loopback = host === 'localhost' || /^127(?:\.\d{1,3}){3}$/.test(host) || host === '[::1]' || host === '::1'
    if (!url || url.username || url.password || !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) {
      errors.push('URL 须为 HTTPS；HTTP 仅允许 localhost 或回环地址，且不能包含用户名或密码')
    }
    const names = new Set<string>()
    for (const [name, value] of Object.entries(server.headers)) {
      const key = name.toLowerCase()
      if (!HEADER.test(name) || /[\r\n]/.test(value) || SECRET_HEADER.test(name)) errors.push(`请求头“${name}”无效或属于敏感信息，请改用凭据引用`)
      if (names.has(key)) errors.push(`请求头“${name}”重复`)
      names.add(key)
    }
    for (const [name, ref] of Object.entries(server.headerRefs)) {
      const key = name.toLowerCase()
      if (!HEADER.test(name) || !REF.test(ref)) errors.push(`请求头“${name}”的凭据引用无效`)
      if (names.has(key)) errors.push(`请求头“${name}”重复`)
      names.add(key)
    }
  } else {
    if (!server.command.trim()) errors.push('启动命令不能为空')
    if (server.args.some(arg => typeof arg !== 'string')) errors.push('命令参数必须是字符串列表')
    for (const [name, ref] of Object.entries(server.envRefs)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !REF.test(ref)) errors.push(`环境变量“${name}”的凭据引用无效`)
    }
  }
  return errors
}

function validateList(servers: McpServer[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const server of servers) {
    if (ids.has(server.id)) errors.push(`服务 ID“${server.id}”重复`)
    if (names.has(server.serverName)) errors.push(`服务名称“${server.serverName}”重复`)
    ids.add(server.id)
    names.add(server.serverName)
    errors.push(...validate(server, [], server.id))
  }
  return errors
}

function normalizeImport(input: unknown): { servers: McpServer[]; errors: string[] } {
  const errors: string[] = []
  const servers: McpServer[] = []
  if (isRecord(input) && Array.isArray(input.servers)) {
    for (const [index, raw] of input.servers.entries()) {
      if (!isRecord(raw)) { errors.push(`servers[${index}] 必须是对象`); continue }
      if (typeof raw.id !== 'string' || raw.id.length === 0) errors.push(`servers[${index}].id 不能为空`)
      if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') errors.push(`servers[${index}].enabled 必须是布尔值`)
      if (raw.purpose !== undefined && raw.purpose !== 'model-tools' && raw.purpose !== 'project-memory') errors.push(`servers[${index}].purpose 无效`)
      const common = {
        id: typeof raw.id === 'string' ? raw.id : makeId(),
        serverName: typeof raw.serverName === 'string' ? raw.serverName : '',
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
        purpose: raw.purpose === 'project-memory' ? 'project-memory' as const : 'model-tools' as const,
      }
      if (raw.transport === 'streamable-http') {
        if (Object.hasOwn(raw, 'command')) errors.push(`servers[${index}] 的 HTTP 配置不能包含 command`)
        if (Object.hasOwn(raw, 'envRefs')) errors.push(`servers[${index}].envRefs 仅适用于 stdio 服务`)
        if (Object.hasOwn(raw, 'env')) errors.push(`servers[${index}].env 含明文环境变量，请改用 envRefs`)
        const headers = stringMap(raw.headers, `servers[${index}].headers`, errors)
        const headerRefs = stringMap(raw.headerRefs, `servers[${index}].headerRefs`, errors)
        servers.push({ ...common, transport: 'streamable-http', url: typeof raw.url === 'string' ? raw.url : '', headers, headerRefs })
      } else if (raw.transport === 'stdio') {
        if (Object.hasOwn(raw, 'url') || Object.hasOwn(raw, 'headers') || Object.hasOwn(raw, 'headerRefs')) errors.push(`servers[${index}] 的 stdio 配置包含 HTTP 专用字段`)
        if (Object.hasOwn(raw, 'env')) errors.push(`servers[${index}].env 含明文环境变量，请改用 envRefs`)
        const args = Array.isArray(raw.args) ? raw.args.filter((item): item is string => typeof item === 'string') : []
        if (raw.args !== undefined && (!Array.isArray(raw.args) || args.length !== raw.args.length)) errors.push(`servers[${index}].args 必须是字符串列表`)
        servers.push({ ...common, transport: 'stdio', command: typeof raw.command === 'string' ? raw.command : '', args, cwd: typeof raw.cwd === 'string' ? raw.cwd : '', envRefs: stringMap(raw.envRefs, `servers[${index}].envRefs`, errors) })
      } else errors.push(`servers[${index}].transport 无效`)
    }
  } else if (isRecord(input) && isRecord(input.mcpServers)) {
    for (const [serverName, raw] of Object.entries(input.mcpServers)) {
      if (!isRecord(raw)) { errors.push(`mcpServers.${serverName} 必须是对象`); continue }
      if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') errors.push(`mcpServers.${serverName}.enabled 必须是布尔值`)
      if (raw.purpose !== undefined && raw.purpose !== 'model-tools' && raw.purpose !== 'project-memory') errors.push(`mcpServers.${serverName}.purpose 无效`)
      const common = { id: makeId(), serverName, enabled: raw.enabled !== false, purpose: raw.purpose === 'project-memory' ? 'project-memory' as const : 'model-tools' as const }
      if (Object.hasOwn(raw, 'env')) errors.push(`mcpServers.${serverName}.env 含明文环境变量，请改用 envRefs`)
      if (raw.transport !== undefined && raw.transport !== 'streamable-http' && raw.transport !== 'stdio') errors.push(`mcpServers.${serverName}.transport 无效`)
      if (typeof raw.url === 'string' && !Object.hasOwn(raw, 'command')) {
        if (raw.transport !== undefined && raw.transport !== 'streamable-http') errors.push(`mcpServers.${serverName}.transport 与 url 不匹配`)
        servers.push({ ...common, transport: 'streamable-http', url: raw.url, headers: stringMap(raw.headers, `${serverName}.headers`, errors), headerRefs: stringMap(raw.headerRefs, `${serverName}.headerRefs`, errors) })
      } else if (typeof raw.command === 'string' && !Object.hasOwn(raw, 'url')) {
        if (raw.transport !== undefined && raw.transport !== 'stdio') errors.push(`mcpServers.${serverName}.transport 与 command 不匹配`)
        if (Object.hasOwn(raw, 'headers') || Object.hasOwn(raw, 'headerRefs')) errors.push(`mcpServers.${serverName} 的请求头仅适用于 HTTP 服务`)
        const args = raw.args === undefined ? [] : Array.isArray(raw.args) ? raw.args.filter((item): item is string => typeof item === 'string') : undefined
        if (Array.isArray(raw.args) && args !== undefined && args.length !== raw.args.length) errors.push(`mcpServers.${serverName}.args 必须是字符串列表`)
        if (args === undefined) errors.push(`mcpServers.${serverName}.args 必须是字符串列表`)
        servers.push({ ...common, transport: 'stdio', command: raw.command, args: args ?? [], cwd: typeof raw.cwd === 'string' ? raw.cwd : '', envRefs: stringMap(raw.envRefs, `${serverName}.envRefs`, errors) })
      } else errors.push(`mcpServers.${serverName} 必须且只能包含 url 或 command`)
    }
  } else errors.push('JSON 顶层须包含 servers 列表或 mcpServers 对象')
  errors.push(...validateList(servers))
  return { servers, errors }
}

function stringMap(value: unknown, label: string, errors: string[]): Record<string, string> {
  if (value === undefined) return {}
  if (!isRecord(value) || Object.values(value).some(item => typeof item !== 'string')) {
    errors.push(`${label} 必须是字符串键值对象`)
    return {}
  }
  return value as Record<string, string>
}

function loadDraft(): McpServer[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.servers)) return []
    const result = normalizeImport({ servers: value.servers })
    return result.errors.length === 0 ? result.servers : []
  } catch { return [] }
}

function download(name: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => { URL.revokeObjectURL(url) }, 1000)
}

function toForm(server: McpServer): Form {
  return {
    id: server.id, serverName: server.serverName, enabled: server.enabled, purpose: server.purpose, transport: server.transport,
    url: server.transport === 'streamable-http' ? server.url : '',
    headers: format(server.transport === 'streamable-http' ? server.headers : {}),
    headerRefs: format(server.transport === 'streamable-http' ? server.headerRefs : {}),
    command: server.transport === 'stdio' ? server.command : '',
    args: format(server.transport === 'stdio' ? server.args : []), cwd: server.transport === 'stdio' ? server.cwd : '',
    envRefs: format(server.transport === 'stdio' ? server.envRefs : {}),
  }
}

function toServer(form: Form, errors: string[]): McpServer {
  if (form.transport === 'streamable-http') {
    const server: HttpServer = { id: form.id || makeId(), serverName: form.serverName.trim(), enabled: form.enabled, purpose: form.purpose, transport: form.transport, url: form.url.trim(), headers: mapText(form.headers, '请求头', errors), headerRefs: mapText(form.headerRefs, '凭据引用', errors) }
    return server
  }
  let args: unknown
  try { args = JSON.parse(form.args) } catch { errors.push('命令参数须为 JSON 字符串数组'); args = [] }
  if (!Array.isArray(args) || args.some(item => typeof item !== 'string')) { errors.push('命令参数须为 JSON 字符串数组'); args = [] }
  const normalizedArgs = Array.isArray(args) && args.every((item): item is string => typeof item === 'string') ? args : []
  const server: StdioServer = { id: form.id || makeId(), serverName: form.serverName.trim(), enabled: form.enabled, purpose: form.purpose, transport: form.transport, command: form.command.trim(), args: normalizedArgs, cwd: form.cwd, envRefs: mapText(form.envRefs, '环境变量凭据引用', errors) }
  return server
}

/** First-class Settings page for local MCP drafts and exports. */
export function McpSettingsSection({ t }: Props) {
  const [servers, setServers] = useState<McpServer[]>(loadDraft)
  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const editing = form.id !== ''

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, servers }))
      setStorageUnavailable(false)
    }
    catch { setStorageUnavailable(true) }
  }, [servers])

  const update = (patch: Partial<Form>) => { setForm(current => ({ ...current, ...patch })) }
  const edit = (server: McpServer) => { setForm(toForm(server)); setErrors([]); setMessage('') }
  const reset = () => { setForm(emptyForm()); setErrors([]) }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: string[] = []
    const server = toServer(form, nextErrors)
    nextErrors.push(...validate(server, servers, form.id))
    if (nextErrors.length) { setErrors(nextErrors); return }
    setServers(current => editing ? current.map(row => row.id === form.id ? server : row) : [...current, server])
    reset()
    setMessage(t('saved'))
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileKey(key => key + 1)
    if (!file) return
    try {
      const result = normalizeImport(JSON.parse(await file.text()))
      if (result.errors.length) { setErrors(result.errors.slice(0, 6)); return }
      if (servers.length && !window.confirm(t('confirmReplace'))) return
      setServers(result.servers)
      reset()
      setErrors([])
      setMessage(t('imported'))
    } catch { setErrors([t('invalidJson')]) }
  }

  const toggle = (server: McpServer) => {
    setServers(rows => rows.map(row => row.id === server.id ? { ...row, enabled: !row.enabled } : row))
    setForm(current => current.id === server.id ? { ...current, enabled: !current.enabled } : current)
  }
  const remove = (server: McpServer) => {
    if (!window.confirm(t('confirmRemove'))) return
    setServers(rows => rows.filter(row => row.id !== server.id))
    if (form.id === server.id) reset()
  }
  const clear = () => {
    if (!window.confirm(t('confirmClear'))) return
    setServers([])
    reset()
    setMessage(t('saved'))
  }

  const setText = (key: 'headers' | 'headerRefs' | 'args' | 'envRefs', value: string) => { update({ [key]: value }) }

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div><h2 className={css.title}>{t('title')}</h2><p className={css.intro}>{t('intro')}</p></div>
        <p className={css.note}>{t('localNote')}</p>
      </header>
      <div className={css.toolbar}>
        <strong>{t('servers')} · {servers.length}</strong>
        <div className={css.actions}>
          <label className={css.button}>
            {t('import')}<input key={fileKey} className={css.file} type="file" accept="application/json,.json" onChange={(event) => { void importFile(event) }} />
          </label>
          <button className={css.button} type="button" onClick={() => { download('mcp-servers.json', { servers }) }}>{t('exportJson')}</button>
          <button className={css.button} type="button" onClick={() => { download('cordis.patch.yml', [{ id: 'mcp-server-manager', name: '@deepseek-ai/dsh-mcp-settings/managed', config: { servers, checkTimeoutMs: 10000 } }]) }}>{t('exportCordis')}</button>
          <button className={css.buttonPrimary} type="button" onClick={() => { reset(); setMessage('') }}>＋ {t('add')}</button>
        </div>
      </div>
      {(storageUnavailable || message) && <p className={css.message} role="status">{storageUnavailable ? t('storageUnavailable') : message}</p>}
      {errors.length > 0 && <div className={css.errors} role="alert">{errors.map((error, index) => <p key={`${index}-${error}`}>{error}</p>)}</div>}
      <div className={css.layout}>
        <section className={css.panel} aria-label={t('servers')}>
          {servers.length === 0 ? <p className={css.empty}>{t('empty')}</p> : servers.map(server => (
            <article key={server.id} className={css.server}>
              <div className={css.serverInfo}>
                <strong>{server.serverName}</strong>
                <span>{server.transport === 'stdio' ? t('stdio') : t('http')} · {server.purpose === 'project-memory' ? t('projectMemory') : t('modelTools')}</span>
              </div>
              <div className={css.serverActions}>
                <label className={css.enabled}><input type="checkbox" checked={server.enabled} onChange={() => { toggle(server) }} />{t('enabled')}</label>
                <button className={css.linkButton} type="button" onClick={() => { edit(server) }}>{t('edit')}</button>
                <button className={css.linkButton} type="button" onClick={() => { remove(server) }}>{t('remove')}</button>
              </div>
            </article>
          ))}
          <div className={css.clearRow}><span>{t('credentialsNote')}</span><button className={css.linkButton} type="button" onClick={clear}>{t('clear')}</button></div>
        </section>

        <section className={css.panel}>
          <form className={css.form} onSubmit={save}>
            <label className={css.field}><span>{t('serverName')}</span><input value={form.serverName} maxLength={32} autoComplete="off" onChange={(event) => { update({ serverName: event.target.value }) }} /></label>
            <div className={css.row}>
              <label className={css.field}><span>{t('transport')}</span><select value={form.transport} onChange={(event) => { update({ transport: event.target.value as Transport }) }}><option value="streamable-http">{t('http')}</option><option value="stdio">{t('stdio')}</option></select></label>
              <label className={css.field}><span>{t('purpose')}</span><select value={form.purpose} onChange={(event) => { update({ purpose: event.target.value as Purpose }) }}><option value="model-tools">{t('modelTools')}</option><option value="project-memory">{t('projectMemory')}</option></select></label>
            </div>
            <label className={css.enabled}><input type="checkbox" checked={form.enabled} onChange={(event) => { update({ enabled: event.target.checked }) }} />{t('enabled')}</label>
            {form.transport === 'streamable-http' ? <>
              <label className={css.field}><span>{t('url')}</span><input type="url" inputMode="url" value={form.url} placeholder={t('urlPlaceholder')} onChange={(event) => { update({ url: event.target.value }) }} /></label>
              <label className={css.field}><span>{t('headers')}</span><textarea rows={3} spellCheck={false} value={form.headers} onChange={(event) => { setText('headers', event.target.value) }} /></label>
              <label className={css.field}><span>{t('headerRefs')}</span><textarea rows={3} spellCheck={false} value={form.headerRefs} onChange={(event) => { setText('headerRefs', event.target.value) }} /></label>
            </> : <>
              <label className={css.field}><span>{t('command')}</span><input value={form.command} autoComplete="off" onChange={(event) => { update({ command: event.target.value }) }} /></label>
              <label className={css.field}><span>{t('args')}</span><textarea rows={3} spellCheck={false} value={form.args} onChange={(event) => { setText('args', event.target.value) }} /></label>
              <label className={css.field}><span>{t('cwd')}</span><input value={form.cwd} onChange={(event) => { update({ cwd: event.target.value }) }} /></label>
              <label className={css.field}><span>{t('envRefs')}</span><textarea rows={3} spellCheck={false} value={form.envRefs} onChange={(event) => { setText('envRefs', event.target.value) }} /></label>
            </>}
            <div className={css.formActions}>
              {editing && <button className={css.button} type="button" onClick={reset}>{t('cancel')}</button>}
              <button className={css.buttonPrimary} type="submit">{t('save')}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
