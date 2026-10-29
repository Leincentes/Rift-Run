#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { APP_FILES, readAndValidateChannel, copyChannelAssets } from './release-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const output = path.resolve(repoRoot, arg('--out', '_site'));
const canonicalSource = path.join(repoRoot, 'source', 'game.html');
const betaPatch = path.join(repoRoot, 'patches', 'beta-overlay.patch');
const productionAssets = path.join(repoRoot, 'channels', 'production');
const betaAssets = path.join(repoRoot, 'channels', 'beta');
const shellFiles = APP_FILES.filter(name => name !== 'index.html');

function copyShellAssets(source, target) {
  for (const name of shellFiles) fs.copyFileSync(path.join(source, name), path.join(target, name));
}
function prepareStage(root, assetsDir) {
  fs.mkdirSync(root, { recursive: true });
  fs.copyFileSync(canonicalSource, path.join(root, 'index.html'));
  copyShellAssets(assetsDir, root);
}
function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function removeOutputSafely(target) {
  if (target === path.parse(target).root || target === repoRoot || isWithin(repoRoot, target)) {
    throw new Error(`Refusing unsafe output directory: ${target}`);
  }
  const protectedRoots = ['.git', '.github', 'channels', 'docs', 'patches', 'scripts', 'source', 'tests', 'README.md', '.gitignore', 'package.json', '.nojekyll'];
  for (const name of protectedRoots) {
    const protectedPath = path.join(repoRoot, name);
    if (isWithin(target, protectedPath) || isWithin(protectedPath, target)) {
      throw new Error(`Refusing output directory that overlaps project inputs (${name}): ${target}`);
    }
  }
}

let tempRoot = null;
try {
  if (!fs.existsSync(canonicalSource)) throw new Error(`Missing canonical source: ${path.relative(repoRoot, canonicalSource)}`);
  if (!fs.existsSync(betaPatch)) throw new Error(`Missing Beta overlay patch: ${path.relative(repoRoot, betaPatch)}`);
  for (const dir of [productionAssets, betaAssets]) {
    for (const name of shellFiles) {
      if (!fs.existsSync(path.join(dir, name))) throw new Error(`Missing ${path.relative(repoRoot, path.join(dir, name))}`);
    }
  }
  removeOutputSafely(output);
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-run-pages-'));
  const productionStage = path.join(tempRoot, 'production');
  const betaStage = path.join(tempRoot, 'beta');
  const siteStage = path.join(tempRoot, 'site');

  // Production uses the clean canonical source without Beta instrumentation.
  prepareStage(productionStage, productionAssets);
  const production = readAndValidateChannel(productionStage, 'production');

  // Beta is the canonical source plus an explicit, reviewable Beta-only patch.
  prepareStage(betaStage, betaAssets);
  try {
    execFileSync('git', ['apply', '--whitespace=nowarn', betaPatch], {
      cwd: betaStage, stdio: 'pipe'
    });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim();
    throw new Error(`Beta overlay no longer applies to source/game.html. Review and regenerate patches/beta-overlay.patch. ${detail}`);
  }
  const beta = readAndValidateChannel(betaStage, 'beta');
  if (production.cacheName === beta.cacheName) throw new Error('Production and Beta service worker caches must be different');
  if (production.manifestName === beta.manifestName) throw new Error('Production and Beta app names must be different');

  // Assemble into a temporary destination first, so a failure cannot leave a half-built site.
  copyChannelAssets(productionStage, siteStage);
  copyChannelAssets(betaStage, path.join(siteStage, 'beta'));
  fs.writeFileSync(path.join(siteStage, '.nojekyll'), '', 'utf8');
  readAndValidateChannel(siteStage, 'production');
  readAndValidateChannel(path.join(siteStage, 'beta'), 'beta');

  fs.mkdirSync(path.dirname(output), { recursive: true });
  const outputStage = path.join(path.dirname(output), `.rift-run-output-${process.pid}`);
  const previousOutput = path.join(path.dirname(output), `.rift-run-output-previous-${process.pid}`);
  fs.rmSync(outputStage, { recursive: true, force: true });
  fs.rmSync(previousOutput, { recursive: true, force: true });
  fs.cpSync(siteStage, outputStage, { recursive: true });
  let movedPrevious = false;
  try {
    if (fs.existsSync(output)) {
      fs.renameSync(output, previousOutput);
      movedPrevious = true;
    }
    fs.renameSync(outputStage, output);
    if (movedPrevious) fs.rmSync(previousOutput, { recursive: true, force: true });
  } catch (swapError) {
    if (!fs.existsSync(output) && movedPrevious && fs.existsSync(previousOutput)) {
      fs.renameSync(previousOutput, output);
    }
    throw new Error(`Could not safely replace output directory: ${swapError.message}`);
  } finally {
    fs.rmSync(outputStage, { recursive: true, force: true });
  }
  console.log(`PASS: built Production ${production.version} at ${output}`);
  console.log(`PASS: built Beta ${beta.version} at ${path.join(output, 'beta')}`);
  console.log('PASS: both builds came from source/game.html; Beta-only changes were applied from patches/beta-overlay.patch');
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
}
