(() => {
  let current, api, contextKey='',jobs=[],busy=false,connected=null;
  const node=id=>document.getElementById(id);
  const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',ogg:'video/ogg',ogv:'video/ogg'};
  const type=file=>file.type||types[file.name.split('.').pop().toLowerCase()]||'';
  const key=ctx=>JSON.stringify([ctx.base,ctx.account,ctx.name,ctx.host,ctx.preview]);
  async function hostRequest(ctx,path,method='GET') {
    const response=await fetch(`${ctx.base}/dropbox/${path}`,{method,headers:{'X-Host-Password':ctx.password},cache:'no-store'});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Unable to connect to Dropbox. Deploy the updated Worker and check its settings.');return result;
  }
  function updateControls() {
    node('dropboxHostControls').hidden=!current?.host||current.preview||connected===true;
    node('dropboxCheckConnection').hidden=!current||current.preview||connected===true;
  }
  async function status({silent=false}={}) {
    if(!current)return;
    const ctx=current,ctxKey=key(ctx);
    if(!silent){node('dropboxConnectionStatus').textContent='Checking Dropbox…';node('dropboxInlineUpload').hidden=true;}
    try {
      if(ctx.preview)throw new Error('Return to Host View to connect Dropbox or upload.');
      let result;
      if(ctx.host)result=await hostRequest(ctx,'status');else result=await api(ctx,'/dropbox-upload/status');
      if(key(current)!==ctxKey)return;
      connected=result.connected;updateControls();
      node('dropboxInlineUpload').hidden=!result.connected;
      node('dropboxConnectionStatus').textContent=result.connected?'Dropbox is connected. Photos and videos uploaded here go directly to the hosts’ Dropbox.':ctx.host?'Connect Dropbox to enable uploads here. Your Dropbox app needs files.content.write permission.':'Website uploads are not connected yet. Please try again later.';
      node('dropboxConnect').textContent=result.connected?'Reconnect Dropbox':'Connect Dropbox';
      if(ctx.host&&!result.configured)node('dropboxConnectionStatus').textContent='Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET in Cloudflare Worker secrets, then choose Connect Dropbox.';
    }catch(error){if(key(current)===ctxKey){connected=false;updateControls();node('dropboxInlineUpload').hidden=true;node('dropboxConnectionStatus').textContent=error.message;}}
  }
  function show(ctx,apiMethod) {
    api=apiMethod;current=ctx;
    if(contextKey!==key(ctx)){connected=null;contextKey=key(ctx);jobs=[];node('dropboxFiles').value='';node('dropboxUploadStatus').textContent='';status();}
    updateControls();
  }
  node('dropboxCheckConnection').addEventListener('click',()=>status());
  function recheck(){if(current&&!busy&&!document.hidden&&node('weddingMediaSection').getClientRects().length>0)status({silent:true});}
  window.addEventListener('focus',recheck);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)recheck();});
  setInterval(recheck,60000);
  node('dropboxConnect').addEventListener('click',async()=>{
    if(!current.host||current.preview)return;
    const ctx=current,popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
    try{const result=await hostRequest(ctx,'connect','POST');if(popup)popup.location.href=result.url;else throw new Error('Allow pop-ups, then choose Connect Dropbox again.');}
    catch(error){popup?.close();node('dropboxConnectionStatus').textContent=error.message;}
  });
  node('dropboxFiles').addEventListener('change',()=>{jobs=[...node('dropboxFiles').files].map(file=>({file,offset:0}));node('dropboxUploadStatus').textContent=`${jobs.length} files selected.`;});
  node('dropboxUpload').addEventListener('click',async()=>{
    if(busy)return;const ctx=current,ctxKey=key(ctx),batch=[...jobs];
    if(!batch.length){node('dropboxUploadStatus').textContent='Choose photos or videos first.';return;}
    if(ctx.preview)return;
    busy=true;node('dropboxUpload').disabled=true;node('dropboxFiles').disabled=true;const failures=[];
    for(const [index,job] of batch.entries()){
      if(job.done)continue;
      try{
        const contentType=type(job.file);if(!Object.values(types).includes(contentType)||!job.file.size)throw new Error('Choose a supported photo or video.');
        if(!job.id){const started=await api(ctx,'/dropbox-upload/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:job.file.name,size:job.file.size,contentType})});job.id=started.id;}
        while(job.offset<job.file.size){
          if(key(current)!==ctxKey)throw new Error('Your signed-in account changed. Select files again to resume.');
          node('dropboxUploadStatus').textContent=`Uploading ${index+1} of ${batch.length}: ${job.file.name} (${Math.floor(job.offset/job.file.size*100)}%)`;
          const chunk=job.file.slice(job.offset,job.offset+8*1024*1024);
          const result=await api(ctx,`/dropbox-upload/${job.id}/chunk?offset=${job.offset}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:chunk});job.offset=result.offset;
        }
        await api(ctx,`/dropbox-upload/${job.id}/finish`,{method:'POST'});job.done=true;
      }catch(error){failures.push(`${job.file.name}: ${error.message}`);}
    }
    busy=false;node('dropboxUpload').disabled=false;node('dropboxFiles').disabled=false;
    if(failures.length && key(current)===ctxKey)status({silent:true});
    if(key(current)===ctxKey){const done=batch.filter(job=>job.done).length;node('dropboxUploadStatus').textContent=`${done} of ${batch.length} uploaded to Dropbox.${failures.length?' '+failures.join(' ')+' Press Upload to retry unfinished files.':''}`;if(!failures.length){jobs=[];node('dropboxFiles').value='';}}
  });
  globalThis.DropboxUpload={show};
})();
