// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { WallpaperPresenter, wallpaperUrl } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import type { WallpaperSnapshot } from '@deepseek-ai/dsh-client-ui-wallpaper/client'
import type { WallpaperEntry } from '../src/wallpaper-contract.ts'

const DEFAULT_WALLPAPERS: WallpaperEntry[] = [
  { name: 'a.webp', url: '/wallpapers/a.webp' },
  { name: 'b.png', url: '/wallpapers/b.png' },
]

const snapshot = (selected: string | null, wallpapers: WallpaperEntry[] = DEFAULT_WALLPAPERS): WallpaperSnapshot => ({
  selected,
  wallpapers,
  revision: 1,
})

describe('wallpaperUrl', () => {
  it('builds an encoded route URL', () => {
    expect(wallpaperUrl({ name: 'my wall paper.webp', url: '' })).toBe('/wallpapers/my%20wall%20paper.webp')
  })
})

describe('WallpaperPresenter', () => {
  it('applies the selected wallpaper as a cover background', () => {
    const presenter = new WallpaperPresenter()
    presenter.apply(snapshot('a.webp'))
    expect(document.body.style.backgroundImage).toBe(
      'linear-gradient(rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.38)), url("/wallpapers/a.webp")',
    )
    expect(document.body.style.backgroundSize).toBe('cover')
    // jsdom normalizes the position to its two-value form.
    expect(document.body.style.backgroundPosition).toBe('center center')
    expect(document.body.style.backgroundRepeat).toBe('no-repeat')
    presenter.dispose()
  })

  it('clears owned properties when no wallpaper is selected', () => {
    const presenter = new WallpaperPresenter()
    presenter.apply(snapshot('a.webp'))
    presenter.apply(snapshot(null))
    expect(document.body.style.backgroundImage).toBe('')
    expect(document.body.style.backgroundSize).toBe('')
    expect(document.body.style.backgroundPosition).toBe('')
    expect(document.body.style.backgroundRepeat).toBe('')
  })

  it('ignores a selection missing from the list (stale snapshot)', () => {
    const presenter = new WallpaperPresenter()
    presenter.apply(snapshot('gone.webp'))
    expect(document.body.style.backgroundImage).toBe('')
  })

  it('dispose retracts only what it applied', () => {
    const presenter = new WallpaperPresenter()
    presenter.dispose()
    expect(document.body.style.backgroundImage).toBe('')
  })
})
