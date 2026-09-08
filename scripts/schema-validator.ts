import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'schemas';
const files = readdirSync(root).filter(file => file.endsWith('.json')).sort();
const failures: string[] = [];

for (const file of files) {
  const path = join(root, file);
  try {
    const schema = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    for (const field of ['$schema', '$id', 'title', 'type']) {
      if (typeof schema[field] !== 'string' || schema[field] === '') throw new Error(`missing string field ${field}`);
    }
    if (schema.type !== 'object') throw new Error('root type must be object');
    if (schema.required !== undefined && !Array.isArray(schema.required)) throw new Error('required must be an array');
    console.log(`schema ${file}: PASS`);
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated ${files.length} JSON schemas.`);
