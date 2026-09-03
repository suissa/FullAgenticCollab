import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const forbidden = [/\beval\s*\(/, /new\s+Function\s*\(/, /child_process/, /process\.env\.[A-Z0-9_]+\s*=/];
function walk(path:string):string[]{ const out:string[]=[]; for(const n of readdirSync(path)){const f=join(path,n); const s=statSync(f); if(s.isDirectory()) out.push(...walk(f)); else if(f.endsWith('.ts')) out.push(f);} return out; }
const files = walk('examples/ecommerce');
const findings = files.flatMap(file => { const text=readFileSync(file,'utf8'); return forbidden.filter(rx=>rx.test(text)).map(rx=>({file,rule:String(rx)})); });
console.log(JSON.stringify({tool:'facop-reference-security-check',files:files.length,findings},null,2));
if(findings.length) process.exit(1);
