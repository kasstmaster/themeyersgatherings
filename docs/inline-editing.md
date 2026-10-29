# Editing the website

In the approval-gated A1/A2 implementation, hosts enter their password in First Name and choose Next for hidden, server-checked Host sign-in; guest name/QR entry has no new code/email step. Sign in as host and choose **Edit** after Print Page in the fixed main toolbar. Host options use icons with accessible names/tooltips. Edit changes to **Done** (checkmark) while editing. The dark sidebar stays on the left and reserves page width; only its formatting area scrolls. Ordinary guests cannot open it. An authenticated host previewing another account retains host controls and a top-right Leave account action.

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

Text controls include alignment, bold, italic, underline, font, size, text color, highlight and links. Expand **Text effects** for shadow (color, opacity, horizontal/vertical offset and blur) and outline (color, opacity and width); Off removes the effect, including older effects inside the selected range. Changing an effect replaces that effect throughout the selection while preserving fonts, emphasis and links. Effect colors, offsets, blur and width persist after Done and reload. Reopened controls read the highlighted text’s displayed formatting, or the first text run when nothing is highlighted. Highlight a range in a rich-content text box to style that range. Matching shared component types receive gathering-wide effects. Rich text boxes also offer bullets, numbering and indentation. Blank lines use the shared safe formatter. Dates, URLs and multi-field records use compact structured inputs. Empty editable text slots have a small host-only outline/click area; no placeholder text is saved for guests.

Background controls include color/hex, opacity, image URL/upload, fit and removal. Gathering and RSVP banners use upload-only controls rather than image URL fields. Border controls include color/hex, opacity, width and radius. Uploading a banner replaces its image source instead of stacking an image behind it. PNG/JPEG/WebP uploads use the existing host-authenticated R2 service.

Within a gathering, matching titles, introductions, buttons, tabs, toolbar options, outer containers, inner containers and count components use shared appearance groups. Titles and introductions are independent groups. Count numbers and labels format separately. Count-dialog cards/headings/rows have their own shared groups, isolated from ordinary page styles. Dish buttons have separate available/claimed/bringing groups. Selected/unselected states are separate for buttons, tabs and toolbar options. Rich page-content boxes retain independent typography and inline styles. Button background and label highlight are independent: a transparent highlight cannot erase the button surface. Explicit selected/unselected appearance takes precedence over legacy per-button settings. Background opacity 100% is fully opaque. These classifications are defined in `ElementAppearance.group`; they are not independent implementations per gathering.

The RSVP form is the outer container. Its content panels and count strip use the inner-container group. The chooser has separate website-wide settings and does not inherit a gathering's design. Toolbar background/border and selected/unselected text/icon colors can be edited together for the current gathering. Saved title sizes remain the sizing baseline; automatic fitting shrinks them only enough for the available width.

**↑ Gap** is a vertical strip reserving space beside an element; **→ Gap** is a horizontal band above/below an element. Drag either from the fixed sidebar or select existing spacing/padding to resize it. Placement, direction and size are gathering-specific. Saved gaps with a text anchor follow that text when moved and remain after leaving edit mode or refreshing gallery status. Photos-page text can be moved using Move up/down or drag/drop; its title/intro stay above the inner panel and body copy stays inside it.

## Pages, roles, and management

Selecting a tab/page option exposes renaming and Move left/right where supported. The navigation Container offers New page title / Add page. Existing and newly created gatherings use the same page editor; new pages inherit their gathering's formatting but keep their own title, introduction and content. All Gatherings, Photos & Videos and the fixed print/host actions have prescribed positions; movable page options retain their manual order. The details page is accessed through the toolbar rather than a visible main tab.

Menu opens the selected gathering's dish editor, or Wedding meal choices. The separate host Menu page and dishes-needed counter/dialog are gone. Attending shows each household’s dishes, then other existing contributions without an attending RSVP, and still-needed dishes at the bottom. Wedding’s meal selections remain with their attendees. Copy menu is a compact action beside the totals and exports statuses without names. All count dialogs use X rather than a redundant Close button.

Accounts manages household records and gathering-keyed permissions. The tiny person icon previews a member's account; host management returns to host context as necessary. History opens archived gatherings and the explicit next-occurrence action. Templates manages event-owned invitation templates.

Wedding retains specialized Attire, Responsibilities and meal-card layouts. The Responsibilities container exposes party-member management through its relevant Format settings. Attire exposes its image/video settings. Party members have role-specific attire, their responsibilities/personal pages, shared Timeline and shared Details. Timeline and Details intentionally reuse their canonical Wedding content across the intended locations.

The main Photos & Videos page is available to every gathering. Share Your Photos & Videos expands Upload or Share Link, pushing subsequent content down. Progress/errors and successful-batch gallery refresh are shared. The published View & Download folder button is editable; its label/URL are gathering-specific. The backend's account gallery currently spans gatherings; see the audit.

All signed-in users start at gathering selection. Within a gathering, guests default to Photos & Videos, Wedding hosts to Bride & Groom, and standard hosts to Notes. RSVP questions use one flow; Wedding adds attire/meals. X/Escape backs out one level. Wedding completion opens Registry; standard completion returns to the chooser. Print Page offers Print/Email for the current toolbar surface and exits questions before preparing a page. Printed pages add the first RSVP header where absent; the email body uses the exported page text.

## Known limitations and verification

The shared builder's main paths pass isolation/reload checks, but this is not a guarantee that every saved selector or specialized heading has correct scope. The [audit](documentation-architecture-audit.md) records the original Wedding Party heading defect and its A5 follow-up, plus other separately tracked findings. The original documentation audit itself did not fix application code.

With a local server on port 8041, Playwright installed and `/usr/bin/chromium` available, the following local-only scripts block external requests and live writes:

- `scripts/verify-shared-gathering-builder.cjs`: existing/new gatherings, toolbar labels, custom pages, grouped formatting, immediate switches and reloads on desktop/mobile.
- `scripts/verify-editor-offset.cjs`: sidebar layout, current controls, empty/normal text selection and autosave.
- `scripts/verify-shared-information.cjs`: shared Wedding Timeline/Details content and appearance.
- `scripts/verify-persistent-role-toolbar.cjs`: role controls across pages, questions, dialogs and creation.
- `scripts/verify-count-list-formatting.cjs`: isolated shared count-dialog formatting.
- `scripts/verify-tab-scroll-stability.cjs`: main/subpage scrolling without accumulation.

These were validated during the preceding builder work; the current audit's actually executed checks and limitations are listed in its report. Older optional scripts may target removed controls or old single-click editing; do not present them as current guarantees without running/updating them in a separate code task.

Wedding Party heading words now belong to the selected subpage/member/custom page, including the smaller introduction above the title. Edit them through the usual shared toolbar. Formatting groups remain Wedding-wide; heading copy does not change another heading, the tab label or the member's actual name/role. Uniquely identifiable old heading edits remain visible only on their original page. Ambiguous old overrides remain in saved data but are not displayed on every subpage; re-enter intended copy on the correct page if needed.

The page reserves the measured fixed toolbar height plus 16 px at its bottom. This system clearance is separate from editable spacing, so the last content remains above the toolbar on mobile. Heading fitting skips unchanged content and preserves scroll position during measurement.

Typing and editor-control updates do not trigger a full gathering repaint. New page content and changed selection states still receive saved formatting; ordinary dynamic updates are batched into one frame. Autosave and Undo/Redo use the same existing persistence path.

Sign-in persists on the canonical site (new guests up to 30 days, hosts eight hours). Logout is at the far right of the gathering chooser’s name bar; pending edits are flushed or preserved before ending the session. See [session security](state-security-rollout.md) for expiry and offline behavior.

Accounts and count-list popups scroll as one dialog; the card background and border continue around the whole list, including long lists on mobile.

Guest name entry skips Suffix after Last Name unless the server recognizes a matching person with a suffix. The suffix step remains for those names; guest permissions and invitation scope are unchanged.

Popup family headings display uppercase. Accounts aligns Inv # and +1 with the family heading using layout CSS; label elements, selector paths and typography remain intact.

Claimed dishes in Attending have no per-item dividers or extra spacing between lines. They follow menu category order, mains first and drinks last, without category headings. Separation between family entries and the still-needed dish rows remains.

Dishes still needed uses the same count-dialog title formatting as Attending.

A unanimous invitation-group decline finishes at attendance using Save my RSVP; children, guests, meal and contribution questions are skipped. Saving releases that group’s attributed dishes and clears its active child/guest selections. A partial decline keeps dishes. Other invitation groups remain unchanged. Historical household-only dish claims with ambiguous group ownership are preserved until every household adult declines.

Accounts displays one heading per surname within an account, combining matching surnames across invitation numbers and splitting different surnames. Inv # and +1 keep their existing typography and each person retains their own editable controls. This display grouping does not merge accounts or change invitation membership.

Custom RSVP contributions reuse the same name, quantity/unit and category questions for each item. Add another item appears after the category question; Next continues to review. All entries are reviewed and saved together under the current invitation group. Opening a fresh RSVP clears unsaved custom-item fields without removing saved dishes.

Saved custom items remain on their gathering’s menu after claims are released and when starting the next occurrence. Only old claims are reset; the host can still delete items explicitly in Menu.

Lowering a dish limit below existing claims does not block unrelated RSVP saves. Existing quantities can stay the same or decrease; new claims cannot increase the existing overflow. RSVP validation messages are displayed inside the RSVP page.

RSVP refreshes preserve unavailable dish controls; showing a covered dish as checked does not claim it for the current invitation group.

### Yearly dinner plans (Wedding excluded)

Use Edit → Menu to choose the event year’s Potluck or Full sit-down dinner plan. Top buttons in the Menu popup open Potluck, Sit Down Dinner or Quantity Types. Each section uses the full popup content area, without a nested scrolling list. Both menus remain editable regardless of the active plan. Only changing Dinner plan activates a mode; adding, editing or selecting items does not switch it. Full sit-down dinner shows a private preparation menu: add/edit dish options and check Prepare for the dishes to make that year. Unchecking preserves the option. Switching plans preserves both menus and yearly selections. A later event year starts with the default Potluck plan until changed. Guest potluck totals show Invited and Attending only and cannot open name lists. Sit-down guests see no counts or contribution questions.

Your Dishes appears in the toolbar for a potluck invitation with claims and opens its printable list. The existing Print Page action exports only that page. Legacy single-invitation household claims count as that invitation’s; ambiguous unassigned claims from multi-invitation households are not attributed to a guessed group.

Food category order is shared across menus, RSVP dish choices, claimed/needed lists and exports: Main Table → Sides → Appetizers → Desserts → Drinks. Item order within each category is preserved.

Potluck and private preparation dishes use the same labeled Remove button and the same full-width list layout. Removing an item keeps the existing menu-specific removal behavior. Potluck up/down controls are removed; shared category sorting determines the list order.

Both menu edit lists show a small divider only when the food category changes, without category titles or dividers between items in the same category.

The Menu popup keeps Dinner plan, Clear a Claim and the section buttons in a shared header, in that order. They stay visible when switching Potluck, Sit Down Dinner or Quantity Types; only the section content changes.

Copy from is available in both menu sections. Choose a source gathering and menu, then Copy items. Duplicate names (case/spacing variations included) are skipped rather than overwritten. Copied potluck entries retain amounts/units and start unclaimed; copied preparation options start unselected. Copying between menu types uses one item when no source quantity exists. Wedding is excluded. The source menu and active dinner plan are unchanged.

For one requested unit, dish lists, RSVP choices/review, Your Dishes and menu exports show status without a numeric amount. The default Item type is omitted; dozen/case/custom type labels remain. Multi-unit rows and host amount/type inputs are unchanged.

Potluck guests see a compact fixed reference bar during dish/contribution questions: Invited, Attending and RSVP by. Counts combine adults and children; adult/child breakdowns are available in the count titles. These are confirmed saved totals, not unsaved draft attendance. Missing deadlines show Not set. The bar hides outside these steps and never opens guest lists. Its measured height reserves top space independently of bottom toolbar clearance.

### Year-specific gathering management

The Host can use **Manage Gatherings** on the selection page to rename, cancel or delete a selected date and restore a deletion within 30 days. Cancel/delete require a separate warning and typed confirmation. These actions keep other years and their formatting/content independent. Guests use **View Past Gatherings** for read-only prior-year RSVP history and photos. See [the lifecycle guide](gathering-lifecycle.md).

Gathering date, time, RSVP-by, and addresses now have one content-editing area in **Manage Gatherings**. Their page elements retain formatting selection, while core values are no longer changed through inline date/address fields or Templates. Templates keeps QR mode/assignment and supports **Copy from** with a new image; incomplete drafts can be saved with red reminders for missing values/fields. See [invitation editing](invitations.md).

The invitation editor is a full page and uses the common `ElementEditor` toolbar shell and compact dark controls through a draft workspace adapter. It adds template value/QR/artwork controls, center snapping, Save/Preview and independent Undo/Redo; it does not write to website appearance groups. Manage Gatherings is a Host toolbar option only on the selection page, and prior-year choices live in a dropdown below current gatherings.

Manage Gatherings appears above Menu/Templates in the website editing sidebar on every page. Leaving edit mode returns the same control to the Host toolbar, where it appears on the selection page. It remains hidden from guests. The template workspace has no duplicate Done action: use Done in the Host toolbar. Save/Preview, snap/remove, Values and the compact Background upload stay above a separate formatting scroll region, with full-width controls and no repeated selected-value heading.

Invitation **Add image** creates an independently selectable image layer. The shared sidebar exposes its coordinates, dimensions and Keep proportions toggle; corner resizing, Undo/Redo and Remove value also apply. Background artwork remains separate. See [invitation images](invitations.md#resizable-image-elements).

Invitation text values support **All caps** in the selected value’s formatting controls. This is saved per value and applies after date formatting without changing gathering data or custom text. Text is vertically centered within its field using the same glyph measurements in the editor, preview, and exports; changing Height adjusts the centering.

Invitation templates support multiple selection: Shift/Cmd/Ctrl-click to add or remove elements, or enable **Select multiple** and tap additional elements. Drag a selected element to move the selection together; relative spacing is preserved, movement stays within the artwork, and center snapping uses the group bounds. Undo/Redo reverses/reapplies a whole move. Click an unselected element with multiple selection off to return to individual formatting; Remove selected removes the selection in one undoable action. Selection itself is temporary and is not saved.

Select one added invitation image to reveal **Replace image**. Replacement uploads new artwork and preserves the selected image’s position, box size, and stacking order; Undo restores the previous image. Existing shared artwork is retained for other templates.

New gatherings can optionally receive a banner in Create Gathering. An empty main or first RSVP banner has a selectable placeholder in Host Edit mode; guests do not see that placeholder. Select it and use **Upload image** in Format to add the first image, replace it, or remove it. Images remain scoped to that gathering and persist through Done and reload. Creation uploads initialize both the main and first RSVP banners; later edits use their respective image slots.
