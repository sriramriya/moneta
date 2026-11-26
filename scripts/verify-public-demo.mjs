import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const url = new URL(process.argv[2]);
assert.equal(url.protocol, 'https:');
assert.match(url.hostname, /^moneta-public-demo(?:-[a-z0-9-]+)?\.vercel\.app$/);
const browser = await chromium.launch();
try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await mobile.newPage();
  const errors = [];
  const network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => network.push(request.url()));
  const response = await page.goto(url.href);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['content-security-policy'], /connect-src 'none'/);
  await page.locator('main h1').waitFor();
  assert.equal(new URL(page.url()).origin, url.origin);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.locator('.bottom-nav').getByRole('button', { name: 'Add', exact: true }).tap();
  await page.locator('.add-menu').getByRole('button', { name: 'Expense', exact: true }).tap();
  const name = 'Fictional demo verification expense';
  await page.locator('#form [name=name]').fill(name);
  await page.locator('#form [name=amount]').fill('12.50');
  await page.locator('#form button[type=submit]').tap();
  await page.locator('dialog[open]').waitFor({ state: 'hidden' });
  await page.reload();
  await page.locator('main h1').waitFor();
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('moneta-public-demo-v1')));
  assert.ok(local.transactions.some(transaction => transaction.name === name));
  assert.ok(local.budgets.length && local.goals.length);
  await page.locator('.bottom-nav').getByRole('button', { name: 'Transactions', exact: true }).tap();
  await page.getByText(name, { exact: true }).first().waitFor();
  await page.getByRole('link', { name: 'About this demo', exact: true }).click();
  await page.getByRole('heading', { name: 'Explore MONETA with sample data' }).waitFor();
  await page.getByRole('link', { name: 'Return to the demo', exact: true }).click();
  await page.locator('main h1').waitFor();
  const legacy = await page.goto(new URL('/workspace', url).href);
  assert.equal(legacy.status(), 200);
  await page.getByRole('heading', { name: 'Personal accounts', exact: true }).waitFor();
  assert.equal((await page.goto(new URL('/home.html', url).href)).status(), 200);
  await page.locator('main h1').waitFor();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const clean = await desktop.newPage();
  assert.equal((await clean.goto(url.href)).status(), 200);
  await clean.locator('main h1').waitFor();
  assert.equal(await clean.evaluate(() => localStorage.getItem('moneta-public-demo-v1')), null);
  assert.deepEqual(errors, []);
  assert.ok(network.every(request => {
    const destination = new URL(request);
    return destination.origin === url.origin && !destination.pathname.startsWith('/api/');
  }));
  console.log('PASS: signed-out mobile and desktop, sample add and reload, About this demo, legacy workspace and home links, separate browser data, no API calls.');
} finally {
  await browser.close();
}
