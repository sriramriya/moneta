# Owner-approved MONETA access

MONETA's Clerk production path now requires owner approval for every verified account. New users create a MONETA account with an email address and the sign-in methods enabled in Clerk. They reach `/access-pending` until you approve them. Use an application password when password sign-in is enabled. Gmail addresses are supported as email identifiers.

## Approve or revoke an account

Open the [Clerk dashboard](https://dashboard.clerk.com/), choose the MONETA application and the correct instance, then open **Users**. Select the user after checking their verified email address. In **Metadata**, edit **Private metadata** and merge this property while preserving any existing values:

```json
{
  "monetaAccess": "approved"
}
```

Save, then ask the user to click **Check approval status**. Approve your own account through the same dashboard before trying to use the workspace. Setting `monetaAccess` to `revoked`, or removing it, prevents further private API access and returns the workspace to the waiting page. Existing saved records remain in place. Approvals must be entered in private metadata. Client-editable metadata and caller-supplied email/owner fields cannot grant access.

You review new accounts in the Clerk **Users** list. Automatic owner email notifications are unconfigured. The waiting page does not promise an email or a review time. Anonymous visitors may reach the landing and sign-in pages once public hosting is configured. Only approved accounts can reach private records, exports, receipt operations and Mona's saved-record search.

## Deployment configuration

Approval is always required when `VERCEL_ENV=production`. To exercise the same behavior on a protected preview, set the server-side variable `MONETA_REQUIRE_APPROVAL=1` for that candidate. Existing protected previews without this variable retain their prior development behavior. This variable contains no secret.

Production still requires the owned domain and the same production Clerk instance's `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Configure these in **Vercel → project → Settings → Environment Variables → Production**. `DATABASE_URL`, `NEON_PROJECT_ID` and `BLOB_READ_WRITE_TOKEN` must refer to the intended production database and private store. The current production database and store were provisioned in `sriram-b8a2/moneta-rbqa`. Production Clerk and an owned hostname are still missing from the verified configuration.

The public browser-local demo remains at its separate project. Its data cannot be converted into account access by changing a link. [Clerk production deployment requirements](https://clerk.com/docs/guides/development/deployment/vercel).

## Verification

On November 26, 2026, all 98 automated tests passed. The [protected approval preview](https://moneta-rbqa-r82gorbot-sriram-b8a2.vercel.app) built successfully and passed the two-account provider test for pending access, approval, saved transactions, exact receipt download bytes, account separation, anonymous API denial and revocation. Test cleanup reported no failures. This preview uses development identities and retains Vercel infrastructure protection.

`npm test` checks that missing, pending, revoked, public-metadata and client-editable approvals are rejected and that a production override cannot disable approval. The shared API checks cover session, workspace read/write/delete, exports, attachments and Mona.

`scripts/approval-provider-verify.mjs` is an opt-in protected-preview test using two disposable Clerk development accounts. Set `MONETA_RUN_PROVIDER_TESTS=1`, `MONETA_PROVIDER_ENV_FILE` to an ignored file containing the preview's provider configuration and short-lived Vercel OIDC token, and `MONETA_APPROVED_PREVIEW_URL` to the exact candidate URL. It tests pending access, owner approval, saving, private receipts, account separation and revocation, then removes its own synthetic fixtures. Inspect `outputs/release-followup/OWNER_APPROVAL.json` for results and cleanup status. Production sign-in and real email delivery require separate verification after production configuration.
