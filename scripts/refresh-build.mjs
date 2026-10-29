#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readAndValidateChannel } from './release-utils.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const channel = arg('--channel');
const htmlPath = arg('--html');
const dir = path.resolve(arg('--dir', '.'));
if (!['production', 'beta'].includes(channel) || !htmlPath) {
  console.error('Usage: node scripts/refresh-build.mjs --channel production|beta --html PATH [--dir PATH]');
  process.exit(2);
}
try {
  const branch = (await import('node:child_process')).execFileSync('git', ['-C', dir, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
  const expectedBranch = channel === 'production' ? 'main' : 'beta';
  if (branch !== expectedBranch) throw new Error(`You are on branch '${branch}'. Switch to '${expectedBranch}' before refreshing the ${channel} build.`);
  const source = path.resolve(htmlPath);
  if (!fs.existsSync(source)) throw new Error(`HTML build not found: ${source}`);
  const newHtml = fs.readFileSync(source, 'utf8');
  const marker = newHtml.match(/const\s+RIFT_RUN_RELEASE\s*=\s*Object\.freeze\(\{[^}]*version:"([^"]+)"[^}]*channel:"([^"]+)"[^}]*status:"([^"]+)"[^}]*\}\)/);
  if (!marker) throw new Error('Could not read the RIFT_RUN_RELEASE channel/version marker in the selected HTML. Use an exported Rift Run channel build.');
  const [, version, buildChannel] = marker;
  if (buildChannel !== channel) throw new Error(`Selected HTML is channel '${buildChannel}', but you requested '${channel}'. Nothing changed.`);
  const temp = path.join(dir, '.refresh-check');
  fs.rmSync(temp, { recursive: true, force: true });
  fs.mkdirSync(temp, { recursive: true });
  fs.writeFileSync(path.join(temp, 'index.html'), newHtml, 'utf8');
  for (const name of ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png']) fs.copyFileSync(path.join(dir, name), path.join(temp, name));

  const manifestPath = path.join(temp, 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = channel === 'production' ? 'Rift Run' : `Rift Run Beta ${version}`;
  manifest.short_name = channel === 'production' ? 'Rift Run' : 'Rift Run Beta';
  manifest.description = channel === 'production'
    ? `A pixel-art shifting arcade adventure with surprise rift challenges and replayable runs. Version ${version}.`
    : `Rift Run Beta pre-release test build. Version ${version}.`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const swPath = path.join(temp, 'sw.js');
  let sw = fs.readFileSync(swPath, 'utf8');
  const slug = version.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  sw = sw.replace(/const\s+CACHE_NAME\s*=\s*["'][^"']+["'];/, `const CACHE_NAME="rift-run-${channel}-v${slug}";`);
  sw = sw.replace(/Rift Run [^\n]*PWA cache\./, `Rift Run ${version} ${channel} PWA cache.`);
  fs.writeFileSync(swPath, sw, 'utf8');

  const readmePath = path.join(dir, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/^# Rift Run.*$/m, channel === 'production' ? `# Rift Run — Production ${version}` : `# Rift Run — Beta ${version}`);
  fs.writeFileSync(path.join(temp, 'README.md'), readme, 'utf8');

  // Validate everything before replacing the current release files.
  readAndValidateChannel(temp, channel);
  for (const name of ['index.html', 'manifest.webmanifest', 'sw.js', 'README.md']) fs.copyFileSync(path.join(temp, name), path.join(dir, name));
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(`Updated ${channel} branch to ${version}. Review git diff before committing.`);
  console.log('Changed: index.html, manifest.webmanifest, sw.js, README.md. Icons are retained.');
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
