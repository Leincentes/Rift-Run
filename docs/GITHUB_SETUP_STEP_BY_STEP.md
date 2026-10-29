# Rift Run on GitHub — step-by-step setup

This starter is already a local Git repository with two branches: `main` (Production) and `beta` (Beta). Your first job is to connect it to an empty GitHub repository and push both branches.

## Part 1 — Create the remote repository

1. Sign in to GitHub.
2. Open https://github.com/new.
3. Set the repository name to `rift-run` (or another name you prefer).
4. For free GitHub Pages hosting, set visibility to **Public**. GitHub Pages is available for private repositories only on eligible paid plans.
5. **Do not** select “Add a README,” “Add .gitignore,” or “Choose a license.” The starter already contains files and Git history; an empty remote avoids unrelated-history conflicts.
6. Click **Create repository** and keep the repository page open.

## Part 2 — Extract the prepared repository

1. Download and extract `Rift_Run_GitHub_Production_Beta_Starter.zip` to a folder you can keep, such as `C:\Games\Rift-Run-GitHub`.
2. In File Explorer, open that folder. It should contain `index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, `docs`, `scripts`, and a hidden `.git` folder. If `.git` is missing, the archive was not extracted as a complete Git starter; extract it again using Windows' Extract All or 7-Zip.
3. Open PowerShell in that exact folder: click the folder address bar, type `powershell`, and press Enter.
4. Run these commands:

```powershell
git status
git branch
```

You should see `main` as the current branch and `beta` as another local branch. If Git is not recognized, install Git for Windows from https://git-scm.com/download/win, close PowerShell, open it again in the project folder, and repeat the commands. For local release-refresh scripts later, also install Node.js 22 LTS from https://nodejs.org/. The GitHub Actions checks run on GitHub and do not require Node to be installed on your PC just to push branches.

## Part 3 — Connect and push both branches

Copy the HTTPS repository URL from your GitHub page. It looks like `https://github.com/YOUR-USERNAME/rift-run.git`.

Run these commands, replacing the sample URL with your real URL:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/rift-run.git
git push -u origin main beta
```

Sign in when Git asks. Do not paste a password or access token into this guide or a public file. Git Credential Manager can open a browser sign-in.

Check both branches exist on GitHub: open the repository's **Branches** page. You should see `main` and `beta`.

## Part 4 — Turn on GitHub Pages

1. In the repository, open **Settings**.
2. In the sidebar, choose **Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open the **Actions** tab. The workflow named “Deploy Rift Run Production and Beta” should run after the branch push. If multiple runs appear, let the latest run finish.
5. Open the workflow run and make sure the build and deploy jobs are green.
6. GitHub will show the Pages site URL. The exact URL may take a few minutes to become available.

The workflow builds one site with two isolated app roots: Production at `/` and Beta at `/beta/`. Each path gets its own `index.html`, manifest, icons, and service worker. This matters because relative PWA paths and the two channel-specific caches should stay separate.

## Part 5 — Verify each version

Open the URLs shown by GitHub Pages:

- `https://YOUR-USERNAME.github.io/rift-run/` — Production.
- `https://YOUR-USERNAME.github.io/rift-run/beta/` — Beta.

Replace the username and repository segment with yours. Verify the title/version and that Beta-only testing tools appear only in Beta. Install the Production app only after checking the Production URL. Avoid installing Beta and Production under the same browser path; they are served from distinct scopes here.

## How you update the game later

**Update Beta first**

1. Switch to Beta: `git switch beta`.
2. Get a new Beta HTML export from your build process. Keep the exact file path handy.
3. Run the refresh script so it verifies the channel and synchronizes the manifest description and service-worker cache:

```powershell
node scripts/refresh-build.mjs --channel beta --html "C:\Path\To\Rift_Run_Beta_v0.8.4-beta.1.html"
node scripts/check-release.mjs --channel beta --dir .
git status
git add index.html manifest.webmanifest sw.js README.md
git commit -m "Update Beta build to v0.8.4-beta.1"
git push
```

4. Check the GitHub Actions run, then test the `/beta/` URL.

**Release to Production later**

1. Only after testing, obtain a **Production-safe HTML export** of the approved feature. Do not simply rename the Beta HTML; it may contain Beta-only tools.
2. Run `git switch main`.
3. Refresh and check it:

```powershell
node scripts/refresh-build.mjs --channel production --html "C:\Path\To\Rift_Run_Production_v0.8.4.html"
node scripts/check-release.mjs --channel production --dir .
git status
git add index.html manifest.webmanifest sw.js README.md
git commit -m "Release Rift Run v0.8.4"
git push
```

4. Check the workflow and test the root Production URL.

**Never merge the Beta branch into `main` directly.** The packaged files are different by design. Promoting means generating and committing the clean Production build on `main`, not copying Beta's testing build into Production.

## Troubleshooting

- **`remote origin already exists`:** run `git remote -v`; if it points to the wrong URL, use `git remote set-url origin https://github.com/YOUR-USERNAME/rift-run.git`.
- **`src refspec beta does not match any`:** confirm you extracted the full starter and `git branch` lists `beta`.
- **Pages workflow says a branch is missing:** make sure both `main` and `beta` were pushed; rerun the workflow from the Actions tab.
- **Workflow cannot deploy Pages:** confirm Pages source is **GitHub Actions** and the repository's Actions permissions allow workflows to run. The workflow declares the required Pages deploy permissions itself.
- **The page looks old after updating:** wait for the workflow to finish; hard-refresh the browser. If you installed the PWA, close it and reopen after the service worker updates.

Official references:
- Create/push an existing local repository: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- Configure GitHub Pages with Actions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
