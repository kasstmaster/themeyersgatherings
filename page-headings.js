/* Keep each active main page's authored heading above its tab group. */
(() => {
  const moved=[];
  function restore(){
    for(const {nodes,header} of moved.splice(0)){
      for(const {element,anchor} of nodes)anchor.replaceWith(element);
      header.remove();
    }
  }
  function headingFor(panel){return moved.find(entry=>entry.panel===panel)?.nodes.map(item=>item.element).find(element=>/^H[1-6]$/.test(element.tagName));}
  function sync(){
    restore();
    document.querySelectorAll('#eventPage .wedding-party-tabs,#rsvpWeddingPages .wedding-party-tabs').forEach(nav=>{
      if(nav.hidden || nav.closest('[hidden]') || nav.closest('#weddingMediaDialog'))return;
      const tab=nav.querySelector(':scope > [role="tab"][aria-selected="true"]');
      const panel=tab && document.getElementById(tab.getAttribute('aria-controls'));
      if(!panel || panel.closest('[hidden]'))return;
      const elements=[...panel.querySelectorAll(':scope > .section-kicker,:scope > h1,:scope > h2,:scope > h3,:scope > .menu-heading > h2')].filter(element=>!element.hidden);
      if(!elements.some(element=>/^H[1-6]$/.test(element.tagName)))return;
      const header=document.createElement('header');header.className='wedding-tab-page tab-page-heading';
      const nodes=elements.map(element=>{const anchor=document.createComment('page heading');element.before(anchor);header.append(element);return {element,anchor};});
      nav.before(header);moved.push({panel,nodes,header});
    });
  }
  globalThis.PageHeadings={restore,sync,headingFor};
})();
