'use client';
import {useCallback,useEffect,useRef} from 'react';import {useAuth} from '@clerk/nextjs';
export function WorkspaceContent(){
  const frame=useRef<HTMLIFrameElement>(null),cleanup=useRef<(()=>void)|undefined>(undefined),{isLoaded,isSignedIn}=useAuth();
  useEffect(()=>{if(isLoaded&&!isSignedIn)window.location.replace('/sign-in')},[isLoaded,isSignedIn]);
  useEffect(()=>{if(frame.current)frame.current.src='/workspace-frame.html'+window.location.hash;return ()=>cleanup.current?.()},[]);
  useEffect(()=>{const viewport=window.visualViewport;const resize=()=>{if(frame.current)frame.current.style.height=(viewport?.height||window.innerHeight)+'px'};resize();viewport?.addEventListener('resize',resize);return ()=>viewport?.removeEventListener('resize',resize)},[]);
  const loaded=useCallback(()=>{cleanup.current?.();const child=frame.current?.contentWindow;if(!child)return;try{if(child.location.origin!==window.location.origin)return;const sync=()=>{try{window.history.replaceState(null,'','/workspace'+child.location.hash)}catch{/* Navigation left this origin. */}};for(const event of ['hashchange','popstate','moneta:navigate'])child.addEventListener(event,sync);cleanup.current=()=>{for(const event of ['hashchange','popstate','moneta:navigate'])child.removeEventListener(event,sync)}}catch{/* External navigation is handled by the parent. */}},[]);
  return <iframe ref={frame} title="MONETA financial workspace" onLoad={loaded} style={{display:'block',border:0,width:'100%',height:'100dvh'}}/>;
}
