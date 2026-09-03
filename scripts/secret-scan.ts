// FACoP reference secret scanner.
//
// Enforcement point for PROVENANCE.md: `docs/prompts/<ISSUE-ID>.md` and every other
// contribution-plane text artifact MUST be scanned before it becomes append-only and public.
// This is the dependency-free reference implementation; hardened deployments SHOULD run
// gitleaks/trufflehog with the same gate placement (see docs/security-model.md).
//
// Exit code 0 = clean, 1 = findings (blocking), 2 = usage error.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type Finding = { file: string; line: number; rule: string; excerpt: string };

const SCAN_ROOTS = ['docs/prompts', 'docs/spec', 'docs/security-model.md', '.facop/evidence', 'config'];
const SCAN_EXTENSIONS = ['.md', '.json', '.yml', '.yaml', '.txt'];

// Rule set: high-signal credential shapes. Each rule is (name, regex).
const RULES: Array<[string, RegExp]> = [
  ['github-pat', /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/],
  ['github-fine-grained-pat', /\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['aws-access-key-id', /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/],
  ['aws-secret-access-key', /\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/i],
  ['slack-token', /\bxox[abporest]-[A-Za-z0-9-]{10,}\b/],
  ['stripe-key', /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['openai-key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['anthropic-key', /\bsk-ant-[A-Za-z0-9_-]{24,}\b/],
  ['npm-token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['private-key-block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['generic-assigned-secret', /\b(?:api[_-]?key|secret|passwd|password|token|credential)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
  ['basic-auth-url', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{6,}@[^\s/]+/i],
];

// Lines carrying this marker are documented, non-live examples (this file included).
const ALLOW_MARKER = 'facop:secret-scan-allow';

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (!stat.isDirectory()) return SCAN_EXTENSIONS.some(e => path.endsWith(e)) ? [path] : [];
  return readdirSync(path).flatMap(name => walk(join(path, name)));
}

function scanFile(file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, index) => {
    if (text.includes(ALLOW_MARKER)) return;
    for (const [rule, rx] of RULES) {
      const match = rx.exec(text);
      if (!match) continue;
      findings.push({
        file,
        line: index + 1,
        rule,
        // Never echo the candidate secret back into public CI logs.
        excerpt: `${match[0].slice(0, 4)}…${match[0].length} chars redacted`,
      });
    }
  });
  return findings;
}

// Key material is never scanned line-by-line — its presence in the tree is itself the finding,
// except for the one documented non-production reference key.
const ALLOWED_KEY_FILES = ['config/reference-attestation-key.pem'];
function findKeyFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return /\.(pem|key|p12|pfx|jks)$/.test(path) ? [path] : [];
  if (/(^|\/)(node_modules|\.git)$/.test(path)) return [];
  return readdirSync(path).flatMap(name => findKeyFiles(join(path, name)));
}

const explicitTargets = process.argv.slice(2);
const files = (explicitTargets.length ? explicitTargets : SCAN_ROOTS).flatMap(walk);
const findings = files.flatMap(scanFile);

if (!explicitTargets.length) {
  for (const file of findKeyFiles('.')) {
    if (ALLOWED_KEY_FILES.includes(file.replace(/^\.\//, ''))) continue;
    findings.push({ file, line: 0, rule: 'committed-key-material', excerpt: 'key file must not be committed' });
  }
}

console.log(JSON.stringify({ tool: 'facop-secret-scan', scanned: files.length, findings }, null, 2));

if (findings.length) {
  console.error(
    `\nBLOCKED: ${findings.length} candidate secret(s) found. ` +
      `Redact the value, rotate the credential, and record only a digest plus a safe summary ` +
      `(docs/spec/PROVENANCE.md). Prompt logs are append-only and public once merged.`,
  );
  process.exit(1);
}
