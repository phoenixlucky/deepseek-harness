# Agent Note: Quick-access roots in the workspace-directory browser

Status: implemented

English | [中文](2026-08-13-workspace-directory-quick-access.zh.md)

## Problem

The in-app Select Workspace Directory dialog opens at the host account's home directory and offers two ways onward: the breadcrumb trail (which stays inside the current ancestry) and the path editor (typing a full path). On Windows the ancestry stops at the drive root, so reaching another drive — the common case for a project on `D:\` while the account home sits on `C:\` — requires typing the whole path every time. The [directory-picker capability seam](../architecture/2026-07-28-directory-picker-capability-seam.md) recorded drive enumeration as deferred work with no consumer; the dialog's daily use on multi-drive Windows hosts is that consumer.

## Decision

The browse interaction gains a quick-access surface on both sides of the seam.

**Seam and wire.** `DirectoryPickerBrowseCapability` (Service Definition in `dsh-host-directory-picker`) adds `listRoots(signal?)`, returning `DirectoryRoot[]`; the new `host.listRoots` RPC carries it to the browser under the same `browse`-capability gate and error mapping as `host.listDirectory` (abort → `cancelled`, typed failures → `internal`). Each root is a machine key plus an absolute path — `{ kind, path }` with `kind: 'home' | 'root' | 'drive' | 'desktop' | 'documents' | 'downloads'` — because the client owns display copy: the host never formats user-visible labels.

**Backend.** `dsh-host-directory-picker-browse` enumerates in presentation order: home, then the conventional user folders (Desktop, Documents, Downloads) that actually exist under it, then the platform's volume surface. On Windows that is every present drive letter, probed concurrently over the standard A–Z table with a 400ms bound per letter — a missing letter fails fast with ENOENT, while the bound only cuts genuinely stalled probes (a disconnected mapped network drive whose SMB reconnect would otherwise hang the list for the SMB timeout), and a cut drive is dropped, never an error. Elsewhere the volume surface is the filesystem root `/`. The probe function and the platform/home facts are constructor-injectable so the enumeration is deterministic in tests; the class keeps its stable-capability contract (`listRoots` rides the same capability object). This is the stdlib-only approach the seam's dependency survey already blessed — the rejected `drivelist`-style native addons stay rejected.

**Client.** The dialog (`dsh-client-ui-directory-picker-browse`) fetches roots once per open through the same injected `ctx.workspaces.listRoots` channel as the other browse calls, aborting on close and dropping settlements from a superseded open (the dialog's existing generation guard). A **Locations** menu sits in the breadcrumb bar between the crumb trail and the path-edit zone: one row per root, localized label for the conventional kinds (主目录/Home, 桌面/Desktop, 文档/Documents, 下载/Downloads, 根目录/Root) and the bare drive letter (`D:`) for drives, with a disk glyph. Picking a row navigates exactly like a crumb jump — selection-anchored, two-pane away from the display root — so crossing drives or jumping to a project folder needs no typing. The trigger renders only after the enumeration answered, disables while the owner's adoption is busy or the nested create dialog is open, and a failed enumeration withdraws it entirely (the path editor stays the fallback) instead of surfacing an error the core navigation does not need.

## Alternatives considered

- **Path-editor-only (status quo).** Rejected: it is the exact gap the feature reports — on Windows nothing short of typing `D:\…` reaches another drive, and the affordance is invisible to users who do not know it exists.
- **Client-side drive guessing (try `D:\`, `E:\`, …).** Rejected: a hardcoded letter list is wrong by construction (no `D:`, extra removable drives, UNC shares) and duplicates host-owned platform facts on the wire; enumeration belongs to the backend that already owns `homedir` and platform semantics.
- **A native drive-enumeration dependency (`drivelist`, `windows-drive-letters`).** Rejected for the reasons the seam survey already recorded — health and proportionality — and unnecessary: the A–Z probe over `fs.stat` with a per-letter bound is stdlib-only and never hangs the dialog.
- **Roots as display strings from the host.** Rejected: 桌面/Desktop vs Desktop is client copy; the wire carries machine keys and the client localizes, the same split every other host-flagged presentation in this dialog follows (the `hidden` flag).
- **Fetch roots lazily on first menu open.** Rejected: it adds a loading state to the menu and a second wire lifecycle; the roots ride the dialog's existing open/close lifecycle like the home listing does, and the trigger simply appears once the enumeration lands.
- **A permanently visible "This PC" column or drive row list.** Rejected: the Miller view is a directory browser, not a shell; the menu keeps the quick-access surface one click away without changing the pane model.

## Consequences

- The wire gains `host.listRoots` (request `{}`, response `{ roots }`); the client runtime exposes `workspaces.listRoots`; the connection fixture serves a deterministic root list so keyless assembled tests and the dialog golden exercise the surface.
- The README limitation "no drive-root enumeration" is gone from `dsh-host-directory-picker-browse` and the seam; the deferred item in the seam Agent Note is now shipped and cross-referenced here.
- The dialog's aria golden gains the Locations trigger; the quick-access menu itself is presentation-only (no model-visible input, no session event).
- A drive that stalls its probe is invisible to the menu but still reachable through the path editor; a future backend could surface per-volume labels (volume names, free space) without touching the wire contract's kind keys.
