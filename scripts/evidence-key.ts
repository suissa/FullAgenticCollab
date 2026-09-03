import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const inputs = process.argv.slice(2);
if(!inputs.length) throw new Error('usage: node scripts/evidence-key.ts <file>...');
const hash = createHash('sha256');
for(const file of [...inputs].sort()) { if(!existsSync(file)) throw new Error(`missing input ${file}`); hash.update(file); hash.update('\0'); hash.update(readFileSync(file)); hash.update('\0'); }
hash.update(`node=${process.version};platform=${process.platform};arch=${process.arch}`);
console.log(hash.digest('hex'));
