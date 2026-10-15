import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDropboxOAuth, handleDropboxUpload } from '../github-state-worker/dropbox.js';
function fixture(t) {
  const objects=new Map(),calls=[];
  const env={DROPBOX_APP_KEY:'app-key',DROPBOX_APP_SECRET:'app-secret',HOST_PASSWORD:'host',INVITATION_BACKGROUNDS:{
    async get(key){const value=objects.get(key);return value===undefined?null:{async text(){return value.body;}};},
    async put(key,value,options){objects.set(key,{body:String(value),options});},async delete(key){objects.delete(key);}
  }};
  const refreshToken=crypto.randomUUID();
  const previous=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/oauth2/token'))return Response.json(options.body.get('grant_type')==='authorization_code'?{refresh_token:refreshToken,access_token:'access',expires_in:3600}:{access_token:'access',expires_in:3600});
    assert.equal(options.headers.Authorization,'Bearer access');
    if(url.endsWith('/upload_session/start'))return Response.json({session_id:'dropbox-upload-session'});
    if(url.endsWith('/upload_session/append_v2'))return Response.json(null);
    if(url.endsWith('/upload_session/finish'))return Response.json({id:'dropbox-file'});
    throw new Error('Unexpected external request');
  };
  t.after(()=>{globalThis.fetch=previous;});
  const deps={response:(req,env,body,status=200,headers={})=>new Response(body,{status,headers}),jsonResponse:(req,env,value,status=200)=>Response.json(value,{status}),requireHost:req=>req.headers.get('X-Host-Password')==='host'};
  const oauth=(path,host=false,method='GET')=>handleDropboxOAuth(new Request('https://worker.example'+path,{method,headers:host?{'X-Host-Password':'host'}:{}}),env,deps);
  const identity={owner:'a'.repeat(64),accountName:'Benjamin Hall IV,Sherri Hall',uploadedBy:'Benjamin Hall IV'};
  const upload=(path,body,owner=identity,headers={})=>handleDropboxUpload(new Request('https://worker.example/wedding-media/dropbox-upload'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:body}),env,owner,deps);
  const connect=async()=>{const start=await (await oauth('/dropbox/connect',true,'POST')).json();const url=new URL(start.url);await oauth(`/dropbox/callback?state=${url.searchParams.get('state')}&code=approved`);return url;};
  return {objects,calls,env,oauth,upload,identity,connect,refreshToken};
}
test('Dropbox connection is host-only, uses offline PKCE, rejects invalid/replayed state, and never returns credentials',async t=>{
  const f=fixture(t);
  assert.equal((await f.oauth('/dropbox/connect',false,'POST')).status,401);
  const started=await (await f.oauth('/dropbox/connect',true,'POST')).json(),url=new URL(started.url);
  assert.equal(url.searchParams.get('token_access_type'),'offline');assert.equal(url.searchParams.get('scope'),'files.content.write');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('redirect_uri'),'https://worker.example/dropbox/callback');assert.ok(!started.url.includes('app-secret'));
  assert.equal((await f.oauth('/dropbox/callback?state=invalid&code=x')).status,400);
  const state=url.searchParams.get('state');const record=JSON.parse(f.objects.get('dropbox-private/oauth/'+state).body);
  assert.equal(url.searchParams.get('code_challenge'),Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record.verifier))).toString('base64url'));
  const result=await f.oauth(`/dropbox/callback?state=${state}&code=approved`);assert.equal(result.status,200);assert.ok(!(await result.text()).includes(f.refreshToken));
  assert.equal((await f.oauth(`/dropbox/callback?state=${state}&code=approved`)).status,400);
  const status=await (await f.oauth('/dropbox/status',true)).json();assert.deepEqual(status,{configured:true,connected:true,redirectUri:'https://worker.example/dropbox/callback'});
  assert.ok(f.objects.get('dropbox-private/connection').body.includes(f.refreshToken));assert.equal(f.calls[0].options.body.get('code_verifier'),record.verifier);
});
test('Dropbox chunk uploads enforce ownership, offsets, completion, and server-side folder attribution',async t=>{
  const f=fixture(t);await f.connect();
  const huge=await f.upload('/start',JSON.stringify({name:'large.mov',size:200_000_000,contentType:'video/quicktime'}));assert.equal(huge.status,200);
  const start=await (await f.upload('/start',JSON.stringify({name:'photo.jpg',size:3,contentType:'image/jpeg'}))).json();
  const other={...f.identity,owner:'b'.repeat(64)};
  assert.equal((await f.upload(`/${start.id}/chunk?offset=0`,new Uint8Array([1,2,3]),other)).status,404);
  assert.equal((await f.upload(`/${start.id}/finish`,'')).status,409);
  const chunk=()=>f.upload(`/${start.id}/chunk?offset=0`,new Uint8Array([1,2,3]));assert.equal((await chunk()).status,200);assert.equal((await chunk()).status,200);
  assert.equal(f.calls.filter(call=>call.url.endsWith('/append_v2')).length,1);
  assert.equal((await f.upload(`/${start.id}/finish`,'')).status,200);assert.equal((await f.upload(`/${start.id}/finish`,'')).status,200);
  const finish=f.calls.find(call=>call.url.endsWith('/finish'));const args=JSON.parse(finish.options.headers['Dropbox-API-Arg']);assert.ok(args.commit.path.startsWith('/Wedding Uploads/Benjamin Hall IV,Sherri Hall/Benjamin Hall IV/'));assert.equal(args.cursor.offset,3);
  const receipt=f.objects.get(`wedding-media/uploads/${f.identity.owner}/${start.id}`).options.customMetadata;assert.equal(receipt.kind,'dropbox');assert.equal(receipt.uploadedBy,'Benjamin Hall IV');
  assert.equal(f.calls.filter(call=>call.url.endsWith('/oauth2/token')&&call.options.body.get('grant_type')==='refresh_token').length,1);
});
test('Dropbox reports missing configuration and rejects unsupported input and oversized chunks',async t=>{
  const f=fixture(t);delete f.env.DROPBOX_APP_SECRET;assert.equal((await f.oauth('/dropbox/connect',true,'POST')).status,503);
  assert.equal((await f.upload('/start',JSON.stringify({name:'bad.html',size:20,contentType:'text/html'}))).status,400);
  f.env.DROPBOX_APP_SECRET='app-secret';await f.connect();const job=await (await f.upload('/start',JSON.stringify({name:'a.mp4',size:20_000_000,contentType:'video/mp4'}))).json();
  assert.equal((await f.upload(`/${job.id}/chunk?offset=0`,'x',f.identity,{'Content-Length':'9000000'})).status,413);
});
