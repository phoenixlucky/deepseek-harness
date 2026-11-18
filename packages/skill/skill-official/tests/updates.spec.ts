import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'
import { fetchSkillUpdate, isUpdateableSkill, validateSkillUpdateContent } from '../src/updates.ts'

const SOURCE = 'https://raw.githubusercontent.com/phoenixlucky/figma-design-skill/main/SKILL.md'
const VALID = '---\nname: figma-design-skill\ndescription: Updated design guide\nversion: 2.4.3\ncategory: 前端与设计\nsource-url: https://github.com/phoenixlucky/figma-design-skill\nrunAs: inline\n---\nUpdated instructions.'

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, ...init })
}

describe('fixed-source Figma updates', () => {
  it('downloads only the reviewed Figma source and validates its metadata', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('GET')
      expect(init?.redirect).toBe('error')
      return response(VALID)
    })
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetcher)).resolves.toMatchObject({
      name: 'figma-design-skill', version: '2.4.3', content: VALID,
    })
    expect(fetcher).toHaveBeenCalledWith(SOURCE, expect.any(Object))
    expect(isUpdateableSkill('figma-design-skill')).toBe(true)
    expect(isUpdateableSkill('ponytail')).toBe(false)
    await expect(fetchSkillUpdate('ponytail', undefined, fetcher)).rejects.toThrow(/not updateable/u)
  })

  it('rejects redirects, unsuccessful responses, changed URLs, and oversized bodies', async () => {
    const fetchResult = (result: Response) => vi.fn(async () => result)
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(response('', { status: 302 }))))
      .rejects.toThrow(/redirect/u)
    const followedRedirect = response(VALID)
    Object.defineProperty(followedRedirect, 'redirected', { value: true })
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(followedRedirect)))
      .rejects.toThrow(/redirect/u)
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(response('', { status: 503 }))))
      .rejects.toThrow(/HTTP 503/u)
    const changedUrl = response(VALID)
    Object.defineProperty(changedUrl, 'url', { value: `${SOURCE}?changed=1` })
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(changedUrl))).rejects.toThrow(/URL/u)
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(response('', {
      headers: { 'content-length': String(256 * 1024 + 1) },
    })))).rejects.toThrow(/size/u)
    await expect(fetchSkillUpdate('figma-design-skill', undefined, fetchResult(response('x'.repeat(256 * 1024 + 1)))))
      .rejects.toThrow(/size/u)
  })

  it('rejects changed identity, version, source metadata, and unapproved fields', () => {
    expect(() => validateSkillUpdateContent('figma-design-skill', VALID.replace('name: figma-design-skill', 'name: other')))
      .toThrow(/identity/u)
    expect(() => validateSkillUpdateContent('figma-design-skill', VALID.replace('version: 2.4.3', 'version: next')))
      .toThrow(/version/u)
    expect(() => validateSkillUpdateContent('figma-design-skill', VALID.replace('source-url: https://github.com/phoenixlucky/figma-design-skill', 'source-url: https://example.com')))
      .toThrow(/source metadata/u)
    expect(() => validateSkillUpdateContent('figma-design-skill', VALID.replace('runAs: inline', 'permissions: shell')))
      .toThrow(/frontmatter/u)
    expect(() => validateSkillUpdateContent('figma-design-skill', 'invalid'))
      .toThrow(/frontmatter/u)
  })

  it('accepts only the single-line scalar frontmatter the reviewed source uses', () => {
    const quoted = VALID.replace('description: Updated design guide', 'description: "Updated guide: figma"')
    expect(validateSkillUpdateContent('figma-design-skill', quoted).version).toBe('2.4.3')
    const refused = [
      VALID.replace('description: Updated design guide', 'description: |\n  Updated design guide'),
      VALID.replace('description: Updated design guide', 'description: {text: guide}'),
      VALID.replace('runAs: inline', 'runAs: inline\nrunAs: shell'),
    ]
    for (const content of refused) {
      expect(() => validateSkillUpdateContent('figma-design-skill', content)).toThrow(/invalid frontmatter/u)
    }
  })

  it('passes cancellation through and leaves installed settings unchanged on failure', async () => {
    const controller = new AbortController()
    const installed = { 'figma-design-skill': VALID }
    const before = structuredClone(installed)
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal)
      throw new Error('cancelled by caller')
    })
    await expect(fetchSkillUpdate('figma-design-skill', controller.signal, fetcher)).rejects.toThrow(/cancelled/u)
    await expect(fetchSkillUpdate('figma-design-skill', undefined, vi.fn(async () => response('invalid')))).rejects.toThrow()
    expect(installed).toEqual(before)
  })

  it('loads only validated updates without changing skill enablement', async () => {
    const ctx = new Context()
    const disabled: readonly string[] = []
    const updatedSkills = { 'figma-design-skill': VALID }
    try {
      await ctx.plugin(SkillRegistry)
      apply(ctx, { disabledSkills: { get: () => disabled }, updatedSkills: { get: () => updatedSkills } })
      expect((await ctx.skills.get('figma-design-skill'))?.content).toBe('Updated instructions.')
      expect(disabled).toEqual([])
      updatedSkills['figma-design-skill'] = VALID.replace('version: 2.4.3', 'version: next')
      await expect(ctx.skills.get('figma-design-skill')).rejects.toThrow(/version/u)
      expect(disabled).toEqual([])
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
