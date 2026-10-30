# The Meyers Gatherings

A shared, vanilla JavaScript application for family gatherings, RSVP journeys, potluck planning, invitations, and photos/videos. Thanksgiving, Christmas, Wedding, and newly created gatherings use one builder/editor; Wedding enables additional pages, party roles, attire, and meal choices.

The primary website is **https://themeyers.ilymmd.com/**. GitHub Pages remains a compatibility entry for existing invitation links. Source lives in this repository; live shared JSON is configured separately through the Cloudflare service Worker.

## Guides

- [Editing and host controls](docs/inline-editing.md)
- [Architecture and data scopes](docs/gathering-architecture.md)
- [Builder implementation and persistence](docs/gathering-builder.md)
- [Invitations and QR codes](docs/invitations.md)
- [Hosting and domain configuration](docs/custom-domain.md)
- [A1/A2 security implementation and approval-gated rollout](docs/state-security-rollout.md)
- [Private backup and no-write recovery check through GitHub Actions](docs/cloud-private-backup.md)
- [Current documentation and architecture audit](docs/documentation-architecture-audit.md)
- [Permanent development and documentation rules](AGENTS.md)

## Current gathering behavior

All users sign in to the gathering-selection page. Guests enter First Name and Last Name; the Suffix step appears only for a recognized matching name with a recorded suffix. Available gatherings depend on their household's **Give Access** setting. Account QR links restrict name lookup to one household; they do not replace the name-entry flow.

Selecting a gathering opens its RSVP entry surface. Guests and wedding party members initially see **Photos & Videos**; hosts start on **Bride & Groom** for Wedding and **Notes** for standard gatherings. The **RSVP** button opens the questions. Its icon shows unanswered, attending, or declined status; gathering-selection cards also show submitted response status. From questions, X/Escape returns to the same gathering's information surface; closing that surface returns to All Gatherings. A completed Wedding RSVP opens Registry; standard completion returns to gathering selection. Once every adult in an invitation group declines, Save my RSVP finishes at attendance without further questions, clears that group’s children/guest selections and releases its dishes. Partial declines keep the group’s dishes. New dish selections are attributed to the invitation group; another group’s selections remain intact. Legacy household-only dishes are preserved when ownership across multiple invitations is unknown, and released when the whole household declines.

The fixed toolbar retains the current role's permitted options across gathering pages, questions, and dialogs. Gathering-specific options are hidden on the chooser. **All Gatherings** is the home action; **Photos & Videos** follows it. **Print Page** offers Print and Email in one dialog. Hosts also have **Edit/Done** and **Create Gathering**; their main toolbar uses icons with accessible names and hover labels. Guests retain visible labels.

Standard gatherings provide potluck dishes and host Notes. Wedding adds Bride & Groom, Registry, guest/party Attire, Details, Responsibilities and personal pages. Timeline is a shared subpage of Bride & Groom and wedding-party information. Details content is shared between its intended Wedding locations. Role-based Attire shows the appropriate Ladies/Gentlemen panels. These are extensions of the shared editor, not separate builders.

## Host editing and planning

Use **Edit** after Print Page. It becomes **Done** while the dark editor sidebar is open. Click an element to select it; double-click editable text to type. One Format panel provides applicable text, alignment, lists, background/image/opacity, and border controls. **Use Button** follows a selected button while editing; **Container** selects its parent. The two gap actions support positioning and sizing spaces. **Text effects** adds shadow color, opacity, offset/blur and outline color, opacity/width. Reapplying an effect replaces older effects in the selected text and persists through Done/reload. Bottom spacing automatically clears the visible fixed toolbar, including mobile safe-area padding.

The shared formatting watcher ignores typing and editor-only updates to keep editing responsive. Text autosaves after a short pause (currently 800 ms); many appearance controls save immediately. Done flushes pending edits. There is no general Save or Done button in the sidebar. Undo/Redo cover the current editing session. Structured controls may still have Apply, and management dialogs have their own actions. See the [editing guide](docs/inline-editing.md) for exact controls and exceptions.

Formatting groups apply to matching elements **within the selected gathering**, including its RSVP pages. Titles and introductions are separate groups. Outer/inner containers, count values/titles, count lists, dish-status buttons, and selected/unselected toolbar/tab/button states have distinct groupings. Rich page-content text boxes keep their own formatting. Words and page content remain independent. The chooser uses its own `gatheringHome` settings. See the audit for remaining scope violations.

The sidebar provides **Menu / Templates** and **Accounts / History**. Menu edits potluck categories, items, quantities and units, or Wedding meal choices. The host **Attending** list includes each household’s claimed dishes once, followed by any other existing contributions and **Dishes still needed** at the bottom. There is no separate dishes-needed count/dialog or host Menu page. Wedding meal selections remain with their attendees. The compact **Copy menu** action exports one list with claimed/needed status and no claimant names. In RSVP, fully claimed dishes remain in their original categories, checked and unavailable to a different household.

Other host counts open Invited, Attending, Not attending, and No Response lists. Counts display adults/children; list totals include households. These details and claimant names are host-only. The A1/A2 implementation adds server-side role views and permitted mutation checks; guest name-only identification still does not prove identity. See [access limitations](#access-and-data-protection-limitations).

Wedding Party heading and introduction words are saved per built-in subpage, member, or custom-page ID. Editing Responsibilities, Details, Timeline, or a custom heading does not rename another page or member. Titles and introductions keep their existing Wedding-wide formatting groups. Older reused-heading records are retained: an unambiguous original is shown only on its owning page; ambiguous copies are kept for recovery and never applied across pages.

## Accounts, children, and invitations

Accounts are website-wide household records. **Give Access**, **Invite**, invitation quantities/group membership and guest allowances are keyed by gathering. Invite controls invitation output and invited totals; it does not grant sign-in access. A small person icon beside a name opens that household's session for host preview. The authenticated host retains host controls; **Leave account** restores their session. The Accounts footer has **Sync** and **Save** side by side. Family headings display in capitals throughout popup lists; Accounts groups people by surname within each account (even across invitation numbers), keeping different surnames separate and **Inv #** and **+1** on each family-heading row with their existing typography. Individual invitation assignments remain unchanged.

Guests keep the same name-entry and existing QR flow; no household code or email step is added. Host access is hidden: enter the Host password in **First Name** and choose **Next**. Entries reaching the 24-character minimum are masked and submitted as password candidates to the server; there is no Host button or separate password input. The existing Worker Secret remains the only source of the password, and a successful Host request clears every name field before opening the Host gathering chooser. Normal guest names keep the existing steps. Each adult responds separately. Child selection uses saved household children, **No Children**, and **Another child** for additional names; unchecking an added name removes it. Guest choices and named guest allowances depend on gathering capabilities. Wedding meal cards use the attendee and child data; meal audiences distinguish adults, children, or both. Deadline handling permits attendance updates while restricting later changes to named guests/meals where configured. It is no longer a children-only numeric counter.

Templates opens a full-page invitation editor with the shared dark sidebar, full-width controls, always-visible Values/Background options, and a separate formatting scroll area. Save/Preview are in the sidebar; Done stays in the Host toolbar. Horizontal-center snapping is retained. Editor, preview and downloaded invitations share text rendering; fit warnings measure visible text and distinguish width from height. Gathering name, date, time, RSVP-by and address are edited and saved together in **Manage Gatherings**; QR mode and template assignment stay in Templates. Incomplete templates can be saved; missing required values and unplaced dynamic fields receive red editor borders as reminders. **Copy from** reuses another gathering’s layout and formatting with a replacement image and the current gathering’s values. A template belongs to its gathering, with original-image coordinates, text fields and QR placement. Artwork is PNG/JPEG/WebP runtime data in R2, not committed invitation images. **Add image** adds separate draggable/resizable image elements, with optional proportion locking, that appear in previews and downloads. Invitation downloads use account quantities and invitation groups, producing uniquely named PNGs/ZIPs. Account-specific QR output requires an existing `qrToken`; general-login QR output does not. Email invitation output uses the browser's file-sharing API when supported, with download as the fallback. [Invitation details](docs/invitations.md).

Guests can expand **View Past Gatherings** below the current choices for earlier years they were invited to or attended, even without a current invitation. Completed current-year gatherings stay at the bottom of selection. The Host edit toolbar’s **Manage Gatherings** option supports date-specific rename, confirmed cancellation, confirmed deletion and 30-day restore; backups and Dropbox are preserved. See [yearly gathering lifecycle](docs/gathering-lifecycle.md).

History snapshots completed gatherings by date using the Los Angeles calendar day. Snapshots preserve their event/account view. Starting the next occurrence deliberately resets responses, claims and access/invitation selections while retaining layout/setup; it also clears Notes. All menu items, including guest-added custom items, remain available with claims cleared. This is an explicit host action, separate from ordinary editing. The service Worker also runs hourly history capture.

## Photos & Videos and Dropbox

Every gathering uses the same Photos & Videos page and `/wedding-media` service. **Share Your Photos & Videos** reveals **Upload** or **Share Link**; choosing one hides the other. Upload progress/errors remain visible, and the gallery refreshes after a successful complete batch. There is no manual Refresh button.

The host can set the **View & Download** label and folder URL through its editor. Until a URL is supplied, the link is disabled. The description recommends waiting about a month before downloading, allowing everyone time to upload, and explains that downloading is optional. This published link is gathering-specific. Dropbox folder sharing permissions control access/downloads.

Uploads use the hosts' single Dropbox connection. The website gallery lists account-owned receipts, links and legacy files; it does not fetch new Dropbox file bytes. **Current limitation:** that account gallery and its storage namespace are shared across gatherings; only session admission and the manually published folder-link settings use the gathering ID. This is a confirmed isolation issue in the audit, not a documented guarantee of per-gathering gallery separation.

To provision Dropbox on an existing service deployment:

1. Create/configure an App Folder Dropbox app with `files.content.write`.
2. Register `https://<service-worker-host>/dropbox/callback` as its exact redirect URI. The checked-in frontend currently targets `curly-sun-ef0f.kassandraraudman.workers.dev`; confirm the deployed service before configuring callbacks.
3. Store `DROPBOX_APP_KEY` and `DROPBOX_APP_SECRET` as encrypted secrets on the **service** Worker, not the static-site Worker.
4. As host, open Photos & Videos → Share Your Photos & Videos → Upload → Connect Dropbox. Complete authorization and return to the site. Check connection is host-only.

The service uses offline OAuth/PKCE and private R2 connection records. Transfers use 8 MiB chunks. The current destination code uses `/Wedding Uploads/<account>/<uploader>/...` for all gatherings; the Dropbox app's outer folder name is configured by Dropbox, not by this repository. No live authorization/upload was performed during the documentation audit.

Wedding attire-tip videos are a separate host feature: YouTube/Vimeo links or MP4/WebM/Ogg uploads up to 50 MB, stored under `attire-videos/` in the existing R2 bucket with byte-range playback. This size limit does not describe Dropbox photo/video transfers.

## AnyList Address Book sync

Accounts → **Sync** calls the host-authenticated service, which dispatches `sync-anylist.yml`. The job reads AnyList through the Node `anylist` package; it does not mutate the AnyList list. It reconciles categories/people into website households, including names, addresses, children from item notes, aliases and category IDs. It adds accounts, updates linked accounts, skips ambiguous matches, and migrates relevant name references while preserving website-owned permissions and existing QR tokens. Missing QR tokens are backfilled. It is **not append-only**.

The job re-reads the latest state and retries conflicting GitHub writes. Its logs include category/household names as well as counts, so logs must be treated as personal data. It uses an unofficial service; upstream AnyList changes can require adapter/dependency updates.

Configure these in the repository that actually executes the workflow:

| Kind | Name | Purpose/default |
| --- | --- | --- |
| Secret | `ANYLIST_EMAIL`, `ANYLIST_PASSWORD` | AnyList credentials |
| Secret | `STATE_REPOSITORY_TOKEN` | Contents read/write access to the state repository |
| Variable | `ANYLIST_LIST_NAME` | `Address Book` |
| Variable | `STATE_REPOSITORY` | Target state repository; required |
| Variable | `STATE_BRANCH` | `main` |
| Variable | `STATE_PATH` | `data/app-state.json` |

The dispatch supplies required `sync_id`; scripts read it as `SYNC_ID`. The service's `GITHUB_TOKEN` needs Actions read/write on the workflow repository and Contents read/write on the state repository.

**Configuration requiring confirmation:** `github-state-worker/wrangler.toml` currently dispatches to `kasstmaster/thanksgiving`, while this repository also contains the workflow. Do not assume moving/renaming the website repository changed the dispatch target. Confirm the intended execution repository, its secrets/variables, and live Worker configuration before a future sync change.

## Local development and tests

Use Node.js 24 for the application tests/build, matching CI. AnyList's separate workflow currently uses Node.js 22 and installs its dependency with `npm install --ignore-scripts`. The static frontend and Node test suite do not require an application bundler or a running Worker.

```sh
python3 -m http.server 8041 --bind 127.0.0.1
# In another terminal:
npm test
node scripts/build-domain-site.js /tmp/meyers-site-review
```

Open `http://127.0.0.1:8041/` for local inspection. The checked-in HTML points at a live backend; use the provided **local-only browser harnesses**, which strip that URL and block external requests, for synthetic editing tests. Do not manually sign into a live backend or submit test RSVPs/uploads as part of a documentation audit.

The build refuses to overwrite existing `themeyers/` or `themeyersgatherings/` output directories; choose a new output directory for each run. It stages one frontend, hashes local asset URLs, and emits a legacy redirect. `.domain-site/` is ignored.

Selected browser scripts require locally available `playwright` and `/usr/bin/chromium`. If needed, install Playwright locally without committing dependency changes (`npm install --no-save --package-lock=false playwright`) and provide Chromium through your environment. For the shared-builder harness:

```sh
node scripts/verify-shared-gathering-builder.cjs
```

It creates synthetic gatherings, edits content/styles/custom pages, switches before autosave, reloads, and checks desktop/mobile isolation. Browser scripts are not automatically run by `npm test`. Some older scripts still target removed controls; consult the [audit validation inventory](docs/documentation-architecture-audit.md#validation-and-limits) before treating them as release checks.

## Persistence and configuration

`appState.events[gatheringId]` stores gathering data and designs. `gatheringHome` stores chooser formatting; `accounts`, `invitationTemplates` and `sharedSite` contain intentionally website-wide records, with event ownership on templates and gathering-keyed account settings. Browser storage retains a primary copy, a backup and pending-save state. Normalization upgrades older records; see the audit for a destructive Christmas menu-version exception.

`index.html` supplies the service URL. Startup restores a server-validated session or shows sign-in; anonymous visitors do not download shared application state. Server sign-in returns an authorized view and a revision. Hosts receive their administrative state; guests receive permitted gatherings and their household's data, without other account/QR records or private planning pages. On the canonical site, a Secure, HttpOnly, SameSite=Strict first-party cookie restores sign-in after reload or browser reopening. Newly signed-in guests stay signed in for up to 30 days; hosts keep their eight-hour limit. Restoration does not extend expiration. **Logout** is at the far right of the name bar on the gathering selection page. Passwords/tokens are not stored in local/session storage or application JSON, and no production credential is compiled into the frontend. Different-household QR links still require their normal name entry. Guest sign-in finishes after Last Name when no suffix is recorded. Only a recognized matching name with a suffix opens the existing suffix step; no name list or suffix choices are returned.

Edits are changes against an acknowledged baseline, sent with `If-Match`. The service uses the exact GitHub blob SHA for its conditional write. Stale snapshots/write races return 409 and are not blindly retried. The shared warning retains the local draft, offers a private download and an explicit load-latest action. Old pending browser copies are quarantined for recovery instead of automatically replaying them after sign-in. Background reads do not advance the write revision until their data is adopted. See the [protocol and rollout guide](docs/state-security-rollout.md).

The repository fallback is a public seed, not the live private database. The production build refuses fallback account/QR/RSVP/claim data. Without a service URL, local synthetic inspection is possible, but live authorization/sync requires the service. Private live state remains in its existing repository/schema; no bulk data rewrite or QR rotation is part of this change.

| Location | Non-secret configuration | Secret names only |
| --- | --- | --- |
| `github-state-worker/wrangler.toml` | `GITHUB_REPOSITORY`, `GITHUB_BRANCH`, `GITHUB_STATE_PATH`, `ALLOWED_ORIGIN`, `ALLOWED_ORIGINS`, `GITHUB_WORKFLOW_REPOSITORY`, `GITHUB_WORKFLOW_BRANCH`; R2 binding and hourly cron | `GITHUB_TOKEN`, approved replacement `HOST_PASSWORD`, `AUTH_MIGRATION_READY`; optional `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET` |
| Workflow execution repository | AnyList state/list variables above | `ANYLIST_EMAIL`, `ANYLIST_PASSWORD`, `STATE_REPOSITORY_TOKEN` |
| Website repository Actions | Deploy both Cloudflare accounts | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DOMAIN_API_TOKEN`, `CLOUDFLARE_DOMAIN_ACCOUNT_ID` |
| `index.html` | Shared-service and fallback URLs | No secrets belong here |

The checked-in state repository target is `kasstmaster/themeyersevents-data`, branch `main`, path `data/app-state.json`. Confirm actual deployed values before maintenance. CORS values are **origins only** (scheme/host/optional port), never repository paths. Provision the configured `INVITATION_BACKGROUNDS` R2 bucket before deploying the service; the current workflow does not create it.

For first-time Worker secret setup, run from the service directory, selecting the correct Cloudflare account:

```sh
cd github-state-worker
npx wrangler@4.151.1 secret put GITHUB_TOKEN
npx wrangler@4.151.1 secret put HOST_PASSWORD
```

Enter values only at the secure prompt. The implementation removes the source-visible host password. Activation requires owner approval, a verified private backup/restore drill, manual replacement of that exposed password, and `AUTH_MIGRATION_READY=verified-backup-v1`. No new guest secret is required. Do not merge/deploy the security branch before that approval; follow the rollout guide.

## Hosting and release

The application is served by `domain-site-worker/`; `github-state-worker/` handles state, uploads, AnyList dispatch, Dropbox and history. They deploy to separate Cloudflare accounts. GitHub Pages remains enabled for legacy links, whose query/fragment is preserved when redirecting to the canonical subdomain.

`.github/workflows/deploy-state-worker.yml` starts on **every main push** or manual dispatch. The security release blocks its first step until the owner-approved repository variable `SECURITY_ROLLOUT_APPROVED=state-auth-v1` is configured after backup/readiness verification. In one sequential job it runs compatibility tests, builds the frontend, preflights both Cloudflare targets and redirect-only Pages publication, deploys the service with the reviewed commit, verifies its protocol/readiness, then deploys and verifies the matching frontend. Active releases are not cancelled by newer runs. Manual dispatch defaults to read-only preflight; use the reviewed security branch for pre-merge checks, never the still-old main workflow. The preflight also rejects a backup whose source blob no longer matches live state. Before merging, Pages must move from application publication on main to the dedicated redirect-only branch; see the [coordinated release procedure](docs/security-release-procedure.md). If the secure-service gate fails, use the secret-safe boolean checks described in the release procedure; never disable that gate or restore an unauthenticated backend. Both credential pairs must remain in their original account roles. It does not install secrets or create the R2 bucket. [Complete domain instructions](docs/custom-domain.md).

`.github/workflows/validate-gathering-builder.yml` runs the Node tests and production build on pull requests and main pushes. `sync-anylist.yml` is a separately dispatched job. Do not confuse those workflows with the GitHub Pages build/deploy or assume a frontend publication deploys the service by itself.

The installable app has its own manifest, rose icons and offline reconnect screen. Its service worker caches only that generic offline page, not live RSVP/account/gallery data. The cache-busting build does not migrate browser storage between origins.

## Access and data-protection limitations

The A1/A2 implementation is prepared for review; production activation is approval-gated. Server sessions and projections prevent anonymous full-state reads/writes and guest administrative actions. Revision-checked changes prevent stale devices from silently replacing newer information. Existing QR tokens/URLs and guest name entry remain unchanged.

Name-only identification is intentionally not strong authentication: someone who knows a valid name may impersonate that guest. It does not grant host access. Existing public-by-URL artwork/attire assets and account-wide media scope (A3) are not redesigned here; A4–A6 also remain open. See the [audit](docs/documentation-architecture-audit.md) and [manual configuration, backup, rollout and remaining risks](docs/state-security-rollout.md). No production credentials, backup or deployment have been changed by the implementation task.

Future changes must follow [AGENTS.md](AGENTS.md), update relevant documentation, and state documentation status in their final task summary.

Claimed dishes under each family in Attending form a compact, undivided list ordered by menu category (mains through drinks), preserving item order within categories and adding no category headings.

In the RSVP contribution questions, “I’ll bring something else” supports multiple custom items. After entering an item’s name, quantity/unit and category, choose **Add another item** to enter the next one. Review shows all items; saving claims each for the current invitation group.

Saved custom dishes remain part of that gathering’s menu for future selection, including future occurrences; clearing claims does not remove the items.

RSVP saves preserve existing dish claims that exceed a later menu limit, allowing unchanged or reduced quantities without permitting additional over-capacity claims. Validation errors appear within the RSVP page.

Dishes already claimed by other invitation groups remain checked and unavailable through deadline/RSVP refreshes, and are never submitted as new selections for the current group.

Under **Edit → Menu**, top buttons open **Potluck**, **Sit Down Dinner** or **Quantity Types**, each using the popup content area without an inner scrolling list. Both menus remain editable regardless of the active plan. Editing either menu does not activate it. For non-wedding gatherings, **Edit → Menu → Dinner plan** selects Potluck, Sit Down Dinner, None or Drinks (alcoholic drinks) for the event’s year. Potluck keeps contribution questions and shows guests only Invited/Attending totals; these totals cannot open private guest lists. Full sit-down dinner skips contribution questions and hides all guest counts. Its private preparation menu lets the host retain dish options and check which to prepare that year. Both menus persist independently when switching plans. Preparation options persist into later occurrences; each new year defaults to Potluck with no preparation choices until configured. Wedding retains its own menus and RSVP behavior.

Guests with invitation-owned dish claims see **Your Dishes** in the gathering toolbar. It opens their dishes and quantities using the shared page layout; **Print Page** prints/emails that list. The option disappears when that invitation has no dishes, or the gathering uses a sit-down plan.

Food uses one shared category order: mains, sides, appetizers, desserts, then drinks, while preserving each category’s item order. This applies to food lists, RSVP dish choices, menu editors and menu exports.

Each non-wedding menu editor has **Copy from**: choose another gathering and its Potluck or Sit Down Dinner menu, then Copy items. Only missing dish names are added (ignoring case and extra spacing). Existing items, claims, yearly preparation selections and the active dinner plan stay unchanged; custom quantity types are matched or copied by label.

Single-unit dish labels omit “1 of 1” and numeric amounts: an ordinary item shows only needed/claimed, while a dozen, case or custom type keeps its type and status. Multi-unit quantities and host editing controls retain their amounts.

While guests answer potluck contribution/menu questions, a fixed top reference bar shows total people Invited, confirmed Attending and the RSVP deadline. It contains no names, uses server-provided aggregate counts and reserves space above the questions on mobile and desktop. It is absent from Wedding, sit-down dinner and unrelated RSVP steps.

Invitation text values support **All caps** in the selected value’s formatting controls. This is saved per value and applies after date formatting without changing gathering data or custom text. Text is vertically centered within its field using the same glyph measurements in the editor, preview, and exports; changing Height adjusts the centering.

Invitation Event Date formatting also offers a plain month/day/year option, such as **November 6 2026**, without ordinal suffixes or a comma.

Invitation templates support multiple selection: Shift/Cmd/Ctrl-click to add or remove elements, or enable **Select multiple** and tap additional elements. Drag a selected element to move the selection together; relative spacing is preserved, movement stays within the artwork, and center snapping uses the group bounds. Undo/Redo reverses/reapplies a whole move. Click an unselected element with multiple selection off to return to individual formatting; Remove selected removes the selection in one undoable action. Selection itself is temporary and is not saved.

Select one added invitation image to reveal **Replace image**. Replacement uploads new artwork and preserves the selected image’s position, box size, and stacking order; Undo restores the previous image. Existing shared artwork is retained for other templates.

Hosts can upload an optional banner while creating a gathering. Empty main and first RSVP banners remain selectable in Edit mode through an upload placeholder, while guests see no empty placeholder. Banner uploads and replacements save independently for each gathering.

The shared gathering-selection, browser, and installed-app icons use the bundled red rose with blue leaves in `assets/icons/`. The original artwork is retained as `rose-source.png`; square PNG and ICO variants preserve transparency and proportions. Icon references and the manifest are versioned to refresh browser caches without changing the installed app identity.

First RSVP-page information below the banner uses the shared largest-fit text sizing: authored lines do not wrap as the container narrows, while intentional line breaks and blank paragraphs remain. Saved font sizes remain the maximum and are restored when space allows. Your Dishes shows only the name for one Item, the amount alone for multiple Items, and the amount plus quantity type for other units (for example, 1 dozen). Claim indicators and “of” totals are omitted, including in print/email exports.

In the first RSVP-page information, a “Kindly RSVP by” deadline uses an abbreviated month and day without a year (for example, **Kindly RSVP by Nov. 7**). Existing long-form deadline wording is shortened for display without rewriting the saved text; unrelated event dates retain their own formatting.

**Manage Gatherings** is available in the Host edit toolbar only; it is hidden in the regular bottom toolbar, including on gathering selection.

Popup cards, their main headings, and X buttons share the count-list container/title/close formatting groups within the current design context. All popup X buttons use the common top-right close-button class. RSVP retains its separate page shell, and dialog widths and specialized form layouts remain content-specific.

Entry screens use **#191F37**, copied from the Wedding toolbar at the time of this change, for loading/startup, sign-in and gathering-selection backgrounds/actions. A one-time chooser-palette update replaces its old backgrounds while preserving content, typography, and unrelated settings. Later chooser edits remain independent and are not linked to the Wedding gathering. Installed-app startup/theme colors use the same navy; icon artwork is unchanged.

Entry buttons have visible white borders on sign-in (Next/Get Started/Back) and gathering selection. A one-time border update preserves existing button backgrounds and subsequent customization.

Back actions in sign-in and RSVP use the same primary-button styling as Next, including width, padding, typography, and borders.

Your Dishes includes **Make Changes**, which opens the existing RSVP dish-selection step without altering saved attendance or claims. Existing RSVP deadline locks still apply. The page reuses the RSVP menu’s fixed invited/attending/deadline reference toolbar; it hides when another page is selected.

Uploaded gathering banners can have optional text over the artwork. Enter **Banner text (optional)** in Create Gathering or select an existing banner and use that field in Format. Select the overlay text itself to use the shared rich-text/font/color controls; double-click to edit its wording. Clearing the text hides the overlay, and removing an image hides its text without deleting it. Main and first-RSVP banner text are independent gathering-specific content; creation initializes both with the entered wording. Existing banners without text remain unchanged.

Rich-text formatting selections are confined to the selected text box, including when a mouse selection extends into neighboring page content. Detached ranges from previous pages are discarded. Banner images and their text remain one anchored layout surface: gaps can be added around the banner, while old internal spacer records are retained but not rendered. Undo/Redo remains available in the fixed edit toolbar during caption formatting; text stays scoped to its gathering.

The shared rich-text format preserves paragraph indentation and nested lists through autosave, Done and reload; Outdent reduces the saved level. Bold/italic/underline applies to the whole selected text box when no text is highlighted, or only the highlighted portion otherwise. Generated gathering information (including the date) exposes appearance controls while its actual values remain managed through gathering information. Date labels share their gathering’s date-formatting appearance group and retain automatic width fitting.

Banner caption autosaves preserve the active text and cursor while typing, including pauses mid-sentence. Saved caption markup is rendered when the text is no longer owned by the editor.

Select any text element and use **Format → Line height** to adjust line spacing (0.5–5 times the font size; 1 is single spacing). This applies to the text box’s lines and paragraphs, including banner captions, dates, titles and buttons. Matching formatting types share the value within the current gathering; page text boxes keep their independent styles. Existing spacing stays unchanged until edited. Line height supports autosave and Undo/Redo.

The non-wedding **Dinner plan → None** option skips food-contribution questions and hides guest counts, food lists and Your Dishes. Hosts can still edit both saved menus without activating either one. Existing dishes, claims and yearly preparation selections are retained for switching back. None is saved independently for that gathering and year; Wedding keeps its separate meal behavior.

**Drinks (alcoholic drinks)** uses the same contribution questions, invitation-group claiming, quantities, Your Dishes, printing and guest aggregate counts as Potluck, backed by a separate alcoholic-drinks menu. Edit it through the **Drinks (alcoholic drinks)** section in Edit → Menu, even when another dinner plan is active. Copy from supports all three saved menus. Switching plans preserves food items, drink items, claims and sit-down selections; guests can only read or claim items from the currently active contribution menu. New yearly occurrences retain both menu catalogs and clear their claims.
