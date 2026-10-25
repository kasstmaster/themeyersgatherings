# Editing the website

Sign in as the host and choose **Edit website**. Click an element to select it. A red outline identifies the selected element, and one fixed toolbar stays at the top of the page. The page keeps its normal layout, including Attire, Responsibilities, and meal cards. Guests never see the editor.

The toolbar has four expandable groups:

- **Text:** bold, italic, underline, font, size, text color, highlight, and links. Highlight the text you want to format. Type directly in a selected text box or button label. Dates, URLs, and other structured values have compact fields in the toolbar.
- **Lists:** bullets, numbering, indent, and outdent.
- **Background:** color picker, hex code, opacity, image URL or upload, image fit, and image removal.
- **Border:** color picker, hex code, opacity, width, and corner radius.

Each text box, button, count, or container is one logical element. A button's label, background, and border use the same toolbar. Counts remain calculated; formatting does not replace live totals. Text uses the same safe formatting renderer in all existing and newly created gatherings.

Use **Select container** to edit the surface around an element. The **Select an element** menu also reaches empty text boxes without adding placeholders or changing their size. **Save** saves the selection, and **Done editing** saves pending changes and exits edit mode. Switching selection or leaving the page saves pending text changes. Appearance changes save immediately.

Clicking a navigation button selects it for editing. Use **Open page / use button** in the toolbar to follow it while staying in edit mode. This lets you visit each page individually. Outside edit mode buttons work normally. Editing RSVP questions advances through pages without submitting an RSVP.

Page labels expose movement and deletion actions in **Text**. Select a tab group's container to add a page. Private host pages and party audience restrictions remain unchanged. Existing manual tab order remains saved per gathering.

For Wedding Party member management, select the Responsibilities container and open **Text → Edit party members**. For Attire media, select the Attire page container and use **Text → Edit images and videos**. For meal definitions, select the Menu container and use **Text → Edit meal options**. These settings appear inside the compact toolbar; they do not replace page containers. Meal names, audience restrictions, addition, and removal remain available.

Background images may be PNG, JPEG, or WebP, uploaded through the existing authenticated host upload service. Appearance overrides and text edits remain separate for each gathering. Previously saved colors and images continue to apply.

## Browser verification

Serve the repository locally on port 8041, then run `node scripts/verify-element-ribbon.cjs` with Playwright and Chromium available. The check blocks external requests and removes the live shared-state URL. It verifies unchanged page geometry, selection formatting, background and border saves, page navigation, Attire and Responsibilities layouts, meal editing, and persistence within the RSVP flow.
