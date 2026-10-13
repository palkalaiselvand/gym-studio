import { createPrivateKey, sign } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { canonicalLicensePayload, validateLicensePayload, type SignedLicenseFile } from './license.js';

async function main(): Promise<void> {
  const [, , inputPath, privateKeyPath, outputPath] = process.argv;
  if (!inputPath || !privateKeyPath || !outputPath) {
    throw new Error('Usage: npm run license:sign -- <payload.json> <private-key.pem> <signed-license.json>');
  }

  const input: unknown = JSON.parse(await readFile(inputPath, 'utf8'));
  const payload = validateLicensePayload(input);
  const privateKey = createPrivateKey(await readFile(privateKeyPath));
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('The signing key must be an Ed25519 private key.');
  }

  const file: SignedLicenseFile = {
    payload,
    signature: sign(null, Buffer.from(canonicalLicensePayload(payload)), privateKey).toString('base64url')
  };
  await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(`Signed license written to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'License signing failed');
  process.exitCode = 1;
});
