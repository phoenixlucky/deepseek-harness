---
description: "Search and enable the restored official skill catalog in Web Settings, and check for a validated update to the Figma design skill."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-skills

English | [中文](README.zh.md)

## Summary

Open the **Official skills** section in Settings to search the bundled catalog and stage skills for enablement or disablement. Changes to enablement take effect when saved. The page checks a fixed upstream source for the Figma design skill and installs only content that passes the official provider's validation; it does not change enablement when installing an update.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Open the **Official skills** section in Settings to manage the official skill provider's catalog.

The search field matches skill names, descriptions, and source labels. Each row has a switch; changes remain drafts until **Save**. A failed save remains visible and leaves the Host's saved configuration in place. The section lists thirteen WJ Forge skills and `figma-design-skill`.

Only the Figma row has update controls. **Check for updates** fetches the reviewed fixed GitHub raw URL; **Install update** appears only after valid content is returned. The package rejects redirects, failed responses, oversized documents, changed skill identity, or unapproved metadata. A failed check or write is reported in the section, and installing never changes disabled skills.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser plugin registers a `settings.section` entry while the `official-skills` configuration namespace is served. `OfficialSkillsSettingsController` uses the shared `SettingsFormModel` for `disabledSkills`; Figma updates are written separately to `updatedSkills`, preserving the other update entries and using the scope revision. The Host entry is inert and exists so the Web Loader can serve the client module.

The skill list and fixed-source validation are owned by [skill-official](../../skill/skill-official/README.md). This page keeps a searchable presentation catalog in sync with that provider and exposes no update action for the WJ Forge skills.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [skill-official](../../skill/skill-official/README.md) — owns the restored skill catalog and Figma update validation.
- [ui-settings](../ui-settings/README.md) — provides configuration forms and served-namespace tracking.
- [ui-plugin-manager](../ui-plugin-manager/README.md) — shows settings sections associated with a bundle on the Plugins page.
- [ui-primitives](../ui-primitives/README.md) — provides shared settings form behavior.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers a browser Settings section and adds no model-visible content.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Only Figma has an update control** — the other bundled skill assets have no update path in this package.
- **The section follows provider configuration availability** — it is absent while the Host does not serve `official-skills`.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
