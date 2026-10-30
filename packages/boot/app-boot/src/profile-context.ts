/** Launcher-owned profile locations and composition inputs. */
import { join } from 'node:path'
import { composeEntries, loadProfileDirectory, PROFILE_PATCH_FILENAME, type Profile } from './profile.ts'
import { loadOptionalPatches } from './index.ts'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'

/** Application-owned package manager executable; environment applies only to package operations. */
export interface ProfilePnpmInvocation {
  readonly command: string
  readonly args: readonly string[]
  readonly env: Readonly<Record<string, string>>
}

/** One parsed configuration patch layer with a path-free display identity. */
export interface ConfigSourceLayer {
  readonly layer: 'bundle' | 'profile' | 'home' | 'invocation'
  readonly identity: string
  readonly patches: readonly PatchOptions[]
}

/** Source metadata for one schema field; configuration values never leave the Host. */
export interface ConfigFieldSources {
  readonly fieldPath: readonly string[]
  readonly effective: Pick<ConfigSourceLayer, 'layer' | 'identity'> | null
  readonly shadowed: readonly Pick<ConfigSourceLayer, 'layer' | 'identity'>[]
}

/**
 * Find patch layers that define a field on a Loader entry, preserving precedence order.
 * @param layers - Configuration layers from lowest to highest precedence.
 * @param entryId - Stable Loader entry identity.
 * @param fieldPath - Schema field path to inspect.
 * @returns The winning and shadowed source identities without configuration values.
 */
export function describeConfigSources(
  layers: readonly ConfigSourceLayer[], entryId: string, fieldPath: readonly string[],
): ConfigFieldSources {
  const sources = layers.flatMap(layer => layer.patches.some(patch => patch.id === entryId
    && hasConfigPath(patch.config, fieldPath)) ? [{ layer: layer.layer, identity: layer.identity }] : [])
  return {
    fieldPath: [...fieldPath],
    effective: sources.at(-1) ?? null,
    shadowed: sources.slice(0, -1),
  }
}

function hasConfigPath(value: unknown, path: readonly string[]): boolean {
  let current = value
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, key)) return false
    current = Reflect.get(current, key)
  }
  return path.length > 0
}

/** Current profile facts; scheduling and mutation belong to their callers. */
export interface ProfileContext {
  readonly name: string
  /** Packaged applications supply their bundled runtime instead of a PATH executable. */
  readonly packageManager?: ProfilePnpmInvocation
  readonly dir: string
  readonly patchPath: string
  readonly installAnchor: string
  readonly cwd: string
  readonly home: string
  /** Bundle packages used to start this process, before any persisted edits. */
  readonly startedBundles: readonly string[]
  /** Parsed command-line overlays, applied above profile and home patches. */
  readonly overlays: readonly PatchOptions[]
  /** Launch-time DSH_TELEMETRY_DISABLED value; any non-empty value opts out. */
  readonly telemetryDisabledEnv: string | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Present only in a profile launched by dsh. */
    profileContext: ProfileContext
  }
}

const TELEMETRY_ROW_ID = 'session-telemetry-otel'

/**
 * Resolve the telemetry opt-out switch into its boot patch. ANY non-empty
 * value (including `'0'`/`'false'`) disables: a privacy switch prefers
 * off-by-mistake over on-by-mistake. A composition without the telemetry row
 * exports nothing, so the switch is then trivially satisfied and no patch is
 * generated — custom profiles need not mount telemetry to run with the
 * switch set.
 * @param disabledEnv - the raw `DSH_TELEMETRY_DISABLED` value (`undefined` when unset).
 * @param hasRow - whether the composition carries the telemetry row.
 * @returns the disable patch, or `undefined` when no hard-disable patch is required.
 */
export function resolveTelemetryPatch(disabledEnv: string | undefined, hasRow: boolean): PatchOptions | undefined {
  if ((disabledEnv ?? '') === '' || !hasRow) return undefined
  return { id: TELEMETRY_ROW_ID, disabled: true }
}

/** Read the selected bundles' patches, which apply before the profile patch file.
 * @param binName Diagnostic prefix for malformed or missing configuration.
 * @param context Data supplied by the profile launcher.
 * @param initialProfile Already loaded startup profile; omitted reads the current files.
 * @returns Bundle patches in application order.
 */
export function readBundlePatches(binName: string, context: ProfileContext, initialProfile?: Profile): PatchOptions[] {
  const profile = initialProfile ?? loadProfileDirectory(binName, context.dir, context.installAnchor, { userLayer: false })
  return profile.layers.flatMap(layer => layer.patches)
}

/** Read current bundle and user layers with the launch-time overlays.
 * @param binName Diagnostic prefix for malformed or missing configuration.
 * @param context Data supplied by the profile launcher.
 * @param initialProfile Already loaded startup profile; omitted reads the current files.
 * @returns Detached ordered patches; this function does not update the Loader.
 */
export function readProfilePatches(binName: string, context: ProfileContext, initialProfile?: Profile): PatchOptions[] {
  const patches = structuredClone([
    ...readBundlePatches(binName, context, initialProfile),
    ...(initialProfile?.patches ?? loadOptionalPatches(binName, context.patchPath) ?? []),
    ...(loadOptionalPatches(binName, join(context.home, PROFILE_PATCH_FILENAME)) ?? []),
    ...context.overlays,
  ])
  const telemetryPatch = resolveTelemetryPatch(context.telemetryDisabledEnv,
    composeEntries([patches]).some(row => row.id === TELEMETRY_ROW_ID))
  if (telemetryPatch !== undefined) patches.push(telemetryPatch)
  return patches
}

/** Read the current profile, home, and invocation layers as path-free source records.
 * @param binName Diagnostic prefix for malformed or missing configuration.
 * @param context Data supplied by the profile launcher.
 * @param initialProfile Already loaded startup profile; omitted reads the current files.
 * @returns Patch layers in precedence order, without copying raw values to callers.
 */
export function readConfigSourceLayers(
  binName: string, context: ProfileContext, initialProfile?: Profile,
): ConfigSourceLayer[] {
  const profile = initialProfile ?? loadProfileDirectory(binName, context.dir, context.installAnchor)
  const homePatches = loadOptionalPatches(binName, join(context.home, PROFILE_PATCH_FILENAME)) ?? []
  return [
    ...profile.layers.map(({ packageName, patches }): ConfigSourceLayer => ({
      layer: 'bundle', identity: packageName, patches,
    })),
    { layer: 'profile', identity: context.name, patches: profile.patches },
    { layer: 'home', identity: 'home', patches: homePatches },
    { layer: 'invocation', identity: 'command-line', patches: context.overlays },
  ]
}
