/**
 * dsh-desktop main process: boots the local `dsh --profile web` server in a
 * utility process (reusing the product's own CLI path, build artifacts and
 * profile composition) and renders its UI in a dedicated BrowserWindow. The
 * window owns the server lifecycle: closing the window terminates the server
 * and its child process tree, and a server that dies on its own quits the app.
 * @module @deepseek-ai/dsh-desktop/main
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, shell, utilityProcess, type UtilityProcess } from 'electron'
import { extractWebUrl } from './web-url.ts'

/** Repository root, resolved from this module's built location (apps/desktop/lib). */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
/** The built dsh CLI entry that boots profiles (built by `pnpm run build`). */
const DSH_BIN = resolve(REPO_ROOT, 'apps/cli/lib/bin.js')
/** The built web frontend the CLI serves (built by `pnpm run build`). */
const WEB_DIST = resolve(REPO_ROOT, 'apps/web/dist')
/** Profile to boot; override for advanced use (e.g. DSH_DESKTOP_PROFILE=headless is meaningless for a window). */
const PROFILE = process.env.DSH_DESKTOP_PROFILE ?? 'web'
/** How long to wait for the server's readiness line before failing loud. */
const READY_TIMEOUT_MS = 60_000

let server: UtilityProcess | undefined
let window: BrowserWindow | undefined
let windowCreated = false
let quitRequested = false

/**
 * Terminate the dsh server and its whole process tree. On Windows a plain
 * kill would orphan the server's own children (shell sessions, watchers), so
 * taskkill with /T is used; elsewhere the utility process kill suffices.
 */
function terminateServer(): void {
  if (server === undefined) return
  const pid = server.pid
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    server.kill()
  }
  server = undefined
}

/** Fail loud with a message box and shut down. */
function fatal(message: string, detail: string): void {
  dialog.showErrorBox(message, detail)
  quitRequested = true
  terminateServer()
  app.quit()
}

/** Open the app window on the resolved server URL. */
function openWindow(url: string): void {
  if (windowCreated) return
  windowCreated = true
  window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'DeepSeek Harness',
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolve(dirname(fileURLToPath(import.meta.url)), 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.on('closed', () => {
    quitRequested = true
    window = undefined
    terminateServer()
    app.quit()
  })
  // External links (docs, model pages) belong in the system browser; the app
  // window only ever hosts the local server origin.
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith('http://') || target.startsWith('https://')) void shell.openExternal(target)
    return { action: 'deny' }
  })
  window.webContents.on('did-fail-load', (_event, code, description) => {
    fatal('Failed to load the client UI', `The web server answered but the page failed to load (${code}: ${description}).`)
  })
  void window.loadURL(url)
}

/** Boot the dsh server and react to its readiness line, stderr, and exit. */
function startServer(): void {
  const child = utilityProcess.fork(DSH_BIN, ['--profile', PROFILE, '--port', '0'], {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: 'pipe',
  })
  server = child
  let seen = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    process.stdout.write(text)
    // The readiness line can straddle two chunks; keep the tail and re-match.
    seen = (seen + text).slice(-512)
    const url = extractWebUrl(seen)
    if (url !== undefined) openWindow(url)
  })
  child.stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk))
  child.on('exit', (code) => {
    if (quitRequested || windowCreated === false) return
    fatal('dsh server exited', `The dsh server terminated unexpectedly with exit code ${String(code)}. Check the log above and your DEEPSEEK_API_KEY.`)
  })
}

const readyTimer = setTimeout(() => {
  if (!windowCreated) {
    fatal('dsh server did not start', `No readiness line from the dsh server within ${READY_TIMEOUT_MS / 1000}s. Check the log above and that DEEPSEEK_API_KEY is set in .env or the web onboarding UI.`)
  }
}, READY_TIMEOUT_MS)

void app.whenReady().then(() => {
  const missing: string[] = []
  if (!existsSync(DSH_BIN)) missing.push(DSH_BIN)
  if (!existsSync(resolve(WEB_DIST, 'index.html'))) missing.push(resolve(WEB_DIST, 'index.html'))
  if (missing.length > 0) {
    fatal('Build artifacts missing', `The desktop client needs the built CLI and web UI.\nRun "pnpm run build" (or use start-client.bat) first.\nMissing:\n${missing.join('\n')}`)
    return
  }
  startServer()
})

// Closing the window stops the server; unlike macOS convention there is no
// dock to keep alive, so the process exits on all platforms.
app.on('window-all-closed', () => {
  terminateServer()
  app.quit()
})

app.on('will-quit', () => {
  clearTimeout(readyTimer)
  terminateServer()
})
