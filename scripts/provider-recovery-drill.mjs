// Explicit development-only provider drill. No production rows or files are read/copied.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {neon} from '@neondatabase/serverless';
import {put,get,del,list,issueSignedToken,presignUrl,getDownloadUrl} from '@vercel/blob';
import {postgresD1} from '../lib/vercel/postgres.mjs';
import {applySchema} from '../lib/vercel/migrations.mjs';
import {captureRecovery,restoreRecovery} from '../lib/recovery.js';
import {putWorkspace} from '../lib/workspace-service.js';
import {createApiHandler} from '../lib/api-handler.js';
import {fresh} from '../public/core.js';
import {upgrade,trashTransaction} from '../public/ledger.js';

if(process.env.MONETA_RUN_PROVIDER_RECOVERY!=='1'||!process.env.MONETA_PROVIDER_ENV_FILE)throw Error('Explicit development-provider drill and env file required.');
const configured=parseEnv(fs.readFileSync(process.env.MONETA_PROVIDER_ENV_FILE,'utf8'));
if(!configured.CLERK_SECRET_KEY?.startsWith('sk_test_')||!configured.DATABASE_URL||!configured.BLOB_READ_WRITE_TOKEN)throw Error('Explicit file must contain all development-provider references');
Object.assign(process.env,configured);
if(!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')||!process.env.DATABASE_URL||!process.env.BLOB_READ_WRITE_TOKEN)throw Error('Development services required; production authentication is refused.');
const out='outputs/release-followup';fs.mkdirSync(out,{recursive:true});
const id=crypto.randomUUID(),suffix=id.replaceAll('-',''),raw=neon(process.env.DATABASE_URL),created=[],knownObjects=new Set(),checks=[],cleanupFailures=[];
const schemaNames=['moneta_drill_source_'+suffix,'moneta_drill_target_'+suffix];
const root='moneta-recovery-drill/'+id+'/',tables=/\b(workspaces|feedback|request_limits|receipts|receipt_purges|receipt_uploads)\b/g;
const allowedSchema=name=>/^moneta_drill_(source|target)_[a-f0-9]{32}$/.test(name)&&schemaNames.includes(name);
const sourceOwners=['drill-alice-'+id,'drill-bob-'+id],generations=new Map();
let stage='create isolated namespaces',failure=null,restoreMilliseconds=null,bundleAgeAtRestoreMilliseconds=null,inventory=null;
function scopedSQL(schema){assert.ok(allowedSchema(schema));return {query:(text,args,opts)=>raw.query(text.replace(tables,(_,table)=>'"'+schema+'"."'+table+'"'),args,opts),transaction:(queries,opts)=>raw.transaction(queries,opts)}}
function bucket(label){const base=root+label+'/';const physical=key=>{if(!/^(receipts|receipt-parts)\//.test(key)||key.includes('..'))throw Error('Unexpected test object path.');return base+key};return {
 async put(key,bytes,options){const path=physical(key);knownObjects.add(path);return put(path,Buffer.from(bytes),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:options?.httpMetadata?.contentType||'application/octet-stream'})},
 async get(key){const r=await get(physical(key),{access:'private',useCache:false});return r?.statusCode===200?{body:r.stream}:null},
 async delete(key){const path=physical(key);await del(path);knownObjects.delete(path)},
 async list(options={}){const r=await list({prefix:base,limit:options.limit,cursor:options.cursor});assert.ok(r.blobs.every(b=>b.pathname.startsWith(base)));return {objects:r.blobs.map(b=>({key:b.pathname.slice(base.length)})),truncated:r.hasMore,cursor:r.cursor}},
 async link(key,duration=60000){const until=Date.now()+duration,pathname=physical(key),token=await issueSignedToken({pathname,operations:['get'],validUntil:until});const r=await presignUrl(token,{operation:'get',pathname,access:'private',validUntil:until});return {url:getDownloadUrl(r.presignedUrl),until}},
 async authorizedDownload(row){const {url}=await this.link(row.object_key);return new Response(null,{status:302,headers:{Location:url,'Cache-Control':'private, no-store'}})}
}}
const canonicalRows=rows=>Object.fromEntries(Object.entries(rows).map(([table,values])=>[table,values.map(r=>JSON.stringify(r)).sort()]));
const note=text=>{checks.push(text);console.log(text)};
const safeMessage=e=>{let message=String(e.message||e.name);for(const key of ['DATABASE_URL','BLOB_READ_WRITE_TOKEN','CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','VERCEL_OIDC_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET'])if(process.env[key])message=message.replaceAll(process.env[key],'[redacted]');return message.replace(/https?:\/\/[^\s/@:]+:[^\s/@]+@/g,'[redacted]@').slice(0,240)};
try{
 for(const name of schemaNames){assert.ok(allowedSchema(name));stage='create scratch schema';await raw.query('CREATE SCHEMA "'+name+'"');created.push(name);stage='bootstrap scratch schema';await applySchema(scopedSQL(name),fs.readFileSync('drizzle-vercel/0000_workspace.sql','utf8'))}
 const source=postgresD1(scopedSQL(schemaNames[0])),target=postgresD1(scopedSQL(schemaNames[1])),sourceFiles=bucket('source'),targetFiles=bucket('target');
 stage='synthetic source records and private objects';const receipts=[];
 for(const [index,owner] of sourceOwners.entries()){
  const s=upgrade(fresh());s.accounts=[{id:'bank',name:'Fictional bank',kind:'bank',currency:'USD',opening:10000000}];s.transactions=[{id:'tx',name:'Fictional restoration expense',type:'expense',account:'bank',currency:'USD',amount:10000,category:'Uncategorized',date:'2026-11-11'}];
  if(index===0)trashTransaction(s,'tx');const saved=await putWorkspace(source,owner,{workspace:s,revision:0,replaceBackup:true});generations.set(owner,saved.workspace.generation);
  const receipt=crypto.randomUUID(),key='receipts/'+receipt,bytes=Buffer.from('%PDF-1.4\nFictional recovery '+index+'\n%%EOF');const uploaded=await sourceFiles.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});await source.prepare('INSERT INTO receipts VALUES (?,?,?,?,?,?,?,?)').bind(receipt,owner,'tx',key,'fictional.pdf','application/pdf',bytes.length,new Date().toISOString()).run();receipts.push({receipt,key,bytes,owner,privateUrl:uploaded.url});
 }
 const upload=crypto.randomUUID(),part='receipt-parts/'+upload+'/part-0',pending='receipt-parts/'+crypto.randomUUID()+'/part-0',at=new Date().toISOString();await sourceFiles.put(part,Buffer.from('fictional upload'));await sourceFiles.put(pending,Buffer.from('fictional pending purge'));
 await source.prepare('INSERT INTO receipt_uploads VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(upload,sourceOwners[0],'tx',generations.get(sourceOwners[0]),'fictional.pdf',16,'receipt-parts/'+upload,at,at,'pending',null).run();await source.prepare('INSERT INTO receipt_purges VALUES (?,?,?)').bind(pending,sourceOwners[0],at).run();
 stage='capture and restore';const bundle=await captureRecovery(source,sourceFiles,{writesQuiesced:true,platform:'vercel'});const started=Date.now();bundleAgeAtRestoreMilliseconds=started-Date.parse(bundle.createdAt);const restored=await restoreRecovery(target,targetFiles,JSON.parse(JSON.stringify(bundle)),{isolatedTarget:true,targetPlatform:'vercel'});const again=await captureRecovery(target,targetFiles,{writesQuiesced:true,platform:'vercel'});assert.deepEqual(canonicalRows(again.rows),canonicalRows(bundle.rows));assert.deepEqual(again.objects,bundle.objects);restoreMilliseconds=Date.now()-started;inventory={tables:restored.tables,objects:restored.objects,sha256:bundle.sha256};note('Real Neon schema-isolated restore preserves all table rows and private Blob byte hashes, including Recovery and staged/purge objects');
 stage='private object access';const anonymousObject=await fetch(receipts[0].privateUrl,{cache:'no-store'});assert.ok([401,403,404].includes(anonymousObject.status));note('Private Blob object rejects unauthenticated direct access');stage='restored owner access';const owners=new Set(sourceOwners),handle=createApiHandler({env:{DB:target,BUCKET:targetFiles},resolveUser:r=>owners.has(r.headers.get('authorization'))?{userId:r.headers.get('authorization'),email:'synthetic@example.invalid'}:null});const req=(owner,path)=>new Request('https://recovery.test/api/'+path,{headers:owner?{authorization:owner}:{}});
 assert.equal((await handle(req(null,'workspace'))).status,401);
 for(const entry of receipts){const wrong=sourceOwners.find(o=>o!==entry.owner);assert.equal((await handle(req(wrong,'receipts/'+entry.receipt))).status,404);const response=await handle(req(entry.owner,'receipts/'+entry.receipt));assert.equal(response.status,302);const file=await fetch(response.headers.get('location'),{cache:'no-store'});assert.equal(file.status,200);assert.deepEqual(Buffer.from(await file.arrayBuffer()),entry.bytes)}
 note('Restored owner downloads return the exact PDF bytes; wrong-owner access is 404 and anonymous workspace access is 401');
 stage='short-lived link expiry';const link=await targetFiles.link(receipts[0].key,20000),first=await fetch(link.url,{cache:'no-store'});assert.equal(first.status,200);await first.arrayBuffer();await new Promise(resolve=>setTimeout(resolve,Math.max(0,link.until-Date.now()+1500)));const expired=await fetch(link.url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});assert.ok([401,403,404].includes(expired.status),'Expired private download must be denied');note('A short-lived private signed download works before expiry and is denied afterward');
 await assert.rejects(()=>restoreRecovery(target,targetFiles,bundle,{isolatedTarget:true,targetPlatform:'vercel'}),/empty/);note('Restoration refuses the populated isolated target');
}catch(e){failure={stage,name:e.name,message:safeMessage(e),code:e.code||e.sourceError?.code||e.cause?.code||null,category:/permission denied/i.test(e.message)?'permission denied':/fetch|connect|timeout/i.test(e.message)?'provider connection error':'provider query error'};process.exitCode=1;console.log(JSON.stringify({status:'FAIL',failure,secretValuesPrinted:false}))}
finally{
 for(const key of knownObjects){if(!key.startsWith(root)){cleanupFailures.push('unexpected-object-scope');continue}try{await del(key)}catch{cleanupFailures.push('private-test-object')}}
 for(const name of created.reverse()){if(!allowedSchema(name)){cleanupFailures.push('unexpected-schema-scope');continue}try{await raw.query('DROP SCHEMA "'+name+'" CASCADE')}catch{cleanupFailures.push('isolated-test-schema')}}
 if(cleanupFailures.length)process.exitCode=1;
 const report={date:new Date().toISOString(),status:failure||cleanupFailures.length?'FAIL':'PASS',scope:'Real existing DEVELOPMENT Neon database and private Blob store; two unique PostgreSQL schemas and object prefixes, not separate accounts/failure domains; synthetic data only',checks,failure,cleanupFailures,restoreMilliseconds,bundleAgeAtRestoreMilliseconds,inventory,createdSchemaCount:created.length,scratchSchemas:schemaNames,scratchBlobPrefix:root,productionTouched:false,productionRecoveryVerified:false,operations:{backupFrequency:'Not configured; drill snapshot was on demand',productionRetention:'Not configured/verified',expectedProductionDataLossWindow:'Unknown; no finite RPO claimed without scheduled verified backups',measuredRecoveryTime:'Synthetic measured duration above is not a production RTO guarantee'}};
 fs.writeFileSync(out+'/PROVIDER_RECOVERY.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,restoreMilliseconds,cleanupFailures}));
}
