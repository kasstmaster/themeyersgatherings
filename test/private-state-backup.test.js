import test from 'node:test';
import assert from 'node:assert/strict';
import {backupState,verifyRestore} from '../scripts/private-state-backup.js';
test('backup refuses public repositories and never writes private data there',async()=>{
 let calls=0;await assert.rejects(()=>backupState({repository:'test/state',token:'test',fetchImpl:async()=>{calls++;return Response.json({private:false});}}),/public repository/);assert.equal(calls,1);
});
test('private backup preserves exact bytes, verifies an immutable commit and supports a no-write restore drill',async()=>{
 const original='{"events":{"one":{"unknownLegacy":{"keep":true}}},"accounts":[]}\n';let copy,reads=0,writes=0;
 const fetchImpl=async(url,options={})=>{
  if(!url.includes('/contents/'))return Response.json({private:true});
  if(options.method==='PUT'){writes++;copy=JSON.parse(options.body).content;return Response.json({commit:{sha:'immutable-commit'}});}
  if(url.includes('security-backups/'))return Response.json({content:copy});
  reads++;return Response.json({sha:'original-blob',content:Buffer.from(original).toString('base64')});
 };
 const receipt=await backupState({repository:'test/state',token:'test',fetchImpl});assert.equal(receipt.verified,true);assert.equal(reads,2);assert.equal(writes,1);assert.equal(Buffer.from(copy,'base64').toString(),original);
 assert.equal((await verifyRestore({repository:receipt.repository,backupCommit:receipt.backupCommit,backupPath:receipt.path,expectedHash:receipt.sha256,token:'test',fetchImpl})).restoreDryRun,true);assert.equal(writes,1);
});
test('a moving live file refuses deployment readiness instead of claiming a current backup',async()=>{
 let reads=0,content=Buffer.from('{"events":{},"accounts":[]}').toString('base64');
 const fetchImpl=async(url,options={})=>{if(!url.includes('/contents/'))return Response.json({private:true});if(options.method==='PUT')return Response.json({commit:{sha:'commit'}});if(url.includes('security-backups/'))return Response.json({content});return Response.json({sha:String(++reads),content});};
 await assert.rejects(()=>backupState({repository:'test/state',token:'test',fetchImpl}),/changed during backup/);
});
