# Official Skill Provider Restoration

English | [中文](2026-11-17-official-skill-restoration-design.zh.md)

## Summary

This design restores the official skill provider and its Settings controls from the historical integration while excluding Chrome MCP Bridge and unrelated changes from the same commit. The provider exposes thirteen WJ Forge skills and the Figma design skill through the existing skill registry.

## Table of Contents

- [Problem](#problem)
- [Existing capabilities](#existing-capabilities)
- [Restored skills](#restored-skills)
- [Architecture](#architecture)
- [Settings and updates](#settings-and-updates)
- [Failure behavior](#failure-behavior)
- [Validation](#validation)
- [Out of scope](#out-of-scope)

-----

## Problem

The current tree has a shared skill registry, filesystem and Office providers, and a model-facing skill loader. It does not contain the historical official provider or its Settings controls, so the skills from the October integration cannot be discovered or enabled in the current product.

Copying only the skill documents would leave them unusable. The restoration needs the provider, per-skill enablement, the existing Settings extension point, and package registration needed to load them.

## Existing capabilities

`dsh-skill` merges providers and loads one selected skill on demand. `dsh-tool-skill` publishes the catalog and loader tool. Settings configuration forms already persist plugin-owned values, and the Client Settings Plugins area accepts feature-owned tabs.

The official provider will use these existing services. It will not add another skill registry, a new model tool, or a separate settings storage mechanism.

## Restored skills

The provider will bundle `bug-hunt`, `code-review`, `github`, `moon-lovers`, `officecli`, `ponytail`, `release-notes`, `superpowers`, `taste-skill`, `ui-ux-pro-max`, `vision-liao-memory`, `weiliaozi-skill`, and `zerotoken-skill` from WJ Forge, plus `figma-design-skill` with its reviewed reference files and Apache-2.0 license.

The provider catalog, package documentation, tests, and Settings search will omit `chrome-mcp-bridge-2026-skill`. The other WJ Forge entries retain their source attribution and reviewed embedded text. The Figma skill remains the only skill with a fixed-source update path.

## Architecture

`@deepseek-ai/dsh-skill-official` will register the embedded skills with `ctx.skills.registerProvider()`. It will validate skill names and descriptions when loading its assets, return full instructions only when a consumer requests a skill, and declare no tools or permission grants.

The provider will filter only its own skills using its `disabledSkills` configuration. It will use the existing bundled-skill precedence and provider lifecycle. Disposing the provider removes its candidates and invalidates its catalog through the existing registry API.

`@deepseek-ai/dsh-client-ui-settings-skills` will add a feature-owned tab through the existing Settings Plugins extension point. The tab will search the provider's reviewed catalog, show each skill's enabled state, and update only the official provider's configuration form.

Package manifests, workspace aggregates, and the owning package-group READMEs will register the provider and Settings package. Existing skill subsystem types and invocation rules remain unchanged.

## Settings and updates

Users can enable or disable each bundled skill independently. A disabled skill stays visible in Settings search but does not enter the model-facing catalog. Enablement changes invalidate the provider catalog so consumers see the saved selection.

The Figma skill can check and install an update only from its fixed reviewed HTTPS source. The update path rejects redirects, oversized content, changed identity, and unapproved frontmatter. It does not accept caller-supplied URLs. Other skills remain pinned to their bundled copies.

All visible copy uses the existing English and Chinese locale dictionaries. The Settings UI reports update and save failures without claiming an update or enablement change succeeded.

## Failure behavior

Missing or invalid bundled assets fail provider activation with the affected path. A disabled or unavailable provider contributes no catalog entries; other providers remain available through `dsh-skill`.

An update failure preserves the current Figma skill content and enablement. A successful update changes only the validated Figma document. Provider disposal removes its registration and leaves other providers untouched.

## Validation

Provider tests will cover the exact restored identity set, the absence of Chrome MCP Bridge, source labels, per-provider enablement, skill loading, and disposal. Update tests will cover fixed-source validation, redirect and size rejection, identity and metadata checks, and preservation of the prior version after failure.

Settings tests will cover search, localized presentation, enablement writes, update states, and failure reporting. Package checks will verify workspace registration, README ownership, bilingual pairing, and the Web composition that exposes the Settings tab and skill provider.

## Out of scope

This restoration does not include Chrome MCP Bridge, MCP server packages or cards, desktop profile seeding, theme assets, community plugin changes, or unrelated files from the historical commit. It does not add skills from the host's personal skill directory to the product bundle or change skill precedence, invocation policy, or registry APIs.
