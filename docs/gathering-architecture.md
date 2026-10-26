# Shared gathering implementation

Thanksgiving, Christmas and all custom gatherings use the same standard feature
object in `gathering-features.js`, renderers in `app.js`, RSVP journey in
`rsvp-flow.js`, and layout rules in `styles.css`. Wedding enables additional
pages, role visibility, named guests and meals through its feature definition.
Accounts, children, invitations, attendance lists and editing remain shared.

Hosts select gatherings into the same first RSVP page as guests. Host counters
sit below RSVP; individual first-page buttons expose private planning pages. Wedding hosts start
on Bride & Groom; guests retain their permitted default page. There is no
separate host home layout.

## Themes and new gatherings

The creation form stores `gatheringTheme: 'neutral'`. Its white/gray palette is
CSS variables on `body.theme-neutral`, not another layout. Existing custom
records without that marker retain their previous theme. Built-in holidays keep
their palettes and artwork. Do not set the marker in `makeEvent`: normalization
uses that factory for existing records as well as new ones.

Saved per-element styles remain scoped to each gathering. Legacy saved palette
colors still render through `gathering-palette.js`; its old editing dialog has
been removed. Retain legacy palette selector identities while those records
remain supported.

## One editor

`inline-editing.js` registers editable field, text, tab and structured-form
metadata. `element-editor.js` owns the fixed toolbar and selection behavior;
`element-appearance.js` applies saved element styles. `text-styles.js` and the
shared editable-text formatter preserve selected text formatting and line breaks.
`gap-layout.js` manages editable spacing. The former overlay/textarea editor,
separate appearance popup and palette popup are removed.

Keep layout and typography in shared rules. Theme-specific rules should hold
colors and artwork; Wedding-only content can retain its specialized layouts.
Host-authored text formatting is content and must not be reset by rendering.

## Verification

Run `npm test`. Local Chromium scripts block external requests and live state
writes, and expect the site served on port 8041:

- `verify-gathering-consistency.cjs`: creation, neutral colors, legacy themes,
  common desktop/mobile geometry, and isolated saved appearance edits.
- `verify-host-rsvp-home.cjs`: host pages, counters, navigation and guest privacy.
- `verify-element-ribbon.cjs`: shared toolbar and selected-text formatting.
- `verify-host-toolbar.cjs`: host controls, account switching and creation.
- `verify-gap-editing.cjs`, `verify-editor-offset.cjs`,
  `verify-modal-scrolling.cjs`, `verify-rsvp-status-icon.cjs`: spacing, toolbar
  layout, scrolling and response status.

Older optional browser scripts may describe superseded UI and should be updated
before use; they are not part of `npm test`.

## Shared photos and videos

Every gathering uses `renderGatheringMedia`, the same media DOM, `wedding-media.js`
and `dropbox-upload.js`. The historical `/wedding-media` endpoint and storage
prefix remain stable so existing uploads and galleries keep working. Sessions
include the selected gathering ID; the service checks account access to that
gathering rather than requiring Wedding access. Older clients omit the ID and
retain Wedding authorization. All gatherings use the existing Dropbox connection
and destination; private galleries remain scoped to the account. New gatherings
receive this feature automatically without copied markup or configuration.

Run `scripts/verify-shared-uploads.cjs` for desktop/mobile guest and host access
across Wedding, holidays and a newly created gathering. Worker tests cover
authorization, ownership, links and file access.

Each gathering also has an optional `mediaGalleryUrl` and `mediaGalleryLabel`.
The combined Photos & Videos page shows a disabled folder button until the host supplies a
link. In Edit mode, select that button to set its label and Dropbox folder URL
in the shared toolbar. The saved link is available to every guest who can open
that gathering; it is separate from the account's private upload receipts.
Removing the URL returns the button to its pending state. Dropbox sharing
permissions determine access and download availability for the linked folder.

The Photos & Videos surface combines the gallery and sharing flow without tabs.
Share Your Photos & Videos reveals Upload and Share Link actions. Exactly one
form is visible at a time; collapsing sharing hides both forms. The gallery and
host-published folder link remain available below the sharing flow.
