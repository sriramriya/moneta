// Explicit opt-in test of a protected preview using disposable Clerk development users.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { chromium } from 'playwright-core';
import { createClerkClient } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';
import { del } from '@vercel/blob';
import { postgresD1 } from '../lib/vercel/postgres.mjs';
import { deleteWorkspace, purgeReceipts } from '../lib/workspace-service.js';

if (process.env.MONETA_RUN_PROVIDER_TESTS !== '1' || !process.env.MONETA_PROVIDER_ENV_FILE) {
  throw Error('Explicit development-provider opt-in and environment file required.');
}
const configuration = parseEnv(fs.readFileSync(process.env.MONETA_PROVIDER_ENV_FILE, 'utf8'));
assert.ok(configuration.CLERK_SECRET_KEY?.startsWith('sk_test_'));
assert.ok(configuration.DATABASE_URL && configuration.BLOB_READ_WRITE_TOKEN && configuration.VERCEL_OIDC_TOKEN);
const root = process.env.MONETA_APPROVED_PREVIEW_URL;
assert.match(root || '', /^https:\/\/moneta-[a-z0-9-]+\.vercel\.app$/);
const clerk = createClerkClient({ secretKey: configuration.CLERK_SECRET_KEY });
const database = postgresD1(neon(configuration.DATABASE_URL, { fullResults: true }));
const users = [];
const checks = [];
const cleanupFailures = [];
let browser;
let failure;
let stage = 'launch';

async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch('/api/' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }, { path, method, body });
}

async function session() {
  const user = await clerk.users.createUser({
    emailAddress: ['moneta-approval-' + crypto.randomUUID() + '+clerk_test@example.com'],
    password: crypto.randomUUID() + 'aA1!',
  });
  users.push(user.id);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== root) return route.continue();
    return route.continue({ headers: { ...request.headers(), 'x-vercel-trusted-oidc-idp-token': configuration.VERCEL_OIDC_TOKEN } });
  });
  const page = await context.newPage();
  await page.goto(root + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Clerk?.loaded);
  const ticket = await clerk.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 120 });
  await page.evaluate(async ticket => {
    const attempt = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket });
    await window.Clerk.setActive({ session: attempt.createdSessionId });
  }, ticket.token);
  await page.goto(root + '/workspace', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Waiting for approval', exact: true }).waitFor();
  return { id: user.id, page };
}

try {
  browser = await chromium.launch({ headless: true });
  stage = 'pending users';
  const alice = await session();
  const bob = await session();
  for (const user of [alice, bob]) {
    for (const path of ['session', 'workspace', 'export', 'receipts/fictional']) {
      assert.equal((await api(user.page, path)).status, 403);
    }
  }
  await clerk.users.updateUserMetadata(alice.id, { unsafeMetadata: { monetaAccess: 'approved' } });
  assert.equal((await api(alice.page, 'workspace')).status, 403);
  checks.push('Two pending users reach the waiting page and cannot access private APIs; unsafe metadata cannot grant access.');

  stage = 'owner approval and saving';
  await clerk.users.updateUserMetadata(alice.id, { privateMetadata: { monetaAccess: 'approved' } });
  await alice.page.getByRole('link', { name: 'Check approval status', exact: true }).click();
  await alice.page.frameLocator('iframe').locator('.profile-setup').waitFor();
  const initial = await api(alice.page, 'workspace');
  assert.equal(initial.status, 200);
  const workspace = initial.body.workspace;
  workspace.profile = { name: 'Fictional approval Alice', country: 'US', locale: 'en-US', timeZone: 'UTC', dateFormat: 'locale', goal: 'saving' };
  workspace.accounts = [{ id: 'approval-bank', name: 'Fictional bank', kind: 'bank', opening: 10000000, currency: 'USD' }];
  const transaction = crypto.randomUUID();
  workspace.transactions = [{ id: transaction, name: 'Fictional approval expense', type: 'expense', account: 'approval-bank', amount: 120000, currency: 'USD', category: 'Uncategorized', date: new Date().toISOString().slice(0, 10) }];
  assert.equal((await api(alice.page, 'workspace', 'PUT', { workspace, revision: initial.body.revision })).status, 200);
  await alice.page.reload();
  await alice.page.frameLocator('iframe').locator('main h1').waitFor();
  assert.equal((await api(alice.page, 'workspace')).body.workspace.transactions[0].id, transaction);

  stage = 'receipt and account isolation';
  const bytes = Buffer.from('%PDF-1.4\nFictional\nOK');
  const upload = await api(alice.page, 'receipt-upload', 'POST', { transaction, filename: 'fictional.pdf', size: bytes.length });
  assert.equal(upload.status, 200);
  assert.equal((await api(alice.page, 'receipt-upload/' + upload.body.id, 'PUT', { part: 0, base64: bytes.toString('base64') })).status, 200);
  const receipt = await api(alice.page, 'receipt-upload/' + upload.body.id, 'POST', {});
  assert.equal(receipt.status, 200);
  const token = await alice.page.evaluate(() => window.Clerk.session.getToken());
  const download = await fetch(root + '/api/receipts/' + receipt.body.id, {
    redirect: 'manual',
    headers: { Authorization: 'Bearer ' + token, 'x-vercel-trusted-oidc-idp-token': configuration.VERCEL_OIDC_TOKEN },
  });
  assert.equal(download.status, 302);
  const location = new URL(download.headers.get('location'));
  assert.equal(location.protocol, 'https:');
  assert.match(location.hostname, /\.blob\.vercel-storage\.com$/);
  const file = await fetch(location, { redirect: 'error' });
  assert.equal(file.status, 200);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), bytes);
  const signedOut = await fetch(root + '/api/workspace', {
    redirect: 'manual', headers: { 'x-vercel-trusted-oidc-idp-token': configuration.VERCEL_OIDC_TOKEN },
  });
  assert.equal(signedOut.status, 401);
  await clerk.users.updateUserMetadata(bob.id, { privateMetadata: { monetaAccess: 'approved' } });
  assert.equal((await api(bob.page, 'workspace')).body.workspace.transactions.length, 0);
  assert.equal((await api(bob.page, 'export')).body.transactions.length, 0);
  assert.equal((await api(bob.page, 'receipts/' + receipt.body.id)).status, 404);
  checks.push('Owner approval enables saved records and receipts; another approved account cannot access the first account records, exports or receipt.');

  stage = 'revocation';
  await clerk.users.updateUserMetadata(alice.id, { privateMetadata: { monetaAccess: 'revoked' } });
  for (const path of ['workspace', 'export', 'receipts/' + receipt.body.id]) assert.equal((await api(alice.page, path)).status, 403);
  assert.equal((await api(alice.page, 'receipt-upload', 'POST', {})).status, 403);
  await alice.page.goto(root + '/workspace', { waitUntil: 'domcontentloaded' });
  await alice.page.getByRole('heading', { name: 'Waiting for approval', exact: true }).waitFor();
  checks.push('Revocation immediately denies backend access in the existing session and returns the workspace to the approval page.');
} catch (error) {
  let message = String(error.message || error.name);
  for (const value of Object.values(configuration)) {
    if (value.length >= 12) message = message.replaceAll(value, '[redacted]');
  }
  failure = { stage, name: error.name, message: message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 400) };
  process.exitCode = 1;
} finally {
  for (const id of users) {
    try {
      const owner = 'clerk:' + id;
      await deleteWorkspace(database, owner);
      assert.equal(await purgeReceipts(database, { delete: key => del(key, { token: configuration.BLOB_READ_WRITE_TOKEN }) }, owner), 0);
      await clerk.users.deleteUser(id);
    } catch {
      cleanupFailures.push('Synthetic owner ' + id);
    }
  }
  await browser?.close();
  const report = { date: new Date().toISOString(), status: failure || cleanupFailures.length ? 'FAIL' : 'PASS', previewUrl: root, checks, failure, cleanupFailures, productionTouched: false };
  fs.mkdirSync('outputs/release-followup', { recursive: true });
  fs.writeFileSync('outputs/release-followup/OWNER_APPROVAL.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (cleanupFailures.length) process.exitCode = 1;
}
