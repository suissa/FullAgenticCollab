// FACoP evidence attestation (DSSE-style envelope over Ed25519).
//
// An EvidenceKey proves that nothing semantically relevant changed. It does NOT prove that
// the first execution was honest. Reuse therefore requires a signature from a producer the
// consuming plane already trusts. See docs/security-model.md § Evidence attestation.

import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export const PAYLOAD_TYPE = 'application/vnd.facop.evidence-passport+json';
export const TRUSTED_KEYS_PATH = process.env.FACOP_TRUSTED_KEYS ?? 'config/trusted-keys.json';

export type Signature = { keyid: string; sig: string };
export type Envelope = { payloadType: string; payload: string; signatures: Signature[] };
export type TrustedKey = {
  keyid: string;
  publicKey: string;
  trust_class: string;
  profiles: string[];
  not_after?: string;
  revoked?: boolean;
};

/** DSSE Pre-Authentication Encoding: binds the payload type into the signed bytes. */
export function pae(payloadType: string, payload: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`DSSEv1 ${payloadType.length} ${payloadType} ${payload.length} `, 'utf8'),
    payload,
  ]);
}

/** Key id is the digest of the SPKI DER form, so it is derivable from the public key alone. */
export function keyIdFor(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return `sha256:${createHash('sha256').update(der).digest('hex')}`;
}

export function signEnvelope(payloadObject: unknown, privateKeyPem: string): Envelope {
  const key = createPrivateKey(privateKeyPem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('FACoP attestation requires an Ed25519 key');
  const payload = Buffer.from(JSON.stringify(payloadObject), 'utf8');
  const keyid = keyIdFor(createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString());
  const sig = sign(null, pae(PAYLOAD_TYPE, payload), key).toString('base64');
  return { payloadType: PAYLOAD_TYPE, payload: payload.toString('base64'), signatures: [{ keyid, sig }] };
}

export function loadTrustedKeys(path = TRUSTED_KEYS_PATH): TrustedKey[] {
  if (!existsSync(path)) throw new Error(`trusted key set not found: ${path}`);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed.keys)) throw new Error(`malformed trusted key set: ${path}`);
  return parsed.keys as TrustedKey[];
}

export type VerifyResult = { ok: true; keyid: string; trust_class: string; payload: any } | { ok: false; reason: string };

/**
 * Verifies an envelope against the trusted key set for a given execution profile.
 * Rejects unknown, revoked and expired keys, and keys not authorized for the profile.
 */
export function verifyEnvelope(envelope: Envelope, profile: string, keys: TrustedKey[] = loadTrustedKeys()): VerifyResult {
  if (envelope?.payloadType !== PAYLOAD_TYPE) return { ok: false, reason: `unexpected payloadType: ${envelope?.payloadType}` };
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length === 0) return { ok: false, reason: 'envelope carries no signature' };

  const payload = Buffer.from(envelope.payload, 'base64');
  const signed = pae(envelope.payloadType, payload);
  const now = Date.now();

  for (const signature of envelope.signatures) {
    const key = keys.find(k => k.keyid === signature.keyid);
    if (!key) continue;
    if (key.revoked) return { ok: false, reason: `key revoked: ${key.keyid}` };
    if (key.not_after && Date.parse(key.not_after) < now) return { ok: false, reason: `key expired: ${key.keyid}` };
    if (!key.profiles.includes(profile)) return { ok: false, reason: `key ${key.keyid} is not authorized for profile '${profile}'` };
    if (!verify(null, signed, createPublicKey(key.publicKey), Buffer.from(signature.sig, 'base64'))) {
      return { ok: false, reason: `bad signature for key ${key.keyid}` };
    }
    return { ok: true, keyid: key.keyid, trust_class: key.trust_class, payload: JSON.parse(payload.toString('utf8')) };
  }
  return { ok: false, reason: `no signature from a trusted key (saw: ${envelope.signatures.map(s => s.keyid).join(', ')})` };
}
