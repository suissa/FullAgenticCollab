import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export type ExpectedFailure = {
  exit_code?: number;
  pattern: string;
  semantic_id?: string | null;
};

export type ProblemContribution = {
  id: string;
  issue: string;
  base_revision: string;
  contribution_revision?: string | null;
  generated_candidate_revision?: string | null;
  state: string;
  claim: {
    semantic_id: string;
    statement: string;
    kind?: string;
  };
  reproduction: {
    source: string;
    inject_to: string;
    command: string[];
    expected_failure: ExpectedFailure;
    digest?: string | null;
  };
  reason_provenance: {
    prompt: string;
    context?: string[];
  };
  attempts?: unknown[];
  evidence?: string[];
  reviews?: string[];
  decision?: string | null;
};

export type ExecutionObservation = {
  tree: string;
  exit_code: number;
  test_digest: string;
  output_digest: string;
};

const forbiddenContributorFields = new Set([
  'patch',
  'patch_digest',
  'diff',
  'source_patch',
  'candidate_code',
  'implementation',
]);

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${field} must be a non-empty string`);
  return value;
}

function requireRelativePath(value: unknown, field: string): string {
  const path = requireString(value, field).replaceAll('\\', '/');
  if (isAbsolute(path) || path === '..' || path.startsWith('../') || path.includes('/../')) {
    throw new Error(`${field} must stay inside the contribution/worktree`);
  }
  return path;
}

function listFiles(path: string, root = path): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [relative(root, path).split(sep).join('/')];
  return readdirSync(path).flatMap(name => listFiles(join(path, name), root));
}

export function sha256(data: Buffer | string): string {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

export function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

export function loadContribution(bundleDir: string): ProblemContribution {
  const manifestPath = join(bundleDir, 'contribution.json');
  if (!existsSync(manifestPath)) throw new Error(`contribution manifest not found: ${manifestPath}`);
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;

  for (const field of forbiddenContributorFields) {
    if (field in raw) throw new Error(`contributor production code field is forbidden: ${field}`);
  }

  requireString(raw.id, 'id');
  requireString(raw.issue, 'issue');
  requireString(raw.base_revision, 'base_revision');
  requireString(raw.state, 'state');

  const claim = raw.claim as Record<string, unknown> | undefined;
  if (!claim) throw new Error('claim is required');
  requireString(claim.semantic_id, 'claim.semantic_id');
  requireString(claim.statement, 'claim.statement');

  const reproduction = raw.reproduction as Record<string, unknown> | undefined;
  if (!reproduction) throw new Error('reproduction is required');
  requireRelativePath(reproduction.source, 'reproduction.source');
  requireRelativePath(reproduction.inject_to, 'reproduction.inject_to');
  if (!Array.isArray(reproduction.command) || reproduction.command.length === 0 || reproduction.command.some(v => typeof v !== 'string' || !v)) {
    throw new Error('reproduction.command must be a non-empty string array');
  }
  const expected = reproduction.expected_failure as Record<string, unknown> | undefined;
  if (!expected) throw new Error('reproduction.expected_failure is required');
  requireString(expected.pattern, 'reproduction.expected_failure.pattern');
  if (expected.exit_code !== undefined && (!Number.isInteger(expected.exit_code) || Number(expected.exit_code) <= 0)) {
    throw new Error('reproduction.expected_failure.exit_code must be a positive integer');
  }

  const reason = raw.reason_provenance as Record<string, unknown> | undefined;
  if (!reason) throw new Error('reason_provenance is required');
  requireRelativePath(reason.prompt, 'reason_provenance.prompt');
  if (reason.context !== undefined) {
    if (!Array.isArray(reason.context) || reason.context.some(v => typeof v !== 'string')) {
      throw new Error('reason_provenance.context must be a string array');
    }
    for (const [index, value] of (reason.context as string[]).entries()) {
      requireRelativePath(value, `reason_provenance.context[${index}]`);
    }
  }

  return raw as unknown as ProblemContribution;
}

export function validateCodeFreeBundle(bundleDir: string): ProblemContribution {
  const contribution = loadContribution(bundleDir);
  if (contribution.generated_candidate_revision) {
    throw new Error('contributor bundle must not declare an upstream generated candidate');
  }

  const allowed = new Set<string>([
    'contribution.json',
    requireRelativePath(contribution.reproduction.source, 'reproduction.source'),
    requireRelativePath(contribution.reason_provenance.prompt, 'reason_provenance.prompt'),
    ...(contribution.reason_provenance.context ?? []).map((p, i) => requireRelativePath(p, `reason_provenance.context[${i}]`)),
  ]);

  for (const file of listFiles(bundleDir)) {
    if (!allowed.has(file)) {
      throw new Error(`code-free contribution contains undeclared/non-authoritative file: ${file}`);
    }
  }
  for (const file of allowed) {
    if (!existsSync(join(bundleDir, file))) throw new Error(`declared contribution artifact is missing: ${file}`);
  }

  const digest = sha256File(join(bundleDir, contribution.reproduction.source));
  if (contribution.reproduction.digest && contribution.reproduction.digest !== digest) {
    throw new Error(`reproduction digest mismatch: manifest=${contribution.reproduction.digest} observed=${digest}`);
  }
  return contribution;
}

function contains(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target));
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

export function reproductionEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'CI', 'NODE_OPTIONS', 'SystemRoot']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.FACOP_REPRODUCTION = '1';
  return env;
}

export function executeInjectedReproduction(
  treeDir: string,
  bundleDir: string,
  contribution: ProblemContribution,
  treeLabel: string,
): ExecutionObservation & { output: string } {
  const source = resolve(bundleDir, contribution.reproduction.source);
  const target = resolve(treeDir, contribution.reproduction.inject_to);
  if (!contains(bundleDir, source)) throw new Error('reproduction source escapes contribution bundle');
  if (!contains(treeDir, target)) throw new Error('reproduction injection target escapes execution tree');
  if (existsSync(target)) throw new Error(`reproduction injection would overwrite an existing file: ${contribution.reproduction.inject_to}`);

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  const sourceDigest = sha256File(source);
  const injectedDigest = sha256File(target);
  if (sourceDigest !== injectedDigest) throw new Error('injected reproduction bytes differ from contributed reproduction');

  try {
    const [command, ...args] = contribution.reproduction.command;
    const result = spawnSync(command, args, {
      cwd: treeDir,
      encoding: 'utf8',
      env: reproductionEnvironment(),
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status === null) throw new Error(`reproduction did not terminate normally in ${treeLabel}`);
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    return {
      tree: treeLabel,
      exit_code: result.status,
      test_digest: injectedDigest,
      output_digest: sha256(output),
      output,
    };
  } finally {
    if (existsSync(target)) unlinkSync(target);
  }
}

export function proveProblem(
  baseDir: string,
  bundleDir: string,
  contribution = validateCodeFreeBundle(bundleDir),
  baseLabel = 'base',
) {
  const observation = executeInjectedReproduction(baseDir, bundleDir, contribution, baseLabel);
  const expected = contribution.reproduction.expected_failure;
  if (observation.exit_code === 0) throw new Error('claim not proven: reproduction passed on canonical base');
  if (expected.exit_code !== undefined && observation.exit_code !== expected.exit_code) {
    throw new Error(`claim not proven: expected exit ${expected.exit_code}, observed ${observation.exit_code}`);
  }
  let matcher: RegExp;
  try {
    matcher = new RegExp(expected.pattern, 'm');
  } catch {
    throw new Error(`invalid expected failure pattern: ${expected.pattern}`);
  }
  if (!matcher.test(observation.output)) {
    throw new Error('claim not proven: base failed, but not with the declared failure identity');
  }
  return {
    kind: 'ProblemProof',
    contribution_id: contribution.id,
    claim_semantic_id: contribution.claim.semantic_id,
    base: baseLabel,
    reproduction_digest: observation.test_digest,
    expected_failure: expected,
    observed_exit_code: observation.exit_code,
    observed_output_digest: observation.output_digest,
    status: 'proven',
  } as const;
}

export function proveSolution(
  candidateDir: string,
  bundleDir: string,
  contribution = validateCodeFreeBundle(bundleDir),
  candidateLabel = 'candidate',
) {
  const observation = executeInjectedReproduction(candidateDir, bundleDir, contribution, candidateLabel);
  if (observation.exit_code !== 0) {
    throw new Error(`solution not proven: unchanged reproduction still fails on candidate (exit ${observation.exit_code})`);
  }
  return {
    kind: 'SolutionTreatment',
    contribution_id: contribution.id,
    candidate: candidateLabel,
    reproduction_digest: observation.test_digest,
    observed_exit_code: observation.exit_code,
    observed_output_digest: observation.output_digest,
    status: 'pass',
  } as const;
}

export function proveProblemAndSolution(baseDir: string, candidateDir: string, bundleDir: string) {
  const contribution = validateCodeFreeBundle(bundleDir);
  const problem = proveProblem(baseDir, bundleDir, contribution, 'base');
  const treatment = proveSolution(candidateDir, bundleDir, contribution, 'candidate');
  if (problem.reproduction_digest !== treatment.reproduction_digest) {
    throw new Error('solution not proven: reproduction digest changed between control and treatment');
  }
  return {
    schema: 'facop.vrd.proof/v1',
    contribution_id: contribution.id,
    claim: contribution.claim,
    problem_proof: problem,
    solution_proof: {
      kind: 'SolutionProof',
      contribution_id: contribution.id,
      base_reproduction_digest: problem.reproduction_digest,
      candidate_reproduction_digest: treatment.reproduction_digest,
      candidate_exit_code: treatment.observed_exit_code,
      candidate_output_digest: treatment.observed_output_digest,
      status: 'proven',
    },
  } as const;
}
