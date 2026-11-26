// Operator-only local maintenance. Never expose this command or its environment to browsers.
import fs from 'node:fs';import {neon} from '@neondatabase/serverless';import {del} from '@vercel/blob';import {postgresD1} from '../lib/vercel/postgres.mjs';import {cleanExpiredUploads} from '../lib/vercel/receipt-upload.mjs';
if(!process.env.VERCEL&&fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
for(const key of ['DATABASE_URL','NEON_PROJECT_ID','BLOB_READ_WRITE_TOKEN'])if(!process.env[key])throw Error('Missing operator configuration: '+key);
const result=await cleanExpiredUploads(postgresD1(neon(process.env.DATABASE_URL,{fullResults:true})),{delete:del});
console.log(JSON.stringify({processed:result.processed,note:'At most 25 expired intents per run; repeat for a backlog. No credential values or record details printed.'}));
