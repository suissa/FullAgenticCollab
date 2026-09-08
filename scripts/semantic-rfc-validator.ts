import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Vector = Record<string, unknown>;
const root = 'test-vectors/semantic';
const failures: string[] = [];

function bool(v: unknown): v is boolean { return typeof v === 'boolean'; }
function validate(v: Vector): boolean {
  if (typeof v.id !== 'string' || typeof v.kind !== 'string') throw new Error('id and kind are required');
  switch (v.kind) {
    case 'ProblemProof':
      if (v.status === 'valid') return v.base_exit_code !== 0 && v.base_exit_code === v.expected_exit_code && v.failure_matches === true;
      return true;
    case 'SolutionProof':
      if (v.status === 'valid') return v.problem_proven === true && v.control_reproduction_digest === v.treatment_reproduction_digest && v.candidate_exit_code === 0;
      if (v.problem_proven === false) return false;
      return v.control_reproduction_digest !== v.treatment_reproduction_digest;
    case 'Evidence':
      return v.status === 'invalid' && (v.evidence_status === 'expired' || v.evidence_status === 'revoked');
    case 'LifecycleTransition':
      return v.status === 'invalid' && Array.isArray(v.evidence) && v.evidence.length === 0;
    case 'CandidateGeneration':
      return v.status === 'invalid' && v.trust_plane !== 'upstream';
    default:
      throw new Error(`unknown vector kind: ${v.kind}`);
  }
}

for (const file of readdirSync(root).filter(name => name.endsWith('.json')).sort()) {
  const path = join(root, file);
  try {
    const vector = JSON.parse(readFileSync(path, 'utf8')) as Vector;
    const observed = validate(vector);
    const expected = vector.status === 'valid';
    if (observed !== expected) failures.push(`${file}: expected ${expected}, observed ${observed}`);
    console.log(`semantic-vector ${file}: ${observed ? 'PASS' : 'REJECT'}`);
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Validated ${readdirSync(root).filter(name => name.endsWith('.json')).length} semantic vectors.`);
