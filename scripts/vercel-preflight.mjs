import fs from 'node:fs';
const required=['lib/vercel/auth.ts','lib/vercel/environment.ts','lib/vercel/postgres.mjs','lib/vercel/route.ts','tsconfig.vercel.json','scripts/build-vercel.mjs','.vercelignore'];
const missing=required.filter(p=>!fs.existsSync(p));
const report={status:missing.length?'BLOCKED':'REQUIRES LIVE VERIFICATION',missing,target:'Native Next.js with explicit Vercel aliases; original Cloudflare build retained',checks:{projectLinked:fs.existsSync('.vercel/project.json'),envTemplatePresent:fs.existsSync('.env.example')},limitations:'Static file check only; does not authenticate, deploy, migrate or verify live sessions. See VERCEL_DEPLOYMENT.md and the live verification report.'};
fs.mkdirSync('outputs/vercel-preparation',{recursive:true});fs.writeFileSync('outputs/vercel-preparation/preflight.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(missing.length)process.exitCode=1;
