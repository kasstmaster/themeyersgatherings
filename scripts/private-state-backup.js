// Explicit operator tool. Never outputs state, tokens, credentials or guest details.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function backupState({repository,branch='main',statePath='data/app-state.json',token,fetchImpl=fetch,now=new Date()}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!token)throw new Error('Configure the private state repository and token.');
 const api='https://api.github.com/repos/'+repository,headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'meyers-private-backup','X-GitHub-Api-Version':'2022-11-28'};
 async function call(path,options={}){const response=await fetchImpl(api+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Backup operation failed (HTTP '+response.status+').');return response.json();}
 const repo=await call('');if(repo.private!==true)throw new Error('Refusing to store a state backup in a public repository.');
 const path=statePath.split('/').map(encodeURIComponent).join('/'),source=await call('/contents/'+path+'?ref='+encodeURIComponent(branch));
 const bytes=Buffer.from(source.content.replace(/\s/g,''),'base64'),text=bytes.toString('utf8');
 const state=JSON.parse(text);if(!state.events||typeof state.events!=='object'||Array.isArray(state.events)||!Array.isArray(state.accounts))throw new Error('Source state has an unexpected format; no backup created.');
 const digest=hash(bytes),destination='security-backups/'+now.toISOString().replace(/[:.]/g,'-')+'-'+digest.slice(0,12)+'/app-state.json';
 const created=await call('/contents/'+destination,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Create private verified pre-security backup',branch,content:bytes.toString('base64')})});
 const verification=await call('/contents/'+destination+'?ref='+encodeURIComponent(created.commit.sha));
 if(hash(Buffer.from(verification.content.replace(/\s/g,''),'base64'))!==digest)throw new Error('Backup verification failed; do not deploy.');
 // Re-read the canonical file to detect a moving target during backup.
 const current=await call('/contents/'+path+'?ref='+encodeURIComponent(branch));
 if((await call('')).private!==true)throw new Error('Repository privacy changed; backup is not verified.');
 if(current.sha!==source.sha)throw new Error('Live state changed during backup. Keep this copy, pause writers, and repeat before deploying.');
 return {repository,branch,path:destination,backupCommit:created.commit.sha,sourceBlob:source.sha,sha256:digest,verified:true};
}
export async function verifyRestore({repository,backupCommit,backupPath,expectedHash,token,fetchImpl=fetch}){
 const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'meyers-private-restore-check'};
 const base='https://api.github.com/repos/'+repository;
 const repo=await fetchImpl(base,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!repo.ok||(await repo.json()).private!==true)throw new Error('Private repository verification failed.');
 const response=await fetchImpl(base+'/contents/'+backupPath+'?ref='+encodeURIComponent(backupCommit),{headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Could not read the immutable backup.');
 const record=await response.json(),bytes=Buffer.from(record.content.replace(/\s/g,''),'base64');
 if(hash(bytes)!==expectedHash)throw new Error('Backup hash does not match.');
 const restored=JSON.parse(bytes.toString('utf8'));if(!restored.events||typeof restored.events!=='object'||Array.isArray(restored.events)||!Array.isArray(restored.accounts))throw new Error('Invalid restore data.');
 // Deliberately no live write: restore needs a separately approved expected-SHA write.
 return {verified:true,sha256:expectedHash,restoreDryRun:true};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const options={repository:process.env.STATE_REPOSITORY,branch:process.env.STATE_BRANCH||'main',statePath:process.env.STATE_PATH||'data/app-state.json',token:process.env.STATE_REPOSITORY_TOKEN};
 try{console.log(JSON.stringify(await backupState(options)));}catch{console.error('Private backup was not verified. Do not deploy; inspect configuration privately and retry.');process.exitCode=1;}
}
