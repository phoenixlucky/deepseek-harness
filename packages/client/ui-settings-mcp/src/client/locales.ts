/** Copy for the MCP server settings section. */
export type McpSettingsLocaleKey =
  | 'nav' | 'title' | 'intro' | 'localNote' | 'servers' | 'empty' | 'add' | 'import' | 'exportJson' | 'exportCordis'
  | 'serverName' | 'transport' | 'http' | 'stdio' | 'purpose' | 'modelTools' | 'projectMemory' | 'enabled'
  | 'url' | 'urlPlaceholder' | 'headers' | 'headerRefs' | 'command' | 'args' | 'cwd' | 'envRefs'
  | 'save' | 'cancel' | 'edit' | 'remove' | 'clear' | 'confirmReplace' | 'confirmClear' | 'confirmRemove'
  | 'saved' | 'imported' | 'invalidJson' | 'invalidConfig' | 'storageUnavailable' | 'credentialsNote'

/** English labels for the MCP server Settings section. */
export const en: Record<McpSettingsLocaleKey, string> = {
  nav: 'MCP servers', title: 'MCP servers', intro: 'Manage local MCP server configuration.',
  localNote: 'Drafts stay in this browser. Export the config and apply it to your Harness profile to start using these servers.',
  servers: 'Servers', empty: 'No servers configured yet.', add: 'Add server', import: 'Import JSON', exportJson: 'Export JSON', exportCordis: 'Export Cordis patch',
  serverName: 'Server name', transport: 'Transport', http: 'Streamable HTTP', stdio: 'stdio process', purpose: 'Purpose',
  modelTools: 'Model tools', projectMemory: 'Project memory', enabled: 'Enabled', url: 'Server URL', urlPlaceholder: 'https://example.com/mcp', headers: 'Headers (JSON object)',
  headerRefs: 'Credential references (JSON object)', command: 'Command', args: 'Arguments (JSON string array)', cwd: 'Working directory',
  envRefs: 'Environment credential references (JSON object)', save: 'Save server', cancel: 'Cancel', edit: 'Edit', remove: 'Remove', clear: 'Clear draft',
  confirmReplace: 'Import will replace the current local draft. Continue?', confirmClear: 'Clear all local MCP server drafts?', confirmRemove: 'Remove this MCP server?',
  saved: 'Draft saved in this browser.', imported: 'Configuration imported.', invalidJson: 'Could not read this JSON file.',
  invalidConfig: 'Configuration is invalid. Check required fields and credential references.',
  storageUnavailable: 'Browser storage is unavailable; editing and export still work.',
  credentialsNote: 'Secret values are not stored here. Use credential reference names for sensitive headers and environment variables.',
}

/** Simplified Chinese labels for the MCP server Settings section. */
export const zh: Record<McpSettingsLocaleKey, string> = {
  nav: 'MCP 服务器', title: 'MCP 服务器', intro: '管理本地 MCP 服务器配置。',
  localNote: '草稿保存在此浏览器中。导出配置并应用到 Harness 配置文件后，服务器才会启动。',
  servers: '服务器', empty: '还没有配置服务器。', add: '添加服务器', import: '导入 JSON', exportJson: '导出 JSON', exportCordis: '导出 Cordis 补丁',
  serverName: '服务名称', transport: '连接方式', http: 'Streamable HTTP', stdio: 'stdio 进程', purpose: '用途',
  modelTools: '模型工具', projectMemory: '项目记忆', enabled: '已启用', url: '服务 URL', urlPlaceholder: 'https://example.com/mcp', headers: '请求头（JSON 对象）',
  headerRefs: '凭据引用（JSON 对象）', command: '启动命令', args: '命令参数（JSON 字符串数组）', cwd: '工作目录',
  envRefs: '环境变量凭据引用（JSON 对象）', save: '保存服务', cancel: '取消', edit: '编辑', remove: '删除', clear: '清空草稿',
  confirmReplace: '导入会替换当前浏览器中的全部草稿。是否继续？', confirmClear: '清空所有本地 MCP 服务器草稿？', confirmRemove: '删除此 MCP 服务器？',
  saved: '草稿已保存在此浏览器。', imported: '配置已导入。', invalidJson: '无法读取此 JSON 文件。',
  invalidConfig: '配置无效。请检查必填项和凭据引用。',
  storageUnavailable: '浏览器存储不可用；仍可编辑和导出。',
  credentialsNote: '此处不会保存密钥明文。敏感请求头和环境变量请使用凭据引用名。',
}
