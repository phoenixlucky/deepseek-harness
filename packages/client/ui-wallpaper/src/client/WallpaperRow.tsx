/**
 * Wallpaper selection row registered into the General section item slot:
 * title + a "None" option plus one thumbnail per wallpaper from the Host
 * directory. Selection follows the persisted snapshot.
 */
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { WallpaperEntry } from '../wallpaper-contract.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createWallpaperRowStore } from './settings-store.ts'
import { wallpaperUrl } from './presenter.ts'
import css from './WallpaperRow.module.css'

/** Injected business face: the selection write. */
export interface WallpaperRowInjected {
  /** Select a wallpaper by file name, or null for the default background. */
  setWallpaper: (name: string | null) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type WallpaperRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createWallpaperRowStore>>
  & PropsLocale<'settings.wallpaper'> & WallpaperRowInjected

/**
 * Render the Wallpaper row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function WallpaperRow({ t, setWallpaper, useStore }: WallpaperRowComponentProps) {
  const { selected, wallpapers } = useStore(s => s)
  return (
    <div className={css.group}>
      <div className={css.title}>{t('wallpaper.title')}</div>
      <div className={css.thumbRow}>
        <button
          type="button"
          className={clsx(css.noneOption, selected === null && css.selected)}
          aria-pressed={selected === null}
          onClick={() => { setWallpaper(null) }}
        >
          {t('wallpaper.none')}
        </button>
        {wallpapers.map((entry: WallpaperEntry) => (
          <button
            key={entry.name}
            type="button"
            className={clsx(css.thumb, selected === entry.name && css.selected)}
            aria-pressed={selected === entry.name}
            aria-label={entry.name}
            onClick={() => { setWallpaper(entry.name) }}
          >
            <img className={css.image} src={wallpaperUrl(entry)} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}
