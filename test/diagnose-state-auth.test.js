import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnose} from '../scripts/diagnose-state-auth.js';
test('incident diagnostic emits allowlisted booleans/versions only and never accesses state or logs credentials',async()=>{
 const expected='a'.repeat(40),calls=[];
 const result=await diagnose({EXPECTED_COMMIT:expected,CLOUDFLARE_API_TOKEN:'PRIVATE_TOKEN',CLOUDFLARE_ACCOUNT_ID:'account'},async(url,options)=>{
  calls.push(url);assert.equal(options.method,undefined);
  if(url.endsWith('/health/state-auth'))return Response.json({protocol:'state-auth-v1',ready:false,commit:expected,unexpected:'PRIVATE_DATA'},{status:503});
  if(url.endsWith('/settings'))return Response.json({success:true,result:{bindings:[{name:'RELEASE_COMMIT',type:'plain_text',text:expected},{name:'SECRET',type:'plain_text',text:'PRIVATE_DATA'}]}});
  return Response.json({success:true,result:{deployments:[{versions:[{version_id:'a'.repeat(8)+'-'+ 'a'.repeat(4)+'-'+ 'a'.repeat(4)+'-'+ 'a'.repeat(4)+'-'+ 'a'.repeat(12),percentage:100}],secret:'PRIVATE_DATA'}]}});
 });
 assert.equal(result.healthHttpStatus,503);assert.equal(result.healthReady,false);assert.equal(result.releaseCommitBindingMatches,true);
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.ok(calls.every(url=>!url.endsWith('/state')));
});
