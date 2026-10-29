# Local verification report — Production/Beta separation

**Run date:** 2026-10-29  
**Game baseline:** Production 0.8.3 / Beta 0.8.3-beta.1  
**Environment:** Node.js 22, Git, local build only

## Automated results

- Regression suite: **5/5 passed**.
- Production output build: **passed**.
- Beta output build: **passed**.
- Production channel gate: **passed** (stable channel marker, manifest identity, service-worker namespace, relative paths and inline-script CSP hash).
- Beta channel gate: **passed** (experimental marker, Beta manifest identity, distinct cache namespace, relative paths and inline-script CSP hash).
- JavaScript syntax: **passed** for build/test scripts and each generated inline game script.
- Boundary regression: a test-only recorder injected into Production is rejected by the Production gate.
- Gameplay parity checks: tutorial, run start, Rift Rescue, save-record and preference-loading functions remain in both channels.
- Output safety check: build refuses to overwrite source/configuration directories.

## Generated layout

- `_site/index.html` — Production
- `_site/beta/index.html` — Beta
- Each channel has its own `manifest.webmanifest`, `sw.js`, and icons.

## Not verified by this report

No public HTTPS deployment was performed. No real browser end-to-end session, installed-PWA update/offline test, physical mobile device test, independent player session, backup/restore recovery drill, rollback drill, or release-owner approval was performed. Passing local checks is not a certification that Production is ready for public release.
