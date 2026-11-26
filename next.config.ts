import type {NextConfig} from 'next';import path from 'node:path';
const vercel=process.env.MONETA_PLATFORM==='vercel'||process.env.VERCEL==='1';
const nextConfig:NextConfig={
  ...(vercel?{typescript:{tsconfigPath:'tsconfig.vercel.json'},async rewrites(){return {beforeFiles:[{source:'/home.html',destination:'/vercel-home.html'},{source:'/workspace.html',missing:[{type:'query',key:'demo',value:'1'}],destination:'/workspace'},{source:'/information.html',destination:'/vercel-information.html'}]}}}:{}),
  webpack(config){if(vercel){config.resolve.alias={...config.resolve.alias,'@moneta/auth$':path.resolve('lib/vercel/auth.ts'),'@moneta/environment$':path.resolve('lib/vercel/environment.ts'),'@moneta/provider$':path.resolve('lib/vercel/provider.tsx'),'@moneta/middleware$':path.resolve('lib/vercel/middleware.ts'),'@moneta/workspace$':path.resolve('lib/vercel/WorkspaceFrame.tsx')}}return config},
};
export default nextConfig;
