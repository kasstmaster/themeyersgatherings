import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const endpoint='https://curly-sun-ef0f.kassandraraudman.workers.dev/health/state-auth';
export async function diagnose(env,fetcher=fetch) {
  const expected=env.EXPECTED_COMMIT;
  if(!/^[a-f0-9]{40}$/.test(expected||''))throw new Error('Expected release commit is required.');
  const report={expectedCommit:expected};
  try {
    const response=await fetcher(endpoint,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    report.healthHttpStatus=response.status;
    const body=await response.json();
    report.healthProtocol=body.protocol==='state-auth-v1'?'state-auth-v1':'unexpected';
    report.healthReady=body.ready===true;
    report.healthCommit=/^[a-f0-9]{40}$/.test(body.commit||'')?body.commit:null;
    report.healthCommitMatches=body.commit===expected;
    report.checks={};
    for(const key of ['activationReady','hostPasswordReady','storageReady','githubReady','releaseCommitReady'])if(typeof body.checks?.[key]==='boolean')report.checks[key]=body.checks[key];
  } catch {report.healthRequestOrJsonFailed=true;}
  for(const [name,suffix] of [['frontend','?commit='+expected],['frontendWithoutQuery','']])try {
    const response=await fetcher('https://themeyers.ilymmd.com/release.json'+suffix,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    report[name+'HttpStatus']=response.status;
    report[name+'ContentTypeJson']=(response.headers.get('Content-Type')||'').includes('application/json');
    const body=await response.json();
    report[name+'Commit']=/^[a-f0-9]{40}$/.test(body.commit||'')?body.commit:null;
    report[name+'ProtocolMatches']=body.protocol==='state-auth-v1';
    report[name+'CommitMatches']=body.commit===expected;
  } catch {report[name+'RequestOrJsonFailed']=true;}
  if(env.CLOUDFLARE_API_TOKEN&&env.CLOUDFLARE_ACCOUNT_ID) {
    const base='https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/workers/scripts/curly-sun-ef0f';
    for(const kind of ['settings','deployments'])try {
      const response=await fetcher(base+'/'+kind,{headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},redirect:'error',signal:AbortSignal.timeout(15000)});
      report[kind+'HttpStatus']=response.status;if(!response.ok)continue;
      const body=await response.json();if(body.success!==true)continue;
      if(kind==='settings') {
        const bindings=body.result.bindings||[];
        report.hostSecretPresent=bindings.some(v=>v.name==='HOST_PASSWORD'&&v.type==='secret_text');
        report.readinessMarkerIsSecret=bindings.some(v=>v.name==='AUTH_MIGRATION_READY'&&v.type==='secret_text');
        report.releaseCommitBindingMatches=bindings.some(v=>v.name==='RELEASE_COMMIT'&&v.type==='plain_text'&&v.text===expected);
        report.stateRepositoryBindingMatches=bindings.some(v=>v.name==='GITHUB_REPOSITORY'&&v.text==='kasstmaster/themeyersevents-data');
        report.r2BindingMatches=bindings.some(v=>v.name==='INVITATION_BACKGROUNDS'&&v.type==='r2_bucket'&&v.bucket_name==='meyers-invitation-backgrounds');
      } else {
        report.activeVersions=(body.result.deployments?.[0]?.versions||[]).map(v=>({id:/^[a-f0-9-]{36}$/.test(v.version_id||'')?v.version_id:null,percentage:typeof v.percentage==='number'?v.percentage:null}));
      }
    } catch {report[kind+'RequestFailed']=true;}
  }
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {console.log(JSON.stringify(await diagnose(process.env)));}
  catch {console.error('Read-only diagnostic could not complete. No response bodies or credentials are logged.');process.exitCode=1;}
}
