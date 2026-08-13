/**
 * Preload bridge for the dsh desktop window. The page is the ordinary web
 * surface (remote content), so the bridge stays minimal: one frozen read-only
 * descriptor, no host APIs.
 * @module @deepseek-ai/dsh-desktop/preload
 */

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('dshDesktop', Object.freeze({
  platform: process.platform,
}))
