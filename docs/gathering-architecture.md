# Shared gathering implementation

Gatherings have two behavior types. Thanksgiving, Christmas, and every newly
created gathering use the same standard type. Wedding explicitly enables its
special pages, ceremony/reception addresses, named children and plus-ones, and
meal choices. `gathering-features.js` is the single definition of these choices;
`EVENT_DETAILS` contains display metadata, not behavior switches.

| Concern | Shared implementation | Wedding differences |
| --- | --- | --- |
| Pages | `renderGatheringPages`, common page/container styles | `renderWeddingGathering` for couple, party, guest, timeline, registry and media content |
| RSVP | One form, attendance choices, counters and submit/save flow | Named children, named plus-ones and meals; regular gatherings use guest counts |
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
