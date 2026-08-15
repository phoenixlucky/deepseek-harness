import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ServerResponse } from 'node:http'
import {
  listWallpapers, resolveWallpaperPath, serveWallpaperFile,
} from '@deepseek-ai/dsh-client-ui-wallpaper'

let root: string | undefined

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function tempRoot(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'dsh-wallpaper-'))
  return root
}

/** A fake response capturing status, headers, and body. */
function fakeResponse(): { res: ServerResponse; status: () => number | undefined; body: () => Buffer; end: Promise<void> } {
  let status: number | undefined
  let body = Buffer.alloc(0)
  let resolveEnd!: () => void
  const end = new Promise<void>((resolve) => { resolveEnd = resolve })
  const res = {
    writeHead: (code: number) => { status = code },
    end: (chunk?: unknown) => {
      if (typeof chunk === 'string') body = Buffer.from(chunk)
      else if (chunk instanceof Buffer) body = chunk
      resolveEnd()
    },
  } as unknown as ServerResponse
  return { res, status: () => status, body: () => body, end }
}

describe('listWallpapers', () => {
  it('lists only supported image extensions, sorted by name', async () => {
    const dir = await tempRoot()
    await writeFile(join(dir, 'b.jpg'), 'b')
    await writeFile(join(dir, 'a.webp'), 'a')
    await writeFile(join(dir, 'note.txt'), 'no')
    await writeFile(join(dir, 'c.PNG'), 'c')
    const entries = await listWallpapers(dir)
    expect(entries.map(e => e.name)).toEqual(['a.webp', 'b.jpg', 'c.PNG'])
    expect(entries[0]!.url).toBe('/wallpapers/a.webp')
  })

  it('ignores directories and unreadable entries', async () => {
    const dir = await tempRoot()
    await mkdir(join(dir, 'sub.webp'))
    const entries = await listWallpapers(dir)
    expect(entries).toEqual([])
  })

  it('returns an empty list for a missing directory (no-wallpapers state)', async () => {
    const dir = join(await tempRoot(), 'missing')
    expect(await listWallpapers(dir)).toEqual([])
  })
})

describe('resolveWallpaperPath', () => {
  it('resolves a plain file name inside the root', async () => {
    const dir = await tempRoot()
    expect(resolveWallpaperPath(dir, '/a.webp')).toBe(join(dir, 'a.webp'))
  })

  it('rejects traversal outside the root', async () => {
    const dir = await tempRoot()
    expect(() => resolveWallpaperPath(dir, '/../secret.png')).toThrow(/escapes/)
  })

  it('normalizes a mixed-separator configured root before containment checks', async () => {
    // The shipped composition supplies `process.cwd() + '/wallpapers'`, which
    // mixes backslash cwd segments with a forward-slash suffix on Windows; the
    // containment check must not reject every file for it.
    const dir = await tempRoot()
    const mixed = dir.replace(/[\\/]/g, match => (match === '\\' ? '/' : '\\'))
    expect(resolveWallpaperPath(mixed, '/a.webp')).toBe(join(dir, 'a.webp'))
  })
})

describe('serveWallpaperFile', () => {
  it('serves a file with its image MIME type', async () => {
    const dir = await tempRoot()
    await writeFile(join(dir, 'a.webp'), 'WEBPBYTES')
    const { res, status, body, end } = fakeResponse()
    await serveWallpaperFile('/a.webp', res, dir)
    await end
    expect(status()).toBe(200)
    expect(body().toString()).toBe('WEBPBYTES')
  })

  it('answers 404 for a missing file', async () => {
    const dir = await tempRoot()
    const { res, status, end } = fakeResponse()
    await serveWallpaperFile('/missing.webp', res, dir)
    await end
    expect(status()).toBe(404)
  })

  it('answers 403 for traversal', async () => {
    const dir = await tempRoot()
    const { res, status, end } = fakeResponse()
    await serveWallpaperFile('/../secret.png', res, dir)
    await end
    expect(status()).toBe(403)
  })
})
