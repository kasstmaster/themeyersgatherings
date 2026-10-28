(() => {
  let current, mode = '', loadNumber = 0;
  const sessions = new Map();
  const node = id => document.getElementById(id);
  const key = ctx => JSON.stringify([ctx.base, ctx.host ? 'host' : ctx.account, ctx.name, ctx.preview, ctx.eventId]);
  function available(ctx) {
    if (ctx.preview) throw new Error('Uploads and private galleries are unavailable in View As. Return to Host View to use them.');
    if (!ctx.base) throw new Error('Photo and video uploads are not configured yet.');
  }
  async function session(ctx) {
    available(ctx);
    const cached = sessions.get(key(ctx));
    if (cached && cached.expires > Date.now() + 10000) return cached.token;
    const response = await fetch(`${ctx.base}/wedding-media/session`, { method:'POST', headers:StateClient.headers({'Content-Type':'application/json'}), body:JSON.stringify({name:ctx.name,eventId:ctx.eventId,preview:ctx.host===false&&StateClient.role==='host'}), cache:'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Upload service unavailable. Deploy the latest Worker before using uploads.');
    sessions.set(key(ctx), result); return result.token;
  }
  async function api(ctx, path, options = {}) {
    const token = await session(ctx);
    const response = await fetch(`${ctx.base}/wedding-media${path}`, { ...options, headers:{ ...options.headers, ...StateClient.headers(), 'X-Media-Session':token }, cache:'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { if (response.status === 401) sessions.delete(key(ctx)); throw new Error(result.error || `Upload service failed (${response.status}).`); }
    return result;
  }
  function selectShareMode(value) {
    mode=value;
    node('weddingMediaUploadForm').hidden=mode!=='upload';
    node('weddingMediaLinkForm').hidden=mode!=='link';
    node('weddingMediaChooseUpload').setAttribute('aria-expanded',String(mode==='upload'));
    node('weddingMediaShareLink').setAttribute('aria-expanded',String(mode==='link'));
    node('weddingMediaChooseUpload').setAttribute('aria-pressed',String(mode==='upload'));node('weddingMediaShareLink').setAttribute('aria-pressed',String(mode==='link'));
    if(mode==='upload')DropboxUpload.show(current,api);
    if(mode==='link')node('weddingMediaLink').focus();
    globalThis.GapLayout?.refresh();
  }
  function show(ctx) {
    ctx = { ...ctx, base:ctx.base.replace(/\/$/,'') };
    if (!current || key(current) !== key(ctx)) {
      current = ctx;node('mediaUploadFeedback').hidden=true;selectShareMode('');node('weddingMediaShareOptions').hidden=true;node('weddingMediaShare').setAttribute('aria-expanded','false');node('weddingMediaLinkStatus').textContent='';node('weddingMediaLink').value='';node('weddingMediaGallery').replaceChildren();loadGallery();
    } else current=ctx;
    if(mode==='upload')DropboxUpload.show(ctx, api);
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
        if(item.kind==='dropbox'){const receipt=document.createElement('p');receipt.textContent='Uploaded to the hosts’ Dropbox.';card.append(receipt);gallery.append(card);continue;}
        const url=item.kind==='link'?item.url:`${ctx.base}/wedding-media/${item.path}?session=${encodeURIComponent(token)}`;
        if (item.kind==='image' && !['image/heic','image/heif'].includes(item.contentType)) {const img=document.createElement('img');img.src=url;img.alt=item.name;img.loading='lazy';img.referrerPolicy='no-referrer';card.append(img);}
        if (item.kind==='video') {const video=document.createElement('video');video.src=url;video.controls=true;video.playsInline=true;video.preload='metadata';card.append(video);}
        const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.kind==='link'?'Open shared photos & videos':'Open / download original';card.append(link);gallery.append(card);
      }
    } catch(error) { if(attempt===loadNumber)status.textContent=error.message; }
  }
  function initialize() {
    node('weddingMediaShare').addEventListener('click',()=>{
      const options=node('weddingMediaShareOptions');options.hidden=!options.hidden;
      node('weddingMediaShare').setAttribute('aria-expanded',String(!options.hidden));
      if(options.hidden)selectShareMode('');
      globalThis.GapLayout?.refresh();
    });
    node('weddingMediaChooseUpload').addEventListener('click',()=>selectShareMode('upload'));
    node('weddingMediaShareLink').addEventListener('click',()=>selectShareMode('link'));
    node('weddingMediaSaveLink').addEventListener('click',async()=>{
      const ctx=current,button=node('weddingMediaSaveLink'),status=node('weddingMediaLinkStatus');
      let url;try{url=new URL(node('weddingMediaLink').value.trim());if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{status.textContent='Enter a full http or https photo-sharing link.';return;}
      button.disabled=true;try{await api(ctx,'/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.href})});node('weddingMediaLink').value='';status.textContent='Sharing link saved.';loadGallery();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
  }
  globalThis.WeddingMedia={show,uploadsFinished:ctx=>{if(current && key(current)===key(ctx))return loadGallery();}};
  initialize();
})();
