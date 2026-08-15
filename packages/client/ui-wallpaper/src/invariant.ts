/**
 * Package-owned invariant companion for the wallpaper plugin.
 * @module @deepseek-ai/dsh-client-ui-wallpaper/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-wallpaper'

/** Cordis companion plugin name. */
export const name = 'client-ui-wallpaper-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this plugin owns no event stream or mutable runtime
 * data; the selected-wallpaper fact lives in the settings document and the
 * browser WallpaperRuntime mirrors it through the settings scope.
 */
const install: InvariantInstaller = () => {}

/**
 * Register the wallpaper invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
