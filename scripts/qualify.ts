import {spawnSync,execFileSync} from 'node:child_process'; import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'; import {ACTION_LABELS,actionEvidenceKey} from './evidence-key-lib.ts';
function run(cmd:string,args:string[],extraEnv:NodeJS.ProcessEnv={}){const r=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,...extraEnv}}); if(r.status!==0) process.exit(r.status??1);}
run('npm',['run','test:stage']);
const previousPath=process.env.FACOP_PREVIOUS_PASSPORT||''; let previous:any[]=[];
if(previousPath && existsSync(previousPath)){try{const p=JSON.parse(readFileSync(previousPath,'utf8')); previous=Array.isArray(p.evidence)?p.evidence:[];}catch{previous=[];}}
const oldBy=new Map(previous.filter(x=>x?.subject&&x?.evidence_key).map(x=>[x.subject,x]));
const selected=ACTION_LABELS.filter(label=>oldBy.get(label)?.evidence_key!==actionEvidenceKey(label));
let fresh:any[]=[];
if(selected.length){run('npm',['run','characterize'],{FACOP_CHANGED_ACTIONS:selected.join(',')}); fresh=JSON.parse(readFileSync('.facop/evidence/characterization.json','utf8')).results;}
const freshBy=new Map(fresh.map(x=>[x.subject,x])); const combined=ACTION_LABELS.map(label=>freshBy.get(label)??oldBy.get(label)).filter(Boolean);
if(combined.length!==ACTION_LABELS.length) throw new Error(`evidence closure incomplete: expected ${ACTION_LABELS.length}, got ${combined.length}`);
for(const row of combined){if(row.evidence_key!==actionEvidenceKey(row.subject)) throw new Error(`stale evidence: ${row.subject}`); if(row.stress?.status==='fail'||row.chaos?.status==='fail') throw new Error(`failed characterization: ${row.subject}`);}
mkdirSync('.facop/evidence',{recursive:true}); writeFileSync('.facop/evidence/characterization.json',JSON.stringify({generated_at:new Date().toISOString(),executed:selected.length,reused:ACTION_LABELS.length-selected.length,results:combined},null,2));
const revision=(()=>{try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{return 'unknown';}})(); const tree=(()=>{try{return execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();}catch{return 'unknown';}})(); const passport={artifact:'examples/ecommerce',revision,tree,generated_at:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},evidence_summary:{required:ACTION_LABELS.length,executed:selected.length,reused:ACTION_LABELS.length-selected.length},evidence:combined}; writeFileSync('.facop/evidence/passport.json',JSON.stringify(passport,null,2)); console.log(`QUALIFIED ${revision} tree=${tree}: stage acceptance passed; characterization executed=${selected.length} reused=${ACTION_LABELS.length-selected.length}.`);
