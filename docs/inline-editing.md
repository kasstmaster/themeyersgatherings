# Editing the website

Sign in as the host and choose the fixed **Edit** button at the top right. Click an element to select it. A red outline identifies the selected element, and one fixed vertical toolbar stays on the left. The page uses the remaining width, shrinking containers when needed so the toolbar never covers them. The fixed Edit button hides while the toolbar is open and returns after Done. The page keeps its normal layout, including Attire, Responsibilities, and meal cards. Guests never see the editor.

The Format panel opens automatically when you select an element and combines the applicable controls:

- **Text:** bold, italic, underline, font, size, text color, highlight, and links. Highlight the text you want to format. Type directly in a selected text box or button label. Dates, URLs, and other structured values have compact fields in the toolbar.
- **Lists:** bullets, numbering, indent, and outdent for editable text boxes.
- **Background:** color picker, hex code, opacity, image URL or upload, image fit, and image removal.
- **Border:** color picker, hex code, opacity, width, and corner radius.
- **Gap:** select existing spaces or padding to adjust their size, or drag Gap from the toolbar to add a spacer above/below an element. Drag an existing gap to move it. Gap sizes and placement are saved separately for each gathering.

Each text box, button, count value, count title, or container is one logical element. A button's label, background, and border use the same toolbar. Counts remain calculated; formatting does not replace live totals. Text uses the same safe formatting renderer in all existing and newly created gatherings.

Use **Container** to edit the surface around an element. **Save** saves the selection, and **Done** saves pending changes and exits edit mode. Switching selection or leaving the page saves pending text changes. Appearance changes save immediately.

Clicking a navigation button selects it for editing. Use **Use Button** in the toolbar to follow it while staying in edit mode. This lets you visit each page individually. Outside edit mode buttons work normally. Editing RSVP questions advances through pages without submitting an RSVP.

Page labels expose movement and deletion actions in **Text**. Select a tab group's container to add a page. Private host pages and party audience restrictions remain unchanged. Existing manual tab order remains saved per gathering.

For Wedding Party member management, select the Responsibilities container and open **Format → Edit party members**. For Attire media, select the Attire page container and use **Format → Edit images and videos**. To edit dishes or Wedding meal choices, choose **Edit → Menu**. These settings appear inside the compact toolbar; they do not replace page containers. Meal names, audience restrictions, addition, and removal remain available.

Background images may be PNG, JPEG, or WebP, uploaded through the existing authenticated host upload service. Appearance overrides and text edits remain separate for each gathering. Previously saved colors and images continue to apply.

## Browser verification

Serve the repository locally on port 8041, then run `node scripts/verify-element-ribbon.cjs` with Playwright and Chromium available. The check blocks external requests and removes the live shared-state URL. It verifies preserved internal layout, toolbar offsets, selection formatting, background and border saves, page navigation, Attire and Responsibilities layouts, meal editing, and persistence within the RSVP flow.

## Host navigation and account sessions

The fixed host toolbar is available on the gathering selection page, RSVP screens, and other dialogs. **All Gatherings** returns everyone to gathering selection. **Menu**, **Accounts** and **History** are fixed host editing controls directly below Templates. The **+** new-gathering action appears at the top-left only on the host gathering chooser. Gathering shortcuts remain available to guests. **Templates** is in the editing toolbar.

In **Accounts**, click the small person icon beside an adult's name to enter that person's household session. **Leave account** restores the host session. During the account session, the account’s normal pages appear, with Edit and the host toolbar retained for the authenticated host. **Leave account** sits immediately left of Edit. Host management actions return to the host context; ordinary guests never see these controls. Accounts without gathering access have disabled sign-in icons.

Run `node scripts/verify-host-toolbar.cjs` with the same local browser setup to check persistent controls across dialogs, Home, per-person sign-in, host return, Templates placement, and mobile layout.

Run `node scripts/verify-gap-editing.cjs` to verify editable existing spacing, spacer drag/drop and sizing, saved placement, gathering isolation, and restored Bride & Groom / Timeline outer panels.

## Host RSVP landing and pages

Choosing a gathering as host opens its first RSVP page. The host counters appear directly below RSVP. The previous host home page is removed. Wedding hosts default to Bride & Groom; guests retain their normal Details or personal Wedding Party default.

Host first-page buttons open Bride & Groom and custom pages. Photos & Videos is in the toolbar. Notes is a host toolbar option. The Dishes needed counter opens the host dish overview. Personal-name, Attire, Registry and Details options also live in the toolbar, followed by Print Page. Timeline is shared between the Bride & Groom sub-tabs and wedding party personal-information sub-tabs. Private host buttons and counters stay hidden in guest views. This navigation also works during editing; click a page label to rename or reorder it.

Run `node scripts/verify-host-rsvp-home.cjs` to check host landing, counter placement, page switching, standard gatherings, and guest privacy.

Toolbar colors: in Edit mode, click the toolbar background. Text contains selected/unselected text and icon
colors; Background contains overall and selected/unselected option backgrounds.
Each setting includes a color picker, hex input and opacity. These settings apply
to every option, including the guest toolbar for the same gathering.

Accounts and History appear below Menu in the edit toolbar. The chooser’s + stays at the top-left.
The Meyers returns any signed-in user to gathering selection. Wedding Information,
Attire, Registry and Details live in the toolbar, with Print Page last.

Matching component appearance is shared within the current gathering, including
RSVP steps. The selected element label identifies shared buttons, titles, tabs,
counts, containers and inner containers. Appearance edits apply to matching
components; editing their names or words remains local. Page-content text boxes
keep independent colors, fonts and selected-text formatting.

To reorder tabs, select a tab in Edit mode and use **Move left** or **Move right**
in the top toolbar. The tab stays selected and its order is saved for the current
gathering. Toolbar page options move within their navigation group; The Meyers
and Print Page keep their fixed positions. Spaces, arrow keys and clicks inside
an active title edit change the text/caret rather than activating the tab.

Menu action buttons share appearance by status: available (I’ll bring this), claimed, and bringing. Each status has independent background, border, and text formatting within the gathering. Claimed buttons remain selectable in Edit mode.

The gathering selection home page uses site-wide `appState.gatheringHome` for text, appearance, and gaps, with its own editor context and group scope. It never reads an event’s formatting. All users, including the host, land on gathering selection after signing in. Selecting a gathering opens that event’s RSVP entry. Run `node scripts/verify-home-appearance.cjs` to check independent home/event edits, persistence, guest visibility, host sign-in, and mobile layout.

Click a counter’s number to format all count values in that gathering, or its label to format all count titles independently. The surrounding counter remains selectable for background and border edits. Count values remain calculated. Run `node scripts/verify-count-formatting.cjs` to check independent typography, redraws, and gathering isolation.

The editor initializes controls from the selected element’s current rendered styles and saved overrides, including text selection font/size/color/highlight, bold/italic/underline states, background color/opacity/image/fit, border color/opacity/width/radius, toolbar selected and unselected colors, and gap size. Moving the text selection updates the Text controls. Run `node scripts/verify-current-editor-values.cjs` for this regression check.

For banners and image elements, Image URL, Upload image, and Remove image change the image source rather than layering a CSS background behind the original. RSVP and gathering banners save their canonical image fields; other image elements save their source in the current page’s appearance state. Replacement clears previous background-image overlays on the image and its banner wrapper. Run `node scripts/verify-banner-replacement.cjs` for URL, upload, removal, and persistence checks.

Outer containers and inner containers use separate shared appearance groups. Nested custom subpages retain the inner group even when they also use page layout classes; page panels inside RSVP use the inner group. The RSVP form remains an outer container despite its flow-panel class. Run `node scripts/verify-container-levels.cjs` to check independent backgrounds, opacity, borders, and custom page classification.

The full RSVP form is the outer container. Page panels within it (including Notes, Bride & Groom, Photos & Videos, Registry, and custom pages) and the summary strip holding the counts share the inner-container appearance group. Changing an inner background, opacity, or border does not change the RSVP form. Count values and titles keep their separate text formatting. Run `node scripts/verify-notes-container.cjs` to check the actual Notes selection and shared count-container background.

Dish titles, calculated status text (Optional or quantities still needed), and claimant names have separate formatting. Status and claimant text each share their own appearance group within the gathering; clicking either selects that text without selecting the dish editor. Their values remain calculated from menu items and claims. RSVP dish availability captions share the status group. Run `node scripts/verify-dish-details-formatting.cjs` for independent fonts/colors, live quantity redraws, and gathering isolation.

The Dishes needed counter opens a dialog with all dishes: Still needed first, Claimed last, and claimant names. The old Menu page and toolbar option are removed. In RSVP, fully covered dishes stay in their original category, checked and disabled; they never enter the current guest’s dish draft or satisfy dish-selection validation. Own claims remain editable. X (or Escape) returns from RSVP questions to the same gathering’s main page; from the main page it closes to gathering selection. Programmatic completion destinations are unchanged. Run `node scripts/verify-dish-overview.cjs`.

Photos & Videos text boxes support Move up and Move down in the fixed editor toolbar. Positions are saved in the gathering’s `siteElementOrder` and restored independently for each gathering. Upload progress remains visible outside the collapsible upload controls, including completion and retryable errors. The gallery automatically reloads once the whole upload batch succeeds; there is no manual Refresh button. Run `node scripts/verify-media-auto-refresh.cjs`.

In Edit mode, Photos & Videos text boxes also support drag-and-drop using the same placement guide as gaps, including moves between containers on that page. Click to edit text; drag the selected box’s red border to reposition it. Placements persist in `siteElementPlacements` per gathering. Move up/down remain available. Dragging cannot move authored copy into the dynamic upload status or gallery cards. Run `node scripts/verify-media-text-drag.cjs`.

The dish counter uses the same modal card and compact list rows as the other count dialogs. Remaining quantities appear first as “Dish (1 of 2) still needed”; claimed quantities appear below per household as “Dish (1 of 2) Raudman”. Partially claimed dishes therefore appear in both groups. Copy menu retains its export behavior with a smaller button. In the Gap panel, choose or drag Vertical gap or Horizontal gap; explicit gaps also have a direction selector and size control. Existing gaps default to vertical. Run `node scripts/verify-compact-dishes-and-gaps.cjs`.

The editing toolbar includes Undo and Redo for up to 50 saved changes in the current editing session. A new edit clears redo history. Undo restores only the properties changed by that action and preserves unrelated RSVP data; it refuses to overwrite a conflicting later change. Pending text formatting is saved before undoing. Run `node scripts/verify-editor-undo.cjs`.

RSVP layout now initializes after inactive questions are hidden, hides empty navigation footers, and applies saved spacing after appearance. Page wrappers are layout-only: the full RSVP form is the outer surface, and content panels/counts are shared inner surfaces. Content text formatting remains independent. This removes the extra painted Wedding layer and unused bottom reserve while preserving Attire, Responsibilities, and meal layouts. Run `node scripts/verify-first-open-and-layers.cjs`.

Vertical gap and Horizontal gap are directly draggable toolbar options, replacing the generic Gap launcher. Labels match the visible spacer orientation: Vertical is a vertical strip (adjust its width); Horizontal is a horizontal band (adjust its height). Existing spacer placement and sizes remain intact.

Buttons, tabs, and toolbar options each have separate selected and unselected appearance groups. Select an item in its current active/inactive state to edit that state’s background, image, opacity, border, font, or text/icon colors. The editor label identifies the state. Styles follow selection when navigation changes; words and destinations stay independent. Existing shared styles remain a fallback until overridden for a state. Toolbar-wide selected/unselected color controls preserve the opposite state’s overrides. Run `node scripts/verify-selected-appearance.cjs`.

Selecting a button, tab, or toolbar option shows a Formatting state selector for Selected and Unselected. It previews the chosen state without navigating or changing the active page; saved appearance remains shared by state. Container color-wheel/slider updates within one control interaction are coalesced into one Undo action, and pending toolbar fields can be undone before Save. This does not revert existing saved colors.

A single click selects a text box for formatting and dragging; double-click enters inline text editing. While typing, drag its border to move it. Vertical side gaps reserve left/right room on the anchored element rather than taking a line above a block. Their size and side persist across redraws. Run `node scripts/verify-editor-interactions.cjs`.

Photos & Videos keeps its title and intro above the shared inner panel. All remaining page text and controls stay inside that panel, including paragraphs moved outside it by older saved layouts. Body text can be dragged within the inner panel; the intro remains above it. Run `node scripts/verify-media-container-alignment.cjs` and `node scripts/verify-media-text-drag.cjs`.

The left editor keeps Undo / Redo, Save, and Done pinned at the top. Format opens automatically on selection; text boxes include lists, buttons and titles show typography without lists, containers show surfaces and relevant settings, and gaps show sizing. Separate launchers for Text, Lists, Background and Border are removed. Below Done, ↑ Gap and → Gap share a row, followed by Use Button and Container in another row, then Templates. These actions stay fixed; only formatting scrolls. Published frontend asset URLs include content hashes so updated editor files replace cached copies.

Count menus (Dishes needed, Invited, Attending, Not attending and No Response) have dedicated shared appearance groups for their cards, headings, totals, rows, item/household titles, names, details and controls. These groups are isolated from RSVP/page titles, buttons, containers and dish choices. Existing and new gatherings use the same count-list grouping. Run `node scripts/verify-count-list-formatting.cjs`.

Photos & Videos is a shared toolbar option immediately after All Gatherings, with no duplicate front-page button. This ordering applies to hosts and guests in all gatherings; Print Page remains last.

The ↑ Gap and → Gap labels retain the existing vertical-strip and horizontal-band behavior respectively. Both support dragging from the fixed action area.

After a gathering is selected, each role keeps its full permitted toolbar through pages, RSVP questions and dialogs. The same toolbar moves into the active dialog; guests and wedding party members do not receive host options. Choosing a page from RSVP returns to the gathering information view without submitting. Print Page leaves the questions before preparing a printable page. Gathering-specific options are hidden on the gathering selection page. Run `node scripts/verify-persistent-role-toolbar.cjs`.

Menu opens only the selected gathering’s menu controls. Potluck menus reuse the dish editor, including quantities, categories and claims; Wedding reuses the same meal-choice editor as the RSVP settings. Accounts and History keep their existing management screens and are hidden outside host edit mode. Run `node scripts/verify-editor-management.cjs`.

Fixed actions use paired rows: Save / Done, ↑ Gap / → Gap, Use Button / Container, Menu / Templates, and Accounts / History. Only the formatting area scrolls.

Fixed row order is Undo / Redo, Save / Done, divider, Menu / Templates, Accounts / History, divider, ↑ Gap / → Gap, then Use Button / Container. Formatting scrolls below these actions.

Every gathering uses the same summary-item count button styling, including Dishes needed. Hover adds no underline. Counts keep shared value and title appearance groups, separately from the shared count-list groups and editor controls.
