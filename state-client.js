/* Runtime authorization only: no credentials or session tokens in shipped state. */
(() => {
 let token='',role='',revision='',baseline=null,conflicted=false,expired=false,generation=0;
 const clone=value=>structuredClone(value);
 const headers=extra=>({...extra,...(token?{Authorization:`Bearer ${token}`}:{})});
 async function json(base,path,options={}){
  const response=await fetch(base.replace(/\/$/,'')+path,{...options,headers:headers({'Content-Type':'application/json',...options.headers}),cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(result.error||'The service could not complete this request.'),{status:response.status});
  return result;
 }
 function remember(state,acceptedRevision){baseline=clone(state);if(acceptedRevision)revision=acceptedRevision;conflicted=false;}
 async function signIn(base,input){const attempt=++generation;const result=await json(base,'/auth/login',{method:'POST',body:JSON.stringify(input)});if(attempt!==generation)throw new Error('Sign-in was superseded.');token=result.token;role=result.role;revision=result.revision;conflicted=false;expired=false;return result;}
 async function read(base){if(!token)return null;const owner=generation;try{const result=await json(base,'/state');return owner===generation?result:null;}catch(error){if(owner===generation&&error.status===401)expired=true;throw error;}}
 async function save(base,state){
  if(!token)throw Object.assign(new Error('Sign in again before syncing your changes.'),{status:401});
  if(!baseline||!revision)throw Object.assign(new Error('This draft has no verified revision. Reload current information first.'),{status:409});
  if(conflicted)throw Object.assign(new Error('Newer information is available. Your local draft is retained; load the latest information before editing again.'),{status:409});
  const owner=generation;const submitted=clone(state);
  let changes=SharedStateProtocol.changes(baseline,submitted).filter(change=>change.path[0]!=='savedAt');
  if(role==='guest')changes=changes.filter(({path})=>path[0]==='events'&&['rsvps','items'].includes(path[2]));
  if(!changes.length){remember(submitted);return;}
  try{const result=await json(base,'/state',{method:'PATCH',headers:{'If-Match':revision},body:JSON.stringify({changes})});if(owner!==generation)return;revision=result.revision;baseline=submitted;return result;}
  catch(error){if(owner!==generation)throw error;if(error.status===401)expired=true;if(error.status===409||error.status===428)conflicted=true;throw error;}
 }
 async function signOut(base){try{if(token)await json(base,'/auth/logout',{method:'POST'});}catch{/* Local sign-out must still finish if the expired session cannot be revoked. */}finally{generation++;token='';role='';revision='';baseline=null;conflicted=false;expired=false;}}
 globalThis.StateClient={headers,signIn,signOut,read,save,remember,get authenticated(){return Boolean(token);},get role(){return role;},get conflicted(){return conflicted;},get expired(){return expired;}};
})();
