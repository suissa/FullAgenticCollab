// End-to-end exercise of facop-review against a fixture GitHub API.
//
// Verifies the property the whole design rests on: proofs grant acceptance, the oracle can
// only withhold it, and every proof failure blocks. Runs the real compiled binary over real
// HTTP against a local server, with a real Ed25519 envelope produced by the TypeScript
// signer — no mock of the verifier itself.
//
// Usage: node testdata/e2e.mjs   (from tools/facop-review, after `zig build`)

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { signEnvelope } from '../../../scripts/attest-lib.ts';

const HEAD = 'c'.repeat(40);
const key = readFileSync('../../config/reference-attestation-key.pem', 'utf8');

let scenario;
const server = createServer((req, res) => {
  const send = (body) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const url = req.url.split('?')[0];
  if (url.endsWith('/pulls/1')) {
    return send({ head: { sha: scenario.head }, mergeable: scenario.mergeable, draft: false });
  }
  if (url.endsWith('/pulls/1/files')) {
    return send(scenario.files.map((filename) => ({ filename })));
  }
  if (url.includes('/check-runs')) {
    return send({
      check_runs: [{ name: 'FACoP Stage', status: 'completed', conclusion: scenario.checks }],
    });
  }
  res.writeHead(404).end('{}');
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const api = `http://127.0.0.1:${server.address().port}`;

const dir = mkdtempSync(join(tmpdir(), 'facop-e2e-'));
function envelopeFor(revision, { tamper = false } = {}) {
  const env = signEnvelope({ revision, tree: 'd'.repeat(40), evidence: [] }, key);
  if (tamper) {
    const forged = JSON.parse(Buffer.from(env.payload, 'base64').toString());
    forged.evidence.push({ subject: 'injected' });
    env.payload = Buffer.from(JSON.stringify(forged)).toString('base64');
  }
  const path = join(dir, `${revision.slice(0, 6)}${tamper ? '-tampered' : ''}.att.json`);
  writeFileSync(path, JSON.stringify(env));
  return path;
}

// spawn, not spawnSync: the fixture server runs on this process's event loop, so a
// blocking child would deadlock against the request it is waiting on.
function run(attestation, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('./zig-out/bin/facop-review', [
      '--repo', 'owner/name', '--pr', '1', '--github-api', api,
      '--attestation', attestation, '--trusted-keys', '../../config/trusted-keys.json',
    ], { env: { ...process.env, GITHUB_TOKEN: 'fixture', ANTHROPIC_API_KEY: '', ...env } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

// The oracle is deliberately unreachable in every case below, so `accept` is unavailable
// and the expected outcome is `escalate_to_human` wherever the proofs hold. That is the
// point: an absent oracle cannot be talked into granting anything.
const good = envelopeFor(HEAD);
const cases = [
  ['proofs hold, oracle unavailable → blocks, never accepts', { head: HEAD, mergeable: true, checks: 'success', files: ['examples/ecommerce/src/domain.ts'] }, good, 1, 'semantic-review-inconclusive'],
  ['red CI → rejected', { head: HEAD, mergeable: true, checks: 'failure', files: ['README.md'] }, good, 2, 'required-checks-not-green'],
  ['not mergeable → rejected', { head: HEAD, mergeable: false, checks: 'success', files: ['README.md'] }, good, 2, 'not-mergeable-against-base'],
  ['attestation for another revision → rejected', { head: 'e'.repeat(40), mergeable: true, checks: 'success', files: ['README.md'] }, good, 2, 'attested-revision-does-not-match-head'],
  ['tampered payload → rejected', { head: HEAD, mergeable: true, checks: 'success', files: ['README.md'] }, envelopeFor(HEAD, { tamper: true }), 2, 'attestation-not-verified'],
  ['missing attestation → rejected', { head: HEAD, mergeable: true, checks: 'success', files: ['README.md'] }, '/nonexistent.json', 2, 'attestation-not-verified'],
  ['trust root touched → escalates to a human', { head: HEAD, mergeable: true, checks: 'success', files: ['config/trusted-keys.json'] }, good, 1, 'touches-protected-path'],
];

let failures = 0;
for (const [name, s, attestation, expectedCode, expectedReason] of cases) {
  scenario = s;
  const { code, out } = await run(attestation);
  const ok = code === expectedCode && out.includes(expectedReason);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  (exit ${code}, want ${expectedCode})`);
  if (!ok) console.log(out.trim().split('\n').slice(0, 4).join('\n'));
}

server.close();
console.log(failures === 0 ? `\nall ${cases.length} end-to-end cases passed` : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
