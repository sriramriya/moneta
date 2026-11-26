import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname); const file=path.resolve('public','.'+(name==='/'?'/home.html':name));if(!file.startsWith(path.resolve('public')+path.sep))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css'})[file.split('.').pop()]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end('Not found')}}).listen(5173,'127.0.0.1',()=>console.log('MONETA static demo only (no APIs): http://127.0.0.1:5173'));

