import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Vector = Record<string, unknown>;
const root = 'test-vectors/semantic';
const failures: string[] = [];

function isValid(v: Vector): boolean {
  if (typeof v.id !== 'string' || typeof v.kind !== 'string') throw new Error('id and kind are required');
  switch (v.kind) {
    case 'ProblemProof':
      return v.base_exit_code !== 0 && v.base_exit_code === v.expected_exit_code && v.failure_matches === true;
    case 'SolutionProof':
      return v.problem_proven === true &&
        v.control_reproduction_digest === v.treatment_reproduction_digest &&
        v.candidate_exit_code === 0;
    case 'Evidence':
      return v.evidence_status !== 'expired' && v.evidence_status !== 'revoked';
    case 'LifecycleTransition':
      return Array.isArray(v.evidence) && v.evidence.length > 0;
    case 'CandidateGeneration':
      return v.trust_plane === 'upstream';
    default:
      throw new Error(`unknown vector kind: ${v.kind}`);
  }
}

const vectorFiles = readdirSync(root).filter(name => name.endsWith('.json')).sort();
for (const file of vectorFiles) {
  const path = join(root, file);
  try {
    const vector = JSON.parse(readFileSync(path, 'utf8')) as Vector;
    const observed = isValid(vector);
    const expected = vector.status === 'valid';
    if (observed !== expected) failures.push(`${file}: expected ${expected}, observed ${observed}`);
    console.log(`semantic-vector ${file}: ${observed === expected ? 'PASS' : 'FAIL'} (valid=${observed})`);
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated ${vectorFiles.length} semantic vectors.`);
