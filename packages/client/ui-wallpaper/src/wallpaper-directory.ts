/**
 * Host wallpaper-directory machinery: image-file discovery and the two
 * `/wallpapers` web routes (the JSON list and the byte-serving route), plus
 * the traversal-safe path resolution shared by both. Pure functions so the
 * route contract is unit-testable without a live server.
 * @module @deepseek-ai/dsh-client-ui-wallpaper
 */

import type { ServerResponse } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { WALLPAPER_ROUTE, type WallpaperEntry } from './wallpaper-contract.ts'

/** Image extensions accepted from the wallpaper directory. */
export const WALLPAPER_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'] as const

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
}

export type { WallpaperEntry, WallpaperListResponse } from './wallpaper-contract.ts'
export { WALLPAPER_ROUTE } from './wallpaper-contract.ts'

/**
 * Resolve one requested path segment against the wallpaper root, rejecting
 * any traversal outside it.
 * @param root - the configured wallpaper directory (absolute).
 * @param pathname - the decoded URL pathname (may include a leading slash).
 * @returns the resolved file path inside the root.
 * @throws Error when the path escapes the root.
 */
export function resolveWallpaperPath(root: string, pathname: string): string {
  // Normalize the root first: the configured value may mix separators
  // (`process.cwd()` backslashes + '/wallpapers'), and the containment check
  // below compares it with resolved (platform-separator) paths.
  const base = resolve(root)
  const target = resolve(normalize(join(base, pathname.replace(/^\/+/, ''))))
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error(`wallpaper: path "${pathname}" escapes the wallpaper root`)
  }
  return target
}

/**
 * List the wallpaper directory's image files, sorted by name for a stable
 * UI order.
 * @param root - the configured wallpaper directory.
 * @returns one entry per accepted image file; an empty array when the
 * directory is absent or unreadable (a missing directory is a valid
 * no-wallpapers state, not a boot failure).
 */
export async function listWallpapers(root: string): Promise<WallpaperEntry[]> {
  let names: string[]
  try {
    names = await readdir(root)
  } catch {
    return []
  }
  const entries: WallpaperEntry[] = []
  for (const name of names) {
    if (!WALLPAPER_EXTENSIONS.includes(extname(name).toLowerCase() as typeof WALLPAPER_EXTENSIONS[number])) continue
    try {
      if (!(await stat(join(root, name))).isFile()) continue
    } catch {
      continue
    }
    entries.push({ name, url: `${WALLPAPER_ROUTE}/${encodeURIComponent(name)}` })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Serve one wallpaper file's bytes, or 404 when missing.
 * @param pathname - the decoded URL pathname.
 * @param res - the node:http response to write.
 * @param root - the configured wallpaper directory.
 */
export async function serveWallpaperFile(pathname: string, res: ServerResponse, root: string): Promise<void> {
  let target: string
  try {
    target = resolveWallpaperPath(root, pathname)
  } catch {
    res.writeHead(403)
    res.end()
    return
  }
  if (target === root) {
    res.writeHead(404)
    res.end()
    return
  }
  try {
    const body = await readFile(target)
    res.writeHead(200, { 'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}
