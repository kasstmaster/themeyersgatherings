# Host-only push notifications

This feature requires an explicitly approved production setup. Adding the code alone sends no notifications: it is off until the Cloudflare `HOST_PUSH_VAPID` Secret exists and a verified Host enrolls a browser/device. No existing password, invitation token or integration credential is rotated.

## What triggers an alert

After an authorized shared-state save commits successfully, the shared Worker compares confirmed attendance, child/guest attendance, active Wedding meal/dietary selections and potluck claims/invitation attribution across gatherings. It queues one generic notification for a changed save. Stale/failed saves, formatting changes, unclaimed menu edits, archived-only meal fields and starting a new occurrence do not trigger alerts. Private sit-down preparation checkboxes are menu planning, not guest RSVP selections, and do not trigger alerts.

Alerts say **The Meyers — Attendance or food selections were updated. Open the website to view changes.** No names, counts, meals, gathering titles, credentials or session URLs are included. Web Push messages have an empty body; the service worker displays fixed text and ignores incoming payloads. Clicking focuses an existing site window without navigating away from its draft, or opens the sign-in/home page. Private details still require authentication.

## Approved, web-only deployment and setup

1. Review and approve the PR and this setup plan. Refresh and verify the existing private state backup before merging. The normal backend-first deployment and matching-commit gates remain required.
2. Deploy the feature with no new secret first. It remains disabled. Verify the matching frontend/backend release and existing invitation links. `/health/host-push` returns only the public protocol marker `host-push-v1`.
3. In the application repository, open **Actions → Set up Host push signing keys (one time) → Run workflow**, select `main`, and enter `CREATE_HOST_PUSH_KEYS`. This is an explicit production configuration change and must not be run before owner approval.
4. The job uses the already-configured `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for the existing state Worker account. It checks harmless readiness and secret-name metadata, generates a P-256 VAPID pair in the Actions runner, masks it, and writes one atomic Cloudflare Worker Secret named `HOST_PUSH_VAPID`. Private keys exist only in temporary runner memory and that encrypted Secret. No secret, backup or guest data is written to logs, artifacts or public files. The token needs the same Workers Scripts edit access already used for deployment; the website-domain account/token is not used.
5. Sign in as Host on the receiving device. Open the Host toolbar’s **Notifications** bell, select **Enable on this device**, and approve the browser permission prompt. Guests cannot enroll or see this option. Repeat on each desired device.
6. Use **Send test notification** and confirm it arrives. The service accepting a test is not proof that the operating system displayed it. Actual end-to-end delivery remains unverified until tested on the approved real device. Test sends do not modify RSVPs or menus.

No Mac development tools, Terminal commands, external notification account, new storage binding, new cron schedule or saved-data migration are required. If the setup job reports an ambiguous error, inspect whether `HOST_PUSH_VAPID` exists before retrying. The job refuses to replace an existing secret: do not delete it or generate replacement keys as a routine retry. Key rotation needs a separate plan and device reenrollment.

### Browser/device requirements

Use HTTPS and a browser supporting service workers, Push API and Notifications. On Samsung/Android, open the site in Chrome, sign in as Host, open **Notifications → Enable on this device**, and allow notifications. If no alert appears, check Android **Settings → Apps → Chrome → Notifications** and the site’s Chrome notification permission; exact labels vary by phone. Installing the site is optional on Android. On iPhone/iPad, Web Push requires iOS/iPadOS 16.4 or later and opening the website from its Home Screen icon; a normal browser tab cannot enroll. Use the browser’s Add to Home Screen action, open the icon, sign in as Host, then enable notifications there. On Mac/desktop, grant the site notification permission in a supported browser. Focus/Do Not Disturb, browser/OS restrictions, revoked permissions and vendor delivery policies can suppress or delay notifications.

## Storage, authorization and lifecycle

`/host-push` GET/POST/DELETE and `/host-push/test` require a current server-verified Host bearer session. Anonymous requests are rejected and guests receive 403. Status exposes only readiness, the public application-server key and hashed device IDs to the Host. Device endpoints are restricted to known HTTPS browser push providers, are never followed through redirects and are never logged.

The existing private R2 binding stores device endpoints, the current Host credential fingerprint and VAPID public-key association under `host-push-v1/devices/`. It does not store browser payload-encryption keys or gathering state. Guest state projections contain none of this metadata. The bucket must remain private, as required for existing sessions and uploads. Changing the Host password invalidates old device records; no passwords or auth sessions are stored in notifications.

An enrolled browser can receive generic alerts while the site is closed or its Host session has naturally expired. Opening private information still requires Host authentication. **Disable on this device** unsubscribes it; explicit logout also unsubscribes before clearing the session. A guest sign-in suppresses a previous local Host subscription. If server removal fails offline, local unsubscribe still stops that browser; expired provider endpoints are removed on delivery.

Successful writes enqueue an outbox record containing only creation time and hashed recipient IDs. Sending runs in `waitUntil` and does not block the RSVP response. Temporary push failures remain queued and are retried by the existing hourly scheduled handler (also on later changed saves); records expire after 24 hours. Expired endpoints (404/410) are removed. Delivery is best effort, may be delayed or repeated around failures, and is not an audit log or a guarantee of receipt. Notifications share a stable tag to avoid filling the notification tray with duplicates. If the initial outbox write itself fails, the RSVP still succeeds and that alert may be lost; no saved data is rolled back. Fixed generic warnings contain no endpoints or API response bodies.

## Verification and maintenance

Automated tests cover Host/guest/anonymous access, endpoint allowlisting, independently verified VAPID signatures, no-payload delivery, credential-replacement revocation, confirmed-save/stale-save behavior, retry/expired endpoints, browser permission gating, fixed service-worker messages, explicit provisioning approval and refusal to rotate existing credentials. The optional local Worker/browser regression verifies guest invisibility and disabled-until-configured Host controls alongside existing RSVP, QR and editor flows. It does not contact production push providers or grant real device permissions.

Keep changes to this shared feature in the common Worker/client/service worker, not holiday-specific editors. Preserve confirmed-save and authorization gates. Never log subscription endpoints, signing keys, bearer tokens, guest names or push-provider response bodies. When altering triggers, setup, device lifecycle or providers, update this guide and relevant tests.
