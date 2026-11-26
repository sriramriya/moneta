// Explicit operator command; no automatic schedule, production binding or credentials are embedded.
import fs from 'node:fs';import {neon} from '@neondatabase/serverless';import {del} from '@vercel/blob';import {postgresD1} from '../lib/vercel/postgres.mjs';import {expireRecovery} from '../lib/recovery-retention.js';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const apply=process.argv.includes('--apply');if(apply&&!process.argv.includes('--confirm-retention-target'))throw Error('Review the target and backups, then supply --confirm-retention-target to apply deletion.');
if(!process.env.DATABASE_URL||!process.env.NEON_PROJECT_ID||!process.env.BLOB_READ_WRITE_TOKEN)throw Error('Operator database/project/private-store configuration required.');
const db=postgresD1(neon(process.env.DATABASE_URL,{fullResults:true}));let after='',totals={dryRun:!apply,scanned:0,eligible:0,applied:0,conflicts:0,pendingFiles:0};do{const result=await expireRecovery(db,{delete:del},{after,dryRun:!apply});for(const key of ['scanned','eligible','applied','conflicts','pendingFiles'])totals[key]+=result[key];after=result.nextCursor}while(after);console.log(JSON.stringify(totals));
