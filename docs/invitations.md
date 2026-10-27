# Visual invitation templates

Invitation artwork is runtime data. Hosts preview a gathering, create a named template from **Edit → Templates**, upload a PNG, JPEG, or WebP, and place dynamic fields on the image. Each template belongs only to the gathering being previewed when it is uploaded, and the template manager only shows that gathering's templates. No invitation artwork belongs in this source repository.

## Persistence

Template records live in the normal shared application state. Background bytes live in the Cloudflare R2 bucket bound to the state Worker as `INVITATION_BACKGROUNDS`. The Worker accepts host-authenticated uploads, replacements, and deletes at `/invitation-backgrounds/<template-id>`. Public reads allow the browser canvas to render the background. A deployment must configure the shared-state URL and R2 binding before an upload can succeed.

A template record contains its ID, owning event ID, name, background URL/media type/original dimensions, field configurations, and timestamps. Each event stores its selected `invitationTemplateId` plus its event date, RSVP date, and address values.

## Coordinates and rendering

The editor displays the original-size stage under one uniform CSS scale. Pointer coordinates and drag deltas are divided by that scale before being saved, so `x`, `y`, `width`, and `height` remain original-image pixels. Downloads create a fresh canvas at the background's original dimensions; they are not screenshots of the preview.

Text fields have transparent backgrounds. A field stores its data key, geometry, safe web font, size, weight, italic setting, color, alignment, letter and line spacing, and formatter. QR fields store square geometry and a quiet-zone setting. QR rendering consumes the existing account sign-in URL and never creates or changes a `qrToken`.

Bulk download and email include accounts with **Invite** checked and a positive invitation quantity for the selected gathering. Account-specific QR mode additionally requires existing QR access; general-login mode does not. Invitation eligibility is independent of **Give Access**, so invitations can be prepared before account access is enabled. **Email All Invitations** uses the browser's secure file-sharing interface so the host can choose an installed email app with the generated invitation file(s) shared. Bulk output packages the uniquely named PNGs in a ZIP; browsers without supported file sharing require downloading and attaching manually. QR quiet zones remain transparent in previews and exported invitations.

Replacing an image of the same size preserves the layout. The editor warns before replacing it with different dimensions and preserves coordinates without silently stretching them. Duplicating a template copies its background reference and independently copies its field configuration.

## Quantities, groups and account QR access

Account invitation quantities/group membership and named-adult guest allowances are keyed by gathering. A zero quantity excludes an account from bulk output. Rendering and QR downloads consume existing account tokens; AnyList sync can backfill missing tokens without replacing existing ones. Account QR sign-in still requires the guest’s name. These UI features do not protect the complete shared-state endpoint; see the [audit](documentation-architecture-audit.md).

In Accounts, **QR** opens the account code preview, transparent PNG/SVG downloads and a copyable sign-in link. Account links use `#/signin/account/<token>` with the existing random token; a general-login QR uses the general site URL. Never put real token values in documentation.

The production canonical URL is `https://themeyers.ilymmd.com/`. Keep the legacy GitHub Pages entry alive for existing printed links. Do not regenerate account tokens to change the website origin. [Hosting and redirect details](custom-domain.md).
