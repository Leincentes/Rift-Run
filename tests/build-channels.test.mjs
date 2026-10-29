import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rift-run-build-test-'));

function runBuild(outDir) {
  return spawnSync(process.execPath, [path.join(repo, 'scripts/build-pages.mjs'), '--out', outDir], {
    cwd: repo, encoding: 'utf8'
  });
}

test('one canonical Production-safe source and a Beta-only overlay exist', () => {
  const source = path.join(repo, 'source/game.html');
  const overlay = path.join(repo, 'patches/beta-overlay.patch');
  assert.ok(fs.existsSync(source), 'missing canonical game source');
  assert.ok(fs.existsSync(overlay), 'missing Beta-only overlay patch');
  const html = fs.readFileSync(source, 'utf8');
  assert.match(html, /channel:"production",status:"production"/);
  assert.doesNotMatch(html, /recordPlaytestEvent|PLAYTEST_KEY|PLAYTEST TOOLS|Quick Feedback/i);
});

test('build produces isolated Production and Beta roots from the canonical source', () => {
  const out = tmp();
  try {
    const result = runBuild(out);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const production = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    const beta = fs.readFileSync(path.join(out, 'beta/index.html'), 'utf8');
    assert.match(production, /channel:"production",status:"production"/);
    assert.match(beta, /channel:"beta",status:"experimental"/);
    assert.doesNotMatch(production, /recordPlaytestEvent|PLAYTEST_KEY|activePlaytestSession|PLAYTEST TOOLS|Quick Feedback/i);
    assert.match(beta, /recordPlaytestEvent/);
    assert.match(beta, /PLAYTEST_KEY/);
    assert.match(beta, /PLAYTEST TOOLS/);
    assert.notEqual(
      fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'),
      fs.readFileSync(path.join(out, 'beta/manifest.webmanifest'), 'utf8'),
      'channel manifests must remain distinct'
    );
    assert.notEqual(
      fs.readFileSync(path.join(out, 'sw.js'), 'utf8'),
      fs.readFileSync(path.join(out, 'beta/sw.js'), 'utf8'),
      'channel service workers must remain distinct'
    );
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('normal player gameplay, onboarding, save and rescue features remain in both builds', () => {
  const out = tmp();
  try {
    const result = runBuild(out);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    for (const relPath of ['index.html', 'beta/index.html']) {
      const html = fs.readFileSync(path.join(out, relPath), 'utf8');
      for (const marker of [
        'function startTutorialRun',
        'function startGame',
        'function activateRiftRescue',
        'function saveRecords',
        'function loadPreferences',
      ]) assert.ok(html.includes(marker), `${relPath} lost player feature: ${marker}`);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('build refuses output paths that overlap source or configuration', () => {
  const result = spawnSync(process.execPath, [
    path.join(repo, 'scripts/build-pages.mjs'), '--out', path.join(repo, 'source')
  ], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'build must refuse to overwrite canonical inputs');
  assert.match(`${result.stdout}\n${result.stderr}`, /overlaps project inputs/i);
  assert.ok(fs.existsSync(path.join(repo, 'source/game.html')), 'canonical source must remain untouched');
});

test('release check rejects any Beta recorder code in Production', () => {
  const dir = tmp();
  try {
    const result = runBuild(dir);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const htmlPath = path.join(dir, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    fs.writeFileSync(htmlPath, html.replace('</body>', '<script>function recordPlaytestEvent(){}</script></body>'));
    const check = spawnSync(process.execPath, [
      path.join(repo, 'scripts/check-release.mjs'), '--channel', 'production', '--dir', dir
    ], { cwd: repo, encoding: 'utf8' });
    assert.notEqual(check.status, 0, 'Production check should fail when Beta recorder code is injected');
    assert.match(`${check.stdout}\n${check.stderr}`, /Beta-only|playtest|testing/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
