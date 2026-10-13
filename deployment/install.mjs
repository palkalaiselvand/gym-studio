import { createPublicKey, randomBytes } from 'node:crypto';
import { access, chown, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const deploymentDirectory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(deploymentDirectory, '.env');
const composePath = path.join(deploymentDirectory, 'compose.yaml');

function runDocker(args) {
  const result = spawnSync('docker', args, { cwd: deploymentDirectory, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
}

function parsePublicKey(pem) {
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('The license verification public key must be Ed25519.');
  return key.export({ format: 'pem', type: 'spki' }).toString().replace(/\r?\n/g, '\\n');
}

async function ensureBackupDirectory() {
  const backupDirectory = path.join(deploymentDirectory, 'backups');
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32' || typeof process.getuid !== 'function' || process.getuid() !== 0) return;

  let appUid = 1000;
  let appGid = 1000;
  try {
    const env = await readFile(envPath, 'utf8');
    const uid = env.match(/^APP_UID=(\d+)$/m)?.[1];
    const gid = env.match(/^APP_GID=(\d+)$/m)?.[1];
    if (uid) appUid = Number(uid);
    if (gid) appGid = Number(gid);
  } catch {
    // A first install uses the image's default non-root UID.
  }
  await chown(backupDirectory, appUid, appGid);
}

async function setupEnvironment() {
  try {
    await access(envPath);
    console.log('Using existing deployment/.env; installer will not overwrite it.');
    await ensureBackupDirectory();
    return null;
  } catch {
    // No environment file exists; continue with first-run prompts.
  }

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question('Initial administrator email: ')).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid administrator email address.');

    const originInput = (await prompt.question('Public application origin (for example https://gym.example.com): ')).trim();
    const origin = new URL(originInput);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new Error('Application origin must be an HTTP(S) origin without a path, query, or fragment.');
    }
    if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
      throw new Error('Non-local deployments must use HTTPS.');
    }

    const keyPath = (await prompt.question('Path to vendor Ed25519 public key (optional for unlicensed evaluation): ')).trim();
    let publicKey = '';
    if (keyPath) publicKey = parsePublicKey(await readFile(path.resolve(keyPath), 'utf8'));

    const password = randomBytes(24).toString('base64url');
    const hostUid = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const hostGid = typeof process.getgid === 'function' ? process.getgid() : 1000;
    const appUid = hostUid === 0 ? 1000 : hostUid;
    const appGid = hostUid === 0 ? 1000 : hostGid;
    const environment = [
      `ADMIN_EMAIL=${email}`,
      `ADMIN_PASSWORD=${password}`,
      `UI_ORIGINS=${origin.origin}`,
      'HTTP_PORT=8080',
      'APP_VERSION=1.0.0',
      `APP_UID=${appUid}`,
      `APP_GID=${appGid}`,
      `LICENSE_PUBLIC_KEY=${publicKey}`,
      ''
    ].join('\n');
    await writeFile(envPath, environment, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await ensureBackupDirectory();
    console.log(`Initial administrator: ${email}`);
    console.log(`One-time bootstrap password: ${password}`);
    console.log('Store this password securely; it is not printed again by the installer.');
    return { email, password, publicKeyConfigured: Boolean(publicKey) };
  } finally {
    prompt.close();
  }
}

async function main() {
  if (!process.argv.includes('--help')) {
    runDocker(['--version']);
    runDocker(['compose', 'version']);
    runDocker(['info']);
  } else {
    console.log('Usage: node deployment/install.mjs');
    console.log('Creates deployment/.env once and starts the Docker Compose deployment.');
    return;
  }

  const credentials = await setupEnvironment();
  await access(composePath);
  runDocker(['compose', '-f', 'compose.yaml', 'up', '--build', '-d']);

  if (credentials) {
    if (!credentials.publicKeyConfigured) {
      console.log('No license verification key was configured. Import signed licenses after configuring the vendor public key and restarting the API.');
    }
  }
  console.log('Deployment started. The UI is available through the configured TLS reverse proxy on localhost:8080.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Installation failed.');
  process.exitCode = 1;
});
