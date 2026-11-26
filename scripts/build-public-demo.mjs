import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const parent = 'outputs/public-demo';
mkdirSync(parent, { recursive: true });
const out = mkdtempSync(join(parent, 'site-'));
const assets = [
  'style.css', 'enhancements.css', 'financial-workspace.css', 'responsive.css', 'simple-workspace.css',
  'responsive.js', 'core.js', 'demo-finance.js', 'interface-rules.js', 'ledger.js',
  'imports.js', 'record-operations.js', 'ui-icons.js', 'workspace-features.js',
  'workspace-simple.js', 'mona-engine.js', 'xlsx.js', 'favicon.svg', 'third-party-notices.txt',
];
for (const name of assets) copyFileSync(join('public', name), join(out, name));

const html = readFileSync('public/workspace.html', 'utf8')
  .replace('<title>MONETA', '<title>MONETA Public Demo');
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'workspace.html'), html);
writeFileSync(join(out, 'home.html'), html);

writeFileSync(join(out, 'information.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>About the MONETA demo</title><link rel="stylesheet" href="/style.css">
<style>body{margin:0;padding:24px;background:#f3f6ef;color:#243c38}main{max-width:680px;margin:8vh auto;padding:clamp(20px,5vw,48px);background:white;border-radius:16px}h1{font-size:clamp(28px,5vw,42px)}p{line-height:1.7}a{color:#177568}section{margin:28px 0}.btn{display:inline-flex;min-height:44px;align-items:center;padding:12px 20px}</style></head>
<body><main><a href="/" aria-label="MONETA dashboard">MONETA</a>
<h1>Explore MONETA with sample data</h1>
<section id="demo"><p>This public demo starts with fictional transactions, budgets and goals. Changes stay in this browser on this device. Use fictional information while exploring.</p></section>
<section id="personal-workspace"><h2>Personal accounts</h2><p>Account sign-in and a personal cloud workspace are unavailable on this demo. You can explore the dashboard and add sample transactions without an account.</p></section>
<section id="privacy"><h2>Browser storage</h2><p>The demo stores its workspace in your browser's local storage. Clearing this site's browser data removes your changes. This demo has no connection to the application's authentication, financial database or receipt storage.</p></section>
<section id="terms"><h2>Demo availability</h2><p>This is a demonstration with fictional records. Cloud saving, receipt uploads and generative AI are unavailable here.</p></section>
<a class="btn primary" href="/">Return to the demo</a></main></body></html>`);

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
  .replace('<a href="/workspace">Open personal workspace</a>', '<a href="/information.html#demo">About this demo</a>')
  .replace('<a href="/workspace">Continue with ChatGPT</a>', '<a href="/information.html#personal-workspace">About personal accounts</a>')
  .replaceAll('moneta-demo-v2', 'moneta-public-demo-v1')
  .replaceAll('in this browser tab', 'in this browser')
  .replaceAll('saved in this tab', 'saved in this browser')
  .replaceAll('sample data in this tab', 'sample data in this browser')
  .replaceAll('sessionStorage', 'localStorage');
writeFileSync(join(out, 'workspace.js'), workspace);

writeFileSync(join(out, 'vercel.json'), JSON.stringify({
  framework: null,
  buildCommand: null,
  installCommand: null,
  redirects: [{ source: '/workspace', destination: '/information.html#personal-workspace', permanent: false },
    { source: '/signin-with-chatgpt', destination: '/information.html#personal-workspace', permanent: false },
    { source: '/sign-in', destination: '/information.html#personal-workspace', permanent: false }],
  headers: [{ source: '/(.*)', headers: [{
    key: 'Content-Security-Policy',
    value: "connect-src 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  }] }],
}, null, 2));
console.log(out);
