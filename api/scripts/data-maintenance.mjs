import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDirectory = path.resolve(process.env.DATA_DIR || '/data');
const backupDirectory = path.resolve(process.env.BACKUP_DIR || '/backups');
const manifestName = 'manifest.json';

function isDatabaseFile(name) {
  return /^[a-z0-9-]+\.db$/i.test(name);
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function createBackup() {
  await mkdir(backupDirectory, { recursive: true });
  const snapshotId = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const snapshotPath = path.join(backupDirectory, snapshotId);
  await mkdir(snapshotPath, { recursive: false });

  try {
    const names = (await readdir(dataDirectory)).filter(isDatabaseFile).sort();
    const files = [];
    for (const name of names) {
      const source = path.join(dataDirectory, name);
      const sourceStat = await lstat(source);
      if (!sourceStat.isFile()) throw new Error(`Database path is not a regular file: ${name}`);
      await copyFile(source, path.join(snapshotPath, name));
      files.push({ name, sha256: await sha256(path.join(snapshotPath, name)) });
    }

    if (files.length === 0) throw new Error('No database files were found to back up.');
    await writeFile(path.join(snapshotPath, manifestName), `${JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      files
    }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log(`Backup created: ${snapshotId}`);
    return snapshotId;
  } catch (error) {
    await rm(snapshotPath, { recursive: true, force: true });
    throw error;
  }
}

async function restoreBackup(snapshotId) {
  if (!/^snapshot-[0-9TZ-]+-[a-f0-9]{8}$/.test(snapshotId || '')) {
    throw new Error('Provide a valid snapshot ID listed in the backup directory.');
  }

  const snapshotPath = path.resolve(backupDirectory, snapshotId);
  if (!snapshotPath.startsWith(`${backupDirectory}${path.sep}`)) {
    throw new Error('Snapshot path must stay inside the configured backup directory.');
  }
  if (!(await lstat(snapshotPath)).isDirectory()) throw new Error('Snapshot path must be a real directory.');
  const manifestPath = path.join(snapshotPath, manifestName);
  if (!(await lstat(manifestPath)).isFile()) throw new Error('Backup manifest must be a regular file.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('Backup manifest is invalid or unsupported.');
  }
  if (new Set(manifest.files.map((file) => file.name)).size !== manifest.files.length) {
    throw new Error('Backup manifest contains duplicate database entries.');
  }

  for (const file of manifest.files) {
    if (!isDatabaseFile(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error('Backup manifest contains an invalid database entry.');
    }
    const sourcePath = path.join(snapshotPath, file.name);
    if (!(await lstat(sourcePath)).isFile() || await sha256(sourcePath) !== file.sha256) {
      throw new Error(`Backup checksum mismatch for ${file.name}.`);
    }
  }

  const rollbackSnapshotId = await createBackup();
  const rollbackPath = path.join(backupDirectory, rollbackSnapshotId);
  const stagePath = path.join(dataDirectory, `.restore-${randomUUID()}`);
  await mkdir(stagePath);
  let commitStarted = false;
  try {
    for (const file of manifest.files) {
      await copyFile(path.join(snapshotPath, file.name), path.join(stagePath, file.name));
    }

    commitStarted = true;
    for (const name of await readdir(dataDirectory)) {
      if (isDatabaseFile(name)) await rm(path.join(dataDirectory, name));
    }
    for (const file of manifest.files) {
      await copyFile(path.join(stagePath, file.name), path.join(dataDirectory, file.name));
    }
    console.log(`Backup restored: ${snapshotId}`);
  } catch (error) {
    if (commitStarted) {
      try {
        const rollbackManifest = JSON.parse(await readFile(path.join(rollbackPath, manifestName), 'utf8'));
        for (const name of await readdir(dataDirectory)) {
          if (isDatabaseFile(name)) await rm(path.join(dataDirectory, name));
        }
        for (const file of rollbackManifest.files) {
          await copyFile(path.join(rollbackPath, file.name), path.join(dataDirectory, file.name));
        }
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], `Restore failed and automatic rollback from ${rollbackSnapshotId} also failed.`);
      }
    }
    throw error;
  } finally {
    await rm(stagePath, { recursive: true, force: true });
  }
}

async function main() {
  const operation = process.argv[2];
  if (operation === 'backup') return createBackup();
  if (operation === 'restore') return restoreBackup(process.argv[3]);
  throw new Error('Usage: data-maintenance.mjs backup | restore <snapshot-id>');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Data maintenance operation failed');
  process.exitCode = 1;
});
