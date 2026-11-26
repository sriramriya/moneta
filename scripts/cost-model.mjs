import fs from 'node:fs';
const scenarios=[10,100,1000].map(users=>{const requests=users*1000,cpuMs=requests*50,reads=users*2600,writes=users*1320,dbGB=users*.0001,r2GB=users*.013,classA=users*50,classB=users*60;const workers=5+Math.max(0,requests-1e7)/1e6*.3+Math.max(0,cpuMs-3e7)/1e6*.02;const d1=Math.max(0,reads-25e9)/1e6*.001+Math.max(0,writes-5e7)/1e6+Math.max(0,dbGB-5)*.75;const r2=Math.max(0,r2GB-10)*.015+Math.max(0,classA-1e6)/1e6*4.5+Math.max(0,classB-1e7)/1e6*.36;const gross=5+requests/1e6*.3+cpuMs/1e6*.02+reads/1e6*.001+writes/1e6+dbGB*.75+r2GB*.015+classA/1e6*4.5+classB/1e6*.36;return {users,requests,cpuMs,reads,writes,dbGB,r2GB,classA,classB,workers,d1,r2,infrastructure:workers+d1+r2,grossBeforeAllowances:gross,optionalAI:users*.075,optionalMonitoring:users===10?5:users===100?15:50,laborHours:users===10?4:users===100?8:20}});
fs.mkdirSync('audit',{recursive:true});fs.writeFileSync('audit/cost-scenarios.json',JSON.stringify({currency:'USD',date:'2026-11-02',scenarios},null,2));
const dollars=n=>'$'+n.toFixed(2),row=(name,f)=>'| '+name+' | '+scenarios.map(f).join(' | ')+' |';
fs.writeFileSync('COST_ESTIMATE.md',`# Monthly operating cost estimate

2026-11-02, USD, indicative usage model. Actual Sites hosting charges, resale entitlement and billing arrangements are unknown: Cloudflare reference prices below are not a quote for the existing hosted site. No billing integration or external AI is enabled. No free allowance is guaranteed permanent capacity. Taxes, domain, currency conversion, support software and provider rounding are excluded.

## Workload assumptions (unmeasured inputs)

Per active user/month: 1,000 dynamic requests averaging 50 CPU ms; 2,600 indexed D1 rows read and 1,320 rows written; 0.1 MB document storage; 20 receipt uploads at 0.5 MB; reserve another 3 MB for 30 daily document backups, totaling 13 MB R2. Backup jobs are not configured: this is a cost reservation, not an implemented recovery service. 50 R2 Class A and 60 Class B operations per user/month. Units use decimal GB for estimation; actual byte accounting, indexes, full-document writes, version growth, snapshot/history size and query plans can differ. Static asset requests use Workers free static delivery under this model. These are assumptions, not measured capacity or reliability claims.

## Reference rates

Workers paid base $5/month includes 10M requests and 30M CPU ms, with overage $0.30/M requests and $0.02/M CPU ms. [Official Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

D1 paid includes 25 billion rows read, 50M rows written and 5 GB; overages $0.001/M reads, $1/M writes and $0.75/GB-month. Dedicated D1 pricing is used if another summary page differs. [Official D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

R2 Standard $0.015/GB-month, $4.50/M Class A and $0.36/M Class B, egress $0; current monthly allowances are 10 GB, 1M Class A and 10M Class B. [Official R2 pricing](https://developers.cloudflare.com/r2/pricing/).

| Monthly item | 10 active | 100 active | 1,000 active |
|---|---:|---:|---:|
${row('Dynamic requests',s=>s.requests.toLocaleString('en-US'))}
${row('CPU ms',s=>s.cpuMs.toLocaleString('en-US'))}
${row('D1 reads / writes',s=>s.reads+' / '+s.writes)}
${row('D1 GB',s=>s.dbGB.toFixed(3))}
${row('R2 GB incl. backup reservation',s=>s.r2GB.toFixed(2))}
${row('Workers',s=>dollars(s.workers))}
${row('D1 incremental',s=>dollars(s.d1))}
${row('R2 incremental',s=>dollars(s.r2))}
${row('Infrastructure total',s=>dollars(s.infrastructure))}
${row('Infrastructure per active user',s=>dollars(s.infrastructure/s.users))}
${row('Sensitivity: all usage metered before allowances + base',s=>dollars(s.grossBeforeAllowances))}
${row('Optional AI add-on (currently disabled)',s=>dollars(s.optionalAI))}
${row('Optional monitoring budget input (unverified)',s=>dollars(s.optionalMonitoring))}
${row('Maintenance labor hours input',s=>s.laborHours)}
${row('Labor at assumed $50/hour',s=>dollars(s.laborHours*50))}

Formula: base + max(usage − included allowance, 0) × overage rate for each resource. Reproduce numbers with node scripts/cost-model.mjs; exact intermediate values are in audit/cost-scenarios.json. Separate labor from infrastructure; the low hosted-resource estimate does not fund support, compliance, incidents or engineering. The no-allowance sensitivity is illustrative, not a separate provider plan.

## Optional AI calculation

Hypothetical GPT-5.4 mini standard rate: $0.75/M input tokens and $4.50/M output tokens. [Official model pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini). Assume 20 requests/user/month × 2,000 input and 500 billed output tokens = 40,000 input and 10,000 output tokens/user. Cost/user = 0.04 × $0.75 + 0.01 × $4.50 = **$0.075/month**; totals $0.75 / $7.50 / $75.00. No cache discount assumed. Retries, reasoning output, growing context, tools, regional premiums and taxes can add cost. This is a planning example, not a configured model or a guarantee. Current rule-based Mona has zero external-model token usage.

## Other services and commercial inputs

Email/SMS/push, exchange rates, market data, payment processing and third-party monitoring are not configured, so current integration usage is zero; enabling them requires provider selection and verified pricing. Dashboard reminders consume normal app usage. Monitoring budgets above ($5/$15/$50) are unverified planning allowances, not vendor prices. Maintenance inputs (4/8/20 hours at $50) are owner-adjustable assumptions, not quotes.

Payment fees cannot be estimated as zero for a future paid launch: plan price, volume, country, processor, taxes, disputes and refund policy are missing. Model future fees as gross paid revenue × processor percentage + successful charges × fixed fee + disputes/refunds/FX charges. Replace with an official quote after the owner chooses those inputs. No margin or viable subscription price is asserted. Verify actual bills and benchmark database/CPU usage in staging before making customer commitments.
`);
