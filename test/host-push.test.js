import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey,verify} from 'node:crypto';
import worker from '../github-state-worker/worker.js';
import {pushChanges,pushEndpoint,vapidAuthorization,handleHostPush,queueHostPush,flushHostPush} from '../github-state-worker/host-push.js';
import {bucket,TEST_PASSWORD} from './security-fixture.js';
const encode=value=>Buffer.from(value).toString('base64url');
async function keyPair(){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);return {version:1,publicKey:encode(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:(await crypto.subtle.exportKey('jwk',pair.privateKey)).d};}
const keys=await keyPair(),endpoint='https://fcm.googleapis.com/fcm/send/synthetic-device';
const request=(method,body,url='https://service.test/host-push')=>new Request(url,{method,...(body?{body:JSON.stringify(body)}:{})});
const environment=()=>({HOST_PASSWORD:TEST_PASSWORD,HOST_PUSH_VAPID:JSON.stringify(keys),INVITATION_BACKGROUNDS:bucket()});
const sample=()=>({events:{one:{eventDate:'2099-01-01',rsvps:[],items:[{id:'ham',claims:[]}]}}});
test('only meaningful attendance or active food changes trigger an alert',()=>{
 const original=sample(),next=structuredClone(original);next.events.one.gatheringColors={background:'#123456'};next.savedAt='new';assert.deepEqual(pushChanges(original,next),[]);
 next.events.one.items.push({id:'new',name:'New dish',claims:[]});assert.deepEqual(pushChanges(original,next),[]);
 next.events.one.rsvps.push({name:'Household',people:[{name:'Person',attending:false}],adults:0,children:0});assert.deepEqual(pushChanges(original,next),['one']);
 const before=structuredClone(next);next.events.one.rsvps[0].savedMenuSelections=[{meal:'archived'}];assert.deepEqual(pushChanges(before,next),[]);
 next.events.one.rsvps[0].menuSelections=[{meal:'Beef',dietaryRestrictions:'No nuts'}];assert.deepEqual(pushChanges(before,next),['one']);
 const claimed=sample();claimed.events.one.items[0].claims=['Household'];assert.deepEqual(pushChanges(original,claimed),['one']);
 const technical=structuredClone(claimed);technical.events.one.items[0].claimGroups={Household:{1:0}};assert.deepEqual(pushChanges(claimed,technical),[]);
 technical.events.one.eventDate='2100-01-01';assert.deepEqual(pushChanges(claimed,technical),[]);
});
test('push endpoints reject arbitrary hosts, credentials, ports and redirects targets',()=>{
 for(const value of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://fcm.googleapis.com@evil.test/a','https://fcm.googleapis.com:444/a','https://fcm.googleapis.com/a#secret'])assert.equal(pushEndpoint(value),null);
 for(const value of [endpoint,'https://updates.push.services.mozilla.com/wpush/v2/test','https://web.push.apple.com/test','https://wns2-example.notify.windows.com/test'])assert.equal(pushEndpoint(value),value);
});
test('VAPID JWT is verifiable ES256 scoped to the push service, with no private key or guest data',async()=>{
 const now=Date.now(),authorization=await vapidAuthorization(endpoint,keys,now),token=authorization.match(/t=([^,]+)/)[1],parts=token.split('.');
 const header=JSON.parse(Buffer.from(parts[0],'base64url')),payload=JSON.parse(Buffer.from(parts[1],'base64url'));
 assert.deepEqual(header,{typ:'JWT',alg:'ES256'});assert.equal(payload.aud,'https://fcm.googleapis.com');assert.equal(payload.sub,'https://themeyers.ilymmd.com/');assert.equal(payload.exp,Math.floor(now/1000)+43200);
 const raw=Buffer.from(keys.publicKey,'base64url'),publicKey=createPublicKey({format:'jwk',key:{kty:'EC',crv:'P-256',x:encode(raw.subarray(1,33)),y:encode(raw.subarray(33))}});
 assert.equal(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')),true);assert.ok(!authorization.includes(keys.privateKey));
});
test('enrollment and status require real Host role; storage contains endpoints but no application state',async()=>{
 const env=environment();for(const actor of [null,{role:'guest'}])for(const method of ['GET','POST','DELETE']){const response=await handleHostPush(request(method,method==='GET'?null:{endpoint}),env,actor);assert.equal(response.status,actor?403:401);}
 assert.equal(env.INVITATION_BACKGROUNDS.objects.size,0);
 const host={role:'host'};assert.equal((await handleHostPush(request('POST',{endpoint,keys:{auth:'not-stored'}}),env,host)).status,200);
 const status=await (await handleHostPush(request('GET'),env,host)).json();assert.equal(status.configured,true);assert.equal(status.publicKey,keys.publicKey);assert.equal(status.deviceIds.length,1);assert.ok(!JSON.stringify(status).includes(endpoint));
 const stored=[...env.INVITATION_BACKGROUNDS.objects.values()][0].body;assert.ok(!stored.includes('not-stored'));assert.ok(!stored.includes(TEST_PASSWORD));
 assert.equal((await handleHostPush(request('DELETE',{endpoint}),env,host)).status,204);assert.equal(env.INVITATION_BACKGROUNDS.objects.size,0);
 delete env.HOST_PUSH_VAPID;assert.equal((await (await handleHostPush(request('GET'),env,host)).json()).configured,false);assert.equal((await handleHostPush(request('POST',{endpoint}),env,host)).status,503);
});
test('password replacement revokes old enrolled devices without rotating any credentials',async()=>{
 const env=environment();await handleHostPush(request('POST',{endpoint}),env,{role:'host'});env.HOST_PASSWORD+='replacement';
 const status=await (await handleHostPush(request('GET'),env,{role:'host'})).json();assert.deepEqual(status.deviceIds,[]);assert.equal(env.INVITATION_BACKGROUNDS.objects.size,0);
});
test('retry outbox is empty-payload, expires safely and removes expired push endpoints',async t=>{
 const env=environment();await handleHostPush(request('POST',{endpoint}),env,{role:'host'});const old=sample(),next=sample();next.events.one.items[0].claims=['Household'];
 assert.equal(await queueHostPush(env,old,next,'revision-one'),true);
 const previous=globalThis.fetch;t.after(()=>globalThis.fetch=previous);let status=503,calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,endpoint);assert.equal(options.method,'POST');assert.equal(options.redirect,'manual');assert.equal(options.body,undefined);assert.ok(!JSON.stringify(options).includes('Household'));assert.match(options.headers.Authorization,/^vapid /);return new Response(null,{status});};
 await flushHostPush(env);assert.equal(calls,1);assert.equal([...env.INVITATION_BACKGROUNDS.objects.keys()].filter(key=>key.includes('/outbox/')).length,1);
 status=201;await flushHostPush(env);assert.equal([...env.INVITATION_BACKGROUNDS.objects.keys()].filter(key=>key.includes('/outbox/')).length,0);
 await queueHostPush(env,old,next,'revision-two');status=410;await flushHostPush(env);assert.equal(env.INVITATION_BACKGROUNDS.objects.size,0);
});
test('only successful authorized state writes queue push; stale saves and formatting do not',async t=>{
 const env={...environment(),GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'synthetic',AUTH_MIGRATION_READY:'verified-backup-v1',ALLOWED_ORIGIN:'https://site.test'};
 let state={accounts:[{name:'Casey Example',selectedEvents:{one:true}}],events:{one:{eventDate:'2099-01-01',items:[],rsvps:[]}}},sha=1,pushes=0,writes=0,failWrite=false;const previous=globalThis.fetch;t.after(()=>globalThis.fetch=previous);
 globalThis.fetch=async(url,options={})=>{
  if(String(url).startsWith('https://fcm.googleapis.com/')){pushes++;assert.equal(options.body,undefined);return new Response(null,{status:201});}
  assert.match(String(url),/^https:\/\/api.github.com\/repos\/test\/private\/contents\//);
  if(options.method==='PUT'){if(failWrite)return Response.json({},{status:503});const body=JSON.parse(options.body);assert.equal(body.sha,String(sha));state=JSON.parse(Buffer.from(body.content,'base64'));sha++;writes++;return Response.json({content:{sha:String(sha)}});}
  return Response.json({sha:String(sha),content:Buffer.from(JSON.stringify(state)).toString('base64')});
 };
 const call=(path,options={},context)=>worker.fetch(new Request('https://service.test/'+path,options),env,context);
 const login=async body=>(await (await call('auth/login',{method:'POST',body:JSON.stringify(body)})).json());
 assert.equal((await call('host-push')).status,401);const host=await login({role:'host',password:TEST_PASSWORD});
 assert.equal((await call('host-push',{method:'POST',headers:{Authorization:'Bearer '+host.token},body:JSON.stringify({endpoint})})).status,200);
 const guest=await login({role:'guest',name:'Casey Example'});assert.equal((await call('host-push',{headers:{Authorization:'Bearer '+guest.token}})).status,403);
 const changes=[{path:['events','one','rsvps'],value:[{name:'Casey Example',people:[{name:'Casey Example',attending:true}],adults:1,children:0,extraGuests:0}]}],pending=[];
 const options={method:'PATCH',headers:{Authorization:'Bearer '+guest.token,'If-Match':guest.revision},body:JSON.stringify({changes})};
 assert.equal((await call('state',options,{waitUntil:task=>pending.push(task)})).status,200);await Promise.all(pending);assert.equal(pushes,1);assert.equal(writes,1);
 assert.equal((await call('state',options)).status,409);assert.equal(pushes,1);assert.equal(writes,1);
 failWrite=true;const failed=await login({role:'guest',name:'Casey Example'});assert.equal((await call('state',{...options,headers:{Authorization:'Bearer '+failed.token,'If-Match':failed.revision}})).status,502);assert.equal(pushes,1);assert.equal(writes,1);failWrite=false;
 const current=await login({role:'host',password:TEST_PASSWORD});assert.equal((await call('state',{method:'PATCH',headers:{Authorization:'Bearer '+current.token,'If-Match':current.revision},body:JSON.stringify({changes:[{path:['events','one','gatheringColors'],value:{background:'#123456'}}]})})).status,200);assert.equal(pushes,1);
});
