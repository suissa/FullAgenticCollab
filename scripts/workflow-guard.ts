// FACoP trust-plane guard.
//
// Mechanically enforces the invariants stated in docs/security-model.md so that the
// separation between the contributor plane and the upstream plane cannot be broken
// by a later edit that only reads as harmless.
//
// Exit code 0 = clean, 1 = violations.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type Violation = { file: string; rule: string; detail: string };

const WORKFLOW_DIR = '.github/workflows';

// Workflows that may run contributor-controlled code. They MUST hold no credential
// capable of mutating the canonical upstream.
const CONTRIBUTOR_PLANE = ['facop-dev.yml', 'facop-stage.yml', 'facop-qualification.yml'];

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

  // 1. `pull_request_target` and `workflow_run` grant a privileged context to a
  //    fork-controlled ref. No FACoP workflow uses them; contributor evidence is
  //    produced in the contributor's own repository under its own token.
  for (const trigger of ['pull_request_target', 'workflow_run']) {
    if (new RegExp(`^\\s*${trigger}\\s*:`, 'm').test(text)) {
      violations.push({ file: path, rule: 'privileged-fork-trigger', detail: `${trigger} is forbidden in every FACoP workflow` });
    }
  }

  // 2. Third-party and first-party actions MUST be pinned by full commit SHA.
  lines.forEach((line, i) => {
    const m = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/.exec(line);
    if (!m || m[1].startsWith('./')) return;
    const ref = m[1].split('@')[1];
    if (!ref || !/^[0-9a-f]{40}$/.test(ref)) {
      violations.push({ file: path, rule: 'unpinned-action', detail: `${path}:${i + 1} uses ${m[1]} (require a 40-char commit SHA)` });
    }
  });

  // 3. Checkout MUST NOT persist credentials into the working tree.
  if (/uses:\s*actions\/checkout@/.test(text) && !/persist-credentials:\s*false/.test(text)) {
    violations.push({ file: path, rule: 'persisted-checkout-credentials', detail: 'actions/checkout requires persist-credentials: false' });
  }

  // 4. Contributor-plane workflows MUST NOT reference the secrets context at all,
  //    and MUST NOT request write scopes.
  if (CONTRIBUTOR_PLANE.includes(name)) {
    if (/\$\{\{\s*secrets\./.test(text)) {
      violations.push({ file: path, rule: 'secret-in-contributor-plane', detail: 'contributor-plane workflows must not read ${{ secrets.* }}' });
    }
    const permissionMatches = [...text.matchAll(/^\s{2,}([a-z-]+):\s*(read|write|none)\s*$/gm)];
    for (const [, scope, level] of permissionMatches) {
      if (level === 'write') {
        violations.push({ file: path, rule: 'write-permission-in-contributor-plane', detail: `permissions.${scope}: write is forbidden` });
      }
    }
    if (!/^permissions:/m.test(text)) {
      violations.push({ file: path, rule: 'missing-permissions-block', detail: 'contributor-plane workflows must declare an explicit least-privilege permissions block' });
    }
  }
}

console.log(JSON.stringify({ tool: 'facop-workflow-guard', workflows: files.length, violations }, null, 2));

if (violations.length) {
  console.error(`\nBLOCKED: ${violations.length} trust-plane violation(s). See docs/security-model.md.`);
  process.exit(1);
}
