---
description: "Bundled, reviewed WJ Forge and Figma skills and their enablement settings for users and maintainers."
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-official

English | [中文](README.zh.md)

## Summary

This provider bundles thirteen WJ Forge skills and the Figma design skill for offline discovery through `ctx.skills`. The Settings tab searches the catalog and stores per-skill enablement in the provider's own configuration. The skills add workflow guidance only; they do not grant tools or permissions.

Skill documents retain their upstream attribution in frontmatter. The Figma design skill has one fixed reviewed HTTPS source; downloaded updates must preserve identity and approved metadata before a user installs them.

## Table of Contents

- [Summary](#summary)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Model Experience

### Enabled skill instructions

#### What the model sees

The provider makes each enabled instruction document available to the existing skill loader. Inline the selected skill's complete content in its own registered source; for example, [`figma-design-skill/SKILL.md`](assets/figma-design-skill/SKILL.md).

#### Token effect

The selected skill adds its instruction text to the active model context. The amount depends on the chosen skill and task.

#### KV Cache effect

The selected skill text is part of the context prefix while active. Changing the selected skill or updating its content changes that prefix.

## Known Limitations and Deferred Work

- Only the Figma design skill currently has an update source. Other bundled skills remain pinned to their embedded copy.

### Dev Note

The provider stores all skill content under `assets/` and can be disabled per skill through its volatile settings field.
