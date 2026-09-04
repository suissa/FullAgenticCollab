import { execFileSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { validateCodeFreeBundle } from './validated-reason-lib.ts';

function arg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find(value => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalize(path: string): string {
  return path.split(sep).join('/').replace(/^\.\//, '');
}

try {
  const bundle = resolve(arg('bundle', 'contribution')!);
  const contribution = validateCodeFreeBundle(bundle);
  const base = arg('base');
  const result: Record<string, unknown> = {
    tool: 'facop-code-free-contribution-guard',
    contribution_id: contribution.id,
    bundle: normalize(relative(process.cwd(), bundle)),
    status: 'pass',
  };

  if (base) {
    const bundlePrefix = `${normalize(relative(process.cwd(), bundle)).replace(/\/$/, '')}/`;
    const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
    const changed = output.split('\n').map(value => value.trim()).filter(Boolean);
    const forbidden = changed.filter(path => !normalize(path).startsWith(bundlePrefix));
    if (forbidden.length) {
      throw new Error(
        `production-code contribution forbidden; changed paths outside ${bundlePrefix}: ${forbidden.join(', ')}`,
      );
    }
    result.changed_paths = changed;
  }

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ tool: 'facop-code-free-contribution-guard', status: 'blocked', reason: message }, null, 2));
  process.exit(1);
}
