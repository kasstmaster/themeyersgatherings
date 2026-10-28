# A1/A2 security implementation and approval-gated rollout

**Status: implemented for review; NOT approved for production deployment.** Do not merge the implementation branch into main or run its deployment workflow until the owner approves this plan, the private backup is verified, and the production settings below are ready. Main pushes start the deployment workflow. This security release adds a fail-closed repository-variable gate before any deployment step; it must remain unset until owner approval. That gate does not control existing branch-based Pages publication. Before merging, complete the redirect-only Pages cutover and other checks in the [coordinated release procedure](security-release-procedure.md).

Scope is A1 (state/host authorization) and A2 (stale state writes). A3 media ownership, A4 Christmas normalization, A5 heading content and A6 obsolete browser scripts are not being repaired here. Required media changes only authenticate session issuance and host operations; existing storage paths/ownership remain intact.

## Identity decision: no new guest requirement

The owner explicitly declined household access codes and email verification. Guest first-name and last-name entry remains; suffix entry appears only when recognized as needed. Existing account QR links pass their unchanged token as an account-lookup constraint. No QR token is generated, reissued or rotated by this implementation.

Guest names are matched on the server and yield a limited guest session. **This is identification, not strong identity verification.** Someone who knows a valid name can impersonate that guest; a known QR can narrow the lookup but is not trusted as a secret after the old state exposure. This limitation is intentionally accepted for the present family-site experience. It cannot be eliminated without another verification factor or a different invitation policy, neither of which is silently introduced.

Host authentication remains separate on the server but is hidden in the shared sign-in UI: enter the Host password in **First Name**, then choose **Next**. There is no visible Host option or separate password input. It is checked only against the service Worker's secret, never a frontend constant. The previous source-visible password must be replaced manually before activation; changing only the browser code would not make it safe. The new code fails closed for a password shorter than 24 characters. Use a unique, cryptographically generated password of at least 24 ASCII characters, supplied privately by the owner/operator. This task does not choose a production value.

The shared First Name field switches to password masking when its value reaches 24 characters. Autocomplete, spelling correction and capitalization are disabled on that field to avoid retaining or altering credentials. Password candidates are sent exactly as entered (no trimming) in the HTTPS login POST body with role `first-name`, never in URLs, guest-name payloads or saved state. The field is cleared before awaiting the request, duplicate submissions are blocked, and failures leave password candidates cleared. Only a server-confirmed existing long guest given name is restored for normal guest continuation; the response contains no account data or session. Ordinary shorter guest names still advance locally from First Name to Last Name. Guest login remains server-checked; conditional suffix entry is described below. Successful Host authentication clears all name fields, retains only the existing opaque runtime session and opens the Host gathering chooser. Failed hidden password attempts use the same server rate limit.

The existing direct server Host login remains compatible with older open frontend versions; its visible UI is removed by the matching new frontend. No new secret, password rotation, saved-data migration or QR change is required for this access change.

## Authorization and data delivery

`github-state-worker/auth.js` issues opaque sessions lasting eight hours for hosts and 30 days for new guest sign-ins. Existing sessions retain their original expiration; restoration never renews it. Only token hashes and authorization metadata are stored in private R2 under `security-v1/`.

On the canonical site, `domain-site-worker/session.js` bridges only POST `/session/auth/session` and `/session/auth/logout` to the existing service. It uses a host-only `__Host-MeyersSession` cookie (Secure, HttpOnly, SameSite=Strict, Path=/, no Domain), exact Origin/Fetch Metadata checks, fixed upstream, redirect rejection and no-store responses. Visitor cookies/credential headers are not forwarded wholesale or sent to static assets. The backend revalidates sessions, current account membership/access and invitation scope before returning an authorized projection and revision. The client retains an access token only in memory for existing state/media bearer requests; no passwords/tokens go into local/session storage, saved app JSON or public code. No third-party cookies are needed.

Logout is on the right of the chooser's name bar. It flushes or preserves pending drafts, revokes the server session and clears the cookie. If the network fails, a device-local non-credential sign-out marker suppresses restoration; server revocation cannot be guaranteed until the request reaches the service. Existing private local-draft retention applies. Expiration or a host-secret change also invalidates persistent sessions. Never log Cookie/Set-Cookie, Authorization, sign-in bodies or token values.

Deploy the service supporting `/auth/session` before the matching frontend/first-party bridge using the existing gated workflow. No new secrets, bindings, manual Cloudflare settings, QR changes or saved-state migration are required. Older open clients continue using their memory-only sessions; a fresh sign-in sets the persistent cookie. The live smoke check makes an anonymous resume POST, rejected before reading shared state.

State GET requires a valid session. The root route no longer accepts unauthenticated whole-state PUTs. Legacy `X-Host-Password` headers do not grant access. Sign-in errors do not disclose an account roster. Login has bounded bodies and best-effort IP throttling in R2. This is not a distributed, globally atomic rate limiter: configure an edge rate limit if the Cloudflare plan/domain supports it, and do not rely on it to turn name-only sign-in into identity proof.

Host sessions can manage the existing state, accounts, templates, styles and integrations. Host-previewing-an-account remains a host-authorized session; changing frontend flags cannot elevate a guest session.

Guest state is a server-created projection, not the full JSON:

- Only allowed gatherings and that household's account/response data.
- No other account records, QR tokens, invitation template records, archived histories, host Notes or Bride & Groom content.
- Other households' dish claims appear as anonymous occupied slots so existing menu availability still works without names.
- Wedding role content is limited to the matched member. Private/host page copies and unsafe reused private-text overrides are excluded; formatting groups remain gathering-specific. Canonical party Details/Timeline and permitted attire keep using their shared renderers.
- Guest mutations can update the current invitation's RSVP and permitted dish contributions only. The server preserves other invitation groups, other households' claims and responses, unknown unrelated data, account permissions, design settings and history. Existing invitation/deadline/meal helpers are reused for validation/merging.

Guest access maps are respected on the server, including explicit denials. Truly legacy accounts without a per-event map retain the older built-in-event selection interpretation. Names/sessions are rechecked against current account membership and access on state requests. As with any name-only policy, a removed person who knows another valid name may impersonate that other person.

Background artwork and attire asset delivery retain their existing public-by-URL behavior; do not treat those URLs as private storage. Account media still uses expiring scoped media tokens and the same Dropbox connection. A3's account-wide gallery remains unresolved. No OAuth/Dropbox/GitHub credentials are returned to guests.

## Conflict-safe saves

`shared-state-protocol.js` computes changes against the acknowledged browser baseline. `state-client.js` sends those changes with `If-Match` containing the server's GitHub blob revision. Arrays are atomic changes; this is deliberately conservative.

The service checks the revision and makes one conditional GitHub write with that exact SHA. A stale revision or a race at the GitHub write returns 409. There is no retry that attaches an older snapshot to a newer SHA. Missing revisions return 428; old full-state clients cannot write. A background read cannot advance the write revision until its matching state is actually adopted.

Transient network failures retry against the same revision. Conflicts pause retries and show Load latest information plus Download my local draft. Loading latest requires confirmation and a successful private local draft copy first. The application does not silently merge/replay a conflicted draft. Review and reapply intended changes to the latest state; a stale draft is never force-uploaded as a replacement.

The pre-security browser copy (even without a pending marker) and later pending drafts are quarantined under private local-draft keys before fresh authentication. Cached histories from another browser session are not imported into an authorized guest view. They are not automatically replayed without a baseline/revision. They remain sensitive device-local data: use a trusted device, keep private exports private, and do not commit/paste them into the public repository, issue tracker or chat.

Because revision checks currently cover the whole canonical file, a change to an unrelated gathering can also cause a conflict. This favors preservation over silent merging. Permissions do not depend on the client's filtering: forged changes are rejected by the server.

## Private backup and recovery plan — before activation

**Web-only option (recommended for the owner):** follow [Private backup entirely through GitHub](cloud-private-backup.md). Its manual-only workflow runs in the private data repository with GitHub’s automatic repository-scoped token, uses these same backup/restore helpers, and records the receipt privately. No Mac software or personal token is needed. The operator CLI steps below remain an alternative, not a requirement to use Terminal.

No live backup has been taken by the implementation task. No migration or production state write is performed by it. The state schema and existing QR/account data do not require a bulk rewrite, but deployment changes the access protocol and must still have a verified recovery point.

1. Confirm the **private** live state repository, branch and path from the deployed service. The checked-in target is `kasstmaster/themeyersevents-data`, `main`, `data/app-state.json`; do not assume runtime configuration matches.
2. Use an already authorized, privately held Contents read/write token on a trusted operator machine. Do not retrieve secrets through logs or paste values into chat. If a new token is needed, obtain approval before creating it. Coordinate a brief maintenance window and retain any unsynced browser drafts. Pause automatic AnyList runs and coordinate other writers where practical; do not discard their changes.
3. Set `STATE_REPOSITORY`, optional `STATE_BRANCH`/`STATE_PATH`, and `STATE_REPOSITORY_TOKEN` through private environment/secrets tooling. Run `node scripts/private-state-backup.js`. The tool refuses a public repository, reads directly from GitHub rather than a GET that may archive events, copies exact original bytes to a new private `security-backups/.../app-state.json` path, rereads at the immutable backup commit, verifies SHA-256, and confirms the source blob did not change during capture. If it reports a moving source or any error, **do not deploy**; keep the copy and repeat after coordinating writers.
4. Keep the returned repository/path/backup-commit/source-blob/hash receipt privately. It contains no guest data or token. Do not publish backup JSON. The copy is in the same private data repository, not this public website repository.
5. Run exported `verifyRestore` from `scripts/private-state-backup.js` with that receipt and the private token. It verifies repository privacy, retrieves the immutable backup, checks its hash and parses the original schema. This is a **no-write restore drill**, not permission to replace live state. Unit tests verify exact bytes and the zero-write drill. An operator must perform this against the real backup before activation.
6. Record verification privately and obtain the owner's deployment approval. Set the readiness attestation below only after these steps. It is an operator attestation, not a substitute for the backup receipt/drill.

If restoration is ever needed, first stop further writers and make another private backup of the current state. Separately authorize an expected-current-SHA restore from the verified immutable backup; never perform a blind overwrite. Preserve post-backup edits through a reviewed reconciliation. No production restore command is run or automatically provided as a one-click rollback here.

## Manual Cloudflare/GitHub changes requiring approval

In the **existing service Worker account** only:

1. Replace the exposed `HOST_PASSWORD` with the owner's privately chosen new password (at least 24 characters). Do not reuse the old source value or commit the new one. This is an explicit credential migration requiring owner approval.
2. Add `AUTH_MIGRATION_READY` with value `verified-backup-v1` **after** the verified backup/drill. Store it as a Worker secret so the existing Wrangler deployment does not clear a dashboard-only variable. It is a non-credential activation attestation. Without it, authentication fails closed.
3. Preserve the current private `INVITATION_BACKGROUNDS` R2 binding/bucket, `GITHUB_TOKEN`, repository settings, origin allowlist and Dropbox secrets/connection. Verify that R2 public bucket access does not expose private `security-v1/` or Dropbox namespaces. No new session-signing secret, guest code or email provider is required.
4. Review login rate limiting/log configuration: never record sign-in bodies, Authorization headers or session tokens. Cloudflare edge controls are recommended where available; their actual account support is not verified by local tests.

No new GitHub secret is required for runtime authentication. **A new repository Actions variable is required:** set `SECURITY_ROLLOUT_APPROVED=state-auth-v1` only after owner approval, private backup/restore verification and the Cloudflare settings above. Until then the first deployment step exits without touching either Worker. Do not set this variable automatically in code or treat the marker itself as backup evidence. Existing service/domain deployment credentials stay in their original Cloudflare accounts. The backup operator needs approved private-repository access as above. Review/protect the PR: **merging main triggers deployment**. Do not merge or manually deploy this branch before explicit owner approval and readiness checks. After the approval gate, the deployment workflow runs security, client-concurrency, static-privacy and backup regressions before deploying.

The workflow preflights backup currency using private metadata, both Cloudflare targets and the separately published redirect-only Pages artifact before any deployment. Its new manual preflight mode can run from the reviewed branch without merging or deploying; follow the exact branch/mode instructions in the release procedure, since the old main workflow does not have this mode. It does not cancel active releases. A harmless service readiness check and exact release commit must pass before matching frontend publication; the final frontend receipt must match too. These checks do not prove integration credentials or enforce maintenance. See the [release sequence and partial-failure handling](security-release-procedure.md).

For cutover, coordinate staging/maintenance with the owner, provision/replace the approved settings in the correct account, deploy the service and matching frontend together through the reviewed release, then verify the gates below. Existing printed URLs/QR values are unchanged. Previously loaded old frontend tabs cannot use the new API and need a reload; retain unsynced drafts before cutover. Do not promise a zero-interruption mixed-version window or reopen anonymous access as a fallback.

## Release verification and rollback boundaries

Before approval, local tests cover anonymous denial, host authentication, unchanged QR/name entry, guest projection/mutation permissions, stale devices, GitHub write races, history, existing media authorization, private backup and restore verification. `scripts/verify-secure-state-browser.cjs` uses the real Worker with synthetic in-memory GitHub/R2 and a local browser; it contacts no production service.

After approved deployment, privately verify a real existing Thanksgiving invitation, name-only general entry, correct household/event visibility, RSVP and dish contribution, host edit/account/template/AnyList controls, Photos uploads/link sharing and a two-device conflict. Confirm the canonical state still retains the pre-cutover account/QR/formatting records and all later authorized changes. Do not submit test production RSVPs/uploads without explicit permission.

If release verification fails, pause writes/disable activation and keep the private data intact while preparing a forward fix. Do not casually restore the old unauthenticated Worker or auto-upload a backup: that would reopen A1 or erase newer work. Review any actual restore separately with its current revision and backup evidence.

## Remaining limits

- Name-only identification permits guest impersonation and remains vulnerable to someone who knows a name. It never grants host permissions by itself.
- Historical public credentials/data cannot be made secret retroactively; replacing the exposed host password is mandatory. Printed QR identifiers remain intentionally unchanged.
- A3–A6 remain open. Existing public asset delivery and device-local private caches require appropriate handling.
- Global revisions conservatively reject unrelated concurrent changes. Conflicted drafts need human review, not automatic last-write-wins behavior.
- R2 throttling is best-effort. Live CF configuration, actual backup verification, Dropbox/AnyList behavior and real-device cutover have not been verified by local mocks. Deployment must remain pending until the owner approves and the operator completes the checklist.

Persistent-session Node/CI tests cover expiry, revocation, CSRF, account/QR scoping, local-storage safety and restore/logout races. `scripts/verify-persistent-session-browser.cjs` is an optional cloud-local Chromium test using both real Workers and synthetic state; it covers browser reopening, HttpOnly cookies, mobile Logout placement and offline logout without contacting production. It is not run by npm test or CI.

Password/name verification continues directly at the existing service login endpoint, preserving visitor IP rate limiting. After successful authentication, the first-party bridge verifies that opaque session before setting the cookie. New sign-in/logout attempts cancel pending persistence requests so older responses cannot restore a replaced session. If persistence is temporarily unavailable, the current visit remains authenticated and the UI reports that persistence was unavailable.

The first-party bridge uses Cloudflare-supported `redirect: manual` and explicitly rejects all upstream 3xx responses without following them or forwarding Location. Cloudflare edge fetch rejects Node’s `redirect: error` option; the guard must remain an explicit status check. This behavior is covered by the bridge regression test and was reproduced in local workerd.

## Conditional guest suffix entry

After First Name and Last Name, the shared client sends the normal guest login with `checkSuffix: true`. The server checks current access, invitation QR scope, canonical names and valid sign-in aliases. A suffix-free exact match receives its ordinary guest session immediately. A matching suffixed name returns only `{next: "suffix"}` with no token, state, account roster or suffix options; this continuation counts against the existing IP attempt limit. Completing the suffix performs ordinary full-name authentication. Existing clients that submit a full name without the flag remain compatible. Names supplied through aliases are mapped back to the server-confirmed canonical person, preserving Wedding Party identity. No guest codes, saved-data migration, new credentials or configuration are required. As with existing name-only login, recognizing a suffix is not identity proof and reveals a limited fact about the entered name.

## Guest archive and lifecycle authorization

Archive-only households can retain existing name/QR sign-in without receiving current gathering permissions. Their `pastGatherings` are filtered using the same guest projection, with no Host notes or other households. `PATCH /gathering-management` is Host-only and revision checked; cancelled gatherings reject guest mutations and scoped media access. Read-only archive media sessions are revoked when the occurrence is deleted. No extra credential or binding is needed. See [yearly lifecycle](gathering-lifecycle.md) for date isolation, confirmation phrases, 30-day recovery and preserved private backups/Dropbox.
