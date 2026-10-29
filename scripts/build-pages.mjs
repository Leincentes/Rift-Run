#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readAndValidateChannel, copyChannelAssets } from './release-utils.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const production = arg('--production', 'source-production');
const beta = arg('--beta', 'source-beta');
const output = path.resolve(arg('--out', '_site'));
try {
  const prod = readAndValidateChannel(production, 'production');
  const bet = readAndValidateChannel(beta, 'beta');
  if (prod.cacheName === bet.cacheName) throw new Error('Production and Beta service worker caches must be different');
  if (output === path.parse(output).root || output === process.cwd()) throw new Error('Refusing to replace filesystem root or working directory as output');
  fs.rmSync(output, { recursive: true, force: true });
  copyChannelAssets(prod.root, output);
  copyChannelAssets(bet.root, path.join(output, 'beta'));
  fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');
  // Re-validate the final assembled artifact, not only the source branches.
  readAndValidateChannel(output, 'production');
  readAndValidateChannel(path.join(output, 'beta'), 'beta');
  console.log(`PASS: assembled GitHub Pages site at ${output}`);
  console.log(`Production ${prod.version}: /`);
  console.log(`Beta ${bet.version}: /beta/`);
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
