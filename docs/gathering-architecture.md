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

Local persistence has a primary copy, backup, pending-save marker and timestamp-based/recovery selection. Startup attempts the configured shared endpoint or fallback file. Rendering/normalization supports legacy records. Shared polling avoids replacing active edits and pending saves. The A1/A2 implementation sends changes against an acknowledged baseline plus a revision. The service conditionally writes the canonical private JSON with its exact GitHub SHA; it rejects stale revisions/races instead of attaching an old snapshot to a newer SHA.

The service keeps the existing private GitHub data format and archived histories. `auth.js`, `permissions.js` and `state-access.js` create server sessions, project role/account data and validate guest mutations. Host administration is server-authenticated; guest names remain an intentionally weak identifier under the unchanged QR/name UX. See the [approval-gated security rollout](state-security-rollout.md). The historical audit describes pre-fix A1/A2; production remediation is not claimed until the owner approves activation and its checks pass.

## Shared pages and integration boundaries

Guests default to Photos & Videos; host defaults are Bride & Groom for Wedding and Notes otherwise. All Gatherings is the chooser action. Photos & Videos follows it; Print Page offers print/email; host Edit/Done and Create Gathering follow Print Page. Host options are icons with labels exposed through accessibility/tooltips. Role options persist across gathering pages/questions/dialogs; gathering-specific options disappear on the chooser.

Wedding Timeline moves one canonical panel between Bride & Groom and party information. Details has one canonical Wedding record exposed in its intended locations. These are intentional same-content views within one gathering, unlike independent custom pages. The reused Wedding Party heading currently has a separate page-content leakage issue recorded in the audit.

Photo sharing uses one page/client and the `/wedding-media` API for every gathering. Admission checks the requested event's access, but session/gallery ownership and Dropbox paths currently use the household rather than the event. All gatherings intentionally share the Dropbox connection; per-event gallery separation remains unresolved. Published `mediaGalleryUrl`/`mediaGalleryLabel` are event-owned.

AnyList updates website-wide household identity data and relevant references while preserving website-owned settings. Invitations use event-owned templates and permissions. Neither integration requires copying the gathering editor. The service and static site deploy in separate Cloudflare accounts from the same repository; see [hosting](custom-domain.md).

## Verification and future maintenance

`npm test` covers state/context bindings, formatting, feature permissions and integrations through local fixtures. The shared-builder CI workflow runs it and a production build on PRs/main. Browser regressions are optional local scripts, not automatically run by that workflow. See the [editing guide](inline-editing.md#known-limitations-and-verification) and [audit validation inventory](documentation-architecture-audit.md#validation-and-limits).

Do not fix the documented exceptions by duplicating a builder, resetting saved state, or weakening the requirements. Separate development tasks must add targeted regressions, preserve legacy content and keep the documentation aligned with the resulting behavior.

## Wedding Party heading ownership (A5)

Wedding Party extends the shared editor with stable content identities from `WeddingParty.headingOwner/headingFields`, not a separate editor. The rendered heading/kicker carry `data-content-key`; `ElementAppearance.textSelector` scopes text records to that key while the existing appearance selector and `@group:titles` / `@group:introductions` remain unchanged. Heading words are stored in the owning gathering's `siteText` under the corresponding attribute selector. Built-in subpages, per-member Responsibilities, member pages (member ID plus page ID) and common custom pages all have distinct keys. Reordering or changing a member's role does not change its identity. Tab labels, member records and canonical shared Timeline/Details bodies are not overwritten by heading overrides.

Register the explicit text field after custom-subpage selection resolves; capture the field's key and ID-bound state in its commit closure before switching pages. Do not key content by a reused DOM ID, role label, visible page title, array position or the later active tab. New text identities automatically retain the existing formatter, rich-text editor, undo/save/load and grouping code. Guest projections permit only the current member's heading keys and accessible pages; ordinary guests cannot download party heading content.

Legacy `textAppearance` records against reused heading IDs are read only for compatibility. If the saved original identifies exactly one owner, its markup is displayed there until explicitly edited into a new scoped `siteText` entry. The original records remain unchanged. Ambiguous/ownerless records are retained but not globally rendered; an owner can re-enter desired copy on the intended page. No bulk migration, deletion or live data rewrite is performed. Existing appearance maps remain intact.

## Yearly lifecycle and guest history

The shared history module also owns date-specific rename/cancel/delete/restore and retention. `gatheringLifecycle[id][date]` stores temporary Host-only cancellation/recovery records. Guests receive only privacy-filtered `pastGatherings`, with access based on historical invitations/attendance; this does not grant active-event write access. The normal privacy projection is reused for archived content. New media metadata carries ID/date; unassigned legacy uploads are preserved and labelled. See [lifecycle and retention](gathering-lifecycle.md) for controls, 30-day recovery, cleanup timing, and remaining external copies.

Canonical gathering information is edited through the Host lifecycle information command. Invitation templates store layout rather than copied gathering values; the common `SharedDetails.invitationValues` resolver serves previews/exports. New/changed template saves require mandatory dynamic fields and complete gathering data on both client and Worker. Rescheduling keeps same-occurrence media date aliases; new-year creation clears aliases only on the new occurrence. See [invitation templates](invitations.md).
