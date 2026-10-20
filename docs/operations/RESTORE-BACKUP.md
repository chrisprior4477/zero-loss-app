# Zero Loss restore guide

This project is protected in two complementary ways:

1. The Git remote is the versioned source-of-truth backup. It contains the application source, public visual assets, documentation, and change history.
2. The dated offline archive on the owner's Desktop is the full local recovery copy. It also contains the `.git` history and the local `.env.local` configuration file.

## Fastest full recovery from the offline archive

1. Keep the ZIP file somewhere safe and copy it to the replacement computer if necessary.
2. Extract the ZIP. It restores a folder named `zero-loss-app`.
3. Open that folder as the project in Codex.
4. Open a terminal in the project and run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000/`.

Installed dependencies and generated Next.js build output are intentionally not stored in the archive. They are recreated from `package.json` and `package-lock.json` by `npm install` and by the normal build/start commands. They are replaceable outputs, not authored project work.

## Recovery from the versioned remote

Clone `https://github.com/chrisprior4477/zero-loss-app.git`, select the `openai-homepage-experiment` branch, restore the required environment values into `.env.local`, then run `npm install` and `npm run dev`.

## What the backup excludes

- `node_modules` (recreated exactly from `package-lock.json`)
- `.next` and other generated build output (recreated by Next.js)
- browser-capture folders and temporary review screenshots

## Verified workstation recovery (October 20, 2026)

Use Node 24 (see `.nvmrc`), Git, and `npm ci` to restore locked dependencies.
Cursor and Claude Code can open this same folder; `.cursor/rules`, `CLAUDE.md`,
`AGENTS.md`, and `.claude/launch.json` are versioned in Git. Signing into an AI
tool does not restore unpublished files or chat history from another computer.

For ordinary development, restore the public Supabase URL and publishable key,
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`, and
`APP_DATA_ENVIRONMENT=development-test` in an ignored `.env.local`. Do not put
service-role keys in browser variables. Hosted database data, storage files,
and email-worker secrets need their own recovery plan; they are not in Git.

Checks:

```sh
npm run lint
npm run test:run -- --maxWorkers=2
npm run build
npm audit --omit=dev
```

For local database tests, start Docker Desktop, then:

```sh
npm run db:start
npm run test:db
npm run db:stop
```

These commands target the local Docker database, not the linked hosted project.
The first start downloads service images. `db:stop` preserves local data.
Do not use `db reset` against a database containing work you need to keep.
The non-TAP linked-project smoke script lives under `supabase/inspection/`;
the automated suite under `supabase/tests/` emits pgTAP results.

Fresh migration replay now restores the immutable original demo catalog from
commit `057825a`. The historical catalog/calibration migrations were repaired
for an empty installation, without enabling funding or entries. An existing
customer database retains the original demo-enablement checks. These edits are
for replay: already-applied migrations are not rerun on the hosted database.
Bootstrap tests verify disabled gates, no customer/ledger seed records, and
catalog prerequisites. Do not mark historical migrations pending on a live
project just to apply these replay repairs.

The remaining development-tool audit finding is `braces` (GHSA-vfj7-8cjw-p6xm)
through the Next.js ESLint plugin. As of this check there is no patched release;
do not force npm's proposed downgrade to Next 14 tooling. Production dependency
audit is clean. Recheck the advisory when updating the lint toolchain.

## Important account distinction

The website project exists as ordinary files and Git history on the computer and remote repository. A ChatGPT or Codex workspace/account change does not rewrite those files or the Git remote. If an account workflow is disrupted, opening the restored project in a working Codex installation is enough to resume development.
