# Official Skill Provider Restoration Implementation Plan

English | [中文](2026-11-17-official-skill-restoration.zh.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the official skills provider and its Web Settings controls with thirteen WJ Forge skills and the Figma design skill, excluding Chrome MCP Bridge.

**Architecture:** Add a Cordis provider that registers the reviewed embedded skills through the existing `dsh-skill` registry and a Client plugin that contributes a feature-owned Settings tab. Mount both through the Web app's existing package and preset composition; reuse configuration forms, locale dictionaries, bundled skill ranking, and the existing skill loader.

**Tech Stack:** TypeScript ESM, Cordis, React, YAML frontmatter parsing, Vitest, pnpm workspace packages, keyless recorded-session snapshots.

**Spec:** [Official Skill Provider Restoration](../specs/2026-11-17-official-skill-restoration-design.md)

## Global Constraints

- The provider catalog, package documentation, tests, and Settings search will omit `chrome-mcp-bridge-2026-skill`.
- The Figma skill remains the only skill with a fixed-source update path.
- All visible copy uses the existing English and Chinese locale dictionaries.
- Existing skill subsystem types and invocation rules remain unchanged.

## Review Focus

- A missing or invalid bundled asset fails provider activation with the affected path; test malformed frontmatter and missing assets.
- Disabling or disposing the official provider leaves other providers available; test independent registration and invalidation.
- A redirect, HTTP failure, or oversized Figma response preserves the installed content; test each response class.
- Changed Figma identity or unapproved frontmatter is rejected; test identity and metadata mutations.
- A failed Settings save or update is never shown as successful and does not change enablement; test both failure results.

---

### Task 1: Restore the official provider and skill assets

**Files:**
- Create: `packages/skill/skill-official/package.json`
- Create: `packages/skill/skill-official/tsconfig.json`
- Create: `packages/skill/skill-official/src/index.ts`
- Create: `packages/skill/skill-official/tests/registry.spec.ts`
- Create: `packages/skill/skill-official/assets/wj-forge/{bug-hunt,code-review,github,moon-lovers,officecli,ponytail,release-notes,superpowers,taste-skill,ui-ux-pro-max,vision-liao-memory,weiliaozi-skill,zerotoken-skill}/SKILL.md`
- Create: `packages/skill/skill-official/assets/figma-design-skill/{SKILL.md,LICENSE,references/anthropic-mcp-apps-design.md,references/browser-recipes.md,references/claude-design-system-storybook.md}`
- Create: `packages/skill/skill-official/README.md`, `README.zh.md`, and `README.i18n.yaml`
- Modify: `packages/skill/README.md`, `README.zh.md`, and `README.i18n.yaml`

**Interfaces:**
- Consumes: `ctx.skills.registerProvider()` and the existing `SkillProvider`, `SkillCandidate`, and `SkillSource` types from `@deepseek-ai/dsh-skill`.
- Produces: `@deepseek-ai/dsh-skill-official`, whose `apply(ctx, config)` registers exactly thirteen WJ Forge skills and `figma-design-skill`; `Config.disabledSkills` filters only this provider's candidates.

- [ ] **Step 1: Write failing provider tests**

Add `exposesExactlyTheThirteenWjForgeAndFigmaSkillsWithoutChrome`, `filtersDisabledEntriesAndInvalidatesCatalog`, `disablingAndDisposingOfficialProviderLeavesOtherProvidersAvailable`, `rejectsMissingOrInvalidBundleAssetsWithPath`, and `loadsOnlyValidatedReplacementsWithoutToolGrants`. Assert the exact 14 names, `source: 'bundled'`, provider identity, no model metadata or tool grants, selected-skill loading, and provider disposal. The `disabledSkills` default is empty, matching the historical integration.

- [ ] **Step 2: Run the provider tests and verify they fail**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/registry.spec.ts`

Expected: FAIL because the provider package and assets are absent.

- [ ] **Step 3: Add the provider and reviewed assets**

Restore the historical provider implementation and assets, adapting imports and package metadata to current workspace conventions. Keep the 13 listed WJ Forge assets and the licensed Figma assets; do not create the Chrome MCP Bridge asset or include its name in any catalog.

- [ ] **Step 4: Run provider tests**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/registry.spec.ts`

Expected: PASS with exactly 14 official candidates and no Chrome MCP Bridge candidate.

- [ ] **Step 5: Commit the provider package**

```sh
git add packages/skill/skill-official packages/skill/README.md packages/skill/README.zh.md packages/skill/README.i18n.yaml
git commit -m "feat(skill): restore official skill provider"
```

### Task 2: Validate fixed-source Figma updates

**Files:**
- Create: `packages/skill/skill-official/src/updates.ts`
- Create: `packages/skill/skill-official/tests/updates.spec.ts`
- Modify: `packages/skill/skill-official/src/index.ts`

**Interfaces:**
- Consumes: the fixed Figma source `https://raw.githubusercontent.com/phoenixlucky/figma-design-skill/main/SKILL.md`.
- Produces: `fetchSkillUpdate(name, signal?, fetcher?)` and `validateSkillUpdateContent(name, content)`, which accept only `figma-design-skill` and validate its identity, source metadata, version, and allowed frontmatter.

- [ ] **Step 1: Write failing update tests**

Add `downloadsOnlyTheReviewedFigmaSource`, `rejectsRedirectsOversizeAndChangedMetadata`, and `preservesInstalledContentWhenValidationFails`. Cover unknown skill names, redirects, non-success responses, final URL changes, content above 256 KiB, changed identity, invalid version, unapproved frontmatter, cancellation, and preservation of current content.

- [ ] **Step 2: Run update tests and verify they fail**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/updates.spec.ts`

Expected: FAIL because the fixed-source update helpers are absent.

- [ ] **Step 3: Implement fixed-source validation**

Keep the URL in the package allow-list; reject redirects and changed response URLs, enforce the 256 KiB UTF-8 limit, and validate the approved metadata before returning content. Do not accept a caller-supplied URL or change skill enablement during installation.

- [ ] **Step 4: Run update tests**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/updates.spec.ts`

Expected: PASS; failed validation leaves the existing installed content unchanged.

- [ ] **Step 5: Commit update validation**

```sh
git add packages/skill/skill-official/src/index.ts packages/skill/skill-official/src/updates.ts packages/skill/skill-official/tests/updates.spec.ts
git commit -m "feat(skill): validate fixed-source Figma updates"
```

### Task 3: Add the official skills Settings tab

**Files:**
- Create: `packages/client/ui-settings-skills/package.json`
- Create: `packages/client/ui-settings-skills/tsconfig.json`, `tsconfig.client.json`, and `tsconfig.host.json`
- Create: `packages/client/ui-settings-skills/src/index.ts`
- Create: `packages/client/ui-settings-skills/src/{client/index.ts,client/SkillsSettingsTab.tsx,client/settingsModel.ts,client/locales.ts,client/skills-settings.module.css}`
- Create: `packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`
- Create: `packages/client/ui-settings-skills/README.md`, `README.zh.md`, and `README.i18n.yaml`
- Modify: `packages/client/README.md`, `README.zh.md`, and `README.i18n.yaml`

**Interfaces:**
- Consumes: `ctx.configForms.get('official-skills')`, the `settings.plugins.tab` slot, and typed `settings.skills` locale dictionaries.
- Produces: `@deepseek-ai/dsh-client-ui-settings-skills`, which searches and toggles only official skills and offers update controls only for Figma.

- [ ] **Step 1: Write failing Settings tests**

Add `rendersOnlyTheReviewedSkillCatalog`, `filtersBySkillNameDescriptionAndSource`, `writesOnlyOfficialEnablement`, `preservesEnablementWhenInstallingAnUpdate`, `preservesEnablementAfterFailedSaveOrUpdate`, and `reportsFailedSaveAndUpdate`. Assert Chrome MCP Bridge is absent, English and Chinese strings come from dictionaries, failed writes remain visibly failed, and Figma update installation preserves disabled skills and other updates.

- [ ] **Step 2: Run Settings tests and verify they fail**

Run: `pnpm exec vitest run packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`

Expected: FAIL because the Settings package is absent.

- [ ] **Step 3: Implement the feature-owned Settings tab**

Use the existing Slots, locale, and configuration-form services. Keep the reviewed Settings catalog synchronized with the 14 provider names, omit Chrome MCP Bridge, and keep save and update failures visible without changing unrelated provider settings.

- [ ] **Step 4: Run Settings tests**

Run: `pnpm exec vitest run packages/client/ui-settings-skills/tests/skills-settings.client.spec.tsx`

Expected: PASS for search, enablement, update states, and failure reporting.

- [ ] **Step 5: Commit the Settings package**

```sh
git add packages/client/ui-settings-skills packages/client/README.md packages/client/README.zh.md packages/client/README.i18n.yaml
git commit -m "feat(client): add official skills settings"
```

### Task 4: Wire the Web composition and verify the real entry path

**Files:**
- Modify: `packages/bundle/web-app/package.json`
- Modify: `packages/bundle/web-app/presets/standard.patch.yml`, `ptc.patch.yml`, and `cordis.patch.yml`
- Modify: `packages/bundle/web-app/README.md`, `README.zh.md`, and `README.i18n.yaml`
- Create: `packages/skill/skill-official/tests/web-profile.integration.spec.ts`
- Create or update: `snapshots/web/official-skill-provider/` scenario files owned by the recorded-session snapshot harness
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `@deepseek-ai/dsh-skill-official` and `@deepseek-ai/dsh-client-ui-settings-skills` from workspace dependencies.
- Produces: a Web composition that loads the official provider with the existing skill registry and loader, and renders the feature-owned Settings tab.

- [ ] **Step 1: Write the failing Web composition test and snapshot scenario**

Boot a test-only Web profile `cordis.yml` through the Loader and app/process. Assert the model-visible catalog contains exactly the restored skills and `skill` loads a restored instruction. Add a keyless recorded-session scenario for the same user-visible skill-loading path; the Settings package test owns tab rendering.

- [ ] **Step 2: Run the focused integration test and verify it fails**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/web-profile.integration.spec.ts`

Expected: FAIL because the Web profile does not resolve or mount the official provider and Settings package.

- [ ] **Step 3: Wire the provider and Settings package**

Add package dependencies to the Web app manifest and plugin rows beside the existing skill provider and loader in `standard`, `ptc`, and `cordis` presets. Keep `minimal` unchanged. Run `pnpm install` to update the lockfile.

- [ ] **Step 4: Run focused integration and snapshot checks**

Run: `pnpm exec vitest run packages/skill/skill-official/tests/web-profile.integration.spec.ts`

Expected: PASS through the real Web Loader composition.

Run: `pnpm run test:snapshot -t official-skill-provider`

Expected: PASS with the restored skill load represented in the keyless recorded-session output.

- [ ] **Step 5: Run affected repository gates**

Run `pnpm run verify-cordis-config`, `pnpm run verify-client-ui-i18n`, `pnpm run test:docs`, `pnpm run doc-sync`, `pnpm run build:artifacts`, then `pnpm run build:check` after the latest artifacts build. Run `git diff --check` and review the full diff; confirm no Chrome MCP Bridge references or unrelated historical-commit files were added.

- [ ] **Step 6: Commit Web wiring and evidence**

```sh
git add packages/bundle/web-app packages/skill/skill-official/tests/web-profile.integration.spec.ts snapshots/web/official-skill-provider pnpm-lock.yaml
git commit -m "feat(web): expose official skills"
```
