# Editing the website

In the approval-gated A1/A2 implementation, hosts use Host sign-in with a server-checked password; guest name/QR entry has no new code/email step. Sign in as host and choose **Edit** after Print Page in the fixed main toolbar. Host options use icons with accessible names/tooltips. Edit changes to **Done** (checkmark) while editing. The dark sidebar stays on the left and reserves page width; only its formatting area scrolls. Ordinary guests cannot open it. An authenticated host previewing another account retains host controls and a top-right Leave account action.

## Selection and saving

- Click an element to select it; the red outline marks the selection.
- Double-click editable text to type. One click alone does not start typing.
- Highlight text for inline formatting in rich-content text boxes. Shared title/button/tab formatting applies to that component type within this gathering.
- **Use Button** follows a selected button without leaving edit mode. **Container** selects its parent, including a page-navigation group where a custom page can be added.
- Text autosaves after an 800 ms pause; many appearance controls save immediately. Changing selection, finishing editing or switching gatherings flushes pending text. Done is in the main toolbar, not the sidebar.
- The sidebar has no general Save button. Structured fields can still show **Apply**. The Accounts dialog has its own **Sync / Save** footer; other management forms retain their own submit controls.
- Undo/Redo retain up to 50 changes in the current editing session. A new change clears redo. They do not replace durable backup/history. Cross-device revision conflicts pause writes, preserve a private local draft and offer Download my local draft / Load latest information; they do not auto-overwrite newer state. [Security rollout and recovery](state-security-rollout.md).

The fixed sidebar rows are Undo / Redo, divider, Menu / Templates, Accounts / History, divider, ↑ Gap / → Gap, then Use Button / Container. Contextual movement actions appear when supported. Format opens on selection and shows only relevant controls.

## Formatting and layout

Text controls include alignment, bold, italic, underline, font, size, text color, highlight and links. Rich text boxes also offer bullets, numbering and indentation. Blank lines use the shared safe formatter. Dates, URLs and multi-field records use compact structured inputs. Empty editable text slots have a small host-only outline/click area; no placeholder text is saved for guests.

Background controls include color/hex, opacity, image URL/upload, fit and removal. Border controls include color/hex, opacity, width and radius. Uploading a banner replaces its image source instead of stacking an image behind it. PNG/JPEG/WebP uploads use the existing host-authenticated R2 service.

Within a gathering, matching titles, introductions, buttons, tabs, toolbar options, outer containers, inner containers and count components use shared appearance groups. Titles and introductions are independent groups. Count numbers and labels format separately. Count-dialog cards/headings/rows have their own shared groups, isolated from ordinary page styles. Dish buttons have separate available/claimed/bringing groups. Selected/unselected states are separate for buttons, tabs and toolbar options. Rich page-content boxes retain independent typography and inline styles. These classifications are defined in `ElementAppearance.group`; they are not independent implementations per gathering.

The RSVP form is the outer container. Its content panels and count strip use the inner-container group. The chooser has separate website-wide settings and does not inherit a gathering's design. Toolbar background/border and selected/unselected text/icon colors can be edited together for the current gathering. Saved title sizes remain the sizing baseline; automatic fitting shrinks them only enough for the available width.

**↑ Gap** is a vertical strip reserving space beside an element; **→ Gap** is a horizontal band above/below an element. Drag either from the fixed sidebar or select existing spacing/padding to resize it. Placement, direction and size are gathering-specific. Photos-page text can be moved using Move up/down or drag/drop; its title/intro stay above the inner panel and body copy stays inside it.

## Pages, roles, and management

Selecting a tab/page option exposes renaming and Move left/right where supported. The navigation Container offers New page title / Add page. Existing and newly created gatherings use the same page editor; new pages inherit their gathering's formatting but keep their own title, introduction and content. All Gatherings, Photos & Videos and the fixed print/host actions have prescribed positions; movable page options retain their manual order. The details page is accessed through the toolbar rather than a visible main tab.

Menu opens the selected gathering's dish editor, or Wedding meal choices. The separate host Menu page is gone; Dishes needed opens the overview. That list shows still-needed entries before claimed entries and names. Copy menu is a compact action beside the totals and exports statuses without names. All count dialogs use X rather than a redundant Close button.

Accounts manages household records and gathering-keyed permissions. The tiny person icon previews a member's account; host management returns to host context as necessary. History opens archived gatherings and the explicit next-occurrence action. Templates manages event-owned invitation templates.

Wedding retains specialized Attire, Responsibilities and meal-card layouts. The Responsibilities container exposes party-member management through its relevant Format settings. Attire exposes its image/video settings. Party members have role-specific attire, their responsibilities/personal pages, shared Timeline and shared Details. Timeline and Details intentionally reuse their canonical Wedding content across the intended locations.

The main Photos & Videos page is available to every gathering. Share Your Photos & Videos expands Upload or Share Link, pushing subsequent content down. Progress/errors and successful-batch gallery refresh are shared. The published View & Download folder button is editable; its label/URL are gathering-specific. The backend's account gallery currently spans gatherings; see the audit.

All signed-in users start at gathering selection. Within a gathering, guests default to Photos & Videos, Wedding hosts to Bride & Groom, and standard hosts to Notes. RSVP questions use one flow; Wedding adds attire/meals. X/Escape backs out one level. Wedding completion opens Registry; standard completion returns to the chooser. Print Page offers Print/Email for the current toolbar surface and exits questions before preparing a page. Printed pages add the first RSVP header where absent; the email body uses the exported page text.

## Known limitations and verification

The shared builder's main paths pass isolation/reload checks, but this is not a guarantee that every saved selector or specialized heading has correct scope. The [current audit](documentation-architecture-audit.md) records a Wedding Party heading override that carries into another subpage, a destructive legacy Christmas normalization, shared media scope, and backend access/concurrency issues. These were not changed by the documentation audit.

With a local server on port 8041, Playwright installed and `/usr/bin/chromium` available, the following local-only scripts block external requests and live writes:

- `scripts/verify-shared-gathering-builder.cjs`: existing/new gatherings, toolbar labels, custom pages, grouped formatting, immediate switches and reloads on desktop/mobile.
- `scripts/verify-editor-offset.cjs`: sidebar layout, current controls, empty/normal text selection and autosave.
- `scripts/verify-shared-information.cjs`: shared Wedding Timeline/Details content and appearance.
- `scripts/verify-persistent-role-toolbar.cjs`: role controls across pages, questions, dialogs and creation.
- `scripts/verify-count-list-formatting.cjs`: isolated shared count-dialog formatting.
- `scripts/verify-tab-scroll-stability.cjs`: main/subpage scrolling without accumulation.

These were validated during the preceding builder work; the current audit's actually executed checks and limitations are listed in its report. Older optional scripts may target removed controls or old single-click editing; do not present them as current guarantees without running/updating them in a separate code task.
