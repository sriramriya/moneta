import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const parent = 'outputs/public-demo';
mkdirSync(parent, { recursive: true });
const out = mkdtempSync(join(parent, 'site-'));
const assets = [
  'style.css', 'enhancements.css', 'financial-workspace.css', 'responsive.css', 'simple-workspace.css',
  'responsive.js', 'core.js', 'demo-finance.js', 'interface-rules.js', 'ledger.js',
  'imports.js', 'record-operations.js', 'ui-icons.js', 'workspace-features.js',
  'workspace-simple.js', 'xlsx.js', 'favicon.svg', 'third-party-notices.txt',
];
for (const name of assets) copyFileSync(join('public', name), join(out, name));

const html = readFileSync('public/workspace.html', 'utf8')
  .replace('<title>MONETA', '<title>MONETA Public Demo');
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'workspace.html'), html);

const source = readFileSync('public/workspace.js', 'utf8');
const demoSwitch = "const demo=new URLSearchParams(location.search).get('demo')==='1';";
const apiStart = source.indexOf('async function api(');
const commitStart = source.indexOf('async function commit(', apiStart);
if (!source.includes(demoSwitch) || apiStart < 0 || commitStart <= apiStart) {
  throw new Error('Review demo isolation after changing the workspace entry point.');
}
const workspace = (source.slice(0, apiStart)
  + "async function api(){throw Error('This public demo only uses local sample data.');}\n"
  + source.slice(commitStart))
  .replace(demoSwitch, 'const demo=true;')
  .replaceAll('moneta-demo-v2', 'moneta-public-demo-v1')
  .replaceAll('sessionStorage', 'localStorage');
writeFileSync(join(out, 'workspace.js'), workspace);

writeFileSync(join(out, 'vercel.json'), JSON.stringify({
  framework: null,
  buildCommand: null,
  installCommand: null,
  headers: [{ source: '/(.*)', headers: [{
    key: 'Content-Security-Policy',
    value: "connect-src 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  }] }],
}, null, 2));
console.log(out);
