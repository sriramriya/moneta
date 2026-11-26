'use client';
import {useAuth,useClerk} from '@clerk/nextjs';import {useState} from 'react';
export default function SignOutPage(){const {signOut}=useClerk(),{isLoaded}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState('');return <main className="auth-shell"><div><h1>Sign out of MONETA</h1><button disabled={!isLoaded||busy} onClick={async()=>{setBusy(true);setError('');try{await signOut({redirectUrl:'/home.html'})}catch{setError('Sign-out could not be completed. Please retry.');setBusy(false)}}}>Confirm sign out</button>{error?<p role="alert">{error}</p>:null}</div></main>}
