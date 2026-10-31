// First-party, HttpOnly persistence for the existing opaque service sessions.
const SERVICE='https://curly-sun-ef0f.kassandraraudman.workers.dev';
const ORIGINS=new Set(['https://meyer.ilymmd.com','https://themeyers.ilymmd.com']);
const COOKIE='__Host-MeyersSession';
const TOKEN=/^[a-f0-9-]{72}$/;
const cookie=(value,age)=>`${COOKIE}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
export async function handleSession(request,fetcher=fetch){
 const url=new URL(request.url);
 const origin=url.origin;
 if(!ORIGINS.has(origin)||!url.pathname.startsWith('/session/'))return null;
 const path=url.pathname.slice('/session'.length);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!['/auth/session','/auth/logout'].includes(path)||url.search)return Response.json({error:'Not found.'},{status:404,headers});
 if(request.method!=='POST')return Response.json({error:'Method not allowed.'},{status:405,headers:{...headers,Allow:'POST'}});
 if(request.headers.get('Origin')!==origin||!['same-origin',null].includes(request.headers.get('Sec-Fetch-Site')))return Response.json({error:'Request origin not allowed.'},{status:403,headers});
 const bearer=request.headers.get('Authorization');
 const stored=request.headers.get('Cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 const forwarded=new Headers({'Content-Type':'application/json',Origin:origin});
 if(bearer?.match(/^Bearer [a-f0-9-]{72}$/))forwarded.set('Authorization',bearer);
 else if(stored&&TOKEN.test(stored))forwarded.set('Authorization','Bearer '+stored);
 try{
  const upstream=await fetcher(SERVICE+path,{method:'POST',headers:forwarded,body:request.body,duplex:'half',redirect:'manual'});
  if(upstream.status>=300&&upstream.status<400)throw new Error('Upstream redirect rejected.');
  if(path==='/auth/logout')return new Response(null,{status:upstream.ok?204:upstream.status,headers:{...headers,'Set-Cookie':cookie('',0)}});
  const result=await upstream.json();
  if(upstream.ok&&TOKEN.test(result.token||'')&&Number.isFinite(result.expires)&&result.expires>Date.now())headers['Set-Cookie']=cookie(result.token,Math.floor((result.expires-Date.now())/1000));
  else if(upstream.status===401)headers['Set-Cookie']=cookie('',0);
  return Response.json(result,{status:upstream.status,headers});
 }catch{
  if(path==='/auth/logout')headers['Set-Cookie']=cookie('',0);
  return Response.json({error:'The sign-in service is temporarily unavailable.'},{status:503,headers});
 }
}
