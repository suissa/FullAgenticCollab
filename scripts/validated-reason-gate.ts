import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { proveProblem, proveProblemAndSolution, validateCodeFreeBundle } from './validated-reason-lib.ts';

function arg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find(value => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function addWorktree(path: string, revision: string): string {
  const sha = git('rev-parse', revision);
  execFileSync('git', ['worktree', 'add', '--detach', path, sha], { stdio: 'ignore' });
  return sha;
}

function removeWorktree(path: string) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', path], { stdio: 'ignore' });
  } catch {
    rmSync(path, { recursive: true, force: true });
  }
}

const bundleDir = resolve(arg('bundle', 'contribution')!);
const baseRef = arg('base', 'origin/main')!;
const candidateRef = arg('candidate', 'HEAD')!;
const mode = arg('mode', 'solution');
if (mode !== 'problem' && mode !== 'solution') {
  console.error('usage: node scripts/validated-reason-gate.ts --bundle=contribution --base=<ref> [--candidate=<ref>] [--mode=problem|solution]');
  process.exit(2);
}

try {
  const contribution = validateCodeFreeBundle(bundleDir);
  const scratch = mkdtempSync(join(tmpdir(), 'facop-vrd-'));
  const baseTree = join(scratch, 'base');
  const candidateTree = join(scratch, 'candidate');
  let baseSha = '';
  let candidateSha = '';

  try {
    baseSha = addWorktree(baseTree, baseRef);
    if (/^[0-9a-f]{40}$/.test(contribution.base_revision) && contribution.base_revision !== baseSha) {
      throw new Error(`declared base ${contribution.base_revision} does not match resolved base ${baseSha}`);
    }

    let proof: unknown;
    if (mode === 'problem') {
      proof = {
        schema: 'facop.vrd.problem-proof/v1',
        contribution_id: contribution.id,
        base_revision: baseSha,
        problem_proof: proveProblem(baseTree, bundleDir, contribution, baseSha),
      };
    } else {
      candidateSha = addWorktree(candidateTree, candidateRef);
      const combined = proveProblemAndSolution(baseTree, candidateTree, bundleDir);
      proof = {
        ...combined,
        base_revision: baseSha,
        generated_candidate_revision: candidateSha,
      };
    }

    mkdirSync('.facop/evidence', { recursive: true });
    const outputPath = '.facop/evidence/validated-reason.json';
    writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify({ tool: 'facop-validated-reason-gate', mode, status: 'pass', base: baseSha, candidate: candidateSha || null, evidence: outputPath }, null, 2));
  } finally {
    if (baseSha) removeWorktree(baseTree);
    if (candidateSha) removeWorktree(candidateTree);
    rmSync(scratch, { recursive: true, force: true });
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ tool: 'facop-validated-reason-gate', status: 'blocked', reason: message }, null, 2));
  process.exit(1);
}
