# Visual invitation templates

Invitation artwork is runtime data. Hosts create a named template in **Host tools → Invitation templates**, upload a PNG, JPEG, or WebP, and place dynamic fields on the image. No invitation artwork belongs in this source repository.

## Persistence

Template records live in the normal shared application state. Background bytes live in the Cloudflare R2 bucket bound to the state Worker as `INVITATION_BACKGROUNDS`. The Worker accepts host-authenticated uploads, replacements, and deletes at `/invitation-backgrounds/<template-id>`. Public reads allow the browser canvas to render the background. A deployment must configure the shared-state URL and R2 binding before an upload can succeed.

A template record contains its ID, name, background URL/media type/original dimensions, field configurations, and timestamps. Each event stores only `invitationTemplateId` plus its event date, RSVP date, and address values.

## Coordinates and rendering

The editor displays the original-size stage under one uniform CSS scale. Pointer coordinates and drag deltas are divided by that scale before being saved, so `x`, `y`, `width`, and `height` remain original-image pixels. Downloads create a fresh canvas at the background's original dimensions; they are not screenshots of the preview.

Text fields have transparent backgrounds. A field stores its data key, geometry, safe web font, size, weight, italic setting, color, alignment, letter and line spacing, and formatter. QR fields store square geometry and a quiet-zone setting. QR rendering consumes the existing account sign-in URL and never creates or changes a `qrToken`.

Bulk download and email include only accounts that can sign in to the selected event (including accounts marked **Always Invite**) and already have QR access. **Email All Invitations** uses the browser's secure file-sharing interface so the host can choose an installed email app with every generated PNG attached. QR quiet zones remain transparent in previews and exported invitations.

Replacing an image of the same size preserves the layout. The editor warns before replacing it with different dimensions and preserves coordinates without silently stretching them. Duplicating a template copies its background reference and independently copies its field configuration.
