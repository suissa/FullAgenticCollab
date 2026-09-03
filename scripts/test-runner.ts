import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const profile = process.argv[2];
const roots: Record<string,string[]> = {
  unit: ['examples/ecommerce/actions'],
  integration: ['tests/integration'],
  e2e: ['tests/e2e']
};
if (!roots[profile]) throw new Error(`unknown test profile: ${profile}`);

function walk(path:string): string[] {
  const out:string[] = [];
  for (const name of readdirSync(path)) {
    const full = join(path,name); const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}
const files = roots[profile].flatMap(walk);
if (!files.length) throw new Error(`no ${profile} tests found`);
const r = spawnSync(process.execPath, ['--test', ...files], { stdio:'inherit' });
process.exit(r.status ?? 1);
