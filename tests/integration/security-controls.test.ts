import test from 'node:test'; import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process'; import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { signEnvelope, verifyEnvelope, keyIdFor, type TrustedKey } from '../../scripts/attest-lib.ts';

const tmp = () => mkdtempSync(join(tmpdir(), 'facop-sec-'));
function newKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  return { pub, priv: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), keyid: keyIdFor(pub) };
}
function trusted(k: ReturnType<typeof newKey>, over: Partial<TrustedKey> = {}): TrustedKey[] {
  return [{ keyid: k.keyid, publicKey: k.pub, trust_class: 'test', profiles: ['qualification'], ...over }];
}
const passport = { revision: 'abc', tree: 'def', evidence: [{ subject: 'X', evidence_key: 'sha256:1' }] };

// --- Secret scanning is an enforced gate, not prose -------------------------------------

test('secret scanner blocks a prompt log carrying a credential', () => {
  const dir = tmp(); const file = join(dir, '99.md');
  writeFileSync(file, '# Attempt 1\n\nexport GH_TOKEN=ghp_' + 'a'.repeat(36) + '\n');
  const r = spawnSync(process.execPath, ['scripts/secret-scan.ts', file], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /github-pat/);
  assert.doesNotMatch(r.stdout + r.stderr, /aaaaaaaaaa/, 'scanner must not echo the candidate secret');
});

test('secret scanner passes a redacted prompt log', () => {
  const dir = tmp(); const file = join(dir, '98.md');
  writeFileSync(file, '# Attempt 1\n\nPrompt digest: sha256:deadbeef. Token redacted before persistence.\n');
  assert.equal(spawnSync(process.execPath, ['scripts/secret-scan.ts', file], { encoding: 'utf8' }).status, 0);
});

test('committed prompt logs are clean under the repository gate', () => {
  assert.equal(spawnSync(process.execPath, ['scripts/secret-scan.ts'], { encoding: 'utf8' }).status, 0);
});

// --- Trust-plane separation is mechanically checked ------------------------------------

test('workflow guard passes on the reference workflows', () => {
  assert.equal(spawnSync(process.execPath, ['scripts/workflow-guard.ts'], { encoding: 'utf8' }).status, 0);
});

test('no workflow uses a privileged fork trigger', () => {
  for (const f of ['facop-dev.yml', 'facop-stage.yml', 'facop-qualification.yml', 'facop-review-observer.yml']) {
    const text = readFileSync(join('.github/workflows', f), 'utf8');
    assert.doesNotMatch(text, /^\s*pull_request_target\s*:/m, `${f} must not use pull_request_target`);
  }
});

// --- Attestation: content addressing alone does not make evidence reusable --------------

test('a valid envelope from a trusted key verifies', () => {
  const k = newKey();
  const result = verifyEnvelope(signEnvelope(passport, k.priv), 'qualification', trusted(k));
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.payload.revision, 'abc');
});

test('an envelope from an unknown key is rejected', () => {
  const attacker = newKey();
  const result = verifyEnvelope(signEnvelope(passport, attacker.priv), 'qualification', trusted(newKey()));
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.reason, /no signature from a trusted key/);
});

test('a tampered payload is rejected even though the key is trusted', () => {
  const k = newKey(); const env = signEnvelope(passport, k.priv);
  const forged = { ...JSON.parse(Buffer.from(env.payload, 'base64').toString()), evidence: [{ subject: 'X', evidence_key: 'sha256:1', status: 'pass' }] };
  env.payload = Buffer.from(JSON.stringify(forged)).toString('base64');
  const result = verifyEnvelope(env, 'qualification', trusted(k));
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.reason, /bad signature/);
});

test('revoked and expired keys are rejected', () => {
  const k = newKey(); const env = signEnvelope(passport, k.priv);
  assert.match((verifyEnvelope(env, 'qualification', trusted(k, { revoked: true })) as any).reason, /revoked/);
  assert.match((verifyEnvelope(env, 'qualification', trusted(k, { not_after: '2000-01-01T00:00:00Z' })) as any).reason, /expired/);
});

test('a key trusted for one profile cannot attest another', () => {
  const k = newKey();
  const result = verifyEnvelope(signEnvelope(passport, k.priv), 'qualification', trusted(k, { profiles: ['dev'] }));
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.reason, /not authorized for profile/);
});

test('qualification refuses to reuse an unattested previous passport', () => {
  const dir = tmp(); const p = join(dir, 'passport.json');
  writeFileSync(p, JSON.stringify(passport));
  const r = spawnSync(process.execPath, ['scripts/qualify.ts'], {
    encoding: 'utf8',
    env: { ...process.env, FACOP_PREVIOUS_PASSPORT: p},
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /unattested previous passport/);
});

// --- Autonomous acceptance: the protected set must not drift ----------------------------
// CODEOWNERS is the escalation path for exactly the paths facop-review refuses to
// self-accept. If the two lists diverge, either a gate becomes silently self-acceptable or
// an ordinary contribution is blocked for no reason. Both are bugs, so assert they agree.

function protectedSetFromZig(): { exact: string[]; prefixes: string[] } {
  const src = readFileSync('tools/facop-review/src/policy.zig', 'utf8');
  const section = (name: string) => {
    const start = src.indexOf(`const ${name} = [_][]const u8{`);
    if (start < 0) throw new Error(`policy.zig: ${name} not found`);
    const end = src.indexOf('};', start);
    return [...src.slice(start, end).matchAll(/"([^"]+)"/g)].map(m => m[1]);
  };
  return { exact: section('exact'), prefixes: section('prefixes') };
}

function codeownersPaths(): string[] {
  return readFileSync('.github/CODEOWNERS', 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split(/\s+/)[0].replace(/^\//, ''));
}

test('every path CODEOWNERS escalates is one facop-review refuses to self-accept', () => {
  const { exact, prefixes } = protectedSetFromZig();
  for (const owned of codeownersPaths()) {
    const covered = exact.includes(owned) || prefixes.some(p => owned.startsWith(p) || p === owned);
    assert.ok(covered, `${owned} is owned in CODEOWNERS but not protected in policy.zig`);
  }
});

test('every path facop-review refuses to self-accept requires a human in CODEOWNERS', () => {
  const { exact, prefixes } = protectedSetFromZig();
  const owned = codeownersPaths();
  for (const p of [...exact, ...prefixes]) {
    const covered = owned.some(o => o === p || p.startsWith(o) || o.startsWith(p));
    assert.ok(covered, `${p} is protected in policy.zig but has no owner in CODEOWNERS`);
  }
});

test('CODEOWNERS has no catch-all that would force review on every contribution', () => {
  assert.ok(!codeownersPaths().includes('*'), 'a `*` owner defeats autonomous acceptance');
});
