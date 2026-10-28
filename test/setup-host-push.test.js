import test from 'node:test';
import assert from 'node:assert/strict';
import {setupHostPush} from '../scripts/setup-host-push.js';
const env={HOST_PUSH_SETUP_CONFIRM:'CREATE_HOST_PUSH_KEYS',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'synthetic-token'};
test('setup requires explicit approval and refuses existing credentials without rotating',async()=>{
 let writes=0;
 const fetchImpl=async(url,options={})=>{assert.ok(!String(url).endsWith('/state'));if(options.method==='PUT')writes++;return String(url).endsWith('/health/host-push')?Response.json({protocol:'host-push-v1'}):Response.json({success:true,result:[{name:'HOST_PUSH_VAPID'}]});};
 await assert.rejects(setupHostPush({env:{...env,HOST_PUSH_SETUP_CONFIRM:''},fetchImpl}),/confirmation/);
 await assert.rejects(setupHostPush({env,fetchImpl}),/already exist/);assert.equal(writes,0);
});
test('setup generates and masks one atomic secret only after read-only readiness and metadata checks',async()=>{
 const calls=[],masked=[];let secret;
 const fetchImpl=async(url,options={})=>{calls.push({url,method:options.method||'GET'});if(String(url).endsWith('/health/host-push'))return Response.json({protocol:'host-push-v1'});if(options.method==='PUT'){const body=JSON.parse(options.body);assert.equal(body.name,'HOST_PUSH_VAPID');assert.equal(body.type,'secret_text');secret=JSON.parse(body.text);return Response.json({success:true});}return Response.json({success:true,result:[]});};
 assert.deepEqual(await setupHostPush({env,fetchImpl,mask:value=>masked.push(value)}),{configured:true});assert.equal(calls.length,3);assert.equal(calls[2].method,'PUT');assert.equal(secret.version,1);assert.equal(Buffer.from(secret.publicKey,'base64url').length,65);assert.equal(Buffer.from(secret.privateKey,'base64url').length,32);assert.ok(masked.includes(secret.privateKey));assert.equal(calls.filter(call=>call.url.includes('/state')).length,0);
});
