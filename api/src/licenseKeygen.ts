import { generateKeyPairSync } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const [, , privateKeyPath, publicKeyPath] = process.argv;
  if (!privateKeyPath || !publicKeyPath) {
    throw new Error('Usage: npm run license:keygen -- <private-key.pem> <public-key.pem>');
  }

  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' }
  });
  await writeFile(privateKeyPath, privateKey, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  try {
    await writeFile(publicKeyPath, publicKey, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    await unlink(privateKeyPath);
    throw error;
  }
  console.log(`License key pair created. Keep ${privateKeyPath} offline and private.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'License key generation failed');
  process.exitCode = 1;
});
