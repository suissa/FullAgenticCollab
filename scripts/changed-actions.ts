import { execFileSync } from 'node:child_process';
const base=process.argv[2] ?? 'HEAD^'; const head=process.argv[3] ?? 'HEAD';
const diff=execFileSync('git',['diff','--name-only',base,head],{encoding:'utf8'});
const labels=new Set<string>();
for(const file of diff.split(/\r?\n/)){const m=file.match(/^examples\/ecommerce\/actions\/([^/]+)\/([^/]+)\//); if(m) labels.add(`${m[1]}.${m[2]}`);}
console.log([...labels].sort().join(','));
