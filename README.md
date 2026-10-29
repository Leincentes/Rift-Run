# Rift Run — Production channel

This branch (`main`) is the player-facing Production release of Rift Run. It contains the single-file game plus the PWA manifest, icons, and service worker.

## Channels

- **Production:** the root site (`/`) is built from `main`.
- **Beta:** `/beta/` is built from the `beta` branch.

Once GitHub Pages is enabled, the usual project-site URLs are:

- Production: `https://OWNER.github.io/REPOSITORY/`
- Beta: `https://OWNER.github.io/REPOSITORY/beta/`

Replace `OWNER` and `REPOSITORY` with your GitHub account and repository. GitHub Pages requires a public repository on GitHub Free. See the setup guide in `docs/GITHUB_SETUP_STEP_BY_STEP.md`.

## Important release rule

These are **channel branches containing built HTML releases**, not interchangeable source-code branches. Do **not** merge `beta` into `main`: the Beta HTML intentionally contains testing tools and could replace the Production game. Instead, after a Beta feature is approved, generate a separate Production-safe build, update it on `main`, run the release checks, and commit that Production build.

## Local release checks

Install Node.js 22+ and run:

```bash
node scripts/check-release.mjs --channel production --dir .
```

In the `beta` branch, use `--channel beta`. The GitHub Pages workflow runs checks against both branches before publishing.
