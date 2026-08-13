import { describe, expect, it } from 'vitest'
import { extractWebUrl } from '../src/web-url.ts'

describe('extractWebUrl', () => {
  it('extracts the canonical URL from the readiness line', () => {
    expect(extractWebUrl('dsh web: http://127.0.0.1:43123')).toBe('http://127.0.0.1:43123')
  })

  it('ignores the LAN suffix', () => {
    expect(extractWebUrl('dsh web: http://127.0.0.1:43123 (LAN: http://192.168.1.5:43123)')).toBe('http://127.0.0.1:43123')
  })

  it('matches across a chunk boundary by re-scanning the tail', () => {
    const first = extractWebUrl('some boot log line\n')
    expect(first).toBeUndefined()
    expect(extractWebUrl('dsh web: http://127.0.0.1:43123\n')).toBe('http://127.0.0.1:43123')
  })

  it('returns undefined for unrelated output', () => {
    expect(extractWebUrl('[info] loading profile web')).toBeUndefined()
    expect(extractWebUrl('')).toBeUndefined()
  })

  it('does not confuse other URL mentions on the same line', () => {
    expect(extractWebUrl('docs at https://example.com; dsh web: http://127.0.0.1:9')).toBe('http://127.0.0.1:9')
  })
})
