#!/usr/bin/env node
import { readAndValidateChannel } from './release-utils.mjs';

function value(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}
const channel = value('--channel');
const dir = value('--dir') ?? '.';
if (!['production', 'beta'].includes(channel)) {
  console.error('Usage: node scripts/check-release.mjs --channel production|beta --dir PATH');
  process.exit(2);
}
try {
  const info = readAndValidateChannel(dir, channel);
  console.log(`PASS: ${info.channel} ${info.version} — ${info.title}`);
  console.log(`PASS: manifest=${info.manifestName}; cache=${info.cacheName}`);
  console.log('PASS: required PWA files, channel marker, relative paths, and CSP SHA-256');
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
