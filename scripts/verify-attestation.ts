// Verifies an Evidence Passport attestation before its evidence may be reused or before
// the upstream plane acts on it. Usage:
//
//   node scripts/verify-attestation.ts <envelope.json> [profile] [--expect-revision=<sha>]
//
// Exit 0 = verified, 1 = rejected, 2 = usage error.

import { existsSync, readFileSync } from 'node:fs';
import { verifyEnvelope } from './attest-lib.ts';

const [, , envelopePath, profileArg, ...rest] = process.argv;
if (!envelopePath) {
  console.error('usage: node scripts/verify-attestation.ts <envelope.json> [profile] [--expect-revision=<sha>]');
  process.exit(2);
}
if (!existsSync(envelopePath)) {
  console.error(`attestation envelope not found: ${envelopePath}`);
  process.exit(1);
}

const profile = profileArg && !profileArg.startsWith('--') ? profileArg : (process.env.FACOP_PROFILE ?? 'qualification');
const expected = rest.find(a => a.startsWith('--expect-revision='))?.split('=')[1];

const result = verifyEnvelope(JSON.parse(readFileSync(envelopePath, 'utf8')), profile);
if (!result.ok) {
  console.error(`REJECTED ${envelopePath}: ${result.reason}`);
  process.exit(1);
}
if (expected && result.payload?.revision !== expected) {
  console.error(`REJECTED ${envelopePath}: attested revision ${result.payload?.revision} != expected ${expected}`);
  process.exit(1);
}

console.log(
  `VERIFIED ${envelopePath}: profile=${profile} keyid=${result.keyid} trust_class=${result.trust_class} ` +
    `revision=${result.payload?.revision} tree=${result.payload?.tree}`,
);
