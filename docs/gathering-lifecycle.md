# Yearly gatherings, guest archives, and removal

The common history module powers all gathering types, including Wedding and newly created gatherings. An occurrence is identified by its gathering ID **and date**. Management actions affect only that occurrence, never every year of a gathering.

## Guest selection and archives

**View Past Gatherings** is an expandable dropdown below the current gathering choices. Expanding it lists earlier years; selecting one opens its read-only history/photos. Previous calendar years, using America/Los_Angeles time, appear in the read-only archive. Upcoming gatherings stay in the normal selection; completed gatherings from the current year appear at the bottom in their existing relative order. An empty current selection still supports archive browsing and Host creation/management.

Archive access follows historical invitation/access records or recorded attendance, matched to the current household using stable account identifiers when available. Resetting next year's invitation selections does not revoke older archive access. Existing name entry and household QR invitations still work for archive-only accounts. Guests receive a privacy-filtered projection of their household's RSVP, dishes and meals; other households, Host notes, private pages, credentials and deletion recovery records are excluded. Historical guest access is read-only and never grants access to another current gathering.

Archives show the saved occurrence's gallery link and permitted household uploads. New upload sessions, sharing links and Dropbox receipts are tagged with gathering ID/date. Archive media sessions are read-only and checked against current server access, so cancellation/deletion revokes previously issued scoped sessions too. Existing uploads that never recorded a gathering/year remain available to their authorized owner, explicitly labelled **Earlier upload (gathering/year not recorded)**; the system does not guess their historical assignment or move/delete their underlying files. Other households' uploads remain private unless the Host deliberately supplies a shared gallery link.

## Host management

While editing any website page, **Manage Gatherings** appears above Menu/Templates in the Host edit sidebar. It is hidden outside edit mode and never appears in the main toolbar or to guests. Its dialog uses the same wide editor dialog/modal-card classes as other management popups. Open it and select the name/date:

- **Save gathering information** saves its Name together with the selected occurrence’s date, time, RSVP-by and address in this one area. Wedding includes separate reception time/address. A date change reschedules the occurrence and preserves RSVPs; **Start next occurrence** deliberately starts a fresh year. Rescheduled media dates remain aliases for the same occurrence, and historical snapshots are rekeyed without overwriting another date. Template fields read these canonical values.
- **Rename** updates that occurrence's name. It does not rename a different year or change its design.
- **Cancel gathering** opens a separate warning and requires the exact phrase `CANCEL YYYY-MM-DD`. Only an upcoming/current-day occurrence can be cancelled. Authorized guests see it marked Cancelled but cannot open it, RSVP or upload. It stays visible through the end of its Pacific gathering date, then is removed without creating an archive for that date. Other years remain.
- **Delete gathering** opens a separate warning and requires `DELETE YYYY-MM-DD`. That occurrence disappears from guests immediately. The Host can use **Restore** for 30 days from the server-recorded deletion time. After the cutoff the recovery record, event and matching history are removed from live website state.
- **Save gallery link** lets the Host add or replace the selected year’s photo gallery link later, including for an archived year. It leaves other years untouched. **Start next occurrence** opens the existing next-date flow for a completed current occurrence.
- **Restore** returns the saved occurrence without overwriting a newer occurrence using the same gathering ID. If a newer occurrence exists, the restored date returns to history instead.

The existing hourly Worker task performs cleanup even when nobody opens the website; authorized state reads/saves also run maintenance. Physical live-state cleanup can therefore occur on the next read/save or hourly run, rather than at the exact second. Restore is rejected at or after its 30-day cutoff. No GitHub commit history, private backup, external Dropbox folder, or unrelated year's records are erased. The application does not recreate removed built-in gatherings from static defaults when loading saved state.

## Storage, concurrency, and maintenance

`gatheringHistory[id][date]` remains the existing immutable snapshot structure, with explicit Host rename/delete/restore commands as the only lifecycle exceptions. `gatheringLifecycle[id][date]` contains cancellation markers or temporary Host-only deleted-occurrence recovery data. Tombstones prevent ordinary history preservation from reintroducing a cancelled/deleted snapshot during its retention period. After expiry the live occurrence/recovery record is removed; no permanent deletion-history list is retained. Guest responses use a separate filtered `pastGatherings` projection; it is never a writable archive source.

`PATCH /gathering-management` requires a server-verified Host session, the current `If-Match` revision and a validated command. Commands perform the same conditional GitHub write as ordinary saves. Stale commands fail with 409; missing revisions fail with 428. UI management waits for local pending saves or stops with a visible error. Ordinary guest mutations cannot change lifecycle/history, and cancelled occurrence mutations are rejected server-side.

No new production secret, binding, cron schedule, invitation reissue, or destructive data migration is needed. Existing saved snapshots/accounts remain compatible. The ordinary verified private backup and backend-first reviewed-commit deployment gates still apply before release. Testing uses synthetic fixtures, never live guest state.

When changing archive visibility, lifecycle storage, account matching, media scope, or retention, update this guide and the shared history/security/browser regressions. Keep the operation keyed by ID/date and never extend it to all years implicitly.

Name changes are reflected in the shared gathering metadata for built-in and custom gatherings. Both Save gathering information and the separate Rename action use the selected ID/date; archived names remain independent. A failed save keeps the entered values available for correction/retry instead of replacing them with the previous saved values.
