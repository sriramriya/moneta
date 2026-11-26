import fs from 'node:fs';
const inventory=JSON.parse(fs.readFileSync('audit/dependency-licenses.json','utf8')),groups=new Map();
for(const item of inventory.packages)for(const evidence of item.evidence){const names=groups.get(evidence.file)||new Set();names.add(item.name+'@'+item.version);groups.set(evidence.file,names)}
for(const file of ['scripts/vite/sites-vite-plugin.LICENSE','vendor/shadcn-tailwind-4.13.0.LICENSE.md'])if(fs.existsSync(file))groups.set(file,new Set([file]));
const chunks=[Buffer.from('MONETA — third-party license texts captured for review\n\nPrivate team testing build. These notices do not grant application redistribution rights or settle metadata-only and mixed-license obligations. See LICENSE_AUDIT.md.\n')];
for(const [file,names]of [...groups].sort(([a],[b])=>a.localeCompare(b)))chunks.push(Buffer.from('\n===== '+file+' =====\nApplies to captured components: '+[...names].sort().join(', ')+'\n\n'),fs.readFileSync(file),Buffer.from('\n'));
fs.writeFileSync('public/third-party-notices.txt',Buffer.concat(chunks));console.log('Published notice collection refreshed from '+groups.size+' exact local evidence files; source bytes retained.');
