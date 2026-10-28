# Coordinated state-auth-v1 release

This is a prepared procedure, **not a deployment receipt or authorization**. PR #516 remains a draft until the owner approves production work. No live settings, credentials, Pages source, backup or deployment are changed by preparing these scripts. Follow [the security rollout guide](state-security-rollout.md) for identity limits, secrets and verified backup requirements.

## Why a separate Pages artifact is required

GitHub Pages currently publishes the application from `main` independently of the Cloudflare workflow. The Actions approval marker cannot block that publisher. Before merging the security PR, an approved operator must switch Pages to a dedicated `gathering-redirect` branch with only `index.html`, `404.html`, and `.nojekyll`. Both HTML files redirect to `https://themeyers.ilymmd.com/`, retaining query strings and fragments (including existing account QR links). There is no application, roster, saved data, asset bundle or service worker on that branch. JavaScript-disabled browsers get a canonical link.

Build it from the reviewed security branch with:

```sh
node scripts/build-pages-redirect.js /tmp/meyers-pages-redirect
```

The target must not already exist. Review those three files. **Publishing them and changing Pages are separate production changes requiring owner approval.** An approved operator can initialize an independent Git repository in that output directory, commit only those files and push its new commit to `gathering-redirect` in `kasstmaster/themeyersgatherings`. Do not branch from the application checkout, copy the application, force-push an existing branch, or commit tokens. If that remote branch already exists, inspect it before making a reviewed update.

In repository Settings → Pages, choose Deploy from a branch → `gathering-redirect` → `/ (root)`. Wait for Pages to finish. Check a printed invitation URL privately, including its fragment/query; it must open the current canonical website. Browser-cached old tabs may still need reload. This redirect-only change can precede the security cutover without changing the current canonical frontend. Do not merge first and hope the Worker gate controls Pages.

## Read-only check before merging

The existing deployment workflow has a manual **preflight** mode, which is the default. In GitHub Actions select **Deploy gathering site and shared-state Worker**, click **Run workflow**, choose branch **codex/secure-state-and-concurrency**, choose **preflight** if a mode field is shown, then run. If GitHub shows the old default-branch input form without a mode field, the reviewed branch treats a missing mode as read-only; **the branch choice is essential**. Do not run against `main` before this PR merges: the currently deployed old workflow does not contain this protection and can deploy. No local tools or new secrets are needed.

On the reviewed branch, a manual invocation without explicit `mode=deploy` runs only **Read-only deployment readiness (no deployment)**. The deploy job is skipped. That job validates the exact approval variable, reads private backup receipt/tree metadata using the existing `STATE_REPOSITORY_TOKEN`, and checks both Cloudflare credential pairs and Pages. It never downloads state or backup contents, sends writes, runs Wrangler, or contacts the state endpoint. It does not issue a token or modify the backup. The existing cross-repository token must be scoped to the private data repository and permit Contents read; do not broaden permissions as a shortcut.

A successful run must correspond to the latest reviewed PR commit, with the read-only job green and deployment skipped. **Encrypted host-secret values and future write success cannot be proven through metadata reads**; the owner's settings verification and later secure-service readiness gate remain necessary. If a token lacks a required read permission, stop and review that specific permission privately. No merge is authorized by running this check.

Before declaring merge readiness, recheck latest-commit CI, current backup source blob and read-only preflight success. Arrange the coordinated maintenance window first: merging with the approval variable set starts the deployment automatically. If guest edits change the canonical file, refresh the private backup and repeat the preflight. A green run is a point-in-time result, not a lock on future writes.

## Preflight and required access

The approved workflow only runs releases from `main`; manual preflight can run on the reviewed security branch without deploying. It retains the `SECURITY_ROLLOUT_APPROVED=state-auth-v1` gate and serializes active releases with `cancel-in-progress: false`. A pending run can still be replaced by a newer pending run under GitHub concurrency rules; release one reviewed commit at a time. Do not manually cancel a run after deployment starts.

Before either Worker deployment, `scripts/release-preflight.js` uses read-only APIs to check:

- The latest private backup receipt and immutable backup match the current canonical source blob (GitHub metadata only), with a final source-stability reread.
- Both existing Cloudflare account/token pairs can access their target accounts and Worker settings.
- The service has required secret **names/types**, and the expected R2 binding.
- The website account owns an active `ilymmd.com` zone and the existing website Worker.
- GitHub Pages uses the dedicated branch, that branch contains exactly the approved redirect artifact, and the public Pages root serves the same redirect HTML.

The script logs no API bodies, secret values, tokens or guest records. A failed/missing permission stops release before writes. `GITHUB_TOKEN` needs Contents read and Pages read; the workflow declares both. Existing Cloudflare deployment tokens additionally need read access to their account metadata, Worker settings/secret metadata, and (for the domain account) zone metadata. Existing deploy/write permissions are still needed by Wrangler; read-only preflight cannot prove every future write will succeed. Do not broaden or replace credentials without owner approval. No token values belong in chat or source.

Preflight cannot read encrypted values, validate the replacement password, prove a real backup exists, verify all Dropbox/AnyList credentials, prevent administrators changing settings concurrently, or create a maintenance window. The readiness marker remains an operator attestation, not backup evidence. Confirm R2 privacy and all manual rollout checks separately.

## Approved cutover sequence

1. Complete the website-account inspection and all backup/drill requirements using the [web-only private backup workflow](cloud-private-backup.md) or the approved operator tool. The owner's manual ZIP recovery evidence is useful, but does not substitute silently for the automated private backup receipt and no-write verifier prescribed in the rollout guide. Obtain approval for the private backup tool's new backup-file write before running it. Never replace live state to test recovery.
2. Arrange a short maintenance window. Ask editors/guests to stop writes, retain unsynced browser drafts privately, and coordinate cron/AnyList/other writers. The workflow does **not** enforce maintenance or disable writers. If needed, approve a separate maintenance mechanism before proceeding. Do not assume write suspension because an Actions run is active.
3. With owner approval, apply the privately saved new host secret and `AUTH_MIGRATION_READY` as described in the rollout guide. The secret change can affect the old deployment, so coordinate it inside the window. Set the GitHub approval variable only after all prerequisites are satisfied. Keep these changes out of this implementation task.
4. Release one reviewed `main` commit. Tests and build run before deployment. The static build embeds `release.json` with that commit. Preflight must pass before any Worker write.
5. Deploy the secure service with `RELEASE_COMMIT` set to the same workflow SHA. Its new `/health/state-auth` route returns only protocol, readiness and commit. It reads no shared state or bucket objects, issues no sessions, and reports no secret values. Configuration readiness requires the activation marker, a sufficiently long host password, existing bindings/configuration and a valid commit; it is not a full integration test.
6. The workflow checks the service's ready status and exact commit. Only after that match does it check anonymous `/state` denial (401). **It does not probe the old shared-state endpoint** if the harmless readiness check fails. This denial check is intended only during the approved cutover, after the new protocol is positively identified.
7. Only on success does the workflow deploy the matching canonical frontend. It then runs existing public routing checks and checks that canonical `/release.json` reports the same commit/protocol. This is a sequential release, not an atomic transaction. A failure must keep maintenance active.
8. Privately verify real existing invitations, host login, own-household visibility, RSVP/food, account editing, media and approved integration actions. Preserve the pre-cutover data and subsequent legitimate edits. Only reopen normal use after acceptance. Old protocol tabs must reload; preserve drafts first. Remove or reset the persistent approval marker after this release if it should not authorize later releases.

## Failure handling

| Failure point | Required response |
| --- | --- |
| Preflight/tests/build | Stop; no workflow deployment has occurred. Resolve privately and re-review. |
| Service deployment fails or times out | Inspect active service version and readiness before retrying; an error does not prove nothing deployed. Do not publish the frontend. |
| Service is live but readiness check fails | Keep maintenance active; inspect actual version/configuration and forward-fix. Frontend stays blocked. |
| Secure service ready, frontend fails | Keep maintenance active and complete the matching frontend from the reviewed commit. Re-running the whole workflow may redeploy the service; inspect both targets first. |
| Frontend deployed, verification fails or run cancelled | Inspect both active versions, preserve all current data and forward-fix. Do not treat a green deployment action as acceptance. |

No automatic rollback restores the old unauthenticated Worker. No release failure automatically restores a state backup or changes cron/settings. An actual data restore needs a fresh private backup, separate authorization, current-SHA protection and reviewed reconciliation of post-backup edits. The workflow emits recovery instructions on failure/cancellation but cannot guarantee an operator sees them or prevent an administrator cancelling a release. Branch protection/environment approval rules remain separately managed settings.

## Validation limits

Local regressions cover exact redirect artifacts, QR/query preservation, preflight permission/configuration failures, readiness without private reads, wrong-commit blocking, anonymous denial, frontend commit receipts and workflow ordering. These use synthetic API responses. They do not establish current live credential permissions, deployed configuration, actual maintenance, real backup verification or successful production cutover.

## Diagnosing a blocked secure-service gate

If service deployment succeeds but publication is blocked, inspect the active version and harmless `/health/state-auth` response before any retry. The response exposes only a validated release commit and boolean checks: `activationReady` (exact approved marker), `hostPasswordReady` (minimum server password requirement), `storageReady`, `githubReady`, and `releaseCommitReady`. A false check keeps status 503; diagnostics do not bypass authorization or weaken publication gates. No secret values, password lengths or hashes, state records or API bodies are emitted. The service verifier logs an allowlisted diagnostic with HTTP status, readiness, protocol/commit matches and those boolean checks only.

`scripts/diagnose-state-auth.js` can additionally read active Cloudflare version metadata and binding names/types with the existing service token; it never calls the shared-state endpoint or changes configuration. Never log the full settings response or secret contents. Check the exact active commit: a green deployment action alone is insufficient. If an encrypted value fails the readiness check, an owner may need to correct it privately; do not invent a new password, restore old credentials or disable the gate. Keep the frontend blocked until the approved secure backend is ready, then publish a frontend built from the same reviewed source commit.

### Frontend receipt propagation

The final frontend receipt check makes at most 12 attempts, 10 seconds apart, to tolerate temporary edge propagation or network/JSON failures after a successful upload. Every successful check still requires HTTP success and the exact reviewed commit and protocol. Persistent mismatches fail and retain maintenance instructions. `/release.json` is served with `Cache-Control: no-store`; the verifier requests it without caching and logs only attempt numbers and allowlisted failure booleans/status, never raw bodies. Retries do not change, merge, restore or upload state.
