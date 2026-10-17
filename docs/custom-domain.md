# Publishing at ilymmd.com/themeyers/

## Current status

The gathering site is prepared to run at `/themeyers/` with the same shared-state
service and existing account QR tokens. The live domain has **not** been switched.
The parent website is `plexrequests/plex-requests-app`; access to that repository
and the live domain is needed before its hosting configuration can be changed.
Do not rename or disable `kasstmaster/themeyersgatherings` or change its Pages settings.

## Build from the shared source

Run from this repository:

```sh
node scripts/build-domain-site.js /tmp/meyers-domain-site
```

The output contains only:

- `themeyers/`: the existing frontend, relative assets, and fallback state, with a
  canonical URL of `https://ilymmd.com/themeyers/`.
- `themeyersgatherings/`: a legacy-path redirect preserving the entire query
  string and fragment, including `#/signin/account/TOKEN`.

The builder refuses to overwrite either output directory. It leaves any parent
home page intact and excludes the Worker, Git metadata, dependency manifests,
and CNAME settings. No account, invitation assignment, RSVP, or QR token is edited.

Call this builder from the parent website's normal build using a checkout of the
shared gathering source; do not maintain a second editable copy of the frontend.
The actual output directory and routing must be integrated with that repository's
existing hosting framework after inspection. DNS cannot route individual paths.
Do not replace its home page, existing deployment workflow, or SPA fallback blindly.

## Service compatibility

Deploy the gathering Worker before making the new page public. Its allowlist
retains `https://kasstmaster.github.io` and adds `https://ilymmd.com` and
`https://www.ilymmd.com`. Exact origins receive their own CORS response; unrelated
origins remain rejected. If Cloudflare has environment overrides, check those
against the same allowlist. The Dropbox OAuth callback remains on the existing
Worker and does not require changing the Dropbox app's callback URL.

The old GitHub Pages frontend remains functional. The custom-domain legacy-path
alias handles `/themeyersgatherings/` if old links are ever redirected there by
GitHub. Do not redirect or retire the old frontend before the new route and service
have passed live checks. Browser-only storage does not transfer between origins;
verify the host's latest state is synced before any eventual redirect.

## Release checks

1. Verify the parent website still works at `/`.
2. Verify `/themeyers/` and all relative assets serve successfully over HTTPS.
3. Verify general sign-in, an existing invitation QR link, and invitation-scoped RSVP.
4. Verify requests from both origins reach the same shared-state service, including
   saves, upload sessions, and existing Dropbox connectivity.
5. Verify `/themeyersgatherings/` forwards query and fragment unchanged.
6. Scan an already printed invitation and confirm it still opens the correct
   invitation. Keep the old repository and Pages address active permanently.

Automated checks:

```sh
node --test --test-isolation=none test/domain-migration.test.js
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-domain-migration.cjs
```

The browser check is offline: it serves a staged bundle through request interception,
uses a synthetic account token, and sends no requests or writes to the live sites.
It proves path/asset/redirect compatibility, not live deployment or real invitation access.
