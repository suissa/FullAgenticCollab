// Installs the author-side FACoP git hooks. Idempotent; refuses to clobber an unrelated hook.

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const MARKER = 'FACoP pre-commit gate';
const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8' }).trim();
const target = join(gitDir, 'hooks', 'pre-commit');
const source = 'scripts/hooks/pre-commit';

mkdirSync(join(gitDir, 'hooks'), { recursive: true });

if (existsSync(target) && !readFileSync(target, 'utf8').includes(MARKER)) {
  console.error(`${target} already exists and was not installed by FACoP. Merge it by hand, or chain it from your own hook:\n  bash ${source}`);
  process.exit(1);
}

copyFileSync(source, target);
chmodSync(target, 0o755);
console.log(`Installed ${source} -> ${target}`);
console.log('Note: a local hook is advisory (bypassable with --no-verify). The blocking gates are the');
console.log('pre-receive hook / push ruleset and the required CI check. See docs/security-model.md §2.');
