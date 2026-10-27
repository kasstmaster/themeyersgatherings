# AGENTS.md — Permanent Project Development Rules

## Project Overview

The Meyers Gatherings website manages multiple family gatherings using one shared application.

All gatherings must share the same underlying builder, editor, rendering logic, and functionality while maintaining independent gathering designs, settings, and content.

These rules apply to all future development, including new features, bug fixes, improvements, and refactors.

Before modifying code, inspect the relevant existing implementation and preserve the architecture described below.

---

## 1. Shared Builder Architecture

ALL gatherings, existing and future, must use the same underlying builder and editing systems.

Shared functionality includes:

- Title and introduction editing
- Rich-text editing and formatting controls
- Outer and inner container editing
- Button, tab, and toolbar editing
- Layout and rendering functionality
- Page creation and editing
- Save and load functionality
- Other shared website-building features

Changes to shared builder code must apply consistently to every gathering.

Never duplicate shared functionality unnecessarily or create separate gathering-specific implementations when the shared system can support the feature.

Fix shared problems in the shared implementation rather than applying individual gathering-specific workarounds.

## 2. Gathering-Wide Shared Formatting

Each gathering has its own independent design system.

Within a gathering, elements of the same type must share their formatting and appearance settings.

This includes:

- Outer containers
- Inner containers
- Buttons
- Toolbar items
- Tabs
- Titles
- Introductions
- Future elements designated as shared formatting types

For example:

Changing the background of one outer container must update matching outer containers throughout the current gathering.

Changing a title's font, size, color, alignment, or other shared appearance properties must update matching titles throughout the current gathering.

Changing introduction formatting must update matching introductions throughout the current gathering.

Different element types must maintain separate formatting configurations.

Title formatting must not automatically alter introduction formatting.

**Permanent rule: Formatting changes to shared element types affect the current gathering only, never other gatherings.**

New pages must automatically inherit their gathering's established formatting settings.

New gatherings must support the same formatting functionality while maintaining independent designs.

## 3. Independent Page Content

Pages may share formatting without sharing content.

Each page must retain independently editable:

- Title text
- Introduction text
- Page-specific written content
- Other data intended to belong to that page

For example:

Page A may contain the title "Welcome."

Page B may contain the title "Event Details."

Both titles must use the gathering's shared title formatting while retaining their different text.

Editing the text on Page A must never modify Page B's text.

**Permanent rule: Shared formatting does not mean shared page content.**

## 4. Independent Gathering Data

Each gathering must maintain its own:

- Appearance and formatting configurations
- Pages and content
- Titles and introductions
- Event dates and details
- RSVP information
- Menus and selections
- Gathering-specific settings and customizations

Use the correct gathering identifiers when reading, editing, and saving gathering-specific data.

Never allow formatting, content, or settings to accidentally carry over between gatherings.

Preserve intentionally shared information, such as shared account records, where required by the existing application architecture.

## 5. Gathering-Specific Features

Some features are intentionally restricted to particular gathering types.

For example, wedding-specific menus or wedding party functionality may not apply to other gatherings.

Gathering-specific features are allowed, but should extend or configure the shared application architecture whenever practical.

Do not duplicate the entire builder to accommodate a gathering-specific feature.

Do not force gathering-specific functionality onto unrelated gatherings.

## 6. Existing Infrastructure and Data Protection

Preserve the website's existing integrations and infrastructure, including:

- GitHub Pages
- Cloudflare Worker shared-state functionality
- The separate GitHub data repository
- AnyList synchronization
- Dropbox functionality
- Invitation and QR-code systems
- Existing guest accounts, RSVPs, menus, and gathering information

Inspect the relevant code and documentation before modifying these systems.

Never unnecessarily overwrite, reset, migrate, or replace saved user data.

Maintain backward compatibility with existing saved state wherever possible.

Never commit passwords, private tokens, API secrets, credentials, or sensitive guest information into public source code or documentation.

Do not change deployment infrastructure unless required by the task.

## 7. Future Development Requirements

For every future feature, improvement, bug fix, or refactor:

1. Inspect the relevant existing implementation.
2. Determine whether functionality belongs in the shared builder.
3. Reuse existing components whenever possible.
4. Determine the correct scope of associated data: website-wide, gathering-wide, page-specific, or another intentionally defined scope.
5. Preserve gathering-wide formatting behavior.
6. Preserve independent page content.
7. Ensure existing and future gatherings use shared functionality consistently.
8. Preserve existing integrations and saved data.
9. Avoid duplicated functionality and unnecessary workarounds.
10. Verify that unrelated gatherings and features continue working.

Do not silently introduce architectural exceptions.

If a requested change conflicts with these permanent rules, explain the conflict before proceeding.

## 8. Editing and Persistence Requirements

Shared editing functionality must behave consistently throughout every gathering.

Verify relevant changes against these expectations:

- Titles and introductions remain editable on every page.
- Matching titles share formatting within a gathering.
- Matching introductions share formatting within a gathering.
- Page text remains independent.
- Gathering formatting remains independent.
- Switching gatherings displays the correct settings.
- Refreshing retains saved changes.
- Newly created pages inherit gathering formatting.
- Newly created gatherings use the shared builder.
- Existing content and settings remain preserved.

Where practical, use the same shared editing and persistence logic across all gathering types.

## 9. Automated Testing

Maintain automated regression tests for important shared architecture behavior.

Tests should verify:

- Shared editor functionality across multiple gatherings.
- Gathering-wide formatting synchronization.
- Independent formatting between gatherings.
- Independent title and introduction content between pages.
- Save and reload persistence.
- Switching between gatherings.
- Newly created pages and gatherings.
- Preservation of gathering-specific functionality.
- Compatibility with existing saved state.

Run relevant tests after modifying shared builder, formatting, rendering, or persistence code.

Integrate appropriate tests into existing GitHub Actions workflows where practical.

Report tests that fail or cannot be run.

Do not claim testing succeeded unless the tests were actually executed.

## 10. Automatic Documentation Maintenance

Project documentation must remain synchronized with the implemented code.

Documentation maintenance is part of every relevant development task, not a separate task the user must request.

For every future change:

1. Review whether the change affects README.md or other existing documentation.
2. Update README.md when user-facing functionality, features, setup instructions, integrations, or configuration change.
3. Update relevant technical documentation when architecture or implementation details change.
4. Keep AGENTS.md accurate when approved architectural requirements change.
5. Never silently weaken, remove, or contradict permanent architectural rules.
6. Remove outdated documentation only after verifying it is obsolete.
7. Document implemented functionality rather than planned or assumed behavior.
8. Keep instructions accurate, organized, and understandable.
9. Never include passwords, access tokens, API keys, or other secrets.
10. Include documentation status in every development task summary.

Documentation status must explicitly state either:

- Which documentation files were updated and why.
- Or that documentation was reviewed and no changes were necessary.

Do not modify unrelated documentation unnecessarily.

### Repository documentation review checklist

For every relevant task, review the actual changed implementation against:

| Change area | Documentation to review/update |
| --- | --- |
| User flows, host controls, supported features | `README.md`, `docs/inline-editing.md` |
| Shared builder, formatting groups, data ownership, persistence | `docs/gathering-architecture.md`, `docs/gathering-builder.md` |
| Invitations, QR modes, quantities and exports | `docs/invitations.md` |
| Hosting, deployment triggers, origins, account boundaries and configuration names | `docs/custom-domain.md`, relevant README setup sections |
| Confirmed unresolved architecture/data-protection issues | `docs/documentation-architecture-audit.md` or a clearly linked successor audit |

Use the code, workflow YAML and configuration files to verify current behavior. Permanent requirements remain normative: if the implementation violates a rule, record the deviation and a separate follow-up rather than rewriting the rule to legitimize it. Distinguish source inspection, locally reproduced behavior and unverified live configuration.

Document current controls and commands in their primary guide; replace verified obsolete instructions instead of appending contradictory historical behavior. Keep historical audit results explicitly dated. Do not claim optional browser scripts are covered by `npm test` or CI unless the workflow actually invokes them. Check relative Markdown links and referenced file paths when changing documentation.

For documentation-only requests, change only documentation/development instructions unless the user explicitly expands scope. Report code defects without fixing them, avoid live state reads that can trigger archival, and use disposable synthetic fixtures for reproductions. Verify the final changed-file list excludes application source, workflows/configuration, dependencies and saved data. For a change that affects published behavior, update documentation in the same task; a summary saying “no documentation needed” must explain why behavior/setup/architecture did not change.

Every final task summary must identify documentation files updated and their purpose, or explicitly say which relevant documentation was reviewed and why no update was needed. Include remaining uncertainties and validation limits; never present an audit as proof that all integrations or architectural requirements are satisfied. Current audit findings are tracked exceptions needing work, not permission to add similar exceptions.

## 11. Code Review and Change Verification

Before completing a development task, check for:

- Unnecessary duplication of builder functionality.
- Gathering-specific workarounds for shared problems.
- Accidental sharing of page-specific content.
- Formatting changes affecting unrelated gatherings.
- Broken save/load functionality.
- Regressions in existing features.
- Unnecessary changes to saved data or infrastructure.
- Missing automated tests where appropriate.
- Documentation that no longer matches the implementation.

Provide a final summary containing:

- Changes implemented
- Tests executed and results
- Documentation updated or reviewed
- Any unresolved issues or limitations

## 12. Permanent Architectural Model

The website must preserve three primary architectural layers.

### Layer 1 — Website-Wide Shared Builder Code

All gatherings use the same underlying builder, editor, rendering logic, and shared functionality.

### Layer 2 — Gathering-Wide Shared Formatting

Matching element types within a gathering share appearance settings.

Each gathering maintains its own independent formatting and design.

### Layer 3 — Page-Specific Independent Content

Each page retains its own written content and page-specific data while inheriting the gathering's shared formatting.

These three layers are permanent architectural requirements.

Future development must preserve these boundaries unless explicitly authorized to change them.

**Shared code across all gatherings. Shared formatting within each gathering. Independent content on each page.**

---

## 13. Instruction Priority

These instructions are intended to guide development throughout this repository.

If existing documentation contradicts the actual implementation, investigate and correct the documentation.

If an incoming request conflicts with these architectural requirements, explain the conflict and request clarification before changing the architecture.

Do not make unnecessary modifications to working systems merely to reorganize code.

Preserve existing functionality, data compatibility, and maintainability.
