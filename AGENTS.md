# AGENTS.md — Permanent Website Architecture Rules

## Project Overview

This website manages multiple family gatherings, each containing its own pages, content, design settings, guest information, and gathering-specific features.

The website must use **ONE shared gathering builder and editing system** while allowing each gathering to maintain its own independent design and data.

These architectural principles must be preserved during all future development.

## Existing Infrastructure and Data Protection

This website uses GitHub Pages, a Cloudflare Worker, and a separate GitHub data repository for persistent shared state.

When modifying shared builder functionality, gathering formatting, or page content:

- Preserve the existing shared-state architecture.
- Maintain compatibility with existing saved gathering data.
- Do not accidentally reset, overwrite, or migrate guest accounts, RSVPs, menus, or other saved information.
- Keep gathering-specific data isolated while preserving intentional shared account information.
- Ensure changes remain compatible with the existing Cloudflare Worker and save/load functionality.
- Do not introduce unnecessary modifications to the separate data repository.
- Preserve all existing integrations, including AnyList, Dropbox, and invitation generation.

Consult README.md and other relevant project documentation before changing related infrastructure.

---

## One Shared Gathering Builder

ALL gatherings, existing and future, must use the same underlying builder code.

Shared functionality includes:

- Title and introduction editing
- Rich-text editing toolbar
- Formatting controls
- Outer and inner container editing
- Buttons, toolbar items, and tabs
- Layout and rendering components
- Save and load functionality
- General page-building features

**Rule:** When shared builder functionality is improved, fixed, or expanded, the improvement must automatically apply to ALL gatherings.

Never create separate implementations of shared functionality for individual gatherings when the existing shared system can support them.

## Gathering-Wide Shared Formatting

Each gathering has its own design system.

Within a gathering, elements of the same type must share their formatting and appearance settings.

This includes:

- Outer containers
- Inner containers
- Buttons
- Toolbar items
- Tabs
- Titles
- Introductions
- Any future elements designated as gathering-wide style types

For example, changing the background color of one outer container should update all outer containers belonging to the same gathering.

Changing the font, size, color, or alignment of one title should update all titles throughout that gathering.

**Rule:** Formatting changes made to a shared element type must apply to every matching element within the CURRENT gathering, but never to another gathering.

Different element types must maintain separate formatting configurations.

For example, title formatting and introduction formatting must remain independent of each other.

## Independent Page Content

Although formatting is shared within a gathering, page-specific content must remain independent.

For example:

**Page 1**
- Title: Welcome
- Introduction: We're excited to celebrate with you!

**Page 2**
- Title: Event Details
- Introduction: Here's everything you need to know.

Both pages must use the same title formatting and introduction formatting while retaining their own unique text.

Editing the actual title or introduction text must only modify the selected page.

**Rule: Shared formatting does not mean shared text content.**

This distinction must be preserved throughout the entire website.

## Independent Gathering Settings

Each gathering must maintain its own:

- Gathering-wide appearance and formatting settings
- Page content
- Titles and introductions
- Guest information
- RSVP information and responses
- Menus and gathering-specific configurations
- Other independently editable gathering data

Formatting changes made in Gathering A must never affect Gathering B.

Gathering-specific data must be associated with the correct gathering ID.

**Rule: Gatherings share builder functionality, not their individual data or design settings.**

## Architecture and Data Management

Use reusable shared components and gathering-scoped formatting configurations.

- Keep shared builder logic centralized.
- Keep gathering-specific design settings separate.
- Keep page-specific text content separate from formatting.
- Ensure every edit is associated with the correct gathering and, when applicable, page.
- Avoid duplicating editing or rendering logic.
- Prevent editing state from leaking between gatherings.
- Ensure newly created pages inherit the current gathering's formatting.
- Ensure newly created gatherings receive the same builder functionality.

Preserve existing saved data, layouts, settings, and behavior when modifying or refactoring the architecture.

Do not migrate, overwrite, reset, or replace saved data unnecessarily.

## Gathering-Specific Features

Some features are intentionally available only in certain gathering types.

For example, wedding-specific RSVP menus may not be needed for other gatherings.

These features must remain supported without requiring separate copies of the entire builder.

**Rule:** Gathering-specific functionality should extend or configure the shared builder, not replace or duplicate it.

## Future Features and Additions

Every new feature, modification, improvement, or bug fix must follow these architectural rules.

Before implementing a change:

1. Determine whether the functionality belongs in the shared builder.
2. Reuse existing shared components and formatting systems.
3. Determine whether the associated data belongs to the gathering, page, or another appropriate scope.
4. Preserve gathering-wide formatting behavior.
5. Preserve independent page content.
6. Ensure the change works for existing and future gatherings.
7. Protect existing saved data and functionality.

New design elements should use the gathering-wide formatting system by default when they represent a shared visual element type.

If a feature requires independent formatting, implement that exception intentionally rather than accidentally creating inconsistent behavior.

## Editing, Saving, and Loading

All editing functionality must work consistently throughout the website.

Verify that:

- Editing titles and introductions works on every page.
- Formatting a title updates matching titles in the current gathering.
- Formatting an introduction updates matching introductions in the current gathering.
- Editing page text never modifies another page's text.
- Changing gathering-wide formatting never changes another gathering.
- Switching gatherings displays the correct content and formatting.
- Refreshing the page retains saved changes.
- New pages inherit existing gathering-wide formatting.
- New gatherings use the same shared builder functionality.

Fix problems in the shared implementation rather than applying individual gathering-specific patches.

## Automated Testing

Maintain automated regression tests for the shared gathering architecture.

Tests should cover:

- Shared builder functionality across multiple gatherings.
- Independent data between gatherings.
- Gathering-wide formatting synchronization.
- Independent title and introduction text.
- Correct save/load behavior.
- Switching between gatherings.
- Refresh persistence.
- Newly created pages and gatherings.
- Preservation of gathering-specific features.

Run relevant tests after changes to the builder, editor, formatting system, or persistence logic.

Integrate these tests with the existing GitHub Actions workflow where practical so regressions are detected before merging changes.

## Code Review Rules

Flag changes that:

- Duplicate shared builder or editor functionality.
- Introduce unnecessary gathering-specific implementations.
- Prevent matching elements from sharing gathering-wide formatting.
- Cause page-specific content to become shared unintentionally.
- Allow formatting or data to leak between gatherings.
- Break saving, refreshing, or switching gatherings.
- Remove existing functionality or alter saved data unnecessarily.

Prioritize maintainability, consistency, and preservation of existing functionality.

## Permanent Development Requirement

These are permanent architectural requirements for this repository.

They apply to all future:

- Features
- Additions
- Improvements
- Bug fixes
- Refactors
- New gathering types
- New page types
- New editable elements

The website must always follow these three architectural layers:

**Layer 1 — Website-Wide Shared Builder Code**

Every gathering uses the same underlying editing and rendering functionality.

**Layer 2 — Gathering-Wide Shared Formatting**

Matching element types within a gathering share their appearance and formatting settings.

Each gathering maintains its own independent design.

**Layer 3 — Page-Specific Independent Content**

Each page retains its own unique text and other page-specific content while inheriting the gathering's shared formatting.

**Never violate these three layers unless explicitly instructed to change the architecture.**

When future requests introduce new requirements, preserve these rules and extend the existing systems instead of duplicating functionality.

Before modifying these architectural principles, explain the conflict and request approval.
