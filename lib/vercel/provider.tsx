import {ClerkProvider} from '@clerk/nextjs';import type {ReactNode} from 'react';
export function PlatformProvider({children}:{children:ReactNode}){return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace">{children}</ClerkProvider>}
