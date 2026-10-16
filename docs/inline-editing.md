# Editing the website

Sign in as the host and choose **Edit website**. Only the host sees editing controls. **Done editing** returns to the normal page and hides editing tools; guests continue to see the normal site. Use **Save** within an editor to publish that edit, or **Cancel** to discard its draft.

- Edit controls appear beside dates, addresses, the header image, footer, page text, notes, responsibilities, and menu items.
- Use **+** beside a tab group to add a page. Bride & Groom pages remain private to the host, and Wedding Party pages remain limited to the party audience. Other new pages are shared with the audience for that tab group.
- Use **Edit title** to rename a tab and **×** to delete it. Deletion asks for confirmation. Removing a built-in tab hides its page while retaining its underlying data; removing a created Bride & Groom or custom page removes that page.
- Images, videos, party member management, menu additions, and claim tools open inside the relevant page. These use the existing upload/storage handlers.
- Open RSVP while editing to add, rename, or delete meal options directly in that page. Saved RSVPs retain their previous meal selections if an option is renamed or removed.
- Accounts and invitation templates keep their dedicated management tools.

Text editors support the existing Markdown formatting and variables: `{date}`, `{home}`, `{church}`, `{venue}`, `{registry}`, and `{monetary}`.

## Linked details

The date is stored once per gathering and reused by its header, invitations, and `{date}` text. Ceremony/reception details and registry links also reuse their existing event fields.

The home address is shared by the footer, gathering header, invitation address fields, and `{home}` text. Editing any of those address fields updates the others. Gatherings with the same home address update together; gatherings configured with a different address keep their location. The footer name is shared across gatherings. Ceremony and reception addresses are separate locations and stay separate from the home address.

## RSVP lists

Guests attending excludes households with zero adults and zero children. A separate Not attending section includes declined individuals, including declined members of households that have other people attending. The host's own entry shows **Host**, counts, and a bold italic Times New Roman attendance status without repeating “The Host”.

## Verification

Run `npm test` for the data and state checks. The optional browser regression check uses Playwright and system Chromium:

```sh
# Serve the repository locally on port 8041, then in another terminal:
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-inline-editing.cjs
```

`BROWSER_TEST_URL` and `CHROMIUM_PATH` can override the local URL and Chromium executable. The check blocks all external requests and strips the live shared-state URL before using isolated test data. It covers saving edits, tab deletion confirmation, RSVP meal changes, shared-address propagation, persistence, private host controls, and desktop/mobile layout.
