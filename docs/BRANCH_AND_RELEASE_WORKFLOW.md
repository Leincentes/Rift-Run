# Production and Beta build workflow

## Architecture

The repository keeps one maintained game source: `source/game.html`, which is always Production-safe. Beta-only interface, recorder instrumentation, tester metadata, surveys and JSON export are carried in `patches/beta-overlay.patch`. The build script applies that patch to a temporary copy and generates a second HTML export. It does not maintain two unrelated game files by hand.

PWA files are separated by channel under `channels/production/` and `channels/beta/`. The two outputs are assembled to `_site/`:

- `index.html` — Production
- `beta/index.html` — Beta

The manifests, service-worker cache names, metadata and scopes remain channel-specific.

## Safe release cycle

1. Change and test Beta using an exported Beta HTML file; never substitute the Beta file for the canonical source.
2. When promoting approved gameplay, prepare two exports from the same gameplay baseline: one Production-safe export and one Beta export containing its intended test tools.
3. Refresh Production:

   ```bash
   node scripts/refresh-build.mjs --channel production --html "/path/to/Rift_Run_Production_v0.8.4.html"
   ```

4. Refresh the Beta overlay and channel shell with the matching Beta export:

   ```bash
   node scripts/refresh-build.mjs --channel beta --html "/path/to/Rift_Run_Beta_v0.8.4-beta.1.html"
   ```

5. Run `npm test` and `npm run build:pages`. Review changes to the canonical game, Beta overlay, manifests, and service workers.
6. Commit the source/configuration changes to `main`; GitHub Actions checks and deploys both channel roots.
7. Verify the deployed URLs, PWA install/update behavior, storage isolation, backup/restore, rollback and actual device behavior before declaring the release production-ready.

**Important:** the Production export must be Beta-safe before it is saved as `source/game.html`. The refresh script rejects known Beta recorder/UI markers. The Beta export is converted into a patch; the full Beta HTML is not stored as a second maintained source file.

## Automated release gates

The regression suite asserts that:

- Production source excludes playtest recorder functions/calls, test storage keys, tester IDs, playtest UI, quick-feedback survey and feedback JSON export markers.
- Beta output carries its testing panel, recorder and testing storage key.
- Production and Beta have different manifests and service-worker namespaces.
- The overlay applies cleanly to the canonical source, both channel markers are valid, relative PWA paths are retained, and the inline script matches the CSP hash.
- A test that injects recorder code into Production is rejected by the production checker.

## Recovery

Keep the last known-good production HTML and its complete PWA shell. If a release fails, roll back the matching source, patch and channel shell files together, then run all checks before redeploying. Never deploy an HTML file with another version's CSP hash or service-worker cache metadata.
