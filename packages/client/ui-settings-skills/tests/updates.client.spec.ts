import { describe, expect, it } from 'vitest'
import { validateSkillUpdateContent as validateOnHost } from '@deepseek-ai/dsh-skill-official/src/updates.ts'
import { validateSkillUpdateContent as validateInBrowser } from '../src/client/updates.ts'

const VALID = '---\nname: figma-design-skill\ndescription: Design guide\nversion: 2.4.3\ncategory: 前端与设计\nsource-url: https://github.com/phoenixlucky/figma-design-skill\nrunAs: inline\n---\nInstructions.'

describe('browser and Host Figma update validation', () => {
  it('accepts the same reviewed update document', () => {
    expect(validateInBrowser('figma-design-skill', VALID)).toEqual(validateOnHost('figma-design-skill', VALID))
  })

  it('rejects the same invalid identities, metadata, versions, empty bodies, and oversized documents', () => {
    const invalid = [
      ['other-skill', VALID],
      ['figma-design-skill', VALID.replace('name: figma-design-skill', 'name: changed-skill')],
      ['figma-design-skill', `${VALID.replace('---\nInstructions.', 'extra: true\n---\nInstructions.')}`],
      ['figma-design-skill', VALID.replace('version: 2.4.3', 'version: latest')],
      ['figma-design-skill', VALID.replace('Instructions.', '')],
      ['figma-design-skill', `${VALID}${'x'.repeat(256 * 1024)}`],
    ] as const
    for (const [name, content] of invalid) {
      expect(() => validateInBrowser(name, content)).toThrow()
      expect(() => validateOnHost(name, content)).toThrow()
    }
  })

  it('reads the same frontmatter scalars, and refuses the same YAML forms on both sides', () => {
    const quoted = VALID.replace('description: Design guide', 'description: "Design guide: figma"')
    expect(validateInBrowser('figma-design-skill', quoted)).toEqual(validateOnHost('figma-design-skill', quoted))
    const refused = [
      VALID.replace('description: Design guide', 'description: |\n  Design guide'),
      VALID.replace('description: Design guide', 'description: {text: Design guide}'),
      VALID.replace('description: Design guide', 'description: &guide Design guide'),
      VALID.replace('category: 前端与设计', 'category: 前端与设计\ncategory: 后端'),
      VALID.replace('runAs: inline', 'runAs: inline\n  continued'),
    ]
    for (const content of refused) {
      expect(() => validateInBrowser('figma-design-skill', content)).toThrow(/invalid frontmatter/u)
      expect(() => validateOnHost('figma-design-skill', content)).toThrow(/invalid frontmatter/u)
    }
  })
})
