# The Meyers standalone app with two Cloudflare accounts

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

After the security rollout approval gate passes, both deployments run sequentially in one job in `.github/workflows/deploy-state-worker.yml` on every main push or manual dispatch. Both Cloudflare account targets and dedicated redirect-only Pages publication are preflighted before deployment. The service deploys before the website; a matching-commit protocol readiness check must pass before the frontend can publish. Active releases are serialized without cancellation by newer runs. The frontend is built once into `.domain-site` in that job and deployed from its asset binding, without maintaining another editable source copy. This workflow does not create the R2 bucket or install runtime secrets; provision those in the service account first.

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

The domain-credential step stops with a specific missing-secret annotation if either new
secret is absent. No extra R2 bucket or Dropbox connection is needed in the domain
account. The ilymmd.com hostname must be proxied through Cloudflare for Worker
routes to apply.

## Separate app and existing invitations

The website Worker serves **https://meyer.ilymmd.com/** through a Cloudflare
Workers Custom Domain. Wrangler provisions its DNS and TLS in the domain account;
do not point this hostname at Firebase or move the existing apex/www records.
The same Worker retains the gathering path routes on the apex and www hostnames
and redirects those paths to the subdomain, preserving asset paths, query strings
and browser fragments. Plex home page, assets, API and Firebase stay unchanged.

The app manifest has its own origin, name **The Meyers**, root identity, root
launch URL and scope. Local rose PNGs (192/512), Apple touch icon (180) and favicon
are bundled with the app. No external image host is needed at runtime. The generic
offline reconnect page is the only cached page; live pages, RSVP data, account
information and uploads are never cached by the app's service worker.

The original GitHub Pages address stays active for printed invitations. Before merging the security release, move Pages from `main` to the dedicated `gathering-redirect` branch using the [coordinated release procedure](security-release-procedure.md). Its redirect-only artifact opens the new app with the original query and account token fragment intact. Existing account QR tokens are never changed. Future general and
individual QR prints use the subdomain, even when printed from an old frontend.
There is no date-based expiration. Existing browser-local preferences are not
transferred between origins; shared accounts and RSVPs stay in the same backend.

The backend CORS allowlist retains both old origins and adds
`https://themeyers.ilymmd.com` and `https://meyer.ilymmd.com`. Dropbox authorization callbacks remain on the
original service Worker and existing connections/storage stay in its account.

### Install and open

Open **https://meyer.ilymmd.com/** directly. On Android/desktop, use
**Install The Meyers** for the native browser installation prompt when available.
On iPhone/iPad, open in Safari, tap Share, then **Add to Home Screen**. The button
also shows these manual instructions and hides when the app is already running
in standalone mode. The rose loading screen and browser title both use The Meyers.
An old shortcut installed from the parent domain may still be Plex; install again
from the new address to obtain the separate app. Plex does not need to be removed.

QR links use ordinary HTTPS. Whether a QR opens the installed app or the browser
is controlled by the operating system; this setup cannot force that choice.

## Validation and release

The separate `validate-gathering-builder.yml` workflow runs `npm test` and the frontend build on pull requests and main pushes. The deployment workflow runs its listed compatibility-test subset, then deployment and read-only live verification. Optional browser scripts are not automatically part of those workflows. The GitHub Pages build/deploy is also separate.

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
address, redirect, and CORS. Manual workflow_dispatch releases must target `main` and require the same approval and preflight checks. Review-branch deployment is blocked.
Then verify an existing printed invitation and normal
RSVP/upload interactions. Keep the old GitHub Pages address active permanently.

## Security release hold

The A1/A2 branch changes the state protocol and host authentication. Do not merge or manually deploy it just because ordinary CI passes: main pushes deploy automatically. First follow the [private backup, host-secret replacement, readiness setting and owner approval plan](state-security-rollout.md). The new first-step gate requires repository variable `SECURITY_ROLLOUT_APPROVED=state-auth-v1` after owner approval; leave it unset beforehand. Existing QR redirects and token values are preserved; old open frontend tabs need a reload at cutover. No guest access code/email provider or new DNS/R2 binding is required.

Release sequencing, the separate Pages publication change, minimum preflight read permissions, same-commit readiness checks and partial-failure recovery are documented in [the security release procedure](security-release-procedure.md). No checklist or approval variable makes the release atomic or automatically pauses writers.

## First-party sessions

The canonical Worker handles POST `/session/auth/session` and `/session/auth/logout` before assets, using the fixed existing service upstream. Existing custom-domain routing and `run_worker_first` cover these paths; no new binding, route or secret is required. Assets still receive no authentication headers/cookies. See [session security](state-security-rollout.md) for lifetimes, logout, and backend-first deployment. The anonymous post-deployment resume check must return 401 with no-store headers.

Password/name verification continues directly at the existing service login endpoint, preserving visitor IP rate limiting. After successful authentication, the first-party bridge verifies that opaque session before setting the cookie. New sign-in/logout attempts cancel pending persistence requests so older responses cannot restore a replaced session. If persistence is temporarily unavailable, the current visit remains authenticated and the UI reports that persistence was unavailable.

### Shorter canonical address and printed invitation compatibility

The canonical address is `https://meyer.ilymmd.com/`. The same website Worker retains **both** Custom Domains in `domain-site-worker/wrangler.toml`. GET/HEAD visits to `themeyers.ilymmd.com` redirect permanently to the shorter host while preserving the full path and query; a fragment-free Location lets browsers inherit the original invitation fragment. Existing account QR tokens, saved templates, accounts and RSVP data are not rewritten. All future general/account QR generation uses the shorter address, including printing from an older production origin.

The dedicated `gathering-redirect` Pages artifact intentionally stays unchanged: it opens `themeyers.ilymmd.com`, which redirects to `meyer.ilymmd.com`. This preserves the exact published artifact required by release preflight and avoids an independently timed Pages migration. Do not remove the old domain or change Pages publishing settings.

Both origins remain explicitly allowed by the service Worker. The session proxy accepts only same-origin requests on either hostname, retaining support for already-open old tabs; no cookie is shared across subdomains. Visitors may need to sign in again on the new origin and reinstall a home-screen shortcut from there. Private browser drafts and local preferences do not migrate between origins; finish pending edits/RSVPs before switching. The shared backend, Dropbox callbacks/storage, credentials and account links stay unchanged.

The normal backend-first release adds the new CORS origin before publishing the website Worker. Wrangler provisions the new Custom Domain's DNS/TLS in the existing domain account using the existing deployment credentials. The rollout first deploys the shorter hostname as a serving alias while old routing/QR behavior stays unchanged, verifies its live DNS/TLS and anonymous session denial, and only then switches the canonical address. If Cloudflare reports a conflict or missing domain permissions, stop and resolve it in the domain account; do not delete or repoint an existing service blindly. New-domain DNS/TLS may need time. Release checks require the new frontend receipt, the old-host redirect, old invitation addresses, CORS and anonymous session denial. No new secrets or changes to the private data repository are needed.
