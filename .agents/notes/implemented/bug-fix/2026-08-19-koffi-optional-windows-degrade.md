# Agent Note: The koffi native boundary is optional and degrades to pure-Node fallbacks when unbuildable

Status: implemented

English | [中文](2026-08-19-koffi-optional-windows-degrade.zh.md)

## Problem

`koffi` is a hard `dependencies` entry of `dsh-fs-local`, `dsh-session-persistence-jsonl`, and `dsh-host-directory-picker-native`. Its prebuilt native binding does not load on every Windows host when the toolchain that built it is absent — for example an `npm i -g --ignore-scripts` install. The three packages assume the binding loads and crash with a load error, so the community shipped issue #197's workaround: a manual patch of the installed packages that rewrites every koffi call to pure Node. That patch is undocumented, unmaintained, and drifts from the real source.

The Win32 FIDO DACL copy in `fs-local`, the `MoveFileExW` durable publish in `jsonl`, and the native directory dialog share the same root cause: the native boundary is treated as mandatory, so its absence is fatal instead of a supported configuration.

## Decision

`koffi` becomes an `optionalDependencies` entry of all three packages; the harness keeps its native capability where the binding loads and degrades to pure-Node fallbacks where it does not. Instance-injected file operations are unchanged: the degrade applies only where the caller left the operation to the package default.

- `fs-local` caches the binding from `win32()` (undefined = context set in motion, null = failed) and falls back for the default Win32 write/atomic paths: no-op DACL copy, and `replaceFile` becomes `rename(replacement, replaced)` — a plain overwrite. `win32BoundariesAvailable()` exposes whether the default native boundary works.
- `jsonl` falls back in `publishNewFileWin32` and `ensureDurableDirectoryWin32` to `rename` when the binding is null, and `rejectExistingLog` continues to guard single-process log exclusivity; the durable `MoveFileExW` path is lost only where koffi cannot load.
- `directory-picker-native` gains `nativePickerAvailable(platform)`; `directory-picker-auto` routes to the `browse` backend when it reports false, so the auto chooser never mounts an unusable native dialog. On macOS/Linux there is no native picker and `browse` is already the path.

## Alternatives considered

**Remove koffi entirely and keep only the pure-Node paths.** Rejected: it deletes a working capability and a shipped integration with koffi that the optional-dependency approach keeps intact; it also strands `dsh-sandbox-windows-acl`, which keeps koffi as a hard dependency.

**Keep koffi mandatory and require every host to build it.** Rejected: it leaves the reported defect unfixed and forces the unmaintained community patch on affected users.

## Consequences

- On hosts where the binding loads, behavior is unchanged. On hosts where it does not, all three packages load and run.
- The fallbacks give up Windows-only guarantees: DACL replication, atomic-overwrite semantics (a plain overwrite replaces an existing target, losing the concurrent no-REPLACE protection at the OS level while the single-process `rejectExistingLog` guard holds), and `MoveFileExW`'s write-through durability for log publish and directory creation.
- `dsh-sandbox-windows-acl` remains a hard koffi consumer; its users still need a buildable binding, which the optional dependency does not soften.
