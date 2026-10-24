# Editing the website

Sign in as the host and choose **Edit website**. Only the host sees editing controls. **Done editing** returns to the normal page and hides editing tools; guests continue to see the normal site. Use **Save** within an editor to publish that edit, or **Cancel** to discard its draft.

- Edit controls appear beside dates, addresses, the header image, footer, page text, notes, responsibilities, and menu items.
- A single Enter creates one new line in shared text boxes. Blank lines you enter remain visible; automatic paragraph margins do not add extra spacing.
- Highlight text in a text editor to apply bold, italic, links, a font family, a font size, or Text appearance (text color, highlight color, and text border color, using pickers or hex codes). Font sizes are in pixels (8–96). The same toolbar and renderer are shared by all gatherings, and styled RSVP headings still shrink only when needed to fit their container.
- To edit wedding-party members, open Wedding as host, choose **Edit website**, open **RSVP**, then **Wedding Party → Responsibilities**. Members enter this sub-page by default and see their own role and name above their responsibility text. Attire remains a main tab; its Ladies/Gentlemen panels follow each member's role, while hosts can edit both.
- Use **+** beside a tab group to add a page. New pages include a title, page content, and editable text above the title. Blank text retains its Edit control while editing. Bride & Groom pages remain private to the host, and Wedding Party pages remain limited to the party audience. Other new pages are shared with the audience for that tab group.
- Open a tab’s **Edit** option and use **←** and **→** inside its editor to move it within its tab group. The order is saved for that gathering and applies to everyone with access to those tabs.
- Use the single **Edit** option on a tab to rename or format its text. Reordering and **×** deletion are inside that same editor. Text-edit buttons float directly to the right of the text, and page-edit buttons float over the page container’s top-right corner. Edit controls stay outside document flow and clear of the bottom gathering toolbar, so enabling edit mode preserves the normal page layout. Clicking Edit text, Edit page, or Edit title turns the content itself into an input in the same location. Click or tab out to save and return to normal view; there are no separate Save/Cancel buttons. Page titles and bodies can be edited together before focus leaves the page. Single-tab bars stay hidden. Deletion asks for confirmation. Removing a built-in tab hides its page while retaining its underlying data; removing a created Bride & Groom or custom page removes that page.
- Images, videos, party member management, menu additions, and claim tools open inside the relevant page. On the main Attire tab in host view, edit mode automatically overlays the images and videos editor within the normal content area below the introductory text, preserving that area’s dimensions. These use the existing upload/storage handlers.
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

In **Edit website**, Each logical element has one control: **Edit** for text boxes, counts, buttons, and tab labels, or **Appearance** for containers and backgrounds. Inline words, spans, and a button’s nested label do not get separate controls. Text appearance belongs inside the text editor and applies to highlighted text. **Element appearance** inside the same editor changes the whole text box or button’s background, border, and image. A button’s label, background, and border are edited through that one Edit control. Count values remain calculated and their formatting follows updated totals. Use the color picker or #RRGGBB hex input for background, text, and border colors, with separate transparency sliders. Borders also have width and corner-radius inputs. Add a background image by URL or upload a PNG, JPEG, or WebP, and choose Fill or Show the whole image. Changes preview immediately; Save appearance persists them, Cancel restores the saved appearance, and Reset this element removes its overrides. These settings are separate for each gathering and use the same code for existing and newly created gatherings. Existing color selections remain as defaults. The old Colors toolbar option is removed.

**New Gathering** creates a standard gathering with its own name, date, address, empty menu, host notes, RSVPs, invitation settings, and account permissions. It does not copy Wedding features or another gathering’s claims/RSVPs. Give accounts access and invite them from the new gathering’s Accounts section.

Run `node scripts/verify-gathering-management.cjs` with the browser setup above to verify creation, independent colors, saved state after reload, standard page layout, and guest access.

Templates and New Gathering remain visible in the centered host toolbar inside and outside edit mode. Appearance controls are host-only and appear in edit mode. A shared 32px gap separates the counters from the welcome section and the welcome section from the tabs in every gathering, including newly created gatherings. The main action always reads RSVP.

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

The active main page’s title and introductory line appear below its main tabs, inside the page. Built-in and created pages use this same layout, with sub-tabs following the page title.

Built-in and created pages use the shared page styles in styles.css for heading fonts/sizes, upper text, title spacing, responsive padding, body typography, paragraph/list spacing, and colors. Created sub-pages use the shared inner-panel surface and spacing; their heading level is smaller than a top-level page. Main tabs and sub-tabs use the same tab component with their respective shared surface variables. Changes to these shared defaults apply to existing and future pages without replacing authored Markdown formatting.

A custom top-level Wedding page named **What to Expect** is assigned to guests and the host, excluding Wedding Party members. The guest audience is stored on the page so later title edits retain that visibility. Other shared pages retain their existing audience.

Wedding **Upload Photos & Videos** is a camera action in the fixed toolbar at the bottom of the first RSVP page. It opens the shared full-page dialog shell used by RSVP, with Upload and View Photos & Videos inside and Back/Close controls to return to RSVP. It retains the existing Dropbox and account-private gallery handlers; it is no longer a main Wedding tab.

Upload Photos & Videos does not show Print Page or Email Page actions. Only the host sees Check connection. Under OR, Share Dropbox Link reveals the sharing-link input and Share action.

RSVP and Upload Photos & Videos share the `.fullscreen-flow` color variables and `.flow-panel` container component. Their background, foreground, card surface, and card border colors are defined once; upload sub-tabs and gallery cards consume those same variables.

A single Print icon in the existing gatherings toolbar and the first Wedding RSVP page’s upload toolbar opens Print and Email choices. They export the selected main page or sub-page, including custom pages. There are no separate page buttons, added toolbars, or export actions on RSVP question steps. Host main-page containers mirror the corresponding RSVP panel colors, borders, and corner radius without changing RSVP container styles.

After successfully submitting a Wedding RSVP, the first RSVP page reopens with Registry selected and scrolled into view. Closing without submitting keeps the existing exit behavior. Gatherings without Wedding pages retain their completion destination.

Wedding’s main RSVP page navigation is in the fixed toolbar before Upload. Attire uses a tie icon; Registry, Wedding Party (for eligible viewers), and custom pages use the same toolbar component and saved ordering. Selecting an option opens its page and scrolls it into view. Details has no tab or toolbar option: eligible regular guests and hosts open it by default; wedding party members open Wedding Party / Responsibilities by default. A saved custom What to Expect / Details page retains that default-page identity even after its title changes. Completing RSVP still opens Registry.

Edit mode keeps the same individual-page layout. Next page and Back visit the RSVP editing pages one at a time, including meal options, without submitting an RSVP. The single Edit or Appearance control remains attached directly to each logical element on the current page; no hover is required. Existing text editors remain in place. Run `node scripts/verify-page-toolbar.cjs` for the default-page, toolbar, scrolling, direct appearance-button, editing-page, access, and mobile checks.

Run `node scripts/verify-unified-editing.cjs` to verify single controls for text boxes/buttons/counts, highlighted text colors, combined button appearance, dynamic count formatting, and tab styling without losing icons.
