# Publish Rift Run with GitHub Pages

This repository deploys both Production and Beta from one canonical source. GitHub Pages hosting for this public project is free.

## 1. Create an empty GitHub repository

1. Sign in at GitHub and open https://github.com/new.
2. Name the repository `rift-run` (or another name you prefer).
3. For a free GitHub Pages site, set visibility to **Public**.
4. Do not initialize the remote with another README, `.gitignore`, or license. This starter already has those files and local Git history.
5. Create the repository and keep the page open.

## 2. Extract the starter

1. Extract `Rift_Run_GitHub_Production_Beta_Starter.zip` into a permanent folder, such as `C:\Games\Rift-Run-GitHub`.
2. Confirm the folder contains `source`, `channels`, `patches`, `scripts`, `tests`, `docs`, `.github`, `README.md`, and the hidden `.git` directory.
3. Open PowerShell in that folder and run:

   ```powershell
   git status
   git branch
   node --version
   ```

4. Node.js 22+ and Git for Windows are required for local tests and release refreshes. Install them from https://nodejs.org/ and https://git-scm.com/download/win if necessary.

## 3. Run checks before publishing

```powershell
npm test
npm run build:pages
npm run check:production
npm run check:beta
```

These commands must pass before you push. The deploy workflow repeats the tests and build on GitHub.

## 4. Connect and push the repository

Copy the HTTPS repository URL, then run this in PowerShell (replace the example URL with your own):

```powershell
git remote add origin https://github.com/YOUR-USERNAME/rift-run.git
git push -u origin main
```

Use the browser sign-in provided by Git Credential Manager. Never put a password or access token in a source file, README, or chat. This workflow publishes from `main`; Beta is an output at `/beta/`, not a separately maintained full HTML branch.

## 5. Enable GitHub Pages

1. In the GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Actions** and check that “Build and deploy Rift Run Production + Beta” completes successfully.
4. After deploy succeeds, use the site URL shown by GitHub.

The resulting URLs look like:

- Production: `https://YOUR-USERNAME.github.io/rift-run/`
- Beta: `https://YOUR-USERNAME.github.io/rift-run/beta/`

## 6. Verify before installing

Open both URLs in a browser. Production should show the stable game identity and must not include playtest tools, a recorder, tester IDs, feedback survey/export controls, or debug-only UI. Beta should identify itself as Beta and keep its local playtest recorder and feedback export. Confirm normal gameplay, onboarding, touch/keyboard controls, preferences, achievements, local saves, backup/restore, service-worker update and offline relaunch.

Do not call the game “production-ready” based only on a green build. Test the deployed HTTPS site on supported desktop browsers and physical mobile devices, verify recovery/rollback, and collect actual independent-player feedback before release approval.

## 7. Refresh the game later

Keep the two matching channel exports on your computer. Refresh the approved Production-safe export, then refresh Beta against that updated source:

```powershell
node scripts/refresh-build.mjs --channel production --html "C:\Path\To\Rift_Run_Production_v0.8.4.html"
node scripts/refresh-build.mjs --channel beta --html "C:\Path\To\Rift_Run_Beta_v0.8.4-beta.1.html"
npm test
npm run build:pages
git status
git diff
```

Inspect the diff, then commit and push to `main`. The script never accepts a Beta build as the canonical Production source, and it generates a Beta patch rather than keeping a second full game file in the repository.

## Troubleshooting

- **`remote origin already exists`:** use `git remote -v` and `git remote set-url origin https://github.com/YOUR-USERNAME/rift-run.git` if it points to the wrong repository.
- **The Beta overlay no longer applies:** regenerate it only from a matching Production-safe export and the intended Beta export, then run all tests. Do not hand-edit `_site/` output.
- **GitHub Pages deployment fails:** confirm Pages uses GitHub Actions and repository Actions permissions are enabled.
- **The site appears old:** inspect the latest Actions run, hard-refresh the page, and close/reopen any installed PWA so its service worker can update.

Official references:
- https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
