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

## Preflight and required access

The approved workflow only runs releases from `main`. It retains the `SECURITY_ROLLOUT_APPROVED=state-auth-v1` gate and serializes active releases with `cancel-in-progress: false`. A pending run can still be replaced by a newer pending run under GitHub concurrency rules; release one reviewed commit at a time. Do not manually cancel a run after deployment starts.

Before either Worker deployment, `scripts/release-preflight.js` uses read-only APIs to check:

- Both existing Cloudflare account/token pairs can access their target accounts and Worker settings.
- The service has required secret **names/types**, and the expected R2 binding.
- The website account owns an active `ilymmd.com` zone and the existing website Worker.
- GitHub Pages uses the dedicated branch, that branch contains exactly the approved redirect artifact, and the public Pages root serves the same redirect HTML.

The script logs no API bodies, secret values, tokens or guest records. A failed/missing permission stops release before writes. `GITHUB_TOKEN` needs Contents read and Pages read; the workflow declares both. Existing Cloudflare deployment tokens additionally need read access to their account metadata, Worker settings/secret metadata, and (for the domain account) zone metadata. Existing deploy/write permissions are still needed by Wrangler; read-only preflight cannot prove every future write will succeed. Do not broaden or replace credentials without owner approval. No token values belong in chat or source.

Preflight cannot read encrypted values, validate the replacement password, prove a real backup exists, verify all Dropbox/AnyList credentials, prevent administrators changing settings concurrently, or create a maintenance window. The readiness marker remains an operator attestation, not backup evidence. Confirm R2 privacy and all manual rollout checks separately.

## Approved cutover sequence

1. Complete the website-account inspection and all backup/drill requirements. The owner's manual ZIP recovery evidence is useful, but does not substitute silently for the automated private backup receipt and no-write verifier prescribed in the rollout guide. Obtain approval for the private backup tool's new backup-file write before running it. Never replace live state to test recovery.
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
