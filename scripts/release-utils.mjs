import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const APP_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png'];

function fail(message) {
  throw new Error(message);
}

export function readAndValidateChannel(dir, expectedChannel) {
  const root = path.resolve(dir);
  for (const name of APP_FILES) {
    if (!fs.existsSync(path.join(root, name))) fail(`${expectedChannel}: missing required file ${name} in ${root}`);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const manifestText = fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  let manifest;
  try { manifest = JSON.parse(manifestText); } catch { fail(`${expectedChannel}: manifest.webmanifest is not valid JSON`); }

  const release = html.match(/const\s+RIFT_RUN_RELEASE\s*=\s*Object\.freeze\(\{[^}]*version:"([^"]+)"[^}]*channel:"([^"]+)"[^}]*status:"([^"]+)"[^}]*\}\)/);
  if (!release) fail(`${expectedChannel}: could not read the RIFT_RUN_RELEASE marker from index.html`);
  const [, version, channel, status] = release;
  if (channel !== expectedChannel) fail(`${expectedChannel}: HTML says channel=${channel}; wrong build copied into this branch`);
  if (expectedChannel === 'production' && status !== 'production') fail('Production build status must be production');
  if (expectedChannel === 'beta' && status !== 'experimental') fail('Beta build status must be experimental');

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
  if (!title) fail(`${expectedChannel}: index.html has no title`);
  if (expectedChannel === 'production' && /\bbeta\b/i.test(title)) fail('Production page title must not say Beta');
  if (expectedChannel === 'beta' && !/\bbeta\b/i.test(title)) fail('Beta page title should identify itself as Beta');
  if (expectedChannel === 'production') {
    const forbidden = [
      ['playtest recorder function/calls', /\brecordPlaytestEvent\b/i],
      ['playtest storage key', /\bPLAYTEST_KEY\b/i],
      ['active playtest session state', /\bactivePlaytestSession\b/i],
      ['active playtest run state', /\bactivePlaytestRun\b/i],
      ['playtest session collection', /\bmemoryPlaytestSessions\b|\breadPlaytestSessions\b|\bpersistPlaytestSession\b/i],
      ['tester identifier instrumentation', /\btesterId\b/i],
      ['playtest UI panel/classes/styles', /PLAYTEST\s+TOOLS|playtest-tools-card|playtest-panel|playtest-controls|playtest-panel|feedback-panel|feedback-field|feedback-grid|release-check-item|release-runtime/i],
      ['quick feedback survey', /quick\s+(player\s+)?feedback/i],
      ['feedback JSON export text/code', /feedback.{0,40}json|json.{0,40}feedback/i],
      ['Beta branding', /Rift Run Beta|RELEASE CANDIDATE|\b0\.\d+\.\d+-beta(?:\.\d+)?\b/i],
    ];
    const hits = forbidden.filter(([, pattern]) => pattern.test(html)).map(([label]) => label);
    if (hits.length) fail(`Production HTML contains Beta-only testing content: ${hits.join(', ')}`);
  }
  if (expectedChannel === 'beta') {
    const required = [
      ['PLAYTEST TOOLS panel', /PLAYTEST\s+TOOLS/i],
      ['playtest recorder function/calls', /\brecordPlaytestEvent\b/i],
      ['playtest storage key', /\bPLAYTEST_KEY\b/i],
    ];
    const missing = required.filter(([, pattern]) => !pattern.test(html)).map(([label]) => label);
    if (missing.length) fail(`Beta HTML is missing required test tools: ${missing.join(', ')}`);
  }

  if (!/href=["']\.\/manifest\.webmanifest["']/i.test(html)) fail(`${expectedChannel}: index.html does not link to ./manifest.webmanifest`);
  if (!/serviceWorker\.register\(["']\.\/sw\.js["']/i.test(html)) fail(`${expectedChannel}: index.html does not register ./sw.js`);
  if (!manifest.start_url || !manifest.scope || !manifest.start_url.startsWith('./') || !manifest.scope.startsWith('./')) {
    fail(`${expectedChannel}: manifest start_url and scope must stay relative to its own channel folder`);
  }
  if (expectedChannel === 'production' && /\bbeta\b/i.test(manifest.name)) fail('Production manifest name must not say Beta');
  if (expectedChannel === 'beta' && !/\bbeta\b/i.test(manifest.name)) fail('Beta manifest name should identify itself as Beta');

  const cacheName = sw.match(/const\s+CACHE_NAME\s*=\s*["']([^"']+)["']/)?.[1];
  const cachePrefix = sw.match(/const\s+CACHE_PREFIX\s*=\s*["']([^"']+)["']/)?.[1];
  if (!cacheName || !cachePrefix) fail(`${expectedChannel}: service worker cache name/prefix not found`);
  if (!cacheName.startsWith(`rift-run-${expectedChannel}-`) || cachePrefix !== `rift-run-${expectedChannel}-`) {
    fail(`${expectedChannel}: service-worker cache must use the ${expectedChannel}-specific namespace`);
  }

  const cspTag = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"[^>]*>/i);
  if (!cspTag) fail(`${expectedChannel}: Content-Security-Policy meta tag not found`);
  const scriptBlocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\bsrc\s*=/.test(match[1]) && match[2].length > 0);
  if (scriptBlocks.length !== 1) fail(`${expectedChannel}: expected one inline game script, found ${scriptBlocks.length}`);
  const scriptHash = crypto.createHash('sha256').update(scriptBlocks[0][2], 'utf8').digest('base64');
  if (!cspTag[1].includes(`sha256-${scriptHash}`)) fail(`${expectedChannel}: CSP SHA-256 does not match the inline game script`);

  return { channel: expectedChannel, version, status, title, manifestName: manifest.name, cacheName, root };
}

export function copyChannelAssets(sourceRoot, targetRoot) {
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const name of APP_FILES) fs.copyFileSync(path.join(sourceRoot, name), path.join(targetRoot, name));
}
