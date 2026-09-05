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

## Important account distinction

The website project exists as ordinary files and Git history on the computer and remote repository. A ChatGPT or Codex workspace/account change does not rewrite those files or the Git remote. If an account workflow is disrupted, opening the restored project in a working Codex installation is enough to resume development.
