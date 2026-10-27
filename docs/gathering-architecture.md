# Gathering architecture: implementation and required boundaries

The permanent requirements are in [AGENTS.md](../AGENTS.md). This document describes current implementation, not proof that every requirement is satisfied. Confirmed deviations are tracked in the [documentation and architecture audit](documentation-architecture-audit.md).

## One shared builder

Thanksgiving, Christmas, Wedding and custom IDs share `index.html`, `app.js`, the RSVP journey and the editor modules. Historical `wedding` IDs/classes/endpoints are compatibility identifiers, not evidence of a second builder. `gathering-features.js` supplies standard and Wedding capabilities; new gatherings receive the standard definition and a neutral white/gray theme. Existing unmarked custom records keep legacy theme behavior.

| Responsibility | Current owner |
| --- | --- |
| Event definitions, active event, page composition, local/shared persistence | `app.js` |
| ID-bound editor data/save context; teardown before switching/reload | `gatheringBuilderContext`, `finishGatheringBuilderSession` in `app.js` |
| Fields, custom pages, tabs, independent content, undo/redo metadata | `inline-editing.js` |
| One selection-based editor, rich text, formatting controls, autosave | `element-editor.js` |
| Shared appearance groups, overrides, image replacement | `element-appearance.js` |
| Inline style markup and safe text rendering | `text-styles.js` and the formatter in `app.js` |
| Largest-fit heading/date measurement using authored sizes | `fitted-text.js` |
| Saved spacing, padding and text placement | `gap-layout.js`, `SiteEditing.movableText` |
| Shared question flow, validation/navigation, children/guests/meals | `rsvp-flow.js`, `child-picker.js`, `guest-planning.js`, `app.js` |
| Print/email from the role toolbar | `page-actions.js` |
| Legacy palette rendering | `gathering-palette.js` (no separate palette editor) |

Wedding capabilities add party/role visibility, attire, registry, addresses and meals. They must continue to extend these components. Main/custom page editing is registered for standard gatherings as well as Wedding. Specialized cards may have different content/layout without another editor implementation.

## Data scopes

| Scope | Current storage |
| --- | --- |
| Gathering content/design/RSVP/menu/details | `appState.events[gatheringId]` |
| Page text | `sitePages` entries, `siteText`, canonical page fields; per-box `textAppearance` |
| Gathering-wide styles | `elementAppearance['@group:<kind>']`, plus selected/unselected variants |
| Layout | `siteTabOrder`, `rsvpToolbarOrder`, `siteElementOrder`, `siteElementPlacements`, `siteGaps`, `siteSpacing` in the event |
| Chooser design | `appState.gatheringHome` |
| Household identities/children/QR tokens | `appState.accounts`; event access/invites/quantities/guest allowances use gathering keys |
| Invitation templates | Website-level array with `eventId` ownership; event selects its template ID |
| Archived occurrences | `gatheringHistory[gatheringId][date]` snapshots |
| Website identity | `sharedSite`, including the global footer name |
| Media | Event-specific published folder settings; **account-wide R2 gallery/session ownership currently lacks event separation** |

Shared formatting does not share words: a title group changes fonts/colors/alignment in one gathering; a page title edit changes that page's content. Introductions use their own group. Page-content boxes have independent rich formatting by design. Count values/titles, count lists, dish statuses/claimants, outer/inner surfaces and selected/unselected controls are deliberately distinct groups. Admin/editor controls are outside public appearance groups.

Legacy per-element style selectors remain supported. A new group edit clears conflicting properties on matching individual entries; untouched legacy data may still override group values. Selector keys and historical IDs require compatibility handling when markup moves.

## Session and persistence lifecycle

Editor contexts capture the application object, gathering ID and event data. The context's save function writes under that ID and refuses to save into a replacement application object after shared-state reload. Pending text/structured inputs finish before switching; selection cleanup cancels its autosave timer and restores temporary appearance. Undo/redo resets at event/session boundaries.

Local persistence has a primary copy, backup, pending-save marker and timestamp-based/recovery selection. Startup attempts the configured shared endpoint or fallback file. Rendering/normalization supports legacy records. Shared polling avoids replacing active edits and pending saves. An upload sends the **whole application JSON** to the service; this does not provide field-level or gathering-level merge protection between devices.

The service writes state to a separate GitHub repository and preserves archived histories. It retries GitHub SHA conflicts but reuses the submitted snapshot for current data. The [audit](documentation-architecture-audit.md) documents the resulting stale-write risk and access-control limitations. Do not describe local event isolation tests as proof of multi-device conflict safety.

## Shared pages and integration boundaries

Guests default to Photos & Videos; host defaults are Bride & Groom for Wedding and Notes otherwise. All Gatherings is the chooser action. Photos & Videos follows it; Print Page offers print/email; host Edit/Done and Create Gathering follow Print Page. Host options are icons with labels exposed through accessibility/tooltips. Role options persist across gathering pages/questions/dialogs; gathering-specific options disappear on the chooser.

Wedding Timeline moves one canonical panel between Bride & Groom and party information. Details has one canonical Wedding record exposed in its intended locations. These are intentional same-content views within one gathering, unlike independent custom pages. The reused Wedding Party heading currently has a separate page-content leakage issue recorded in the audit.

Photo sharing uses one page/client and the `/wedding-media` API for every gathering. Admission checks the requested event's access, but session/gallery ownership and Dropbox paths currently use the household rather than the event. All gatherings intentionally share the Dropbox connection; per-event gallery separation remains unresolved. Published `mediaGalleryUrl`/`mediaGalleryLabel` are event-owned.

AnyList updates website-wide household identity data and relevant references while preserving website-owned settings. Invitations use event-owned templates and permissions. Neither integration requires copying the gathering editor. The service and static site deploy in separate Cloudflare accounts from the same repository; see [hosting](custom-domain.md).

## Verification and future maintenance

`npm test` covers state/context bindings, formatting, feature permissions and integrations through local fixtures. The shared-builder CI workflow runs it and a production build on PRs/main. Browser regressions are optional local scripts, not automatically run by that workflow. See the [editing guide](inline-editing.md#known-limitations-and-verification) and [audit validation inventory](documentation-architecture-audit.md#validation-and-limits).

Do not fix the documented exceptions by duplicating a builder, resetting saved state, or weakening the requirements. Separate development tasks must add targeted regressions, preserve legacy content and keep the documentation aligned with the resulting behavior.
