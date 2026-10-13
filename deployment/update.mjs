import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const deploymentDirectory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(deploymentDirectory, '.env');
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function runDocker(args, { capture = false } = {}) {
  const result = spawnSync('docker', args, {
    cwd: deploymentDirectory,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: capture ? 'pipe' : 'inherit'
  });
  if (capture && result.stdout) process.stdout.write(result.stdout);
  if (capture && result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
  return result.stdout || '';
}

async function readVersion() {
  const env = await readFile(envPath, 'utf8');
  const match = env.match(/^APP_VERSION=(.+)$/m);
  const version = match?.[1]?.trim() || '1.0.0';
  if (!semverPattern.test(version)) throw new Error('Current APP_VERSION in deployment/.env is invalid.');
  return { env, version };
}

async function writeVersion(env, version) {
  const next = /^APP_VERSION=.*$/m.test(env)
    ? env.replace(/^APP_VERSION=.*$/m, `APP_VERSION=${version}`)
    : `${env.trimEnd()}\nAPP_VERSION=${version}\n`;
  await writeFile(envPath, next, 'utf8');
}

async function createStoppedServiceBackup() {
  runDocker(['compose', '-f', 'compose.yaml', 'stop', 'api']);
  try {
    const output = runDocker([
      'compose', '-f', 'compose.yaml', 'run', '--rm', '--no-deps', 'api',
      'node', '/app/api/scripts/data-maintenance.mjs', 'backup'
    ], { capture: true });
    const snapshot = output.match(/Backup created: (snapshot-[0-9TZ-]+-[a-f0-9]{8})/);
    if (!snapshot) throw new Error('The backup completed without reporting a snapshot ID.');
    return snapshot[1];
  } finally {
    runDocker(['compose', '-f', 'compose.yaml', 'start', 'api']);
  }
}

async function restoreStoppedServiceBackup(snapshotId) {
  runDocker(['compose', '-f', 'compose.yaml', 'stop', 'api']);
  runDocker([
    'compose', '-f', 'compose.yaml', 'run', '--rm', '--no-deps', 'api',
    'node', '/app/api/scripts/data-maintenance.mjs', 'restore', snapshotId
  ]);
}

async function waitForHealth() {
  const port = process.env.HTTP_PORT || (await readFile(envPath, 'utf8')).match(/^HTTP_PORT=(\d+)$/m)?.[1] || '8080';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // A short retry allows the UI proxy and API health check to become ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Updated deployment did not become healthy within 60 seconds.');
}

async function update(version) {
  if (!semverPattern.test(version || '')) throw new Error('Usage: node update.mjs update <semantic-version>');
  const { env, version: previousVersion } = await readVersion();
  if (version === previousVersion) throw new Error('The requested version is already installed.');

  const snapshotId = await createStoppedServiceBackup();
  try {
    await writeVersion(env, version);
    runDocker(['compose', '-f', 'compose.yaml', 'build', '--pull', 'api', 'ui']);
    runDocker(['compose', '-f', 'compose.yaml', 'up', '-d', 'api', 'ui']);
    await waitForHealth();
    console.log(`Update complete: ${previousVersion} -> ${version}; pre-update backup: ${snapshotId}`);
  } catch (error) {
    console.error('Update failed; restoring the prior version and pre-update data.');
    await writeVersion(env, previousVersion);
    await restoreStoppedServiceBackup(snapshotId);
    runDocker(['compose', '-f', 'compose.yaml', 'up', '-d', 'api', 'ui']);
    throw error;
  }
}

async function rollback(version, snapshotId) {
  if (!semverPattern.test(version || '') || !/^snapshot-[0-9TZ-]+-[a-f0-9]{8}$/.test(snapshotId || '')) {
    throw new Error('Usage: node update.mjs rollback <semantic-version> <snapshot-id>');
  }
  const { env, version: currentVersion } = await readVersion();
  if (version === currentVersion) throw new Error('The requested rollback version is already installed.');

  await writeVersion(env, version);
  try {
    await restoreStoppedServiceBackup(snapshotId);
    runDocker(['compose', '-f', 'compose.yaml', 'up', '-d', 'api', 'ui']);
    await waitForHealth();
    console.log(`Rollback complete: ${currentVersion} -> ${version}; restored backup: ${snapshotId}`);
  } catch (error) {
    await writeVersion(env, currentVersion);
    runDocker(['compose', '-f', 'compose.yaml', 'up', '-d', 'api', 'ui']);
    throw error;
  }
}

async function main() {
  const [, , operation, version, snapshotId] = process.argv;
  if (operation === 'update') return update(version);
  if (operation === 'rollback') return rollback(version, snapshotId);
  throw new Error('Usage: node update.mjs update <semantic-version> | rollback <semantic-version> <snapshot-id>');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Update operation failed.');
  process.exitCode = 1;
});
