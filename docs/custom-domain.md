# Publishing at ilymmd.com/themeyers/

## Cloudflare route and shared source

The existing `curly-sun-ef0f` Worker serves the gathering frontend through a static
asset binding at `https://ilymmd.com/themeyers/`. Its routes match only
`/themeyers`, `/themeyers/*`, `/themeyersgatherings`, and
`/themeyersgatherings/*`, on the apex and www hostnames. The Plex home page,
Plex assets, API, and Firebase deployment keep their existing origin. No changes
to `plexrequests/plex-requests-app` are needed.

The existing main-site service worker was inspected: it fetches requests from
the network first and does not replace gathering paths with the Plex shell.

The GitHub Actions Worker deployment builds the static frontend from this
repository on every main-branch push, then deploys the Worker, routes, and assets
together. There is one editable frontend source, not a second copy in the Plex
repository. GitHub Pages continues publishing the original source as before.

Cloudflare must have the ilymmd.com zone in the account used by the existing
workflow. Its `CLOUDFLARE_API_TOKEN` needs Workers Scripts and Workers Routes
permissions for that zone; the existing R2 permissions remain needed. The route
requires the hostname to be proxied through Cloudflare. The repository uses its
existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets; no credentials
are embedded in source or the generated frontend.

## Existing invitation QR links

Do not rename or disable `kasstmaster/themeyersgatherings` or change its Pages
settings. The original address remains a working frontend using the same shared
state and account QR tokens. Existing printed invitations do not need to change. All future general-login and
individual invitation QR prints use `https://ilymmd.com/themeyers/`, even when
printed from the old frontend. There is no date-based cutoff and old links do not expire.

The custom-domain legacy path and www hostname redirect to the canonical path
with HTTP 308. The complete query string is retained and the browser preserves
its original fragment, including `#/signin/account/TOKEN`. Account tokens,
invitation assignments, account records, and RSVP data are not regenerated.

The Worker allowlist retains `https://kasstmaster.github.io` and adds
`https://ilymmd.com` and `https://www.ilymmd.com`. Exact allowed origins receive
matching CORS headers; unrelated origins remain rejected. The Dropbox OAuth
callback remains on the existing Worker and does not change.

## Build and validate

```sh
node scripts/build-domain-site.js .domain-site
npx wrangler deploy --config github-state-worker/wrangler.toml --dry-run
node --test --test-isolation=none test/domain-migration.test.js
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-domain-migration.cjs
```

The builder creates `.domain-site/themeyers/` from relative frontend assets and
fallback state, and a standalone legacy-path redirect in
`.domain-site/themeyersgatherings/`. It refuses to overwrite either directory.
It excludes the Worker, Git metadata, package manifests, and CNAME settings.
The generated directory is ignored by Git and rebuilt in CI.

The browser check is local-only: a local HTTP server runs the actual route handler
using staged static assets and a synthetic account token. Canonical redirect hosts
are mapped to the local server so the browser never contacts the live website. It verifies browser
fragment preservation, asset loading, and scoped sign-in at desktop/mobile sizes
without sending requests or writes to the live sites.

## After merging

The existing Worker workflow publishes this change and runs a read-only public
smoke check of both sites, original QR address, assets, redirect, and CORS. Confirm that it completes,
then verify the live site before sharing its new address:

1. Plex still opens at `/` and its existing routes continue working.
2. `/themeyers/` serves the gathering site and its assets over HTTPS.
3. A general login and an already printed invitation both open the intended account.
4. Both old and new frontends reach the same shared state, including RSVP saves,
   private galleries, and Dropbox upload sessions.
5. `/themeyersgatherings/` retains query/fragment information when redirecting.

Do not retire or force a redirect from the old GitHub Pages frontend. Browser-only
storage does not transfer across origins; verify the latest host state is synced.
