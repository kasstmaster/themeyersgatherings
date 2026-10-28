// Device enrollment is available only through a server-authenticated Host session.
(() => {
 let apiBase='',settings=null;
 const supported=()=>globalThis.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in globalThis&&'Notification' in globalThis;
 const keyBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
 async function request(path='',options={}){
  if(StateClient.role!=='host')throw new Error('Sign in as Host to manage notifications.');
  const result=await fetch(apiBase.replace(/\/$/,'')+'/host-push'+path,{...options,headers:StateClient.headers({'Content-Type':'application/json'}),cache:'no-store',signal:options.signal||AbortSignal.timeout(15000)});
  const value=result.status===204?{}:await result.json().catch(()=>({}));
  if(!result.ok)throw new Error(value.error||'Notifications could not be updated.');return value;
 }
 async function registration(){return await navigator.serviceWorker.getRegistration('/')||navigator.serviceWorker.register('/service-worker.js',{scope:'/'});}
 async function subscription(){if(!supported())return null;const worker=await navigator.serviceWorker.getRegistration('/');return worker?.pushManager.getSubscription()||null;}
 async function stopLocal(){try{await (await subscription())?.unsubscribe();}catch{/* Never block guest sign-in or offline sign-out. */}}
 async function disable(base=apiBase){
  apiBase=base;const current=await subscription();if(!current)return;
  await current.unsubscribe();if(StateClient.role==='host')await request('',{method:'DELETE',body:JSON.stringify({endpoint:current.endpoint}),signal:AbortSignal.timeout(3000)});
 }
 async function refresh(){
  const message=document.querySelector('#hostPushStatus'),enable=document.querySelector('#hostPushEnable'),disableButton=document.querySelector('#hostPushDisable'),test=document.querySelector('#hostPushTest');
  enable.disabled=true;disableButton.hidden=true;test.hidden=true;
  if(!supported()){message.textContent='Push notifications are not supported here. On iPhone or iPad, add this website to your Home Screen, then open it there.';return;}
  try{
   settings=await request();let current=await subscription();
   if(current&&settings.configured){const id=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(current.endpoint)))].map(value=>value.toString(16).padStart(2,'0')).join('');if(!settings.deviceIds.includes(id)){await current.unsubscribe();current=null;}}
   disableButton.hidden=!current;test.hidden=!current||!settings.configured;
   message.textContent=!settings.configured?'Host push setup is not configured yet.':current?'Notifications are enabled on this device.':Notification.permission==='denied'?'Notifications are blocked. Allow them in this website’s browser settings.':'Enable notifications to receive private Host alerts on this device.';
   enable.disabled=!settings.configured||Notification.permission==='denied'||!!current;
  }catch(error){message.textContent=error.message;}
 }
 document.querySelector('#hostPushEnable').addEventListener('click',async()=>{
  if(StateClient.role!=='host'||!settings?.configured)return;
  const button=document.querySelector('#hostPushEnable'),message=document.querySelector('#hostPushStatus');button.disabled=true;
  try{
   // Request permission directly from the click, before network or worker awaits.
   const permission=await Notification.requestPermission();if(permission!=='granted'){message.textContent='Notifications were not enabled.';return;}
   await registration();const worker=await navigator.serviceWorker.ready;
   const current=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(settings.publicKey)});
   try{await request('',{method:'POST',body:JSON.stringify({endpoint:current.endpoint})});}catch(error){await current.unsubscribe();throw error;}
   await refresh();
  }catch(error){message.textContent=error.message||'Notifications could not be enabled.';}finally{button.disabled=Notification.permission==='denied'||!!(await subscription().catch(()=>null));}
 });
 document.querySelector('#hostPushDisable').addEventListener('click',async()=>{try{await disable();await refresh();}catch(error){document.querySelector('#hostPushStatus').textContent=error.message;}});
 document.querySelector('#hostPushTest').addEventListener('click',async()=>{
  const button=document.querySelector('#hostPushTest');button.disabled=true;
  try{const current=await subscription();if(!current)throw new Error('Enable this device first.');await request('/test',{method:'POST',body:JSON.stringify({endpoint:current.endpoint})});document.querySelector('#hostPushStatus').textContent='Test accepted by the push service. Check this device’s notifications.';}
  catch(error){document.querySelector('#hostPushStatus').textContent=error.message;}finally{button.disabled=false;}
 });
 globalThis.HostNotifications={stopLocal,disable,open:async(base,openDialog=dialog=>dialog.showModal())=>{if(StateClient.role!=='host')return;apiBase=base;const dialog=document.querySelector('#hostNotificationsDialog');if(!dialog.open)openDialog(dialog);await refresh();}};
})();
