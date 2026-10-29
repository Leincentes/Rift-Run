# Rift Run — Production and Beta build system

Rift Run is a standalone HTML5 arcade game. This repository builds two separate player-facing artifacts from one maintained Production-safe game source.

## Source of truth

- `source/game.html` is the canonical Production-safe game source.
- `patches/beta-overlay.patch` contains only the current Beta-channel delta, including playtest instrumentation and Beta-only UI.
- `channels/production/` and `channels/beta/` contain separate PWA manifests, service workers, and icons.
- `scripts/build-pages.mjs` applies the overlay to a temporary copy of the canonical source and creates both distributable app roots.
- `tests/` verifies the generated artifacts and the Production/Beta boundary.

Do not edit generated `_site/` files by hand. Update the canonical source and, when refreshing Beta, regenerate the Beta overlay from matching channel exports.

## Build and verify locally

Requires Git and Node.js 22+; no paid tools or services are needed for local builds.

```bash
npm test
npm run build:pages
npm run check:production
npm run check:beta
```

The build creates:

- Production: `_site/index.html`
- Beta: `_site/beta/index.html`

Production must not contain Beta labels, testing panels, recorder/event-capture code, tester identifiers, test surveys, or feedback-export tools. Beta must contain its explicit Beta identity and test tools. Each channel has its own PWA manifest, app identity, service-worker cache namespace, and URL scope.

## Release rules

1. Test changes in Beta first.
2. Do not copy a Beta export over `source/game.html` and do not merge a generated Beta HTML file into Production.
3. After approval, update `source/game.html` with a Production-safe export and update `channels/production` shell assets using `scripts/refresh-build.mjs`.
4. Refresh the Beta overlay against the matching Beta export so `patches/beta-overlay.patch` applies to the current canonical source.
5. Run all tests, review the diff, build both channels, and test both URLs before release.
6. The GitHub Actions workflow deploys both channels from `main`: Production at `/`, Beta at `/beta/`.

No real HTTPS deployment, physical-device verification, independent playtest, or release-owner approval is implied by passing local/CI checks. See `docs/BRANCH_AND_RELEASE_WORKFLOW.md` and `docs/GITHUB_SETUP_STEP_BY_STEP.md` for the release process.
