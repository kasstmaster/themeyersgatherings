# Shared gathering implementation

Gatherings have two behavior types. Thanksgiving, Christmas, and every newly
created gathering use the same standard type. Wedding explicitly enables its
special pages, ceremony/reception addresses, named children and plus-ones, and
meal choices. `gathering-features.js` is the single definition of these choices;
`EVENT_DETAILS` contains display metadata, not behavior switches.

| Concern | Shared implementation | Wedding differences |
| --- | --- | --- |
| Pages | `renderGatheringPages`, common page/container styles; Notes and Menu are host-only on standard gatherings | `renderWeddingGathering` for couple, party, guest, timeline, registry and media content |
| RSVP | `RsvpFlow` provides one full-page question at a time, Back, validation and review. Standard gatherings offer dish commitments at the end; No saves immediately. | Named children, named plus-ones and meals; regular gatherings use guest counts |
| Attendance | `GuestPlanning`, invitation groups, one host list renderer | Individual names/meals; regular entries show surname and counts |
| Accounts and invitations | One account manager, invitation assignments, QR/template/download flows | No separate manager or invitation implementation |
| Editing and history | `SiteEditing`, `SharedDetails`, `GatheringHistory` | Wedding-only content editors enabled by features |
| Design | Shared header, page shells, tabs, panels, toolbars and popup footers | Wedding-specific artwork/attire styling and content |
| Themes | Palette and header-art variables, common layout rules | Wedding decorative header and its palette |

Names, dates, menus, invitations, palettes, and artwork are gathering data.
Holiday-specific default menus and compatibility migrations do not select a
different rendering or RSVP implementation.

When adding a standard feature, update the common renderer or the standard
feature definition once. Do not add Thanksgiving/Christmas/custom-gathering
branches. When adding a Wedding-only feature, declare the capability and gate
its rendering **and validation**; remove inactive required fields when switching
gatherings. Keep geometry and typography in shared CSS rather than theme rules.

Regression checks include `verify-gathering-management.cjs` (creation, palettes,
and permissions), `verify-gathering-consistency.cjs` (shared layouts and features),
`verify-rsvp-child-names.cjs`, `verify-extra-guests.cjs`, `verify-edit-layout.cjs`,
and `verify-popup-footers.cjs`. Browser checks block live writes and external
requests. Run Node tests with `node --test --test-isolation=none`.


Editable content owns its Markdown formatting. Do not force a host-edited
paragraph to regain its default emphasis or change its saved Markdown to make
gatherings look alike. Shared layout, controls, and component styles are separate
from those intentional content choices. Invitation/account list headings and
adult counts share `invitedInvitationGroups`, `invitedAdultCount`,
`adultCountLabel`, and `invitationHeadingHtml` in `app.js`.

RSVP questions reuse the existing form controls and saved-response model. The
journey builds only the questions enabled by `GatheringFeatures.rsvp`, including
any dynamically added guests and children. Save commits attendance and standard
gathering dish claims together. Closing the journey discards unsaved changes.
Dish selection uses the existing menu quantities and claim ownership; guests may
also name another dish. At the deadline, dish changes and Wedding guest/meal
changes are skipped and locked while attendance remains editable. Host edit mode
keeps the structured form available for editing meal options.

The guest landing page of a standard gathering leads into RSVP instead of
showing its menu. Hosts keep their Notes/Menu pages for planning. Wedding pages
remain separate. The sign-in and RSVP screens share `fullscreen-flow` and
`full-page-form` styles. `scripts/verify-rsvp-flow.cjs` exercises the journey on
desktop and mobile, including custom gatherings, invitation scope, validation,
deadlines, and contribution updates.

The RSVP page heading follows the current question; attendance asks “Is [name]
joining us?” without repeating the name below. Body text uses a simple sans-serif font and shared question-title
sizes. The standard-gathering dish question uses Yes/No actions that advance or
save directly, with the normal Next button hidden on that question.
The welcome kicker appears only on attendance questions. RSVP omits the generic
celebration introduction and page counts; later steps keep only relevant copy.

Standard RSVP dishes use checkboxes in separate full-width category groups.
Category names are hidden in the RSVP menu, with spacing between the groups. A checked
dish with multiple available portions reveals a required quantity selector;
single-portion dishes use one automatically. Choices share a responsive grid
that stacks on small screens. Saved quantities restore with their checkboxes.

The children step places “Age 17 and under” directly below its page heading.
Dish category groups keep a 64px vertical gap.

Attendance uses mutually exclusive checkboxes for accepting and declining.
Neither checked remains unanswered and cannot be submitted as a decline.

Wedding collects all child names in one step after the children counter, with
each name required before continuing. Other gatherings still use counts only.
