# Agent Note: The quick-access listing bounds every drive probe, and its stalled-probe test runs on real timers

Status: implemented

English | [中文](2026-08-18-list-roots-stalled-probe-bound.zh.md)

## Problem

The `directory-picker-browse` quick-access enumeration documented "probing is bounded and failure-tolerant throughout", but the release bound lived inside the default `probeDriveLetter` only. A caller-injected `probeDrive` — never settling, as when a disconnected mapped network drive stalls — hung the whole listing, contradicting the documented contract. The test that pinned this behavior paired `vi.useFakeTimers()` with the three real `stat` calls the enumeration performs on the conventional folders first. The bound timer is created only after those stats settle, and fake-clock advance does not let real filesystem I/O land, so on slower platforms the timer was scheduled after the last `advanceTimersByTimeAsync` had already returned: the test timed out instead of passing.

## Decision

`listRoots` now routes every drive probe — the default stat probe and any caller-injected one — through the shared `driveProbeWithinBound(probe)` helper, which races the probe against the existing 400ms `DRIVE_PROBE_TIMEOUT_MS` release bound and resolves `false` when the probe outlives it. `probeDriveLetter` uses the same helper, so the bound logic has one home. The default path is unchanged in behavior: `probeDriveLetter` was already bounded, and wrapping its result again only adds the same race a second time.

The stalled-probe test no longer uses fake timers. It injects the never-settling probe and asserts the enumeration resolves through the real 400ms bound, with the home pointing at a per-process temp path so the conventional-folder stats deterministically answer `ENOENT`.

## Alternatives considered

**Keep fake timers and advance further or repeatedly.** Rejected: the probe is created only after the three real `stat` calls complete, and `advanceTimersByTimeAsync` does not let real filesystem I/O land during its window, so no advance budget reliably covers the timer once it exists. The test would stay timing-dependent.

**Make the conventional-folder `stat` injectable through `DirectoryRootsInternals`.** Rejected: it grows the public internals surface purely to satisfy a test, while the real-timer test already pins the same contract at near-zero cost.

## Consequences

- A stalled user-supplied drive probe releases the quick-access list at the same bound as the default probe; the enumeration contract now holds for every probe source.
- `probeDriveLetter` keeps its own bound for direct callers, and `listRoots` adds a second identical race on the default path — behaviorally equivalent, one extra timer per letter that is cleared on probe settlement.
- The stalled-probe test runs on real timers and takes about 0.4s; it is deterministic on every platform, including Windows where fake-clock/real-I/O interleaving previously wedged it.