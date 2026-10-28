// Host-only Web Push. Empty pushes carry no guest names, RSVP details, or credentials.
import {digest,boundedJson} from './auth.js';
const PREFIX='host-push-v1/',MAX_DEVICES=12,MAX_AGE=86400000;
async function sendPush(endpoint,keys,topic){return fetch(endpoint,{method:'POST',redirect:'manual',headers:{Authorization:await vapidAuthorization(endpoint,keys),TTL:'86400',Urgency:'normal',Topic:topic},signal:AbortSignal.timeout(5000)});}
const bytes=value=>new TextEncoder().encode(value);
const encode=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
function config(env){
 try{const value=JSON.parse(env.HOST_PUSH_VAPID||'null');if(value?.version!==1||decode(value.publicKey).length!==65||decode(value.privateKey).length!==32||decode(value.publicKey)[0]!==4)return null;return value;}catch{return null;}
}
export function pushEndpoint(value){
 try{const url=new URL(value);if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||value.length>2048)return null;
 const host=url.hostname;
 if(!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(host)&&!/^([a-z0-9-]+\.)+notify\.windows\.com$/.test(host))return null;
 return url.href;
 }catch{return null;}
}
async function read(bucket,key){const item=await bucket.get(PREFIX+key);return item?JSON.parse(await item.text()):null;}
async function write(bucket,key,value){await bucket.put(PREFIX+key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'}});}
async function list(bucket,prefix,limit=100){const page=await bucket.list({prefix:PREFIX+prefix,limit});if(page.truncated)throw new Error('Notification storage limit reached.');return page.objects;}
async function identity(env){return digest(env.HOST_PASSWORD||'');}
async function subscriptions(env,keys){
 const result=[],owner=await identity(env);
 for(const item of await list(env.INVITATION_BACKGROUNDS,'devices/')){
  const record=await read(env.INVITATION_BACKGROUNDS,item.key.slice(PREFIX.length));
  if(record?.owner===owner&&record.publicKey===keys.publicKey&&pushEndpoint(record.endpoint))result.push({...record,key:item.key});
  else await env.INVITATION_BACKGROUNDS.delete(item.key);
 }
 return result;
}
export async function vapidAuthorization(endpoint,keys,now=Date.now()){
 const publicBytes=decode(keys.publicKey),jwk={kty:'EC',crv:'P-256',x:encode(publicBytes.slice(1,33)),y:encode(publicBytes.slice(33)),d:keys.privateKey};
 const header=encode(bytes(JSON.stringify({typ:'JWT',alg:'ES256'}))),payload=encode(bytes(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(now/1000)+12*3600,sub:'https://themeyers.ilymmd.com/'})));
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,bytes(header+'.'+payload));
 return `vapid t=${header}.${payload}.${encode(signature)}, k=${keys.publicKey}`;
}
function canonical(value){return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);}
const sorted=values=>(values||[]).map(canonical).sort();
function attendance(event){return sorted((event.rsvps||[]).map(response=>({name:response.name,adults:response.adults||0,children:response.children||0,extraGuests:response.extraGuests||0,childNames:sorted(response.childNames),extraGuestNames:sorted(response.extraGuestNames),people:sorted((response.people||[]).map(person=>({name:person.name,attending:person.attending,guestName:person.attending?person.guestName||'':''})))})));}
function food(event){return {meals:sorted((event.rsvps||[]).filter(response=>response.menuSelections?.length).map(response=>({name:response.name,meals:sorted(response.menuSelections)}))),dishes:sorted((event.items||[]).filter(item=>item.claims?.length).map(item=>({id:item.id,claims:sorted(item.claims),groups:Object.fromEntries(Object.entries(item.claimGroups||{}).map(([household,groups])=>[household,Object.fromEntries(Object.entries(groups).filter(([,quantity])=>quantity>0))]).filter(([,groups])=>Object.keys(groups).length))})))};}
export function pushChanges(before,after){
 return Object.keys(after.events||{}).filter(id=>{
  const old=before.events?.[id],next=after.events[id];if(!old||old.eventDate!==next.eventDate)return false;
  return canonical(attendance(old))!==canonical(attendance(next))||canonical(food(old))!==canonical(food(next));
 });
}
export async function handleHostPush(request,env,actor){
 if(actor?.role!=='host')return Response.json({error:actor?'Host access required.':'Sign in as Host.'},{status:actor?403:401});
 const keys=config(env),bucket=env.INVITATION_BACKGROUNDS;
 if(request.method==='GET')return Response.json({configured:!!keys&&!!bucket,publicKey:keys?.publicKey||null,deviceIds:keys&&bucket?(await subscriptions(env,keys)).map(device=>device.id):[]},{headers:{'Cache-Control':'no-store'}});
 if(!keys||!bucket)return Response.json({error:'Host push setup is not configured.'},{status:503});
 if(!['POST','DELETE'].includes(request.method))return Response.json({error:'Method not allowed.'},{status:405});
 let body;try{body=await boundedJson(request,4096);}catch{return Response.json({error:'Invalid subscription.'},{status:400});}
 const endpoint=pushEndpoint(body?.endpoint);if(!endpoint)return Response.json({error:'Unsupported push subscription.'},{status:400});
 const id=await digest(endpoint),path='devices/'+id;
 if(request.method==='DELETE'){await bucket.delete(PREFIX+path);return new Response(null,{status:204});}
 if(new URL(request.url).pathname==='/host-push/test'){
  const device=await read(bucket,path);
  if(device?.owner!==await identity(env)||device.publicKey!==keys.publicKey)return Response.json({error:'Enable this device first.'},{status:403});
  if(Date.now()-(device.lastTest||0)<60000)return Response.json({error:'Please wait a minute before another test.'},{status:429});
  await write(bucket,path,{...device,lastTest:Date.now()});
  const result=await sendPush(endpoint,keys,'meyers-host-push-test');
  if(result.status===404||result.status===410)await bucket.delete(PREFIX+path);
  return Response.json(result.ok?{sent:true}:{error:'The push service did not accept this device.'},{status:result.ok?200:502});
 }
 const devices=await subscriptions(env,keys);if(devices.length>=MAX_DEVICES&&!devices.some(item=>item.id===id))return Response.json({error:'Device limit reached. Disable an old device first.'},{status:409});
 await write(bucket,path,{id,endpoint,owner:await identity(env),publicKey:keys.publicKey});
 return Response.json({enabled:true},{headers:{'Cache-Control':'no-store'}});
}
export async function queueHostPush(env,before,after,revision){
 const keys=config(env);if(!keys||!env.INVITATION_BACKGROUNDS)return false;
 const changes=pushChanges(before,after);if(!changes.length)return false;
 const devices=await subscriptions(env,keys);if(!devices.length)return false;
 await write(env.INVITATION_BACKGROUNDS,'outbox/'+await digest(revision),{createdAt:Date.now(),remaining:devices.map(item=>item.id)});return true;
}
export async function flushHostPush(env){
 const keys=config(env),bucket=env.INVITATION_BACKGROUNDS;if(!keys||!bucket)return;
 const devices=new Map((await subscriptions(env,keys)).map(record=>[record.id,record]));
 const pending=await bucket.list({prefix:PREFIX+'outbox/',limit:4});
 for(const object of pending.objects){
  const path=object.key.slice(PREFIX.length),job=await read(bucket,path);if(!job||Date.now()-job.createdAt>MAX_AGE){await bucket.delete(object.key);continue;}
  const outcomes=await Promise.all(job.remaining.map(async id=>{
   const device=devices.get(id);if(!device)return null;
   try{
    const result=await sendPush(device.endpoint,keys,object.key.split('/').at(-1).slice(0,32));
    if(result.status===404||result.status===410){await bucket.delete(device.key);devices.delete(id);return null;}
    return result.ok?null:id;
   }catch{return id;}
  }));
  const remaining=outcomes.filter(Boolean);
  if(remaining.length)await write(bucket,path,{...job,remaining});else await bucket.delete(object.key);
 }
}
