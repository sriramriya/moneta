import {loadWorkspace,putWorkspace,purgeReceipts} from './workspace-service.js';
import {recoveryExpiry} from '../public/record-operations.js';
// Operator-only, bounded, cursor-based retention. No scheduled caller is configured by this module.
export async function expireRecovery(db,bucket,{after='',limit=25,dryRun=true,now=new Date().toISOString()}={}){
 if(typeof after!=='string'||after.length>250||!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid retention cursor or batch limit.');
 const rows=await db.prepare('SELECT owner FROM workspaces WHERE owner > ? ORDER BY owner LIMIT ?').bind(after,limit).all();let eligible=0,applied=0,conflicts=0,pendingFiles=0;
 for(const {owner}of rows.results){const current=await loadWorkspace(db,owner),expired=current.workspace.trash.filter(r=>Date.parse(recoveryExpiry(r))<=Date.parse(now));eligible+=expired.length;if(!expired.length||dryRun)continue;const ids=new Set(expired.map(r=>r.id));current.workspace.trash=current.workspace.trash.filter(r=>!ids.has(r.id));try{await putWorkspace(db,owner,current);applied+=expired.length;pendingFiles+=await purgeReceipts(db,bucket,owner)}catch(e){if(e.status===409)conflicts++;else throw e}}
 return {dryRun,scanned:rows.results.length,eligible,applied,conflicts,pendingFiles,nextCursor:rows.results.length===limit?rows.results.at(-1).owner:null};
}
