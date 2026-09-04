import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ACTION_LABELS, actionEvidenceKey } from './evidence-key-lib.ts';
import { verifyEnvelope } from './attest-lib.ts';

function run(cmd: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function gitRevision(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function gitTree(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Reuse gate: an EvidenceKey proves nothing semantically relevant changed, not that the
// original execution was honest. Prior evidence is admissible only under a trusted attestation.
const previousPath = process.env.FACOP_PREVIOUS_PASSPORT || '';
const previousAttestationPath = process.env.FACOP_PREVIOUS_ATTESTATION || (previousPath ? previousPath.replace(/\.json$/, '.att.json') : '');
let previous: any[] = [];
let reuseProvenance = 'none';

if (previousPath && existsSync(previousPath)) {
  if (!previousAttestationPath || !existsSync(previousAttestationPath)) {
    throw new Error(`unattested previous passport at ${previousPath}: refusing reuse without ${previousAttestationPath || '<unset>'}`);
  }
  const verified = verifyEnvelope(JSON.parse(readFileSync(previousAttestationPath, 'utf8')), 'qualification');
  if (!verified.ok) throw new Error(`untrusted previous evidence: ${verified.reason}`);
  if (JSON.stringify(verified.payload) !== JSON.stringify(JSON.parse(readFileSync(previousPath, 'utf8')))) {
    throw new Error('previous passport does not match its attested payload');
  }
  previous = Array.isArray(verified.payload.evidence) ? verified.payload.evidence : [];
  reuseProvenance = `${verified.trust_class} (${verified.keyid})`;
  console.log(`Previous evidence admitted: signed by ${reuseProvenance}, revision ${verified.payload.revision}.`);
}

// VRD proof closure. Qualification does not re-run the contributor test; it consumes the
// tests-profile proof and binds it to this exact generated candidate revision.
const revision = gitRevision();
const validatedReasonPath = process.env.FACOP_VALIDATED_REASON_PROOF || '';
let validatedReason: any = null;
if (validatedReasonPath) {
  if (!existsSync(validatedReasonPath)) throw new Error(`validated reason proof not found: ${validatedReasonPath}`);
  validatedReason = JSON.parse(readFileSync(validatedReasonPath, 'utf8'));
  if (validatedReason?.schema !== 'facop.vrd.proof/v1') throw new Error('invalid validated reason proof schema');
  if (validatedReason?.problem_proof?.status !== 'proven') throw new Error('qualification requires ProblemProof=proven');
  if (validatedReason?.solution_proof?.status !== 'proven') throw new Error('qualification requires SolutionProof=proven');
  if (validatedReason?.generated_candidate_revision !== revision) {
    throw new Error(`validated reason candidate ${validatedReason?.generated_candidate_revision} != qualification revision ${revision}`);
  }
  if (validatedReason?.problem_proof?.reproduction_digest !== validatedReason?.solution_proof?.candidate_reproduction_digest) {
    throw new Error('validated reason proof used different reproduction bytes across control/treatment');
  }
}

run('npm', ['run', 'test:stage']);

const oldBy = new Map(previous.filter(x => x?.subject && x?.evidence_key).map(x => [x.subject, x]));
const selected = ACTION_LABELS.filter(label => oldBy.get(label)?.evidence_key !== actionEvidenceKey(label));
let fresh: any[] = [];
if (selected.length) {
  run('npm', ['run', 'characterize'], { FACOP_CHANGED_ACTIONS: selected.join(',') });
  fresh = JSON.parse(readFileSync('.facop/evidence/characterization.json', 'utf8')).results;
}
const freshBy = new Map(fresh.map(x => [x.subject, x]));
const combined = ACTION_LABELS.map(label => freshBy.get(label) ?? oldBy.get(label)).filter(Boolean);
if (combined.length !== ACTION_LABELS.length) {
  throw new Error(`evidence closure incomplete: expected ${ACTION_LABELS.length}, got ${combined.length}`);
}
for (const row of combined) {
  if (row.evidence_key !== actionEvidenceKey(row.subject)) throw new Error(`stale evidence: ${row.subject}`);
  if (row.stress?.status === 'fail' || row.chaos?.status === 'fail') throw new Error(`failed characterization: ${row.subject}`);
}

mkdirSync('.facop/evidence', { recursive: true });
writeFileSync(
  '.facop/evidence/characterization.json',
  JSON.stringify({ generated_at: new Date().toISOString(), executed: selected.length, reused: ACTION_LABELS.length - selected.length, results: combined }, null, 2),
);

const tree = gitTree();
const passport = {
  artifact: 'examples/ecommerce',
  revision,
  tree,
  generated_at: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  evidence_summary: {
    required: ACTION_LABELS.length,
    executed: selected.length,
    reused: ACTION_LABELS.length - selected.length,
    validated_reason: validatedReason ? 'proven' : 'not-provided',
  },
  validated_reason: validatedReason,
  evidence: combined,
  reuse_provenance: reuseProvenance,
};
writeFileSync('.facop/evidence/passport.json', JSON.stringify(passport, null, 2));
console.log(
  `QUALIFIED ${revision} tree=${tree}: stage acceptance passed; characterization executed=${selected.length} reused=${ACTION_LABELS.length - selected.length}; validated-reason=${validatedReason ? 'proven' : 'not-provided'}.`,
);
