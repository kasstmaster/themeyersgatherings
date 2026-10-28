import {backupState,verifyRestore} from './private-state-backup.js';

// Runs only inside the private repository, using its short-lived GITHUB_TOKEN.
// Never writes the canonical state file, local backup files or Actions artifacts.
export async function cloudPrivateBackup(env,fetchImpl=fetch) {
  const repository='kasstmaster/themeyersevents-data',branch='main',statePath='data/app-state.json';
  if(env.GITHUB_REPOSITORY!==repository || env.GITHUB_REF!=='refs/heads/main' ||
    env.GITHUB_EVENT_NAME!=='workflow_dispatch' || !env.STATE_REPOSITORY_TOKEN ||
    env.BACKUP_CONFIRM!=='Create private backup only' || env.WRITERS_COORDINATED!=='true')throw new Error('Backup execution prerequisites not satisfied.');
  const token=env.STATE_REPOSITORY_TOKEN;
  const receipt=await backupState({repository,branch,statePath,token,fetchImpl});
  await verifyRestore({repository,backupCommit:receipt.backupCommit,backupPath:receipt.path,expectedHash:receipt.sha256,token,fetchImpl});
  const base='https://api.github.com/repos/'+repository;
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'meyers-private-backup','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
  const call=async(path,options={})=>{
    const response=await fetchImpl(base+path,{...options,headers,redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Private backup receipt verification failed.');
    return response.json();
  };
  const check=async()=>{
    if((await call('')).private!==true)throw new Error('Private repository required.');
    const current=await call('/contents/'+statePath+'?ref=main');
    if(current.sha!==receipt.sourceBlob)throw new Error('Live state changed; repeat after coordinating writers.');
  };
  await check();
  const record={...receipt,statePath,restoreDryRun:true,verifiedAt:new Date().toISOString(),runId:env.GITHUB_RUN_ID||null};
  const receiptPath=receipt.path.replace(/app-state\.json$/,'receipt.json');
  const serialized=JSON.stringify(record,null,2)+'\n';
  const saved=await call('/contents/'+receiptPath,{method:'PUT',body:JSON.stringify({message:'Record private backup integrity and no-write restore verification',branch,content:Buffer.from(serialized).toString('base64')})});
  const checked=await call('/contents/'+receiptPath+'?ref='+encodeURIComponent(saved.commit.sha));
  if(Buffer.from(checked.content.replace(/\s/g,''),'base64').toString('utf8')!==serialized)throw new Error('Private receipt did not match.');
  await check();
  return {verified:true,receiptPath,receiptCommit:saved.commit.sha};
}
