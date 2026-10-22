/* One print/email component for built-in and dynamically created tab pages. */
(() => {
  const pageSelector = 'main > :is(.gathering-page,.bride-groom-section,.wedding-party-section,.wedding-timeline-section,.registry-section)';
  const visible = element => element && !element.closest('[hidden]') && element.getClientRects().length > 0;
  const escape = text => { const node=document.createElement('span');node.textContent=text;return node.innerHTML; };
  function surfaceFor(panel) {
    return panel.closest('main > section,main > [role="tabpanel"]') || panel.closest('#weddingMediaSection');
  }
  function sync() {
    const surfaces = new Set(document.querySelectorAll(pageSelector));
    document.querySelectorAll('#eventPage [role="tab"][aria-controls],#weddingMediaDialog [role="tab"][aria-controls]').forEach(tab => {
      const panel=document.getElementById(tab.getAttribute('aria-controls'));
      const surface=panel && surfaceFor(panel);
      if(surface)surfaces.add(surface);
    });
    for(const surface of surfaces) {
      surface.classList.add('page-action-surface');
      if(surface.querySelector(':scope > [data-page-actions]'))continue;
      const actions=document.createElement('div');
      actions.className='page-actions';actions.dataset.pageActions='';
      actions.setAttribute('role','group');actions.setAttribute('aria-label','Page actions');
      actions.innerHTML='<button type="button" data-page-print>Print Page</button><a href="mailto:" data-page-email>Email Page</a>';
      surface.append(actions);
    }
  }
  function exportPage(surface) {
    if(!visible(surface))return null;
    if(surface.id === 'gatheringMenuSection' && api.menuExport)return api.menuExport();
    const selected=surface.querySelector('[role="tab"][aria-selected="true"]');
    const controlled=selected && document.getElementById(selected.getAttribute('aria-controls'));
    const content=controlled && surface.contains(controlled) && visible(controlled)?controlled:surface;
    const heading=document.getElementById(surface.getAttribute('aria-labelledby')) || surface.querySelector('h1,h2,h3');
    const title=selected?.textContent.trim() || heading?.textContent.trim() || surface.getAttribute('aria-label') || 'Page';
    const copy=content.cloneNode(true);
    const originals=[content,...content.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
    originals.forEach((original,index)=>{
      if(index && original.tagName!=='SOURCE' && (original.hidden || getComputedStyle(original).display==='none' || getComputedStyle(original).visibility==='hidden'))clones[index].remove();
    });
    copy.querySelectorAll('[hidden],[data-page-actions],button,nav,script,style,form,input,select,textarea,.inline-edit-control,.inline-tab-tools,.inline-editor').forEach(node=>node.remove());
    copy.querySelectorAll('details').forEach(node=>{node.open=true;});
    // Never put a gallery's bearer session URL into a printable/email document.
    const privateFile = raw => {
      try { const url=new URL(raw,document.baseURI);return url.pathname.startsWith('/wedding-media/') && url.searchParams.has('session'); }
      catch { return false; }
    };
    const signIn=new URL('.',document.baseURI).href;
    copy.querySelectorAll('a[href],img[src],video[src],source[src]').forEach(node=>{
      const url=node.getAttribute('href') || node.getAttribute('src');
      if(!privateFile(url))return;
      const link=document.createElement('a');link.href=signIn;
      link.textContent=`${node.getAttribute('alt') || 'Private file'} (sign in to view)`;
      node.replaceWith(link);
    });
    copy.querySelectorAll('iframe,video,audio').forEach(node=>{
      const url=node.getAttribute('src') || node.querySelector('source')?.getAttribute('src');
      if(!url){node.remove();return;}
      const link=document.createElement('a');link.href=url;link.textContent=`${node.localName==='audio'?'Audio':'Video'}: ${link.href}`;node.replaceWith(link);
    });
    copy.querySelectorAll('img').forEach(image=>{image.loading='eager';});
    for(const node of [copy,...copy.querySelectorAll('*')]) {
      node.removeAttribute('id');node.removeAttribute('contenteditable');
      for(const attribute of [...node.attributes])if(attribute.name.startsWith('on'))node.removeAttribute(attribute.name);
    }
    const firstHeading=copy.querySelector('h1,h2,h3');
    if(firstHeading && (content===surface || firstHeading.textContent.trim()===title))firstHeading.remove();
    const holder=document.createElement('div');holder.className='page-export-preview';
    const textCopy=copy.cloneNode(true);
    textCopy.querySelectorAll('a[href]').forEach(link=>{link.append(` (${link.href})`);});
    textCopy.querySelectorAll('img').forEach(image=>{image.replaceWith(`${image.alt || 'Image'}: ${image.src}`);});
    holder.append(textCopy);document.body.append(holder);
    const text=textCopy.innerText.trim();holder.remove();
    return {title,text,html:copy.innerHTML};
  }
  function printPage(page) {
    document.querySelector('#pagePrintFrame')?.remove();
    const frame=document.createElement('iframe');frame.id='pagePrintFrame';frame.title='Printable page';frame.className='page-export-preview';
    frame.onload=()=>{
      frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});
      frame.contentWindow.focus();frame.contentWindow.print();
    };
    frame.srcdoc=`<!doctype html><html><head><meta charset="UTF-8"><base href="${escape(document.baseURI)}"><title>${escape(page.title)}</title><style>body{font:16px/1.5 Georgia,serif;color:#111;padding:24px}h1{font-size:26px}img{max-width:100%;height:auto}article,details{margin:16px 0}summary{font-weight:bold}.wedding-party-role,.wedding-party-member-name{display:block}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #aaa}a{color:inherit}a,li,p{overflow-wrap:anywhere}@media print{body{padding:0}img{max-height:8in;object-fit:contain}}</style></head><body><h1>${escape(page.title)}</h1>${page.html}</body></html>`;
    document.body.append(frame);
  }
  const api={sync,exportPage,printPage};
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-page-print],[data-page-email]');
    if(!control)return;
    const page=exportPage(control.closest('.page-action-surface'));
    if(!page){event.preventDefault();return;}
    if(control.hasAttribute('data-page-print'))api.printPage(page);
    else control.href=`mailto:?subject=${encodeURIComponent(`The Meyers — ${page.title}`)}&body=${encodeURIComponent(`${page.title}\n\n${page.text}`)}`;
  });
  globalThis.PageActions=api;
})();
