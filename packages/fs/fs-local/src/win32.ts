/**
 * Windows security-descriptor helpers for atomic local-file replacement. Koffi loads lazily so
 * non-Windows processes never open Win32 libraries; koffi is an optional dependency, so a host
 * that cannot load its native binding degrades callers to the pure-Node boundaries.
 * @module @deepseek-ai/dsh-fs-local/win32
 */

import { toNamespacedPath } from 'node:path'

type GetFileSecurityW = (
  path: string,
  requestedInformation: number,
  descriptor: Buffer | null,
  length: number,
  needed: [number],
) => number
type SetFileSecurityW = (path: string, securityInformation: number, descriptor: Buffer) => number
type ReplaceFileW = (
  replaced: string,
  replacement: string,
  backup: null,
  flags: number,
  exclude: null,
  reserved: null,
) => number
type GetLastError = () => number

interface Win32Bindings {
  getFileSecurityW: GetFileSecurityW
  setFileSecurityW: SetFileSecurityW
  replaceFileW: ReplaceFileW
  getLastError: GetLastError
}

interface Win32ErrnoException extends NodeJS.ErrnoException {
  win32Code: number
}

const DACL_SECURITY_INFORMATION = 0x00000004
const PROTECTED_DACL_SECURITY_INFORMATION = 0x80000000
const ERROR_FILE_NOT_FOUND = 2
const ERROR_PATH_NOT_FOUND = 3
const ERROR_ACCESS_DENIED = 5

// undefined = not yet attempted; null = load failed (koffi unavailable).
let bindings: Win32Bindings | null | undefined

async function win32(): Promise<Win32Bindings | null> {
  if (bindings !== undefined) return bindings
  try {
    const koffi = (await import('koffi')).default
    const advapi32 = koffi.load('advapi32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    bindings = {
      getFileSecurityW: advapi32.func('int __stdcall GetFileSecurityW(const char16_t *path, uint32_t requested, void *descriptor, uint32_t length, _Out_ uint32_t *needed)') as GetFileSecurityW,
      setFileSecurityW: advapi32.func('int __stdcall SetFileSecurityW(const char16_t *path, uint32_t information, const void *descriptor)') as SetFileSecurityW,
      replaceFileW: kernel32.func('int __stdcall ReplaceFileW(const char16_t *replaced, const char16_t *replacement, const char16_t *backup, uint32_t flags, void *exclude, void *reserved)') as ReplaceFileW,
      getLastError: kernel32.func('uint32_t __stdcall GetLastError()') as GetLastError,
    }
  } catch {
    // koffi is optional: an absent or unbuildable native binding (e.g. an
    // --ignore-scripts install on a host without a toolchain) records failure
    // here so callers can degrade instead of aborting the boot. Only the koffi
    // import/load can reach this block.
    bindings = null
  }
  return bindings
}

function nativeUnavailable(caller: string): Error {
  return new Error(`${caller} requires the koffi native binding, which is not available on this host`)
}

/**
 * Whether the Win32 DACL/replacement boundaries can run on this host: true only
 * when koffi (the sole native bridge, an optional dependency) loads. Non-Windows
 * hosts report false without ever importing koffi.
 * @returns true when the native Win32 boundaries are usable.
 */
export async function win32BoundariesAvailable(): Promise<boolean> {
  return (await win32()) !== null
}

function errnoCode(win32Code: number): string {
  switch (win32Code) {
    case ERROR_FILE_NOT_FOUND:
    case ERROR_PATH_NOT_FOUND:
      return 'ENOENT'
    case ERROR_ACCESS_DENIED:
      return 'EACCES'
    default:
      return 'EIO'
  }
}

function win32Error(syscall: string, win32Code: number, path: string): Win32ErrnoException {
  const code = errnoCode(win32Code)
  const error = new Error(`${syscall} ${code} (Win32 ${win32Code}): ${path}`) as Win32ErrnoException
  error.code = code
  error.errno = win32Code
  error.syscall = syscall
  error.path = path
  error.win32Code = win32Code
  return error
}

/**
 * Read a file's self-relative DACL security descriptor.
 * @param path - existing file whose DACL is read.
 * @returns a descriptor buffer accepted by `SetFileSecurityW`.
 */
export async function readFileDaclWin32(path: string): Promise<Buffer> {
  const api = await win32()
  if (api === null) throw nativeUnavailable('readFileDaclWin32')
  const nativePath = toNamespacedPath(path)
  const needed: [number] = [0]
  api.getFileSecurityW(nativePath, DACL_SECURITY_INFORMATION, null, 0, needed)
  if (needed[0] === 0) throw win32Error('GetFileSecurityW', api.getLastError(), path)

  const descriptor = Buffer.alloc(needed[0])
  if (api.getFileSecurityW(nativePath, DACL_SECURITY_INFORMATION, descriptor, descriptor.length, needed) === 0) {
    throw win32Error('GetFileSecurityW', api.getLastError(), path)
  }
  return descriptor.subarray(0, needed[0])
}

/**
 * Copy an existing file's DACL onto another file and protect it from staging-parent inheritance.
 * The destination must still be empty when confidentiality depends on this call.
 * @param source - existing file whose DACL is copied.
 * @param destination - existing file that receives the protected DACL.
 */
export async function copyFileDaclWin32(source: string, destination: string): Promise<void> {
  const descriptor = await readFileDaclWin32(source)
  const api = await win32()
  if (api === null) throw nativeUnavailable('copyFileDaclWin32')
  const information = (DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION) >>> 0
  if (api.setFileSecurityW(toNamespacedPath(destination), information, descriptor) === 0) {
    throw win32Error('SetFileSecurityW', api.getLastError(), destination)
  }
}

/**
 * Replace a Windows file while preserving the replaced file's ACL and other replace metadata.
 * @param replaced - existing destination file.
 * @param replacement - closed staging file on the same volume.
 */
export async function replaceFileWin32(replaced: string, replacement: string): Promise<void> {
  const api = await win32()
  if (api === null) throw nativeUnavailable('replaceFileWin32')
  if (api.replaceFileW(
    toNamespacedPath(replaced),
    toNamespacedPath(replacement),
    null,
    0,
    null,
    null,
  ) === 0) {
    throw win32Error('ReplaceFileW', api.getLastError(), replaced)
  }
}
