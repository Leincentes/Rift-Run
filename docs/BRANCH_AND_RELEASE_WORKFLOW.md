# Production and Beta branch rules

## What each branch means

- `main`: clean Production build users should play.
- `beta`: pre-release build with Beta-only recorder, surveys, and diagnostics.

The Pages workflow checks out both branches and assembles a single deployment artifact with two separate directories. A push to either branch causes the site to be rebuilt from the latest `main` and `beta` refs.

## Safe release cycle

1. Generate a Beta build.
2. Update and push it on `beta`.
3. Test the live `/beta/` site.
4. Fix issues in Beta and repeat.
5. When approved, generate a separate Production build that includes the approved gameplay changes but no Beta-only UI/telemetry.
6. Update and push the clean build on `main`.
7. Test the root Production URL.

Do not merge the branches. They contain different compiled single-file HTML exports; an ordinary merge would put the Beta runtime into Production.

## Recovery

If an update breaks a channel, run `git log --oneline` on that branch, find the last known-good commit, and use `git revert <commit>` to create a new reversal commit, then push. Avoid force-pushing shared release branches.

## What the deployment workflow checks

- Correct `RIFT_RUN_RELEASE` channel marker.
- Content Security Policy SHA-256 hash matches the actual inline game script.
- The manifest, service worker, and icons required by the PWA exist.
- Manifest names and service-worker cache prefixes match the intended channel.
- Production and Beta use different app-shell and cache namespaces.
- The composed Pages output contains both channel roots and the expected index/manifest/service-worker assets.
