# Editing the website

Sign in as the host and choose **Edit website**. Only the host sees editing controls. **Done editing** returns to the normal page and hides editing tools; guests continue to see the normal site. Use **Save** within an editor to publish that edit, or **Cancel** to discard its draft.

- Edit controls appear beside dates, addresses, the header image, footer, page text, notes, responsibilities, and menu items.
- Use **+** beside a tab group to add a page. New pages include a title, page content, and editable text above the title. Blank text retains its Edit control while editing. Bride & Groom pages remain private to the host, and Wedding Party pages remain limited to the party audience. Other new pages are shared with the audience for that tab group.
- Use **←** and **→** above a tab in edit mode to move it within its tab group. The order is saved for that gathering and applies to everyone with access to those tabs.
- Use **Edit title** above a tab to rename it and **×** above the tab to delete it. Text-edit buttons float directly to the right of the text, and page-edit buttons float over the page container’s top-right corner. Edit controls stay outside document flow and clear of the bottom gathering toolbar, so enabling edit mode preserves the normal page layout. Clicking Edit text, Edit page, or Edit title turns the content itself into an input in the same location. Click or tab out to save and return to normal view; there are no separate Save/Cancel buttons. Page titles and bodies can be edited together before focus leaves the page. Single-tab bars stay hidden. Deletion asks for confirmation. Removing a built-in tab hides its page while retaining its underlying data; removing a created Bride & Groom or custom page removes that page.
- Images, videos, party member management, menu additions, and claim tools open inside the relevant page. On Wedding Party → Attire, edit mode automatically overlays the images and videos editor within the normal content area below the introductory text, preserving that area’s dimensions. These use the existing upload/storage handlers.
- Open RSVP while editing to see, add, rename, or delete all meal options directly in that page. Each option can be available to adults and children, adults only, or children only, with no fixed number of options. The child count is inside the Attending box; each named person has their own attendance selection. Renaming an option updates its saved RSVP selections too. Removing an option keeps existing RSVP selections for the host’s historical counts, while removing it from new meal choices.
- Accounts is available to the host at the end of the event summary row, including outside edit mode. Templates remains a regular host-toolbar button beside Sign in to account, both inside and outside edit mode.

Text editors support the existing Markdown formatting and variables: `{date}`, `{home}`, `{church}`, `{venue}`, `{registry}`, and `{monetary}`.

## Linked details

The date is stored once per gathering and reused by its header, invitations, and `{date}` text. Ceremony/reception details and registry links also reuse their existing event fields.

The home address is shared by the footer, gathering header, invitation address fields, and `{home}` text. Editing any of those address fields updates the others. Gatherings with the same home address update together; gatherings configured with a different address keep their location. The footer name is shared across gatherings. Ceremony and reception addresses are separate locations and stay separate from the home address.

## RSVP lists

Meal totals appear on a separate row below the adult and child totals. Guests attending excludes households with zero adults and zero children. The Not attending summary section opens its own list between Guests attending and Families invited and includes declined individuals, including declined members of households that have other people attending. The host's own entry shows **Host**, counts, and a bold italic Times New Roman attendance status without repeating “The Host”.

## Verification

Run `npm test` for the data and state checks. The optional browser regression check uses Playwright and system Chromium:

```sh
# Serve the repository locally on port 8041, then in another terminal:
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-inline-editing.cjs
```

`BROWSER_TEST_URL` and `CHROMIUM_PATH` can override the local URL and Chromium executable. The check blocks all external requests and strips the live shared-state URL before using isolated test data. It covers saving edits, tab deletion confirmation, RSVP meal changes, shared-address propagation, persistence, private host controls, and desktop/mobile layout.

Run `node scripts/verify-edit-layout.cjs` with the same Playwright setup for exact before/during/after layout comparisons across wedding pages, notes, menus, and RSVP at desktop and mobile widths.

## Sign in to an account as host

Choose **Sign in to account**, select a household, and choose a person when the household has multiple adults. You retain your host session while using the selected account's normal gathering access, party pages, RSVP, contributions, and upload tools. Changes are saved under that account. **Leave account** restores your original host gathering and page.

Plus-one permissions are saved only for the gathering shown when Accounts was opened. Refreshing shared data preserves each viewer's current gathering, including while an RSVP is open. RSVP forms are bound to the account and gathering where they opened; a stale form cannot save into another gathering.

RSVP deadlines are per gathering. In Edit website, use Edit RSVP deadline beside the header’s RSVP-by date. This is the same date used on invitations; clear it to remove the deadline. Guests can edit all RSVP options through that date in America/Los_Angeles time. Starting the following day, only attendance and the children attending count can change. Guest choices/names, meals, and dietary notes remain saved, including when someone declines and later attends again. Hosts outside an account session can still correct options.

In the host toolbar, **Colors** changes only the current gathering’s buttons, text/accents, toolbar/footer, background/headings, header, page containers, inner containers, text, and borders. Save colors applies the selection; Reset colors restores that gathering’s default palette. **New Gathering** creates a standard gathering with its own name, date, address, empty menu, host notes, RSVPs, invitation settings, and account permissions. It does not copy Wedding features or another gathering’s claims/RSVPs. Give accounts access and invite them from the new gathering’s Accounts section.

Run `node scripts/verify-gathering-management.cjs` with the browser setup above to verify creation, independent colors, saved state after reload, standard page layout, and guest access.

Templates, Colors, and New Gathering remain visible and usable in the centered host toolbar both inside and outside edit mode. **Text and accents** consistently updates section labels (including The Meyer’s Table), summary totals, and outer page borders in every gathering, including newly created gatherings; an explicitly chosen Borders color takes precedence for borders.

On Wedding Party > Responsibilities, enabling edit mode replaces the public responsibilities list with the party-member editor. Each member’s Edit button reveals their responsibilities and pages. Done editing returns to the normal responsibilities list.

Editing stability: direct text/page/title saves update their displayed content without rebuilding the page, so the click that leaves an input still works. Inline member/media/menu controls keep their DOM and focus while autosaving; opening an editor preserves expanded member cards. Background loads skip unchanged state, older overlapping requests, and active editors/dialogs. Pending direct and inline edits flush when leaving edit mode or hiding the page; stale hidden editor controls are not committed during a refresh.

Run `node scripts/verify-editing-stability.cjs` with the browser setup above for shared-state race checks, cursor/focus preservation, automatic member editing, blur-save click transitions, lifecycle saves, and mobile overflow checks. The layout comparison checks page and toolbar geometry and typography before, during, and after edit mode.

Accounts has square invitation number boxes under an Inv # heading beside each adult, followed by a +1 checkbox column. QR, Inv, and Delete are grouped on the right side of each account toolbar. Unassigned people default to Inv #1. The print quantity is derived from the distinct numbers assigned to the current people, so 1, 2, 2 prints two invitations. There is no separate count beside Inv; unused numbers do not produce extra printed copies. Signing in by a person’s normal name or AnyList alias opens RSVP only for their invitation’s adults and guests. Children remain a count per invitation. Saving combines household totals for hosts while preserving other invitations’ attendance, meals, dietary notes, guests, and children. Existing household children are initially retained on invitation #1. The sign-in banner shows “Signed in as:” followed by the signed-in person’s surname (or Host).

Run `node scripts/verify-invitation-groups.cjs` for account assignment, real person sign-in, surname banners, gathering isolation, invitation-scoped RSVP preservation, and deadline checks.

**History** in the host toolbar opens read-only records for each completed date of the current gathering. Snapshots include frozen account names/addresses/children and invitation assignments, invited households, individual RSVP attendance/declines, unanswered invitations, children totals, meal/dietary choices, requested menu items, contribution claims, location, and host notes. Attendance reflects recorded RSVPs, not an independent check-in. Later account edits, deletions, syncs, or event changes cannot change an existing snapshot.

A gathering completes after its full calendar date in America/Los_Angeles time. The browser checks for completed dates on load/save and every minute. The shared-state Worker captures snapshots on reads/writes and an hourly scheduled trigger, even with no website visitors. AnyList sync captures completed events before changing account details. Existing server snapshots take precedence over stale browser state, and conflict retries re-read and preserve the latest stored history.

After a gathering ends, History offers **Start next gathering** with a future date. This keeps the layout, colors, address, host menu setup, and invitation configuration; it clears RSVPs, contribution claims, guest-added dishes, and host notes, and resets invitation/access/+1 permissions for that gathering. Other gatherings retain their permissions. The RSVP deadline moves by the same advance interval (or stays unset if cleared). Changing a completed gathering’s date through its date editor also starts a fresh occurrence and preserves the old date. New years appear as additional dates under the same gathering’s History button. The deployment workflow includes the shared history module and the Worker’s scheduled trigger.

Run `node scripts/verify-gathering-history.cjs` for completed-date capture, frozen deleted-account information, read-only reports, recurrence resets, date selection, reload persistence, and host-only controls. `test/history-worker.test.js` checks unattended scheduled archives, immutable history on saves from older clients, and archive creation before account deletions or event rollover.

Deliberate saves are marked so backup recovery does not resurrect deleted accounts or restore the prior year’s RSVP records after starting the next occurrence. Backups remain available when the primary copy is unreadable. A read-only repository seed does not overwrite a deliberately saved local state.
