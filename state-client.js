/* Runtime tokens only; persistent sessions use a first-party HttpOnly cookie. */
(() => {
 let token='',role='',revision='',baseline=null,conflicted=false,expired=false,generation=0,cookieRequest;
 const clone=value=>structuredClone(value);
 const SIGNED_OUT='meyers-explicit-signout-v1';
 const authBase=base=>globalThis.location?.origin==='https://themeyers.ilymmd.com'?'/session':base;
 const signedOut=()=>{try{return Boolean(globalThis.localStorage?.getItem(SIGNED_OUT));}catch{return false;}};
 function markSignedOut(value){try{if(value)globalThis.localStorage?.setItem(SIGNED_OUT,String(Date.now()));else globalThis.localStorage?.removeItem(SIGNED_OUT);}catch{/* Cookie revocation still works when storage is disabled. */}}
 function accept(result){token=result.token;role=result.role;revision=result.revision;conflicted=false;expired=false;}

 const headers=extra=>({...(token?{Authorization:`Bearer ${token}`}:{}),...extra});
 function cancelCookieRequest(){cookieRequest?.abort();cookieRequest=null;}
 async function json(base,path,options={}){
  const response=await fetch(base.replace(/\/$/,'')+path,{signal:globalThis.AbortSignal?.timeout?.(15000),...options,headers:headers({'Content-Type':'application/json',...options.headers}),cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(result.error||'The service could not complete this request.'),{status:response.status});
  return result;
 }
 function remember(state,acceptedRevision){baseline=clone(state);if(acceptedRevision)revision=acceptedRevision;conflicted=false;}
 async function persistent(base,input,accessToken){
  cancelCookieRequest();const controller=globalThis.AbortController?new AbortController():null;cookieRequest=controller;
  const signal=controller&&globalThis.AbortSignal?.any?AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]):controller?.signal;
  try{return await json(authBase(base),'/auth/session',{method:'POST',headers:accessToken?{Authorization:'Bearer '+accessToken}:{},body:JSON.stringify(input),...(signal?{signal}:{})});}
  finally{if(cookieRequest===controller)cookieRequest=null;}
 }
 async function signIn(base,input){
  cancelCookieRequest();const attempt=++generation;let result=await json(base,'/auth/login',{method:'POST',body:JSON.stringify(input)});
  if(attempt!==generation)throw new Error('Sign-in was superseded.');if(result.next)return result;
  if(authBase(base)!==base){try{result=await persistent(base,{},result.token);}catch{result={...result,persistent:false};}}
  if(attempt!==generation)throw new Error('Sign-in was superseded.');accept(result);markSignedOut(false);return result;
 }
 async function resume(base,qrToken){
  if(authBase(base)===base||signedOut())return null;
  const attempt=++generation;
  try{const result=await persistent(base,{qrToken});if(attempt!==generation)return null;accept(result);return result;}
  catch(error){if(attempt!==generation||error.status===401)return null;throw error;}
 }
 async function read(base){if(!token)return null;const owner=generation;try{const result=await json(base,'/state');return owner===generation?result:null;}catch(error){if(owner===generation&&error.status===401)expired=true;throw error;}}
 async function save(base,state){
  if(!token)throw Object.assign(new Error('Sign in again before syncing your changes.'),{status:401});
  if(!baseline||!revision)throw Object.assign(new Error('This draft has no verified revision. Reload current information first.'),{status:409});
  if(conflicted)throw Object.assign(new Error('Newer information is available. Your local draft is retained; load the latest information before editing again.'),{status:409});
  const owner=generation;const submitted=clone(state);
  let changes=SharedStateProtocol.changes(baseline,submitted).filter(change=>change.path[0]!=='savedAt');
  if(role==='guest')changes=changes.filter(({path})=>path[0]==='events'&&['rsvps','items','drinksItems'].includes(path[2]));
  if(!changes.length){remember(submitted);return;}
  try{const result=await json(base,'/state',{method:'PATCH',headers:{'If-Match':revision},body:JSON.stringify({changes})});if(owner!==generation)return;revision=result.revision;baseline=submitted;return result;}
  catch(error){if(owner!==generation)throw error;if(error.status===401)expired=true;if(error.status===409||error.status===428)conflicted=true;throw error;}
 }
 async function manageGathering(base,command){
  if(role!=='host'||!revision||conflicted)throw new Error('Reload current Host information before managing gatherings.');
  const owner=generation;const result=await json(base,'/gathering-management',{method:'PATCH',headers:{'If-Match':revision},body:JSON.stringify(command)});
  if(owner!==generation)throw new Error('Sign-in changed. Reload before continuing.');remember(result.state,result.revision);return result;
 }
 async function signOut(base){
  cancelCookieRequest();const previous=token;generation++;markSignedOut(true);token='';role='';revision='';baseline=null;conflicted=false;expired=false;
  try{if(previous||authBase(base)!==base)await json(authBase(base),'/auth/logout',{method:'POST',headers:previous?{Authorization:'Bearer '+previous}:{},body:'{}'});}catch{/* Explicit sign-out suppresses cookie restoration even when offline. */}
 }

 globalThis.StateClient={manageGathering,headers,signIn,signOut,resume,read,save,remember,get authenticated(){return Boolean(token);},get role(){return role;},get conflicted(){return conflicted;},get expired(){return expired;}};
})();
