// Signs an Evidence Passport. Run by the plane that EXECUTED the evidence, immediately
// after production, inside the same job. Usage:
//
//   FACOP_ATTESTATION_KEY_PEM=... node scripts/attest.ts [passport.json] [envelope.json]
//   node scripts/attest.ts --keygen        # dev/self-hosted key pair, prints PEMs + keyid
//
// The private key never enters the contribution tree; it is a job-scoped secret of the
// producing plane (docs/security-model.md § Evidence attestation).

import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { keyIdFor, signEnvelope } from './attest-lib.ts';

if (process.argv.includes('--keygen')) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  console.log(JSON.stringify({ keyid: keyIdFor(pub), publicKey: pub, privateKey: priv }, null, 2));
  process.exit(0);
}

const [, , passportArg, envelopeArg] = process.argv;
const passportPath = passportArg ?? '.facop/evidence/passport.json';
const envelopePath = envelopeArg ?? '.facop/evidence/passport.att.json';

const pem = process.env.FACOP_ATTESTATION_KEY_PEM;
if (!pem) {
  console.error('FACOP_ATTESTATION_KEY_PEM is not set: the producing plane cannot attest this passport.');
  process.exit(2);
}
if (!existsSync(passportPath)) {
  console.error(`passport not found: ${passportPath}`);
  process.exit(2);
}

const passport = JSON.parse(readFileSync(passportPath, 'utf8'));
const envelope = signEnvelope(passport, pem);
mkdirSync(dirname(envelopePath), { recursive: true });
writeFileSync(envelopePath, JSON.stringify(envelope, null, 2));
console.log(`ATTESTED ${passportPath} -> ${envelopePath} (keyid ${envelope.signatures[0].keyid})`);
