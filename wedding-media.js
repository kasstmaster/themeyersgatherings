(() => {
  const extensions = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif', heic:'image/heic', heif:'image/heif', mp4:'video/mp4', mov:'video/quicktime', webm:'video/webm', ogg:'video/ogg', ogv:'video/ogg' };
  const types = new Set(Object.values(extensions));
  const fileType = file => file.type || extensions[file.name.split('.').pop().toLowerCase()] || '';
  function validate(file) {
    const type = fileType(file);
    if (!types.has(type)) return 'Unsupported photo or video format.';
    if (!file.size) return 'This file is empty.';
    if (file.size > (type.startsWith('video/') ? 50_000_000 : 15_000_000)) return type.startsWith('video/') ? 'Videos must be 50 MB or smaller.' : 'Photos must be 15 MB or smaller.';
    return '';
  }
  let current, pending = [], busy = false, tab = 'upload', loadNumber = 0;
  const sessions = new Map();
  const node = id => document.getElementById(id);
  const key = ctx => JSON.stringify([ctx.base, ctx.host ? 'host' : ctx.account, ctx.name, ctx.preview]);
  function available(ctx) {
    if (ctx.preview) throw new Error('Uploads and private galleries are unavailable in View As. Return to Host View to use them.');
    if (!ctx.base) throw new Error('Wedding uploads are not configured yet.');
  }
  async function session(ctx) {
    available(ctx);
    const cached = sessions.get(key(ctx));
    if (cached && cached.expires > Date.now() + 10000) return cached.token;
    const response = await fetch(`${ctx.base}/wedding-media/session`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(ctx.host ? {'X-Host-Password':ctx.password} : {}) }, body:JSON.stringify({name:ctx.name}), cache:'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Upload service unavailable. Deploy the latest Worker before using uploads.');
    sessions.set(key(ctx), result); return result.token;
  }
  async function api(ctx, path, options = {}) {
    const token = await session(ctx);
    const response = await fetch(`${ctx.base}/wedding-media${path}`, { ...options, headers:{ ...options.headers, Authorization:`Bearer ${token}` }, cache:'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { if (response.status === 401) sessions.delete(key(ctx)); throw new Error(result.error || `Upload service failed (${response.status}).`); }
    return result;
  }
  function selectTab(value) {
    tab = value;
    document.querySelectorAll('[data-media-tab]').forEach(button => { const active = button.dataset.mediaTab === tab; button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1; });
    node('weddingMediaUpload').hidden = tab !== 'upload'; node('weddingMediaView').hidden = tab !== 'view';
    if (tab === 'view') loadGallery();
  }
  function show(ctx) {
    ctx = { ...ctx, base:ctx.base.replace(/\/$/,'') };
    if (!current || key(current) !== key(ctx)) {
      current = ctx; pending = []; node('weddingMediaFiles').value='';node('weddingMediaLink').value='';node('weddingMediaGallery').replaceChildren();node('weddingMediaStatus').textContent='';selectTab('upload');
    } else current=ctx;
    node('weddingMediaPrivacy').textContent = ctx.host ? 'You can view all uploads and sharing links, with the names of the people who submitted them.' : 'Only your account and the host can view your uploads and sharing links.';
  }
  async function loadGallery() {
    const ctx=current, attempt=++loadNumber;
    const gallery=node('weddingMediaGallery'), status=node('weddingMediaGalleryStatus');
    gallery.replaceChildren();status.textContent='Loading…';
    try {
      const result=await api(ctx,'/');const token=await session(ctx);
      if (attempt!==loadNumber || key(current)!==key(ctx)) return;
      status.textContent=result.items.length?'':'No photos, videos, or sharing links have been submitted yet.';
      for (const item of result.items) {
        const card=document.createElement('article');card.className='wedding-media-card';
        const heading=document.createElement('h3');heading.textContent=item.name;card.append(heading);
        const caption=document.createElement('p');caption.textContent=`${item.uploadedBy} · ${new Date(item.uploadedAt).toLocaleString()}`;card.append(caption);
        if (result.host) {const account=document.createElement('p');account.textContent=`Account: ${item.accountName}`;card.append(account);}
        const url=item.kind==='link'?item.url:`${ctx.base}/wedding-media/${item.path}?session=${encodeURIComponent(token)}`;
        if (item.kind==='image' && !['image/heic','image/heif'].includes(item.contentType)) {const img=document.createElement('img');img.src=url;img.alt=item.name;img.loading='lazy';img.referrerPolicy='no-referrer';card.append(img);}
        if (item.kind==='video') {const video=document.createElement('video');video.src=url;video.controls=true;video.playsInline=true;video.preload='metadata';card.append(video);}
        const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.kind==='link'?'Open shared photos & videos':'Open / download original';card.append(link);gallery.append(card);
      }
    } catch(error) { if(attempt===loadNumber)status.textContent=error.message; }
  }
  function initialize() {
    document.querySelectorAll('[data-media-tab]').forEach(button=>button.addEventListener('click',()=>selectTab(button.dataset.mediaTab)));
    node('weddingMediaTabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectTab(event.key==='Home'?'upload':event.key==='End'?'view':tab==='upload'?'view':'upload');document.querySelector(`[data-media-tab="${tab}"]`).focus();});
    node('weddingMediaFiles').addEventListener('change',()=>{pending=[...node('weddingMediaFiles').files];node('weddingMediaStatus').textContent=`${pending.length} file${pending.length===1?'':'s'} selected.`;});
    node('weddingMediaUploadButton').addEventListener('click',async()=>{
      if(busy)return;const ctx=current,files=[...pending],failed=[],messages=[];const status=node('weddingMediaStatus');
      if(!files.length){status.textContent='Choose photos or videos first.';return;}
      try{available(ctx);}catch(error){status.textContent=error.message;return;}
      busy=true;node('weddingMediaUploadButton').disabled=true;node('weddingMediaFiles').disabled=true;
      for(const [index,file] of files.entries()){
        status.textContent=`Uploading ${index+1} of ${files.length}: ${file.name}`;
        try{const error=validate(file);if(error)throw new Error(error);await api(ctx,`/upload?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':fileType(file)},body:file});}
        catch(error){failed.push(file);messages.push(`${file.name}: ${error.message}`);}
      }
      busy=false;node('weddingMediaUploadButton').disabled=false;node('weddingMediaFiles').disabled=false;
      if(key(ctx)===key(current)){pending=failed;node('weddingMediaFiles').value='';status.textContent=`${files.length-failed.length} of ${files.length} uploaded. ${messages.join(' ')}${failed.length?' Press Upload to retry failed files.':''}`;if(tab==='view')loadGallery();}
    });
    node('weddingMediaSaveLink').addEventListener('click',async()=>{
      const ctx=current,button=node('weddingMediaSaveLink'),status=node('weddingMediaLinkStatus');
      let url;try{url=new URL(node('weddingMediaLink').value.trim());if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{status.textContent='Enter a full http or https photo-sharing link.';return;}
      button.disabled=true;try{await api(ctx,'/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.href})});node('weddingMediaLink').value='';status.textContent='Sharing link saved. Find it in View Photos & Videos.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
    node('weddingMediaRefresh').addEventListener('click',loadGallery);
  }
  globalThis.WeddingMedia={show,validate,fileType};
  initialize();
})();
