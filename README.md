# The Meyers Family Events

A warm, responsive Thanksgiving and Christmas potluck and RSVP page that can be hosted for free with GitHub Pages.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose your main branch and the `/ (root)` folder, then click **Save**.

GitHub will provide a public link you can share with your guests.

## Save everything permanently in GitHub

The published menu can appear to be synced even when syncing is off because its
defaults are part of `app.js` and `data/app-state.json`. Browser-created
accounts, claims, and RSVPs are different: they can cross devices only when the
`shared-state-url` in `index.html` points to the deployed Worker below. The host
dashboard reports **Saved on this device only** until that URL is configured;
afterward, every save uploads the complete state (including menus, accounts,
claims, and RSVPs) together.

The app always loads `data/app-state.json` from this repository before opening
the sign-in dialog. That checked-in file is the canonical fallback on every
phone and computer, so accounts, RSVPs, claims, dates, and menu edits placed in
it do not depend on browser storage. Edit and commit that JSON file whenever you
want to manually replace the published state.

GitHub Pages cannot write to its own repository, and putting a GitHub token in
browser JavaScript would let every visitor steal it. This repository therefore
includes a small Cloudflare Worker in `github-state-worker/`. It keeps the token
secret and commits the complete account, event, menu, claim, and RSVP state to a
JSON file in GitHub after every change. Every device reads the newest committed
state when the page opens, regains focus, and every 30 seconds.

### One-time setup

1. Create a **private** GitHub repository for the data. A private repository is
   strongly recommended because the JSON contains guest names and RSVP details.
2. Create a fine-grained GitHub personal access token with access only to that
   repository and **Contents: Read and write** permission.
3. Edit `github-state-worker/wrangler.toml`: set `GITHUB_REPOSITORY` to
   `owner/repository`, set `ALLOWED_ORIGIN` to the exact GitHub Pages origin
   (include a repository path only in the Pages URL, not in the origin), and
   change the branch or state path if needed.
4. Create the invitation artwork bucket, then deploy the Worker from the
   repository root. Worker source changes are not deployed by GitHub Pages, so
   rerun the deploy command after pulling Worker updates:

   ```sh
   npx wrangler r2 bucket create meyers-invitation-backgrounds
   cd github-state-worker
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put HOST_PASSWORD
   npx wrangler deploy
   ```

5. Copy the deployed `workers.dev` URL into the `shared-state-url` meta tag in
   `index.html`, commit, and publish. Do **not** add the token to
   `wrangler.toml`, `app.js`, or any committed file.
6. On the device that currently has the desired data, reload the published site
   and make one change. The worker creates `data/app-state.json`; subsequent
   edits create normal Git commits, so state is shared across devices and can be
   recovered from Git history. If there is no browser data to preserve, the
   first change starts from the defaults in `app.js`.

To keep the Worker current after this one-time setup, add
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` under **Settings → Secrets
and variables → Actions** in this website repository. The API token needs
Workers Scripts edit and R2 edit access. Changes to `github-state-worker/` on
`main` will then run the **Deploy shared-state Worker** workflow automatically;
it creates the artwork bucket when needed and deploys the current Worker. The
workflow can also be started manually from the Actions tab to resolve an
“invitation upload endpoint is not deployed” message.

The Worker is required for changes made *inside the website* to be committed
automatically. Without a Worker URL, visitors can still read the same committed
`data/app-state.json` on every device, while website edits remain local until
you copy them into the file and commit it.

Invitation template metadata and field coordinates use that shared JSON state.
Uploaded PNG, JPEG, and WebP backgrounds are deliberately not put in either Git
repository: the Worker stores their bytes in its `INVITATION_BACKGROUNDS` R2
bucket. If you use a different bucket name, change the binding in
`wrangler.toml` before deploying. The browser saves only the runtime
background URL, media type, and original pixel dimensions in template records.

If GitHub or the worker is temporarily unavailable, the change remains in that
browser and the site shows a sync warning. Make another change after service is
restored to commit the latest complete state. The repository remains the durable
shared copy; browser storage is only an offline fallback.

## Customize

- Select **Host sign in** and enter the host password. Guests can sign in to each gathering where their account has **Give Access** checked; there is no global gathering activation switch. The separate **Invite** checkbox includes an account in invitation downloads and invited-family totals without granting sign-in access. Both settings apply only to the gathering currently being viewed. After signing in, guests choose from the gatherings available to them and can switch between them with the fixed event bar at the bottom of the page. Each event keeps its own date, menu, claims, RSVPs, invitation list, and sign-in access, while account names and other account settings are shared. You can also edit the viewed event menu, clear a selected quantity of a family's dish claim, RSVP, and claim dishes as **The Host**. The **Host tools** button is only visible after the host signs in.
- Update `HOST_PASSWORD` near the top of `app.js` (the current password is `0810`). Host password matching is case-insensitive.
- Guest names and RSVP details are private in the interface: only a signed-in host can open the guest list or see who claimed a food item. Guests can still see the aggregate attendance and dish counts.
- `GUEST_ACCOUNTS` in `app.js` supplies the initial invited households. You can then manage accounts from **Host tools** without editing code. Write shared first names with commas and separate households with a slash. For example, `Damon,Presley Patterson/Presley,Damon Hall` lets Damon Patterson, Presley Patterson, Presley Hall, and Damon Hall sign in with their own first and last names. RSVP and food entries use the first household's last name, so this example appears as **The Pattersons**. A last name ending in `s`, such as `Stevens`, appears as **The Stevens'**. Matching is case-insensitive.
- Update `defaultItems` in `app.js` to change the initial menu.
- In **Host tools → Edit menu**, add, rename, or remove quantity types such as **Dozen**, **Package**, **Tray**, or **Case**, then choose a type for each requested quantity. Guests will see and claim the quantity in the selected unit.

> **Important:** When `shared-state-url` is blank, sign-ups are stored only in
> each visitor's browser and are not shared or committed to GitHub. The app
> retains a local backup and will recover the browser copy containing the most
> accounts, RSVPs, and claims if an empty state was previously loaded. Older
> saved copies are upgraded without deleting their guest data. Also note
> that last-name sign-in on a
> static website is only a convenience—not secure authentication—because
> visitors can view the site's source code. Protect the shared endpoint with
> appropriate access controls if RSVP names must remain private.

## AnyList Address Book sync

The **Host tools → Sync AnyList Address Book** button starts a private GitHub
Actions job through the Cloudflare Worker. The job logs in to AnyList, reads the
structured `name` and category of each real item in `Address Book`, and never
calls an AnyList mutation method. Notes/descriptions are counted for safe
logging but are not passed to the account converter. The action rereads the
latest state file and its SHA immediately before writing; a conflicting update
is retried against the new version. It only appends `{ "name": "…",
"selected": false }` records. Existing records and all of their properties are
left byte-for-byte equivalent in the parsed state.

The AnyList client is Node-oriented and uses AnyList's unofficial/private
service, so it runs in GitHub Actions rather than in the Cloudflare Workers
runtime. The Worker only verifies the host, dispatches the action, and reads its
non-secret result. Because this is an unofficial integration, an AnyList service
change may require updating the `anylist` dependency or adapter.

### Required configuration (do this before deploying)

In **`kasstmaster/thanksgiving` → Settings → Secrets and variables → Actions**,
add:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `ANYLIST_EMAIL` | AnyList account email with read access to the list |
| Secret | `ANYLIST_PASSWORD` | That AnyList account's password |
| Secret | `STATE_REPOSITORY_TOKEN` | Fine-grained token scoped to `kasstmaster/themeyersevents-data`, with **Contents: Read and write** |
| Variable | `ANYLIST_LIST_NAME` | `Address Book` |
| Variable | `STATE_REPOSITORY` | `kasstmaster/themeyersevents-data` |
| Variable | `STATE_BRANCH` | `main` |
| Variable | `STATE_PATH` | `data/app-state.json` |

In Cloudflare, add the host password as an encrypted Worker secret (use the
same value configured as `HOST_PASSWORD` in `app.js`):

```sh
cd github-state-worker
npx wrangler secret put HOST_PASSWORD
```

The Worker's existing `GITHUB_TOKEN` must be a fine-grained token scoped to both
`kasstmaster/thanksgiving` and `kasstmaster/themeyersevents-data`. It needs
**Actions: Read and write** on the website repository to dispatch the workflow,
and **Contents: Read and write** on the data repository for the existing shared
state endpoint (the AnyList status check itself only reads there). Never place
this token or `STATE_REPOSITORY_TOKEN` in `wrangler.toml`.

Finally, set these non-secret values in `github-state-worker/wrangler.toml`:

* `GITHUB_REPOSITORY="kasstmaster/themeyersevents-data"`
* `GITHUB_BRANCH="main"`
* `GITHUB_STATE_PATH="data/app-state.json"`
* `GITHUB_WORKFLOW_REPOSITORY="kasstmaster/thanksgiving"`
* `GITHUB_WORKFLOW_BRANCH="main"`

The two repository settings intentionally differ: the workflow code lives in
`kasstmaster/thanksgiving`, while both the existing website and the AnyList job
read and write the live state in `kasstmaster/themeyersevents-data`.

After it reconciles the address book, the job also gives every account missing
QR access a cryptographically random 256-bit `qrToken`. Existing tokens are
never replaced, including when AnyList changes an account name or household
membership. The status shown in **Manage accounts** reports how many accounts
received QR access, or that every account already had it. Existing installations
need no separate migration: run **Sync AnyList Address Book** once to backfill
older accounts.

Hosts can then select **QR** beside an account in **Manage accounts** to preview
its code, download a transparent PNG or SVG, or open and copy the clickable
sign-in link shown below the download buttons. The QR contains only a GitHub
Pages-compatible route in the form
`#/signin/account/<secure-random-token>`—never an account ID or guest name. That
page still requires the guest's first name, last name, and optional suffix. It
uses the normal name matcher and session flow, but limits the lookup to the
current members of the account identified by the token. Invalid account links
show one generic error.

Then deploy the Worker manually and push the workflow. No deployment is
performed by this repository change. Sync logs include counts and outcomes but
never credentials, cookies, authorization headers, or token values.
