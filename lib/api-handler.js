import {loadWorkspace,putWorkspace,deleteWorkspace,purgeReceipts,processScheduleRun,ServiceError} from './workspace-service.js';
import {rateLimit,verifyMutation} from './security.js';
import {receiptRequest} from './receipt-service.js';
import {json,errorResponse,limitedJSON,privateHeaders,verifyOrigin} from './http.js';
import {monaAnswer} from './mona.js';
import {csv,validDate} from '../public/core.js';
import {workbook} from '../public/xlsx.js';
// Identity is injected by a trusted server adapter. Never resolve it from body,
// query parameters, or caller-supplied bearer strings in the deployed app.
export function createApiHandler({resolveUser,env}){if(typeof resolveUser!=='function')throw Error('A trusted identity resolver is required.');return async function handle(request){try{
 const user=await resolveUser(request),url=new URL(request.url),path=url.pathname;
 if(path==='/api/session'&&request.method==='GET')return json({user:user?{id:user.userId,name:user.displayName,email:user.email}:null,aiAvailable:false,exchangeRatesAvailable:false,authProvider:env.AUTH_PROVIDER||'chatgpt',receiptChunkBytes:env.RECEIPT_CHUNK_BYTES||0});
 if(!user?.userId||!user.email)throw new ServiceError(401,'Sign in to access personal records.');if(!env.DB)throw new ServiceError(503,'Storage unavailable.');const owner=user.userId;
 if(request.method!=='GET')verifyOrigin(request);if(!path.startsWith('/api/receipts'))verifyMutation(request);await rateLimit(env.DB,owner);
 if(/^\/api\/receipts(?:\/[^/]+)?$/.test(path))return await receiptRequest(request,env.DB,env.BUCKET,owner);
 if(path==='/api/workspace'&&request.method==='GET')return json(await loadWorkspace(env.DB,owner));
 if(path==='/api/workspace'&&request.method==='DELETE'){await deleteWorkspace(env.DB,owner);const receiptsPending=await purgeReceipts(env.DB,env.BUCKET,owner);return json({deleted:true,receiptsPending,status:receiptsPending?'pending':'complete'},receiptsPending?202:200);}
 if(path==='/api/export'&&request.method==='GET'){const {workspace}=await loadWorkspace(env.DB,owner),format=url.searchParams.get('format')||'json';if(format==='json')return new Response(JSON.stringify(workspace),{headers:{...privateHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="moneta-backup.json"'}});const start=url.searchParams.get('start')||'0001-01-01',end=url.searchParams.get('end')||'9999-12-31';if(!validDate(start)||!validDate(end)||start>end)throw new ServiceError(400,'Valid export dates required.');if(format==='csv')return new Response(csv(workspace.transactions.filter(t=>t.date>=start&&t.date<=end)),{headers:{...privateHeaders,'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="moneta-transactions.csv"'}});if(format==='xlsx')return new Response(workbook(workspace,start,end),{headers:{...privateHeaders,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="moneta-report.xlsx"'}});throw new ServiceError(400,'Choose JSON, CSV or XLSX.');}
 const body=await limitedJSON(request);
 if(path==='/api/receipt-purge'&&request.method==='POST'){const receiptsPending=await purgeReceipts(env.DB,env.BUCKET,owner);return json({receiptsPending},receiptsPending?202:200);}
 if(path==='/api/workspace'&&request.method==='PUT'){const result=await putWorkspace(env.DB,owner,body);if(result.receiptsQueued)result.pendingReceiptPurge=await purgeReceipts(env.DB,env.BUCKET,owner);return json(result);}
 if(path==='/api/schedule-run'&&request.method==='POST')return json(await processScheduleRun(env.DB,owner,body));
 if(path==='/api/mona'&&request.method==='POST'){if(typeof body.question!=='string'||!body.question.trim()||body.question.length>500)throw new ServiceError(400,'Question must be 1–500 characters.');const {workspace}=await loadWorkspace(env.DB,owner);if(workspace.aiAccess===false)throw new ServiceError(403,'Mona access is turned off in Settings.');return json(monaAnswer(workspace,body.question));}
 if(path==='/api/feedback'&&request.method==='POST'){if(typeof body.message!=='string'||body.message.trim().length<5||body.message.length>1500)throw new ServiceError(400,'Feedback must be 5–1500 characters.');const current=await loadWorkspace(env.DB,owner);if(!current.revision)throw new ServiceError(409,'Save a workspace before sending feedback.');const saved=await env.DB.prepare(`INSERT INTO feedback (id, owner, message, created_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM workspaces WHERE owner = ? AND COALESCE(json_extract(document, '$.generation'), 'legacy:' || revision || ':' || updated_at) = ?)`).bind(crypto.randomUUID(),owner,body.message.trim(),new Date().toISOString(),owner,current.workspace.generation).run();if(!saved.meta.changes)throw new ServiceError(409,'Workspace changed. Reload before sending feedback.');return json({saved:true});}
 return json({error:'Not found'},404);
 }catch(e){return errorResponse(e)}}}
