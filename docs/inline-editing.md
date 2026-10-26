# Editing the website

Sign in as the host and choose the fixed **Edit** button at the top right. Click an element to select it. A red outline identifies the selected element, and one fixed toolbar stays at the top of the page. The page sits below it and adjusts automatically when toolbar panels open or the screen changes size. The fixed Edit button hides while the toolbar is open and returns after Done editing. The page keeps its normal layout, including Attire, Responsibilities, and meal cards. Guests never see the editor.

The toolbar has five expandable groups:

- **Text:** bold, italic, underline, font, size, text color, highlight, and links. Highlight the text you want to format. Type directly in a selected text box or button label. Dates, URLs, and other structured values have compact fields in the toolbar.
- **Lists:** bullets, numbering, indent, and outdent.
- **Background:** color picker, hex code, opacity, image URL or upload, image fit, and image removal.
- **Border:** color picker, hex code, opacity, width, and corner radius.
- **Gap:** select existing spaces or padding to adjust their size, or drag Gap from the toolbar to add a spacer above/below an element. Drag an existing gap to move it. Gap sizes and placement are saved separately for each gathering.

Each text box, button, count, or container is one logical element. A button's label, background, and border use the same toolbar. Counts remain calculated; formatting does not replace live totals. Text uses the same safe formatting renderer in all existing and newly created gatherings.

Use **Select container** to edit the surface around an element. The **Select an element** menu also reaches empty text boxes without adding placeholders or changing their size. **Save** saves the selection, and **Done editing** saves pending changes and exits edit mode. Switching selection or leaving the page saves pending text changes. Appearance changes save immediately.

Clicking a navigation button selects it for editing. Use **Open page / use button** in the toolbar to follow it while staying in edit mode. This lets you visit each page individually. Outside edit mode buttons work normally. Editing RSVP questions advances through pages without submitting an RSVP.

Page labels expose movement and deletion actions in **Text**. Select a tab group's container to add a page. Private host pages and party audience restrictions remain unchanged. Existing manual tab order remains saved per gathering.

For Wedding Party member management, select the Responsibilities container and open **Text → Edit party members**. For Attire media, select the Attire page container and use **Text → Edit images and videos**. For meal definitions, select the Menu container and use **Text → Edit meal options**. These settings appear inside the compact toolbar; they do not replace page containers. Meal names, audience restrictions, addition, and removal remain available.

Background images may be PNG, JPEG, or WebP, uploaded through the existing authenticated host upload service. Appearance overrides and text edits remain separate for each gathering. Previously saved colors and images continue to apply.

## Browser verification

Serve the repository locally on port 8041, then run `node scripts/verify-element-ribbon.cjs` with Playwright and Chromium available. The check blocks external requests and removes the live shared-state URL. It verifies preserved internal layout, toolbar offsets, selection formatting, background and border saves, page navigation, Attire and Responsibilities layouts, meal editing, and persistence within the RSVP flow.

## Host navigation and account sessions

The fixed host toolbar is available on the gathering selection page, RSVP screens, and other dialogs. **The Meyers** returns everyone to gathering selection. **Accounts** and **History** are host-only fixed corner icons. The **+** new-gathering action appears at the top-left only on the host gathering chooser. Gathering shortcuts remain available to guests. **Templates** is in the top editing toolbar.

In **Accounts**, click the small person icon beside an adult's name to enter that person's household session. **Leave account** restores the host session. During the account session, the account’s normal pages appear, with Edit and the host toolbar retained for the authenticated host. **Leave account** sits immediately left of Edit. Host management actions return to the host context; ordinary guests never see these controls. Accounts without gathering access have disabled sign-in icons.

Run `node scripts/verify-host-toolbar.cjs` with the same local browser setup to check persistent controls across dialogs, Home, per-person sign-in, host return, Templates placement, and mobile layout.

Run `node scripts/verify-gap-editing.cjs` to verify editable existing spacing, spacer drag/drop and sizing, saved placement, gathering isolation, and restored Bride & Groom / Timeline outer panels.

## Host RSVP landing and pages

Choosing a gathering as host opens its first RSVP page. The host counters appear directly below RSVP. The previous host home page is removed. Wedding hosts default to Bride & Groom; guests retain their normal Details or personal Wedding Party default.

Host first-page buttons open Bride & Groom, Photos & Videos and custom pages. Notes and Menu are host toolbar options. Personal-name, Attire, Registry and Details options also live in the toolbar, followed by Print Page. Timeline is shared between the Bride & Groom sub-tabs and wedding party personal-information sub-tabs. Private host buttons and counters stay hidden in guest views. This navigation also works during editing; choose an original page label through Select an element to rename or reorder it.

Run `node scripts/verify-host-rsvp-home.cjs` to check host landing, counter placement, page switching, standard gatherings, and guest privacy.

Toolbar colors: in Edit mode, click the toolbar background or choose its toolbar
element from Select an element. Text contains selected/unselected text and icon
colors; Background contains overall and selected/unselected option backgrounds.
Each setting includes a color picker, hex input and opacity. These settings apply
to every option, including the guest toolbar for the same gathering.

Accounts and History are fixed icons at the top-left beside the chooser’s +.
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
