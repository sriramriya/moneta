import { redirect } from 'next/navigation';
import { getChatGPTUser } from '../chatgpt-auth';
import { isApprovalRequired } from '../../lib/vercel/access-approval.mjs';

export const dynamic = 'force-dynamic';

export default async function AccessPending() {
  let approved = false;
  let pending = false;
  try {
    approved = Boolean(await getChatGPTUser());
  } catch (error) {
    if (!isApprovalRequired(error)) throw error;
    pending = true;
  }

  if (approved) redirect('/workspace');
  if (!pending) redirect('/sign-in');

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f3f6ef' }}>
      <section style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 16, background: '#fff', color: '#243c38' }}>
        <a href="/home.html">MONETA</a>
        <h1>Waiting for approval</h1>
        <p>Your account has been created. The MONETA owner must approve access before you can open a personal workspace.</p>
        <p>You can check again after the owner approves your account.</p>
        <p><a href="/workspace">Check approval status</a></p>
        <p><a href="/signout-with-chatgpt">Sign out</a></p>
      </section>
    </main>
  );
}
