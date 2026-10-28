import {accountKey,eventAllowed} from './permissions.js';
import {accountPeople,normalizedPerson,parsePerson} from '../scripts/anylist-accounts.js';
const PREFIX='security-v1/';
const bytes=value=>new TextEncoder().encode(value);
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(value)))].map(value=>value.toString(16).padStart(2,'0')).join('');}
export function equal(a,b){const x=bytes(a||''),y=bytes(b||'');let difference=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)difference|=(x[i]||0)^(y[i]||0);return difference===0;}
async function read(bucket,key){const value=await bucket.get(PREFIX+key);return value?JSON.parse(await value.text()):null;}
async function write(bucket,key,value){await bucket.put(PREFIX+key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'}});}
export async function issueSession(env,identity){
 const token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token),expires=Date.now()+(identity.role==='guest'?30*24:8)*60*60*1000;
 await write(env.INVITATION_BACKGROUNDS,'sessions/'+hash,{...identity,expires});return {token,expires};
}
export async function authenticate(request,env){
 if(!env.INVITATION_BACKGROUNDS||env.AUTH_MIGRATION_READY!=='verified-backup-v1'||(env.HOST_PASSWORD||'').length<24)return null;
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9-]{72})$/)?.[1];if(!token)return null;
 const record=await read(env.INVITATION_BACKGROUNDS,'sessions/'+await digest(token));
 if(!record||record.expires<Date.now())return null;
 // A deliberate host-secret change invalidates outstanding sessions.
 const version=await digest(env.HOST_PASSWORD||'');
 return equal(version,record.version)?record:null;
}
export async function boundedJson(request,limit=1_000_000){
 const reader=request.body?.getReader();if(!reader)throw Object.assign(new Error('Invalid request.'),{status:400});
 const parts=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Object.assign(new Error('Request too large.'),{status:413});}parts.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(new Error('Invalid request.'),{status:400});}
}
export async function login(request,env,stateProvider){
 if(!env.INVITATION_BACKGROUNDS||!env.HOST_PASSWORD||env.HOST_PASSWORD.length<24||env.AUTH_MIGRATION_READY!=='verified-backup-v1')throw Object.assign(new Error('Authentication is not configured.'),{status:503});
 const body=await boundedJson(request,8192);
 if(!body||typeof body!=='object')throw Object.assign(new Error('Sign-in failed.'),{status:401});
 const ip=request.headers.get('CF-Connecting-IP')||'unknown',rateKey='attempts/'+await digest(ip);
 const attempts=await read(env.INVITATION_BACKGROUNDS,rateKey);
 if(attempts?.expires>Date.now()&&attempts.count>=20)throw Object.assign(new Error('Too many attempts. Try again later.'),{status:429});
 let identity;
 if(['host','first-name'].includes(body.role)&&typeof body.password==='string'&&equal(body.password,env.HOST_PASSWORD))identity={role:'host',version:await digest(env.HOST_PASSWORD)};
 if(body.role==='first-name'&&typeof body.password==='string'&&!identity){
  // Short guest names need no credential probe. Preserve legitimate long given
  // names too, without issuing a guest session or returning household data.
  if(body.password.length<24)return {next:'guest'};
  const state=typeof stateProvider==='function'?await stateProvider():stateProvider;
  const givenName=normalizedPerson(body.password+' Guest');
  if(state.accounts.some(account=>[...accountPeople(account.name),...(account.signInAliases||[]).map(alias=>alias.alias)].some(name=>normalizedPerson((parsePerson(name)?.givenNames||'')+' Guest')===givenName)))return {next:'guest'};
 }
 if(body.role==='guest'&&typeof body.name==='string'){
  const state=typeof stateProvider==='function'?await stateProvider():stateProvider;
  const name=normalizedPerson(body.name);
  const matches=state.accounts.flatMap(account=>{
   if(body.qrToken&&account.qrToken!==body.qrToken)return [];
   const names=accountPeople(account.name),canonical=names.find(value=>normalizedPerson(value)===name)||(account.signInAliases||[]).find(alias=>normalizedPerson(alias.alias)===name)?.name;
   return canonical&&names.includes(canonical)&&Object.keys(state.events).some(id=>eventAllowed(account,id))?[{account,canonical}]:[];
  });
  if(matches.length===1)identity={role:'guest',accountId:accountKey(matches[0].account),person:matches[0].canonical,version:await digest(env.HOST_PASSWORD)};
 }
 if(!identity){await write(env.INVITATION_BACKGROUNDS,rateKey,{count:attempts?.expires>Date.now()?attempts.count+1:1,expires:Date.now()+15*60*1000});throw Object.assign(new Error('Sign-in failed. Check your name and access details.'),{status:401});}
 await env.INVITATION_BACKGROUNDS.delete(PREFIX+rateKey);return {...await issueSession(env,identity),identity};
}
export async function logout(request,env){const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(token)await env.INVITATION_BACKGROUNDS?.delete(PREFIX+'sessions/'+await digest(token));}
