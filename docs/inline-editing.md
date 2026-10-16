# Editing the website

Sign in as the host and choose **Edit website**. Only the host sees editing controls. **Done editing** returns to the normal page and hides editing tools; guests continue to see the normal site. Use **Save** within an editor to publish that edit, or **Cancel** to discard its draft.

- Edit controls appear beside dates, addresses, the header image, footer, page text, notes, responsibilities, and menu items.
- Use **+** beside a tab group to add a page. Bride & Groom pages remain private to the host, and Wedding Party pages remain limited to the party audience. Other new pages are shared with the audience for that tab group.
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
