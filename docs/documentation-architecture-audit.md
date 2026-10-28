# Documentation and architecture audit — 2026-10-27

## Scope and source of truth

Reviewed repository `kasstmaster/themeyersgatherings` at application baseline `e664363` (including shared-builder PR #514), the root README/AGENTS, every existing Markdown guide, shared frontend/editor modules, state normalization/persistence, feature definitions, integration code/configuration, workflows and representative tests/browser harnesses.

This is a **documentation-only audit**. Application source, workflows, configuration, dependencies, assets and saved JSON were not changed. Local reproductions used disposable synthetic browser state or in-memory Worker/GitHub/R2 fixtures. No live RSVP, AnyList sync, Dropbox authorization/upload or data-repository write was performed.

Actual code determines what the documentation describes today. [AGENTS.md](../AGENTS.md) remains the normative architecture: documenting a deviation does not approve it or weaken the requirements.

## Documentation corrected

| Previous documentation | Verified current implementation / correction |
| --- | --- |
| Thanksgiving/Christmas-only description; Wedding described as separate | One common builder with Wedding capability extensions and standard newly created gatherings. |
| Edit website/Host tools, a hidden Edit option, sidebar Save/Done | Main host toolbar Edit becomes Done; one left sidebar, autosave, double-click typing; structured/management forms retain their own controls. |
| Host corner Accounts/History/+ actions; The Meyers home action | Accounts/History are sidebar management actions; All Gatherings is home; Create Gathering follows Edit/Done in the persistent host toolbar. |
| Photos as a front-page button; guests defaulting to Details/party page | Photos is the toolbar option after All Gatherings and default guest information page. Host planning defaults remain role-specific. |
| Separate Print/Email buttons on each page | One Print Page toolbar action opens Print/Email choices. Printing adds the first RSVP header where absent. Email currently uses page text without that extra header. |
| Numeric-only children and numbered unnamed child meal cards | Shared saved-child checkboxes/additional names and gathering-dependent guest/meal choices. |
| Separate host Menu page; generic guest visibility of counts/names | Host Dishes needed overview, sidebar Menu editor, host-only count/detail interface. Backend access limitations are now explicit. |
| AnyList append-only records; notes ignored; logs contain only counts | Reconciles/updates households, names, addresses, children from notes and aliases; migrates references, preserves website-owned fields, backfills missing QR tokens; logs include names. |
| Every invitation mode requires an account QR token; email always attaches PNGs | General-login mode does not require tokens. Quantities/group membership apply; bulk invitation files are ZIPs and browser file-sharing support is required. |
| Repository fallback always authoritatively loaded before sign-in | Startup attempts shared/fallback loading, but recent/recoverable local state and pending-save/active-editor guards affect replacement. |
| Worker deploy triggered only by backend paths; automatically creates R2; separate jobs/artifact | Every main push triggers one sequential compatibility/build/service/domain/live-check job; bucket/secrets must already exist. |
| GitHub Pages instructions presented as the current primary hosting setup | Cloudflare subdomain is primary; Pages is retained for compatibility links; setup documents both Cloudflare accounts. |
| Galleries described as gathering-specific | Published folder settings are event-specific; current server galleries are account-wide across gatherings. Recorded as a defect, not a guarantee. |
| Historical code-audit results presented without a currency warning | Historical report retained and explicitly labeled; current evidence/results live here. |
| Every optional browser script implied current | Current validated harnesses are distinguished from scripts with removed selectors or obsolete UI expectations. |

README and the editing, architecture, builder, invitations and hosting guides now describe these verified behaviors. Permanent documentation-maintenance instructions were retained and strengthened in AGENTS.

## A1/A2 follow-up implementation status

A separate implementation now prepares server-side host sessions, limited name-matched guest views, permitted mutation checks and revision-checked saves. The owner explicitly retained existing name-only guest entry/QR links; guest identity proof remains weak. [The security rollout guide](state-security-rollout.md) records tested changes, the required private backup/restore drill, manual host-secret replacement and approval gate. **Do not mark production A1/A2 remediated until the owner approves deployment and verifies cutover.** A3–A6 remain open and are not being repaired by that work. Findings below describe the audited pre-change baseline.

## Architecture assessment

| Requirement | Assessment |
| --- | --- |
| One shared builder/editor for all gatherings | Common path is implemented through `gatheringBuilderContext`, SiteEditing, ElementEditor, ElementAppearance and GapLayout; standard/new/Wedding browser coverage passes. Wedding capabilities extend the common system. |
| Matching component formatting shared within one gathering | Explicit appearance groups exist; titles and introductions are separate, as are outer/inner containers, count values/titles and count lists. New custom-page inheritance passes the shared-builder check. |
| Independent page content | Common/custom-page fields are independent. **A5:** reused Wedding Party heading overrides violate this boundary. Timeline/Details canonical views are intentional same-content exceptions. |
| Independent gathering settings | Common editor scopes and switch/reload guards pass local tests. **A2/A3:** concurrent whole-state writes and account-wide media storage do not supply full gathering isolation. |
| Preserve existing data | Existing schema, selector compatibility, history and backups remain supported. **A4:** Christmas normalization can replace saved menu definitions. |
| Shared save/load | One local/shared-state path exists. It is whole-snapshot persistence, not a conflict-safe per-event merge. **A1/A2** need separate work. |
| Automated regression testing | PR/main Node tests and build exist; optional Chromium scripts are separate. Coverage does not currently prevent the confirmed findings below. |

### A1 — High: shared-state authorization and source-visible host credential

Evidence: [`github-state-worker/worker.js`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/github-state-worker/worker.js#L278) accepts state GET/PUT without `requireHost` or a guest session check. [`originAllowed`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/github-state-worker/worker.js#L11) accepts requests with no Origin. The host comparison value is in shipped `app.js` (value deliberately not reproduced). Specialized AnyList/upload/OAuth routes do have their own checks; that does not protect the state endpoint.

An in-memory Worker/GitHub reproduction confirmed credential-free GET and PUT succeed. UI privacy and a private backing repository therefore do not establish confidentiality/integrity of the complete application state, including gathering settings and account records. CORS is not authentication.

Separate task: design server-enforced identity/authorization and appropriately scoped state reads/writes; remove reliance on a source-shipped host secret, then plan credential/token handling and compatibility without exposing values. No security behavior was changed in this audit.

### A2 — High: stale whole-state writes can overwrite another gathering

Evidence: [`saveSharedState`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/app.js#L501) sends the whole `appState`; [`writeState`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/github-state-worker/worker.js#L201) reads GitHub's latest SHA but builds current data from the submitted snapshot. It preserves history, not a merge of independently changed live event fields. Retrying a 409 still reuses that snapshot.

Local mock reproduction: the service contained a newer title for gathering One. An older client snapshot changed only gathering Two but retained One's old title. The accepted PUT restored One's old title. This can affect settings, responses and accounts, not only titles. Single-browser switch isolation tests do not cover this multi-device failure mode.

Separate task: introduce an explicit version/conflict or scoped-update protocol and concurrent-client regressions, preserving existing data. Do not describe current SHA retries as protection from lost updates.

### A3 — High: media ownership is not keyed by gathering

Evidence: [`github-state-worker/wedding-media.js`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/github-state-worker/wedding-media.js#L27) checks access to the requested event, then creates an identity from household/category/QR/name without retaining the event in session ownership. The [`uploads` prefix/list](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/github-state-worker/wedding-media.js#L52) is account-wide; Dropbox paths in `github-state-worker/dropbox.js` also omit gathering IDs.

An in-memory R2 reproduction created sessions for the same synthetic account in two gatherings, submitted a sharing link through One and retrieved it through Two. The frontend's event-keyed cache/session request does not change that server scope. The single Dropbox connection is intentionally shared; per-event published folder URLs are correctly stored on the event, but they do not isolate uploaded receipts/files/links.

Separate task: decide and implement event-keyed gallery/session ownership with a migration/access plan for legacy media. Preserve the shared Dropbox connection and existing files; do not hide this behavior behind a documentation-only claim of isolation.

### A4 — High for legacy data: Christmas menu-version normalization replaces definitions

Evidence: [`normalizeState`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/app.js#L260) replaces Christmas `items` with `christmasItems()` whenever `menuVersion` differs, retaining claims only for matching IDs. User-added/renamed/adjusted definitions can be discarded. This is holiday-specific migration behavior outside the common capability model.

A local synthetic-state reproduction set a custom Christmas item and removed the version marker; normalization removed that item. It does not mean every current save loses data: the path is conditional on an absent/older/different marker.

Separate task: design a non-destructive schema upgrade that preserves authored item definitions and valid claims, with legacy-state regression fixtures. No migration was run against production data by this audit.

### A5 — Medium: Wedding Party heading edits carry across subpages

Evidence: [`renderWeddingPartyPageHeading`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/app.js#L1275) reuses `#weddingPartyHeading`/`#weddingPartyKicker` for role/member, Responsibilities, Details, Timeline, experience and custom headings. [`staticTextElements`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/inline-editing.js#L60) excludes those nodes from ordinary page-bound fields; generic selection can still register them through [`ElementEditor`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/element-editor.js#L224). [`storeText`/`applyText`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/element-appearance.js#L178) use the same element selector for a content override.

A local Chromium reproduction edited the Responsibilities heading, flushed the edit, then opened the shared Details subpage. The edited heading followed it instead of that subpage's generated heading. Common title-formatting groups are not the problem: the **words** are stored against a reused node instead of a page/member identity. This violates independent page content.

Separate task: bind editable heading content to its owning page/member, or deliberately treat computed role/name headings as computed and route edits to canonical data. Preserve per-page words and shared title/introduction typography; add cross-subpage/role regressions.

### A6 — Medium maintenance gap: optional browser tests still describe removed UI

Examples: [`scripts/verify-rsvp-flow.cjs`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/scripts/verify-rsvp-flow.cjs#L22) clicks removed `#rsvpButton`; [`scripts/verify-page-actions.cjs`](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/scripts/verify-page-actions.cjs#L47) expects page-local `[data-page-actions]` even though `PageActions.sync()` removes those and uses toolbar actions. Some other historical scripts assume single-click typing or a sidebar Save button.

These scripts are not part of `npm test` or current PR validation, so passing CI does not validate them. This is a verification/documentation gap, not evidence that every current UI flow is broken. Source mismatches were verified; these obsolete scripts were not repaired or used as passing release evidence in this documentation-only task.

Separate task: inventory/update or retire obsolete harnesses and consider automating the maintained browser checks. Do not weaken current application behavior to satisfy old selectors.

## Scope questions and unverified operations

- The footer editor writes the name to global `sharedSite.footerName` ([render](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/app.js#L1546), [editor](https://github.com/kasstmaster/themeyersgatherings/blob/e6643632b9bdc9745388567af23a18c6fcc90b92/app.js#L1660)). Accounts and the chooser also have intentionally website-wide scopes. The footer is documented as global identity; confirm whether that is still intended before a separate scope change. It was not silently converted to event data.
- `github-state-worker/wrangler.toml` still dispatches AnyList to `kasstmaster/thanksgiving`, while this repository contains `sync-anylist.yml`. This is the checked-in target, not a verified deployment error. Confirm which repository actually runs the job and holds its secrets/variables.
- Actual Worker runtime secrets, token permission scopes, R2 existence/content, Cloudflare accounts/DNS/TLS/routes, AnyList service behavior and Dropbox authorization/folder settings were not inspected or changed. Repository configuration alone does not prove deployed configuration.
- No live shared-state endpoint was fetched, since GET can itself archive completed events. No account/private JSON or credentials were requested. No production data reconciliation or restore was attempted.
- Same-browser/local-state checks cannot prove concurrent-client safety, all historical saved selector combinations, all party-role pages, Safari/iOS layout, native browser sharing/printing or live integration correctness.

## Validation and limits

Executed for this audit:

- `npm test`: **39 test files passed**, none failed.
- Read-only ESLint correctness scan: **70 files, 0 errors**; unused-code scan: **31 files, 0 errors**. These existing audit utilities are environment tools, not repository npm scripts; the instructions do not assume they are installed for every contributor.
- `node scripts/build-domain-site.js /tmp/docs-audit-build-20261027` and `/tmp/docs-audit-build-after-20261027`: both passed. All **44 generated files were byte-identical** before/after documentation edits.
- Local-only Chromium `verify-shared-gathering-builder.cjs`, `verify-shared-information.cjs` and `verify-count-list-formatting.cjs`: all passed. These cover existing/new gatherings and custom pages, autosave/switch/reload, desktop/mobile, canonical Wedding Details/Timeline, and count-list style isolation.
- Disposable in-memory Worker/GitHub/R2 checks confirmed A1–A3. Local browser/synthetic-state checks confirmed A4–A5. These expected findings are not fixed and are not presented as passing architecture guarantees.
- Validated **41 relative Markdown links across 9 documents**, including local anchors; `git diff --check` passed. Final file-scope verification is restricted to Markdown documentation/development instructions. Historical reports retain their dated results rather than being relabeled as current runs.

No live deployment/authentication/sync/upload, actual print dialog, native email sharing, real invitation scan or full legacy-browser-harness sweep was performed. Live CI/release statuses, if checked while publishing this documentation, are separate from these local application checks. This audit intentionally leaves application defects and infrastructure/configuration decisions for follow-up work.
