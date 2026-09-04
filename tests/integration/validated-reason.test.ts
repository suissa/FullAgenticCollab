import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { proveProblemAndSolution, validateCodeFreeBundle } from '../../scripts/validated-reason-lib.ts';

function makeBundle(root: string) {
  const bundle = join(root, 'contribution');
  mkdirSync(bundle, { recursive: true });
  writeFileSync(join(bundle, 'prompt.md'), '# Safe prompt provenance\n\nMake the observed behavior satisfy the reproduction without changing the test.\n');
  writeFileSync(
    join(bundle, 'reproduction.test.ts'),
    `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { value } from '../src/value.ts';\ntest('contributed executable claim', () => assert.equal(value(), 1, 'VRD_EXPECTED_FAILURE'));\n`,
  );
  writeFileSync(
    join(bundle, 'contribution.json'),
    JSON.stringify(
      {
        id: 'issue-test-vrd',
        issue: 'test',
        base_revision: 'fixture-base',
        state: 'reproduction-submitted',
        claim: {
          semantic_id: 'Example.Value.MustBeOne',
          statement: 'value() must return one',
          kind: 'defect',
        },
        reproduction: {
          source: 'reproduction.test.ts',
          inject_to: 'tests/reproduction.test.ts',
          command: [process.execPath, '--test', 'tests/reproduction.test.ts'],
          expected_failure: {
            exit_code: 1,
            pattern: 'VRD_EXPECTED_FAILURE',
            semantic_id: 'Example.Value.MustBeOne',
          },
        },
        reason_provenance: { prompt: 'prompt.md', context: [] },
        attempts: [],
        evidence: [],
      },
      null,
      2,
    ),
  );
  return bundle;
}

function makeTree(root: string, name: string, value: number) {
  const tree = join(root, name);
  mkdirSync(join(tree, 'src'), { recursive: true });
  writeFileSync(join(tree, 'src/value.ts'), `export function value() { return ${value}; }\n`);
  return tree;
}

test('same contributed reproduction proves base failure and upstream candidate pass', () => {
  const root = mkdtempSync(join(tmpdir(), 'facop-vrd-test-'));
  const bundle = makeBundle(root);
  const base = makeTree(root, 'base', 0);
  const candidate = makeTree(root, 'candidate', 1);

  const proof = proveProblemAndSolution(base, candidate, bundle);
  assert.equal(proof.problem_proof.status, 'proven');
  assert.equal(proof.solution_proof.status, 'proven');
  assert.equal(proof.problem_proof.reproduction_digest, proof.solution_proof.candidate_reproduction_digest);
});

test('a failure for the wrong reason does not prove the contributor claim', () => {
  const root = mkdtempSync(join(tmpdir(), 'facop-vrd-wrong-reason-'));
  const bundle = makeBundle(root);
  const manifestPath = join(bundle, 'contribution.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.reproduction.expected_failure.pattern = 'THIS_PATTERN_IS_NOT_PRESENT';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const base = makeTree(root, 'base', 0);
  const candidate = makeTree(root, 'candidate', 1);

  assert.throws(() => proveProblemAndSolution(base, candidate, bundle), /not with the declared failure identity/);
});

test('code-free bundle rejects undeclared implementation artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'facop-vrd-code-free-'));
  const bundle = makeBundle(root);
  writeFileSync(join(bundle, 'candidate.ts'), 'export const contributorPatch = true;\n');
  assert.throws(() => validateCodeFreeBundle(bundle), /undeclared\/non-authoritative file/);
});

test('dev contribution guard blocks production source changes outside contribution package', () => {
  const root = mkdtempSync(join(tmpdir(), 'facop-vrd-git-'));
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'facop@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'FACoP Test'], { cwd: root });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src/base.ts'), 'export const base = true;\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'base'], { cwd: root, stdio: 'ignore' });

  makeBundle(root);
  writeFileSync(join(root, 'src/patch.ts'), 'export const contributorProductionPatch = true;\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'contribution with forbidden patch'], { cwd: root, stdio: 'ignore' });

  const guard = resolve('scripts/contribution-guard.ts');
  const result = spawnSync(process.execPath, [guard, '--bundle=contribution', '--base=HEAD~1'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(`${result.stdout}${result.stderr}`, /production-code contribution forbidden/);
  assert.match(`${result.stdout}${result.stderr}`, /src\/patch.ts/);
});
