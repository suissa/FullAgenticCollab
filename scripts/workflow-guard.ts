// FACoP trust-plane guard.
//
// Mechanically enforces trust-plane invariants. Workflows that execute contributor-controlled
// code (including contributor reproduction tests) must not hold upstream mutation authority.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type Violation = { file: string; rule: string; detail: string };

const WORKFLOW_DIR = '.github/workflows';

// These workflows may execute contributor-controlled artifacts and therefore MUST hold no
// credential capable of mutating canonical upstream state.
const UNTRUSTED_EXECUTION_PLANE = [
  'facop-dev.yml',
  'facop-stage.yml',
  'facop-tests.yml',
  'facop-qualification.yml',
];

const violations: Violation[] = [];
const files = existsSync(WORKFLOW_DIR) ? readdirSync(WORKFLOW_DIR).filter(f => /\.ya?ml$/.test(f)) : [];

if (!files.length) {
  console.error(`no workflows found under ${WORKFLOW_DIR}`);
  process.exit(1);
}

for (const name of files) {
  const path = join(WORKFLOW_DIR, name);
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');

  for (const trigger of ['pull_request_target', 'workflow_run']) {
    if (new RegExp(`^\\s*${trigger}\\s*:`, 'm').test(text)) {
      violations.push({ file: path, rule: 'privileged-fork-trigger', detail: `${trigger} is forbidden in every FACoP workflow` });
    }
  }

  // First- and third-party Actions are executable supply-chain inputs and must be SHA-pinned.
  lines.forEach((line, i) => {
    const match = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/.exec(line);
    if (!match || match[1].startsWith('./')) return;
    const ref = match[1].split('@')[1];
    if (!ref || !/^[0-9a-f]{40}$/.test(ref)) {
      violations.push({ file: path, rule: 'unpinned-action', detail: `${path}:${i + 1} uses ${match[1]} (require a 40-char commit SHA)` });
    }
  });

  if (/uses:\s*actions\/checkout@/.test(text) && !/persist-credentials:\s*false/.test(text)) {
    violations.push({ file: path, rule: 'persisted-checkout-credentials', detail: 'actions/checkout requires persist-credentials: false' });
  }

  if (UNTRUSTED_EXECUTION_PLANE.includes(name)) {
    if (/\$\{\{\s*secrets\./.test(text)) {
      violations.push({ file: path, rule: 'secret-in-untrusted-plane', detail: 'untrusted-execution workflows must not read ${{ secrets.* }}' });
    }
    if (/^\s*permissions:\s*write-all\s*$/m.test(text)) {
      violations.push({ file: path, rule: 'write-permission-in-untrusted-plane', detail: 'permissions: write-all is forbidden' });
    }
    const permissionMatches = [...text.matchAll(/^\s{2,}([a-z-]+):\s*(read|write|none)\s*$/gm)];
    for (const [, scope, level] of permissionMatches) {
      if (level === 'write') {
        violations.push({ file: path, rule: 'write-permission-in-untrusted-plane', detail: `permissions.${scope}: write is forbidden` });
      }
    }
    const inlinePermissions = [...text.matchAll(/permissions:\s*\{([^}]+)\}/g)];
    for (const match of inlinePermissions) {
      if (/[a-z-]+\s*:\s*write/.test(match[1])) {
        violations.push({ file: path, rule: 'write-permission-in-untrusted-plane', detail: 'inline permissions map contains write authority' });
      }
    }
    if (!/^permissions:/m.test(text)) {
      violations.push({ file: path, rule: 'missing-permissions-block', detail: 'untrusted-execution workflows must declare explicit least-privilege permissions' });
    }
  }
}

console.log(JSON.stringify({ tool: 'facop-workflow-guard', workflows: files.length, violations }, null, 2));

if (violations.length) {
  console.error(`\nBLOCKED: ${violations.length} trust-plane violation(s). See docs/security-model.md.`);
  process.exit(1);
}
