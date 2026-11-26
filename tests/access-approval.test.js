import test from 'node:test';
import assert from 'node:assert/strict';
import { requireOwnerApproval, OwnerApprovalRequired } from '../lib/vercel/access-approval.mjs';
import { createApiHandler } from '../lib/api-handler.js';

test('production approval trusts only server-managed Clerk private metadata', () => {
  const production = { VERCEL_ENV: 'production' };
  for (const user of [null, {}, { privateMetadata: { monetaAccess: 'pending' } },
    { privateMetadata: { monetaAccess: 'revoked' } },
    { unsafeMetadata: { monetaAccess: 'approved' } },
    { publicMetadata: { monetaAccess: 'approved' } }]) {
    assert.throws(() => requireOwnerApproval(user, production), OwnerApprovalRequired);
  }
  assert.doesNotThrow(() => requireOwnerApproval({ privateMetadata: { monetaAccess: 'approved' } }, production));
  assert.throws(() => requireOwnerApproval({}, { VERCEL_ENV: 'production', MONETA_REQUIRE_APPROVAL: '0' }), OwnerApprovalRequired);
  assert.throws(() => requireOwnerApproval({}, { MONETA_REQUIRE_APPROVAL: '1' }), OwnerApprovalRequired);
  assert.doesNotThrow(() => requireOwnerApproval({}, { VERCEL_ENV: 'preview' }));
});

test('pending or revoked accounts cannot access any private API operation or session data', async () => {
  for (const status of ['pending', 'revoked']) {
    const handler = createApiHandler({
      env: {},
      resolveUser() {
        requireOwnerApproval({ privateMetadata: { monetaAccess: status } }, { VERCEL_ENV: 'production' });
        throw new Error('Unapproved identity must never reach storage');
      },
    });
    for (const [path, method] of [['session', 'GET'], ['workspace', 'GET'], ['workspace', 'PUT'],
      ['workspace', 'DELETE'], ['export', 'GET'], ['receipts/fictional', 'GET'], ['mona', 'POST']]) {
      const response = await handler(new Request('https://moneta.test/api/' + path, { method }));
      assert.equal(response.status, 403, method + ' ' + path);
      assert.match((await response.json()).error, /approval/);
    }
  }
});
