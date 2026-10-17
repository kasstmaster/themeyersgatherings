# Publishing at ilymmd.com/themeyers/ with two Cloudflare accounts

## Workers and account boundaries

The two Cloudflare accounts have separate deployments:

| Worker | Account | Configuration | GitHub credentials |
| --- | --- | --- | --- |
| `curly-sun-ef0f` | Existing service account | `github-state-worker/wrangler.toml` | Existing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` |
| `themeyers-site` | Account containing `ilymmd.com` | `domain-site-worker/wrangler.toml` | New `CLOUDFLARE_DOMAIN_API_TOKEN` / `CLOUDFLARE_DOMAIN_ACCOUNT_ID` |

The service Worker keeps shared state, R2 storage, uploads, Dropbox, and its existing
secrets in the original account. It does not attempt to register ilymmd.com routes.
The website Worker needs only static assets and the domain routes; it receives no
service-account credentials, storage bindings, or Dropbox secrets.

Both deployments run from the existing GitHub Actions workflow in isolated jobs.
The service deploys before the website so its CORS configuration is ready. The
frontend is built once from this repository, shared between jobs as an artifact,
and deployed without maintaining a second editable copy of the source.

## Required one-time GitHub setup

In the Cloudflare account that contains **ilymmd.com**:

1. Copy that account's **Account ID** from the dashboard. Use the Account ID, not
   the Zone ID.
2. Create an API token authorized for that account and the ilymmd.com zone:
   - Account → Workers Scripts → Edit
   - Zone → Workers Routes → Edit
   - Zone → Zone → Read
   Limit the account resource to the domain's account and the zone resource to
   `ilymmd.com`. The token needs access to both Worker deployment and route creation.
3. In `kasstmaster/themeyersgatherings` → Settings → Secrets and variables → Actions,
   add repository secrets:
   - `CLOUDFLARE_DOMAIN_ACCOUNT_ID`: the domain account's Account ID.
   - `CLOUDFLARE_DOMAIN_API_TOKEN`: the token from that same account.

Keep `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` unchanged: they deploy the
existing service Worker in the other account. Do not paste token values into chat.

The website job stops with a specific missing-secret annotation if either new
secret is absent. No extra R2 bucket or Dropbox connection is needed in the domain
account. The ilymmd.com hostname must be proxied through Cloudflare for Worker
routes to apply.

## Paths and existing website

The website Worker matches only `/themeyers`, `/themeyers/*`,
`/themeyersgatherings`, and `/themeyersgatherings/*` on the apex and www hostnames.
The Plex home page, Plex assets, API, and Firebase deployment keep their existing
origin. No changes to `plexrequests/plex-requests-app` are needed.

The main site's existing service worker was inspected: it uses network-first
requests and does not replace gathering paths with the Plex shell.

The custom-domain legacy path and www hostname redirect to
`https://ilymmd.com/themeyers/`, retaining the query string and browser fragment.
The original `kasstmaster/themeyersgatherings` repository and GitHub Pages address
remain active for printed invitations. Existing account QR tokens are not changed.
All future general and individual invitation QR prints use the new address,
including prints made from the old frontend. There is no date-based expiration.

Both sites use the same service URL. Its CORS allowlist retains
`https://kasstmaster.github.io` and includes `https://ilymmd.com` and
`https://www.ilymmd.com`. The Dropbox callback remains on the original Worker.

## Validation and release

```sh
node scripts/build-domain-site.js .domain-site
npx wrangler@4.151.1 deploy --config github-state-worker/wrangler.toml --dry-run
npx wrangler@4.151.1 deploy --config domain-site-worker/wrangler.toml --dry-run
node --test --test-isolation=none test/domain-migration.test.js
NODE_PATH=/path/to/playwright/node_modules node scripts/verify-domain-migration.cjs
```

The generated directory is ignored by Git. It contains only frontend files,
relative assets, fallback state, and canonical URL metadata; no credentials or
Worker source are included. The builder refuses to overwrite its output folders.

The local browser test runs the production website route handler with staged
assets and a synthetic account token. It verifies HTTP redirect fragment
preservation and sign-in without contacting or changing either live website.

After adding the new secrets and merging, the workflow deploys both Workers and
runs a read-only live check of the main site, gathering site/assets, original QR
address, redirect, and CORS. Then verify an existing printed invitation and normal
RSVP/upload interactions. Keep the old GitHub Pages address active permanently.
