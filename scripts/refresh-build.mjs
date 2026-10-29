#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { APP_FILES, readAndValidateChannel } from './release-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const channel = arg('--channel');
const htmlPath = arg('--html');
const sourceFile = path.join(repoRoot, 'source', 'game.html');
const patchFile = path.join(repoRoot, 'patches', 'beta-overlay.patch');
const assetDir = path.join(repoRoot, 'channels', channel || '');
const shellFiles = APP_FILES.filter(name => name !== 'index.html');
if (!['production', 'beta'].includes(channel) || !htmlPath) {
  console.error('Usage: node scripts/refresh-build.mjs --channel production|beta --html PATH');
  process.exit(2);
}

function parseRelease(html) {
  const match = html.match(/const\s+RIFT_RUN_RELEASE\s*=\s*Object\.freeze\(\{[^}]*version:"([^"]+)"[^}]*channel:"([^"]+)"[^}]*status:"([^"]+)"[^}]*\}\)/);
  if (!match) throw new Error('Could not read the RIFT_RUN_RELEASE marker from the selected HTML. Use an exported Rift Run channel build.');
  return { version: match[1], channel: match[2], status: match[3] };
}
function copyShell(source, target) {
  for (const name of shellFiles) fs.copyFileSync(path.join(source, name), path.join(target, name));
}
function makeTempDir(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function normaliseShell(stage, channelName, version) {
  const manifestPath = path.join(stage, 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = channelName === 'production' ? 'Rift Run' : `Rift Run Beta ${version}`;
  manifest.short_name = channelName === 'production' ? 'Rift Run' : 'Rift Run Beta';
  manifest.description = channelName === 'production'
    ? `A pixel-art shifting arcade adventure with surprise rift challenges and replayable runs. Version ${version}.`
    : `Rift Run Beta pre-release test build. Version ${version}.`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const swPath = path.join(stage, 'sw.js');
  let sw = fs.readFileSync(swPath, 'utf8');
  const slug = version.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  sw = sw.replace(/const\s+CACHE_NAME\s*=\s*["'][^"']+["'];/, `const CACHE_NAME="rift-run-${channelName}-v${slug}";`);
  sw = sw.replace(/Rift Run [^\n]*PWA cache\./, `Rift Run ${version} ${channelName} PWA cache.`);
  fs.writeFileSync(swPath, sw, 'utf8');
}
function createOverlay(baseHtml, betaHtml) {
  const temp = makeTempDir('rift-run-overlay-');
  try {
    const a = path.join(temp, 'a');
    const b = path.join(temp, 'b');
    fs.mkdirSync(a); fs.mkdirSync(b);
    fs.writeFileSync(path.join(a, 'index.html'), baseHtml, 'utf8');
    fs.writeFileSync(path.join(b, 'index.html'), betaHtml, 'utf8');
    let diff = '';
    try {
      diff = execFileSync('git', ['diff', '--no-index', '--', 'a/index.html', 'b/index.html'], {
        cwd: temp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      if (error.status !== 1) throw new Error(`Could not generate Beta overlay diff: ${String(error.stderr || error.message).trim()}`);
      diff = String(error.stdout || '');
    }
    diff = diff
      .replaceAll('a/a/index.html', 'a/index.html')
      .replaceAll('b/b/index.html', 'b/index.html');
    if (!diff.trim()) throw new Error('Beta HTML matches Production exactly; the Beta overlay would be empty.');
    return diff;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

let temp = null;
try {
  const html = fs.readFileSync(path.resolve(htmlPath), 'utf8');
  const release = parseRelease(html);
  if (release.channel !== channel) throw new Error(`Selected HTML is channel '${release.channel}', but you requested '${channel}'. Nothing changed.`);
  if (channel === 'production' && release.status !== 'production') throw new Error('Production HTML must carry status="production".');
  if (channel === 'beta' && release.status !== 'experimental') throw new Error('Beta HTML must carry status="experimental".');
  if (channel === 'production' && /recordPlaytestEvent|PLAYTEST_KEY|PLAYTEST TOOLS|Quick Feedback/i.test(html)) {
    throw new Error('Refusing a Production export that contains Beta-only test code/UI.');
  }
  if (channel === 'beta' && !/recordPlaytestEvent/i.test(html)) throw new Error('Beta export is missing its recorder instrumentation.');
  if (!fs.existsSync(assetDir)) throw new Error(`Missing channel assets directory: ${path.relative(repoRoot, assetDir)}`);
  for (const name of shellFiles) if (!fs.existsSync(path.join(assetDir, name))) throw new Error(`Missing ${path.relative(repoRoot, path.join(assetDir, name))}`);

  temp = makeTempDir('rift-run-refresh-');
  const stage = path.join(temp, 'stage'); fs.mkdirSync(stage);
  fs.writeFileSync(path.join(stage, 'index.html'), html, 'utf8');
  copyShell(assetDir, stage);
  normaliseShell(stage, channel, release.version);
  readAndValidateChannel(stage, channel);

  if (channel === 'production') {
    fs.copyFileSync(path.join(stage, 'index.html'), sourceFile);
    copyShell(stage, assetDir);
    console.log(`Updated canonical Production source to ${release.version}.`);
    console.log('Now refresh Beta with the matching Beta export so patches/beta-overlay.patch is rebased onto the new source.');
  } else {
    const baseHtml = fs.readFileSync(sourceFile, 'utf8');
    const overlay = createOverlay(baseHtml, html);
    fs.writeFileSync(patchFile, overlay, 'utf8');
    copyShell(stage, assetDir);
    console.log(`Updated Beta overlay to ${release.version} without storing a second full game HTML file.`);
  }
  console.log('Run `npm test` and `npm run build:pages` before committing or publishing.');
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
}
