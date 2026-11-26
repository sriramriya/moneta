// Production builds validate schema without changing database contents or DDL.
import fs from 'node:fs';import {neon} from '@neondatabase/serverless';import {checkSchema} from '../lib/vercel/migrations.mjs';
if(!process.env.DATABASE_URL)throw Error('Production database configuration required.');await checkSchema(neon(process.env.DATABASE_URL),fs.readFileSync('drizzle-vercel/0000_workspace.sql','utf8'));console.log('MONETA database schema verified read-only.');
