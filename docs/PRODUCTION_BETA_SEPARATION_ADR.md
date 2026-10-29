# ADR-001: Generate Production and Beta from one canonical source

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decision owner:** Rift Run project

## Context

Rift Run is a standalone HTML/Canvas game with two release audiences. Beta needs playtest recording, tester metadata, surveys, feedback export and diagnostics. Production must remain a clean player-facing game and must not ship those controls or their runtime implementation. Maintaining two complete HTML files independently invites gameplay drift and inconsistent releases.

## Decision

Keep `source/game.html` as the only maintained full game HTML. It must always be Production-safe. Keep the Beta-only delta in `patches/beta-overlay.patch`; the build applies that patch to a temporary copy of the canonical source to create the Beta artifact. Keep manifests, icons and service workers separately in `channels/production/` and `channels/beta/`. Generate `_site/index.html` for Production and `_site/beta/index.html` for Beta.

Beta code is excluded from Production during source/build composition, not hidden through CSS or a runtime flag. Automated test suites remain in repository/CI and are not copied into player-facing artifacts. Builds use separate app identities, service-worker cache namespaces and deployment scopes.

## Alternatives considered

1. **Maintain two separate full HTML files.** Simple in the short term, but encourages divergent game behavior and repeated manual edits. Rejected.
2. **Ship one file and hide test tools at runtime/CSS.** Leaves test-only code in Production and can expose diagnostics or feedback capture. Rejected.
3. **Move to a framework/module build pipeline.** Offers more formal dead-code elimination but is a larger migration than this single-file game requires. Deferred unless the game outgrows the patch-based approach.

## Consequences

- One full game source is maintained; Beta-specific additions are reviewable in a patch.
- Production and Beta can be built and tested together with a single command.
- Beta overlay patch conflicts become a deliberate build failure, requiring refresh/review rather than silently shipping stale code.
- The patch method depends on Git being available to the build runner.
- A green local/CI build does not by itself certify a public release; HTTPS deployment, service-worker update/offline behavior, physical-device testing, player feedback, backup/restore, rollback and release approval are still required.

## Verification

Run `npm test`, `npm run build:pages`, `npm run check:production`, and `npm run check:beta`. Verify deployed Production and Beta URLs, install/update behavior, save isolation, backup/restore and rollback before declaring Production ready.
