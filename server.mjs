import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const port=Number(process.env.PORT)||4175;
http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const p=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;fs.readFile(p,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript','css':'text/css','json':'application/json','png':'image/png'})[path.extname(p).slice(1)]||'application/octet-stream');res.end(data);});}).listen(port,'127.0.0.1',()=>console.log('Ashen Road: http://localhost:'+port));
