import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cloudPrivateBackup} from '../scripts/cloud-private-backup.js';
import {privateBackupWorkflow} from '../scripts/build-private-backup-workflow.js';

const env={GITHUB_REPOSITORY:'kasstmaster/themeyersevents-data',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',STATE_REPOSITORY_TOKEN:'synthetic-token',BACKUP_CONFIRM:'Create private backup only',WRITERS_COORDINATED:'true',GITHUB_RUN_ID:'42'};
function fixture({privateRepo=true,moving=false,corrupt=false,receiptCorrupt=false}={}) {
  const writes=[],files=new Map();let reads=0;
  const original='{ "events": {"one": {"legacy": "PRIVATE_SENTINEL"}}, "accounts": [] }\n';
  const fetchImpl=async(url,options={})=>{
    assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer synthetic-token');
    if(!url.includes('/contents/'))return Response.json({private:privateRepo});
    const path=new URL(url).pathname.split('/contents/')[1];
    if(options.method==='PUT') {
      assert.match(path,/^security-backups\/[\w-]+\/(app-state|receipt)\.json$/);
      assert.notEqual(path,'data/app-state.json');
      const body=JSON.parse(options.body);assert.equal(body.branch,'main');assert.equal(body.sha,undefined);
      writes.push(path);files.set(path,body.content);return Response.json({commit:{sha:'commit-'+writes.length}});
    }
    if(path==='data/app-state.json') {reads++;return Response.json({sha:moving&&reads>2?'changed':'live-blob',content:Buffer.from(original).toString('base64')});}
    const content=(corrupt&&path.endsWith('app-state.json'))||(receiptCorrupt&&path.endsWith('receipt.json'))?Buffer.from('corrupt').toString('base64'):files.get(path);
    return Response.json({content});
  };
  return {fetchImpl,writes,files,original};
}
test('cloud workflow stores exact backup and receipt only in private repository and checks recovery without live writes',async()=>{
  const f=fixture(),result=await cloudPrivateBackup(env,f.fetchImpl);
  assert.equal(result.verified,true);assert.equal(f.writes.length,2);
  const backup=f.writes.find(path=>path.endsWith('app-state.json'));
  assert.equal(Buffer.from(f.files.get(backup),'base64').toString(),f.original);
  const receipt=JSON.parse(Buffer.from(f.files.get(result.receiptPath),'base64'));
  assert.equal(receipt.restoreDryRun,true);assert.equal(receipt.sourceBlob,'live-blob');assert.equal(receipt.runId,'42');
  assert.ok(!JSON.stringify(receipt).includes('PRIVATE_SENTINEL'));
});
test('public repo, corrupt backup/receipt and moving source never report verified cloud completion',async()=>{
  for(const options of [{privateRepo:false},{corrupt:true},{moving:true},{receiptCorrupt:true}]) {
    const f=fixture(options);await assert.rejects(cloudPrivateBackup(env,f.fetchImpl));
    assert.ok(f.writes.every(path=>path.startsWith('security-backups/')));
    if(options.privateRepo===false)assert.equal(f.writes.length,0);
  }
});
test('wrong repo/ref/event, missing automatic token or missing deliberate confirmation perform no API calls',async()=>{
  for(const patch of [{GITHUB_REPOSITORY:'kasstmaster/themeyersgatherings'},{GITHUB_REF:'refs/heads/other'},{GITHUB_EVENT_NAME:'push'},{STATE_REPOSITORY_TOKEN:''},{BACKUP_CONFIRM:'Do not run'},{WRITERS_COORDINATED:'false'}]) {
    let calls=0;await assert.rejects(cloudPrivateBackup({...env,...patch},async()=>{calls++;}));assert.equal(calls,0);
  }
});
test('standalone workflow matches tested helpers, is manual/private-only and never checks out or uploads state',async()=>{
  const workflow=await privateBackupWorkflow();
  assert.equal(workflow,await readFile(new URL('../docs/workflows/verified-private-backup.yml',import.meta.url),'utf8'));
  assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/contents: write/);assert.match(workflow,/cancel-in-progress: false/);
  for(const forbidden of ['actions/checkout','upload-artifact','pull_request:','push:','schedule:','secrets.STATE_REPOSITORY_TOKEN'])assert.ok(!workflow.includes(forbidden));
  assert.match(workflow,/STATE_REPOSITORY_TOKEN: \$\{\{ github.token \}\}/);
  const script=workflow.split("node --input-type=module <<'PRIVATE_BACKUP_SCRIPT'\n")[1].split('          PRIVATE_BACKUP_SCRIPT')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  // Execute the exact generated runner; a response-body parse failure must not
  // print its contents, an exception stack, or the automatic token.
  const logs=[],errors=[],previousFetch=globalThis.fetch,previousLog=console.log,previousError=console.error,previousExit=process.exitCode;
  const previousEnv=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));let status;
  try {
    Object.assign(process.env,env);globalThis.fetch=async()=>{throw new Error('PRIVATE_SENTINEL synthetic-token');};
    console.log=value=>logs.push(value);console.error=value=>errors.push(value);
    await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64'));status=process.exitCode;
  } finally {
    globalThis.fetch=previousFetch;console.log=previousLog;console.error=previousError;process.exitCode=previousExit;
    for(const [key,value] of Object.entries(previousEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
  assert.equal(status,1);assert.equal(logs.length,0);const stderr=errors.join('\n');assert.ok(stderr.includes('Backup was NOT verified'));
  assert.ok(!stderr.includes('PRIVATE_SENTINEL'));assert.ok(!stderr.includes('synthetic-token'));assert.ok(!stderr.includes(' at '));
});
