import {getPlatformUser} from '@moneta/auth';
import {redirect} from 'next/navigation';
import {isApprovalRequired} from '../lib/vercel/access-approval.mjs';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
const SIGN_IN_PATH='/signin-with-chatgpt',SIGN_OUT_PATH='/signout-with-chatgpt',CALLBACK_PATH='/callback';
export async function getChatGPTUser():Promise<ChatGPTUser|null>{return getPlatformUser()}
export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  let user: ChatGPTUser | null = null;
  let pendingApproval = false;
  try {
    user = await getChatGPTUser();
  } catch (error) {
    if (!isApprovalRequired(error)) throw error;
    pendingApproval = true;
  }
  if (pendingApproval) redirect('/access-pending');
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}
