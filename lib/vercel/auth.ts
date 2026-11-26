import {auth,currentUser} from '@clerk/nextjs/server';
export const platformAuth='clerk';
export async function getPlatformUser(){const session=await auth();if(!session.userId)return null;const user=await currentUser(),email=user?.primaryEmailAddress;if(!user||!email||email.verification?.status!=='verified')return null;return {userId:'clerk:'+user.id,displayName:user.fullName||user.username||email.emailAddress,email:email.emailAddress,fullName:user.fullName}}
