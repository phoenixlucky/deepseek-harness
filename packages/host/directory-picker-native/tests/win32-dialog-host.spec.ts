/**
 * Spawn plumbing for the Win32 dialog worker: the worker env must carry the
 * dialog title, and under Electron's utility process it must pin
 * ELECTRON_RUN_AS_NODE so the Electron binary behaves as plain Node (a raw
 * spawn does not set it the way child_process.fork does — without the pin the
 * worker boots as an Electron app, `process.send` is undefined, and it exits
 * before reporting a result).
 */

type SpawnMock = (
  command: string,
  args: readonly string[],
  options: { env: NodeJS.ProcessEnv; stdio: readonly unknown[]; windowsHide: boolean },
) => unknown

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn<SpawnMock>(() => ({})) }))

vi.mock('node:child_process', () => ({ spawn: spawnMock }))

import { afterEach, describe, expect, it, vi } from 'vitest'
import { spawnDialogWorker } from '../src/win32-dialog-host.ts'

const lastCall = () => spawnMock.mock.calls.at(-1)!

afterEach(() => {
  spawnMock.mockClear()
  delete (process.versions as Record<string, unknown>).electron
  delete process.env.ELECTRON_RUN_AS_NODE
})

describe('spawnDialogWorker', () => {
  it('passes the dialog title through the worker env', () => {
    spawnDialogWorker({ title: 'Pick a folder' })
    const [command, args, options] = lastCall()
    expect(command).toBe(process.execPath)
    expect(args.length).toBeGreaterThan(0)
    expect(options.env.DSH_DIALOG_TITLE).toBe('Pick a folder')
  })

  it('leaves ELECTRON_RUN_AS_NODE unset outside Electron', () => {
    spawnDialogWorker({ title: 'Pick a folder' })
    expect(lastCall()[2].env.ELECTRON_RUN_AS_NODE).toBeUndefined()
  })

  it('pins ELECTRON_RUN_AS_NODE under Electron', () => {
    Object.defineProperty(process.versions, 'electron', { value: '33.0.0', configurable: true })
    spawnDialogWorker({ title: 'Pick a folder' })
    expect(lastCall()[2].env.ELECTRON_RUN_AS_NODE).toBe('1')
  })

  it('keeps an inherited ELECTRON_RUN_AS_NODE pin', () => {
    process.env.ELECTRON_RUN_AS_NODE = '1'
    spawnDialogWorker({ title: 'Pick a folder' })
    expect(lastCall()[2].env.ELECTRON_RUN_AS_NODE).toBe('1')
  })
})
