import {issueSession,digest} from '../github-state-worker/auth.js';
export const TEST_PASSWORD='test-only-password-at-least-24-chars';
export function bucket(){
 const objects=new Map();return {objects,
  async get(key,options){const item=objects.get(key);if(!item)return null;const bytes=new TextEncoder().encode(String(item.body));return {text:async()=>String(item.body),body:options?.range?bytes.slice(options.range.offset,options.range.offset+options.range.length):bytes,size:bytes.length,httpMetadata:item.options?.httpMetadata||{},customMetadata:item.options?.customMetadata||{}};},
  async put(key,body,options={}){objects.set(key,{body:typeof body==='string'?body:new TextDecoder().decode(body),options});},
  async delete(key){objects.delete(key);},
  async list({prefix}){return {objects:[...objects].filter(([key])=>key.startsWith(prefix)).map(([key,item])=>({key,size:String(item.body).length,customMetadata:item.options?.customMetadata||{}})),truncated:false};}
 };
}
export async function hostEnvironment(env={}){
 const original=env.INVITATION_BACKGROUNDS,privateBucket=bucket();
 env.HOST_PASSWORD=TEST_PASSWORD;env.AUTH_MIGRATION_READY='verified-backup-v1';
 env.INVITATION_BACKGROUNDS={...original,
  get:(key,...args)=>key.startsWith('security-v1/')?privateBucket.get(key,...args):original?.get?.(key,...args),
  put:(key,...args)=>key.startsWith('security-v1/')?privateBucket.put(key,...args):original?.put?.(key,...args),
  delete:(key,...args)=>key.startsWith('security-v1/')?privateBucket.delete(key,...args):original?.delete?.(key,...args)};
 const session=await issueSession(env,{role:'host',version:await digest(TEST_PASSWORD)});
 return {env,authorization:`Bearer ${session.token}`};
}
// Upgrade legacy upload fixtures to real opaque sessions; production still rejects the old header.
export function sessionWorker(actual){
 const sessions=new WeakMap();
 return {...actual,async fetch(request,env){
  const supplied=request.headers.get('X-Host-Password');
  if(supplied&&env.INVITATION_BACKGROUNDS){
   let fixture=sessions.get(env);
   if(!fixture&&supplied===env.HOST_PASSWORD){const previous=env.HOST_PASSWORD;fixture={...await hostEnvironment(env),previous};sessions.set(env,fixture);}
   if(fixture&&supplied===fixture.previous){const headers=new Headers(request.headers);headers.delete('X-Host-Password');headers.set('Authorization',fixture.authorization);request=new Request(request,{headers});}
  }
  return actual.fetch(request,env);
 }};
}
