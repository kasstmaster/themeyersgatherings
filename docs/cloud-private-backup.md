# Private backup entirely through GitHub

No Mac software, Terminal, local checkout, personal access token or downloaded development tools are needed. This procedure does not merge/deploy security PR #516, change activation markers, or restore live data.

## Install once in the private data repository

The reviewed standalone workflow is [docs/workflows/verified-private-backup.yml](workflows/verified-private-backup.yml). Install its exact contents at `.github/workflows/verified-private-backup.yml` on **main in private `kasstmaster/themeyersevents-data`**, preferably through a separate backup-only pull request reviewed in GitHub. Installing that private PR is distinct from merging #516. The workflow runs only on manual dispatch; merely installing it does not create a backup or deploy. Do not install it under `.github/workflows` in the public application repository. Repository/ref guards also reject that execution context.

GitHub's automatically supplied `${{ github.token }}` is the only credential. No user-managed Actions secret, Cloudflare token, AnyList credential, PAT or environment secret is needed. The one job requests only `contents: write`, required to create backup and receipt files in its own private repository; other token permissions are disabled except implicit metadata access. GitHub does not offer path-specific Contents permission: the token can technically write other contents, but this code restricts writes to new backup/receipt paths. It never sends a PUT for `data/app-state.json`. The token is short-lived and has no access to the public website deployment repository or Cloudflare.

If repository/organization Actions policy, workflow-file permissions, or protected-branch rules prevent installation or backup-file creation, stop and report the setting. Do not grant broad personal tokens or weaken branch rules as a shortcut. Any policy change needs separate approval. The workflow checks private repository metadata before backup and before/after receipt verification; keep the repository private throughout.

## Click-by-click operation

Give the owner **one step at a time** in chat; this list is the complete operator reference.

1. In the private data repository, open the separate backup-workflow PR. Review its changed-file list: only the workflow and its instructions, with no live state edits. Merge that PR only after review/approval. Do not merge #516.
2. Open the repository's **Actions** tab. If Actions are disabled, stop and review the policy privately; enabling Actions is a separate setting change. Select **Verify private state backup**.
3. Before running, coordinate a brief quiet period with editors and other writers, preserve unsynced browser drafts, and coordinate the hourly archive writer/AnyList jobs. This workflow does not pause writers. Never attest that writers are coordinated if they are not. A moving file makes verification fail safely; subsequent writes after success can still make the backup older than live data.
4. Click **Run workflow**. Choose branch **main**, confirmation **Create private backup only**, and check the writer-coordination box. Leave all security rollout markers unset. Click the final **Run workflow** only when ready to create new private backup/receipt files.
5. Open that run and wait for a green result. The summary should say **Private backup integrity and no-write restore check passed**, and name a private `security-backups/.../receipt.json` path. A skipped job or failed run is **not** verification. Do not paste logs, state files, token values or guest records into chat.
6. Open the receipt in the private repository. It records the original source blob, backup SHA-256, immutable backup commit/path, verification time, run ID and `restoreDryRun: true`. Keep this receipt private. The summary's receipt path is in the private repository, not a public Actions artifact.
7. Report only whether the run is green and the summary says the backup and no-write check passed. Before eventual cutover, recheck whether live state has changed; rerun during the coordinated window if necessary. A green backup run never authorizes deployment or activates the security release.

## A retry shows a red X before any job starts

If an old run reports `startup_failure` with no jobs, do not keep selecting **Re-run jobs**. The previously used backup run reached 50 attempts; its last actual backup job passed, while subsequent retries could not start. This status does not establish a backup-script or data-integrity failure.

Open **Actions → Verify private state backup** (the workflow listing, rather than the old run), then choose **Run workflow** to create a fresh run. Use `main`, **Create private backup only**, and the writer-coordination checkbox after preserving drafts and coordinating writers. A fresh run must pass and its receipt must match the current source blob before release; an older green job is insufficient. Never delete the old run, bypass the backup gate, change secrets, or restore state to clear this status. Connections that can retry jobs may lack manual workflow-dispatch capability; in that case the owner must start the fresh run in GitHub.

## What the workflow actually verifies

It uses the same tested `backupState` and `verifyRestore` helpers as the operator tool. The standalone YAML embeds generated source, so no private repository checkout or remote script download is needed. Guest bytes stay in runner memory and the private GitHub API/repository; no local backup files, cache or Actions artifacts are created. Only generic status messages and a private receipt path are deliberately logged/summarized. Do not enable debugging or add commands that dump environment, HTTP bodies or state. GitHub's automatic token masking remains enabled.

The job validates the source schema, copies exact bytes into a new immutable private backup commit, re-reads and SHA-256 checks the copy, checks the live source blob remains unchanged, then runs the **no-write** restore verifier against the immutable backup. It writes/re-reads a separate private receipt and checks source stability/privacy again. Backups and receipts are additions only; the canonical account/RSVP/menu/design JSON is never replaced. Backup commits advance the repository branch, so use the source **blob**, not just branch commit equality, to determine whether the canonical file changed.

A restore check proves the saved bytes can be read, hash-verified and parsed as the expected state schema. It does not rehearse a production write, test every UI/integration, guarantee no writer starts after the final check, or replace a separately approved recovery procedure. Actual restoration still needs a new private backup, current-SHA protection, review of subsequent edits and explicit authorization. Nothing auto-restores.

## Maintenance and validation

`node scripts/build-private-backup-workflow.js` regenerates the template from the canonical helper modules. Regression tests require the YAML's embedded implementation to match them exactly; update the private installed workflow through a reviewed follow-up PR when these helpers change. This command is for Codex/CI, **not a requirement for the owner to use Terminal**. `npm test` covers this workflow's safety behavior with synthetic API responses. Production execution remains unverified until the owner installs and manually runs it.

See [security rollout](state-security-rollout.md) and [coordinated release](security-release-procedure.md) for the separate deployment hold and recovery boundaries.
