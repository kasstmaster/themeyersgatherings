import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';
import {handleSession} from '../domain-site-worker/session.js';
import {bucket,TEST_PASSWORD} from './security-fixture.js';
import {digest} from '../github-state-worker/auth.js';
const origin='https://meyer.ilymmd.com';
async function fixture(t){
 const memory=bucket(),env={HOST_PASSWORD:TEST_PASSWORD,AUTH_MIGRATION_READY:'verified-backup-v1',INVITATION_BACKGROUNDS:memory,GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'synthetic',ALLOWED_ORIGIN:origin};
 const state={accounts:[{name:'Casey Example',qrToken:'printed-qr',selectedEvents:{one:true},invitedEvents:{one:true}}],events:{one:{eventDate:'2099-01-01',items:[],rsvps:[],hostNotes:'Host private notes'}},invitationTemplates:[],gatheringHistory:{},gatheringHome:{}};
 const before=JSON.stringify(state),previous=globalThis.fetch;let stateReads=0;
 t.after(()=>globalThis.fetch=previous);
 globalThis.fetch=async(url,options={})=>{assert.match(String(url),/^https:\/\/api.github.com\/repos\/test\/private\/contents\//);assert.ok(!options.method||options.method==='GET','session tests must never write gathering data');stateReads++;return Response.json({sha:'one',content:Buffer.from(JSON.stringify(state)).toString('base64')});};
 const backend=(url,options)=>worker.fetch(new Request(url,options),env);
 const request=async(action,body={},cookie='',extra={})=>{
  if(action==='login'){const signed=await backend('https://service.test/auth/login',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});const session=await signed.clone().json();if(!signed.ok||!session.token)return signed;return request('session',{},'',{Authorization:'Bearer '+session.token});}
  return handleSession(new Request(origin+'/session/auth/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:JSON.stringify(body)}),backend);
 };
 return {request,backend,env,memory,state,before,get reads(){return stateReads;}};
}
test('first-party cookies restore scoped guests, keep printed QR access, and revoke on logout',async t=>{
 const f=await fixture(t),login=await f.request('login',{role:'guest',name:'Casey Example',qrToken:'printed-qr'}),first=await login.json();
 assert.equal(login.status,200);const cookie=login.headers.get('Set-Cookie');assert.match(cookie,/^__Host-MeyersSession=/);assert.match(cookie,/Path=\//);assert.match(cookie,/Secure; HttpOnly; SameSite=Strict/);assert.doesNotMatch(cookie,/Domain=/);assert.equal(login.headers.get('Cache-Control'),'no-store');
 assert.ok(first.expires-Date.now()>29*24*60*60*1000);const pair=cookie.split(';')[0];
 const restored=await f.request('session',{qrToken:'printed-qr'},pair),session=await restored.json();assert.equal(restored.status,200);assert.equal(session.person,'Casey Example');assert.equal(session.role,'guest');assert.equal(session.token,first.token);assert.equal(session.expires,first.expires,'resuming cannot extend session expiration');assert.ok(!JSON.stringify(session.state).includes('Host private notes'));
 assert.equal((await f.request('session',{qrToken:'different-printed-qr'},pair)).status,401);
 assert.equal((await f.request('logout',{},pair)).status,204);assert.equal((await f.request('session',{},pair)).status,401);assert.equal(JSON.stringify(f.state),f.before);
});
test('host lifetime remains eight hours and password replacement invalidates persistence',async t=>{
 const f=await fixture(t),login=await f.request('login',{role:'first-name',password:TEST_PASSWORD}),session=await login.json();const cookie=login.headers.get('Set-Cookie').split(';')[0];
 assert.equal(session.role,'host');assert.ok(session.expires-Date.now()<=8*60*60*1000);assert.ok(session.expires-Date.now()>7.9*60*60*1000);
 assert.equal((await f.request('session',{},cookie)).status,200);
 f.env.HOST_PASSWORD=TEST_PASSWORD+'changed';assert.equal((await f.request('session',{},cookie)).status,401);
});
test('expired and removed-account sessions cannot restore, and anonymous probes never read state',async t=>{
 const f=await fixture(t);assert.equal((await f.request('session')).status,401);assert.equal(f.reads,0);
 let login=await f.request('login',{role:'guest',name:'Casey Example'}),session=await login.json(),cookie=login.headers.get('Set-Cookie').split(';')[0];
 const key='security-v1/sessions/'+await digest(session.token),record=f.memory.objects.get(key);record.body=JSON.stringify({...JSON.parse(record.body),expires:Date.now()-1});
 assert.equal((await f.request('session',{},cookie)).status,401);
 login=await f.request('login',{role:'guest',name:'Casey Example'});cookie=login.headers.get('Set-Cookie').split(';')[0];f.state.accounts=[];assert.equal((await f.request('session',{},cookie)).status,401);
});
test('the cookie bridge rejects CSRF, query strings, unapproved routes and methods without forwarding',async()=>{
 let calls=0;const fetcher=()=>{calls++;throw new Error('Should not forward');};
 for(const [url,method,headers,status] of [
  [origin+'/session/auth/session','POST',{Origin:'https://attacker.test'},403],
  [origin+'/session/auth/session','POST',{Origin:origin,'Sec-Fetch-Site':'cross-site'},403],
  [origin+'/session/auth/login','POST',{Origin:origin},404],
  [origin+'/session/auth/session','GET',{},405],
  [origin+'/session/state','POST',{Origin:origin},404],
  [origin+'/session/auth/session?token=forbidden','POST',{Origin:origin},404],
 ])assert.equal((await handleSession(new Request(url,{method,headers,...(method==='POST'?{body:'{}'}:{})}),fetcher)).status,status);
 assert.equal(calls,0);
});
test('only the opaque session is forwarded, and offline logout clears the cookie without logging secrets',async()=>{
 const token='a'.repeat(72);let sent;
 const req=new Request(origin+'/session/auth/session',{method:'POST',headers:{Origin:origin,Cookie:'unrelated=private; __Host-MeyersSession='+token,'X-Host-Password':'must-not-forward'},body:'{}'});
 await handleSession(req,async(url,options)=>{sent={url,options};return Response.json({error:'Unavailable'},{status:503});});
 assert.equal(sent.url,'https://curly-sun-ef0f.kassandraraudman.workers.dev/auth/session');assert.equal(sent.options.headers.get('Authorization'),'Bearer '+token);assert.equal(sent.options.headers.has('Cookie'),false);assert.equal(sent.options.headers.has('X-Host-Password'),false);
 const failed=await handleSession(new Request(origin+'/session/auth/logout',{method:'POST',headers:{Origin:origin},body:'{}'}),()=>{throw new Error('Synthetic secret must not appear');});assert.equal(failed.status,503);assert.match(failed.headers.get('Set-Cookie'),/Max-Age=0/);assert.ok(!(await failed.text()).includes('Synthetic secret'));
});


test('the edge bridge uses supported manual redirects and rejects every upstream redirect',async()=>{
 let calls=0;
 const response=await handleSession(new Request(origin+'/session/auth/session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+'a'.repeat(72)},body:'{}'}),async(url,options)=>{
  calls++;assert.equal(options.redirect,'manual','Cloudflare fetch does not support redirect:error');return new Response(null,{status:302,headers:{Location:'https://attacker.test'}});
 });
 assert.equal(calls,1);assert.equal(response.status,503);assert.equal(response.headers.has('Location'),false);assert.ok(!(await response.text()).includes('attacker.test'));
});

test('both canonical and previous subdomains retain isolated same-origin session proxies',async()=>{
 for(const host of ['meyer.ilymmd.com','themeyers.ilymmd.com']){
  const origin='https://'+host,other=host.startsWith('meyer.')?'https://themeyers.ilymmd.com':'https://meyer.ilymmd.com';let calls=0;
  const backend=async(url,options)=>{calls++;assert.equal(options.headers.get('Origin'),origin);return Response.json({error:'Sign in required.'},{status:401});};
  const request=sender=>new Request(origin+'/session/auth/session',{method:'POST',headers:{Origin:sender,'Content-Type':'application/json'},body:'{}'});
  assert.equal((await handleSession(request(origin),backend)).status,401);assert.equal(calls,1);
  assert.equal((await handleSession(request(other),backend)).status,403);assert.equal(calls,1);
 }
});
