# Visual invitation templates

Invitation artwork is runtime data. Hosts preview a gathering, create a named draft from **Edit → Templates**, upload a PNG, JPEG, or WebP, and position dynamic fields on the image. New layouts start with Event Date, Event Time, Full Address and RSVP By fields; missing fields or source values are highlighted with red editor borders, while incomplete work can still be saved. Each template belongs only to the gathering being previewed when it is uploaded, and the template manager only shows that gathering's templates. No invitation artwork belongs in this source repository.

## Persistence

Template records live in the normal shared application state. Background bytes live in the Cloudflare R2 bucket bound to the state Worker as `INVITATION_BACKGROUNDS`. The Worker accepts host-authenticated uploads, replacements, and deletes at `/invitation-backgrounds/<template-id>`. Public reads allow the browser canvas to render the background. A deployment must configure the shared-state URL and R2 binding before an upload can succeed.

A template record contains its ID, owning event ID, name, background URL/media type/original dimensions, field configurations, and timestamps. Each event stores its selected `invitationTemplateId` plus its canonical event date, event time, RSVP-by date and address information. Edit gathering information only in **Manage Gatherings**, alongside rename/cancel/delete. Templates retains QR mode and template assignment, with a shortcut to Manage Gatherings; the old invitation/admin information inputs and direct date/address content editors are no longer alternate editing areas. Formatting remains editable.

## Coordinates and rendering

The editor displays the original-size stage under one uniform CSS scale. Pointer coordinates and drag deltas are divided by that scale before being saved, so `x`, `y`, `width`, and `height` remain original-image pixels. Downloads create a fresh canvas at the background's original dimensions; they are not screenshots of the preview.

Text fields have transparent backgrounds. A field stores its data key, geometry, safe web font, size, weight, italic setting, color, alignment, letter and line spacing, and formatter. QR fields store square geometry and a quiet-zone setting. QR rendering consumes the existing account sign-in URL and never creates or changes a `qrToken`.

Bulk download and email include accounts with **Invite** checked and a positive invitation quantity for the selected gathering. Account-specific QR mode additionally requires existing QR access; general-login mode does not. Invitation eligibility is independent of **Give Access**, so invitations can be prepared before account access is enabled. **Email All Invitations** uses the browser's secure file-sharing interface so the host can choose an installed email app with the generated invitation file(s) shared. Bulk output packages the uniquely named PNGs in a ZIP; browsers without supported file sharing require downloading and attaching manually. QR quiet zones remain transparent in previews and exported invitations.

New, copied and duplicated templates remain editor drafts until **Save**. Incomplete templates are allowed: missing gathering date, time, address or RSVP-by values mark the associated placed fields red, and missing dynamic fields mark their Values choices red. An address can use Full Address or separate address lines. These are editor-only reminders, not Save blockers or printed borders. Existing incomplete templates remain compatible. The Worker still checks template record structure and gathering ownership, along with Host authorization and shared-state revision protection. Background replacement updates the draft at a new asset URL rather than overwriting saved artwork.

**Copy from** lists templates owned by other available gatherings. Choose a source, a name, and a replacement background image, then create the draft. Field positions, sizes, fonts, colors, spacing, formatting and QR geometry copy independently; dynamic values always resolve against the destination gathering. Source templates and gathering data remain unchanged. Custom Text is literal decorative copy and should be reviewed; literal text does not clear reminders for missing dynamic fields.

Replacing an image of the same size preserves the layout. The editor warns before replacing it with different dimensions and preserves coordinates without silently stretching them. Duplicating a template copies its background reference and independently copies its field configuration.

## Quantities, groups and account QR access

Account invitation quantities/group membership and named-adult guest allowances are keyed by gathering. A zero quantity excludes an account from bulk output. Rendering and QR downloads consume existing account tokens; AnyList sync can backfill missing tokens without replacing existing ones. Account QR sign-in still requires the guest’s name. The Worker enforces server-side authentication and household-scoped access; existing QR links still use the existing name-entry flow and its documented identification limitations. See [state security](state-security-rollout.md).

In Accounts, **QR** opens the account code preview, transparent PNG/SVG downloads and a copyable sign-in link. Account links use `#/signin/account/<token>` with the existing random token; a general-login QR uses the general site URL. Never put real token values in documentation.

The production canonical URL is `https://themeyers.ilymmd.com/`. Keep the legacy GitHub Pages entry alive for existing printed links. Do not regenerate account tokens to change the website origin. [Hosting and redirect details](custom-domain.md).

## Canonical values and rescheduling

`SharedDetails.invitationValues` resolves gathering data for previews and exports. Legacy Wedding ceremony time/address fields remain supported; saving Wedding information updates the ceremony aliases and keeps reception information separate. Full Address preserves explicit line breaks in both the editor and exported canvas. Editing, preview and PNG downloads share the same canvas text renderer and font loading, including font family, size, weight, italic, alignment and spacing. Text is never horizontally squeezed to fit a narrow field; an actual fit problem is reported so its box can be adjusted. No date, address or RSVP value is copied from another template or invented when source information is missing.

Manage Gatherings can reschedule the selected occurrence without clearing its RSVPs, invitations or menu claims. The explicit **Start next occurrence** action still starts a fresh year. Rescheduling retains prior media dates as aliases on that occurrence so tagged uploads remain accessible; starting a new occurrence clears those aliases on the new event while its historical snapshot keeps them. Existing other years and integration credentials are unchanged.

## Full-page editor and centering

Creating/editing a template opens a dedicated page, with other website pages hidden. It reuses `ElementEditor`’s toolbar frame, dark sidebar, input/select/button helpers, status area and sidebar sizing. A workspace adapter writes field geometry/typography to the invitation draft rather than the website formatting groups. Invitation-only additions include dynamic values, QR controls, artwork replacement, date format, centering and explicit Save/Preview. Undo/Redo operate on draft changes; Done/Back warns before discarding an unsaved draft. Incomplete work can be saved with red reminders; structural and authorization checks remain in force. Background polling cannot replace an active template workspace.

New values are positioned around the click point. With **Snap to horizontal center** enabled (the default), placement/dragging snaps a value’s bounding box to the artwork center within eight visible pixels, regardless of preview scale; a red guide indicates the snap. Snapping preserves the field’s typography/alignment; new text values begin center-aligned, while copied fields retain their saved alignment. Coordinates remain original-image pixels. Selection alone does not add a spurious Undo step; a drag records one change rather than one per pointer move.

Selecting a placed value always reopens its current formatting controls, including after clearing selection with Escape. Escape inside a formatting input keeps native input behavior; leaving a pending text/hex edit for another value commits it first. Cancelled/lost pointer capture finishes the value-selection/drag lifecycle cleanly. These behaviors use the shared workspace sidebar rather than a second inspector.

The template sidebar uses full-width, wrapping controls. Its fixed options are Undo/Redo, **Save / Preview**, snap and Remove value, the always-visible Values choices, and Background’s single **Upload** button. Only the formatting region below those options scrolls; it has no repeated selected-value heading. Done remains in the Host toolbar. The redundant center action and Values/Background dropdowns are removed.

Overflow diagnostics wait for the selected fonts and measure the visible glyph bounds using the same configured canvas font/alignment/spacing as rendering. They distinguish width from height; unused line-box leading and native canvas spacing are not counted twice. Changing the renderer must preserve editor/export parity and saved template geometry/styles.
