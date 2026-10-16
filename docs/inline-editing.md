# Editing the website

Sign in as the host and choose **Edit website**. Only the host sees editing controls. **Done editing** returns to the normal page and hides editing tools; guests continue to see the normal site. Use **Save** within an editor to publish that edit, or **Cancel** to discard its draft.

- Edit controls appear beside dates, addresses, the header image, footer, page text, notes, responsibilities, and menu items.
- Use **+** beside a tab group to add a page. Bride & Groom pages remain private to the host, and Wedding Party pages remain limited to the party audience. Other new pages are shared with the audience for that tab group.
- Use **Edit title** above a tab to rename it and **×** above the tab to delete it. Text-edit buttons sit directly to the right of the text, and page-edit buttons sit in the page container’s top-right corner. Deletion asks for confirmation. Removing a built-in tab hides its page while retaining its underlying data; removing a created Bride & Groom or custom page removes that page.
- Images, videos, party member management, menu additions, and claim tools open inside the relevant page. On Wedding Party → Attire, edit mode automatically replaces the normal content below the introductory text with the images and videos editor. These use the existing upload/storage handlers.
- Open RSVP while editing to see, add, rename, or delete all meal options directly in that page. Each option can be available to adults and children, adults only, or children only, with no fixed number of options. The child count is inside the Attending box; each named person has their own attendance selection. Renaming an option updates its saved RSVP selections too. Removing an option keeps existing RSVP selections for the host’s historical counts, while removing it from new meal choices.
- Accounts is available to the host at the end of the event summary row, including outside edit mode. Invitation templates keep their dedicated management tool in edit mode.

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
