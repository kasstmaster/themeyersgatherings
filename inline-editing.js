/* Shared field/page metadata for the single selection-based editing toolbar. */
(() => {
  let enabled=false,flushing=false,context;
  const cleanup=[],editTargets=new Map(),textRoots=new Set(),originals=new Map(),selectedCustom=new Map(),layoutOriginals=new Map();
  const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
  let undoSteps=[],redoSteps=[],undoBaseline=null,undoEvent='',undoActive=false,replaying=false,undoGroup=null;
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  function changes(before,after,path=[]){
    if(path[0]==='rsvps')return [];
    if(same(before,after))return [];
    if(before && after && typeof before==='object' && typeof after==='object' && !Array.isArray(before) && !Array.isArray(after))return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>changes(before[key],after[key],[...path,key]));
    return [{path,before:structuredClone(before),after:structuredClone(after)}];
  }
  function beginUndoGroup(){
    if(!enabled || !context?.host || replaying)return;
    undoGroup={baseline:structuredClone(context.state),index:undoSteps.length,recorded:false};
  }
  function endUndoGroup(){undoGroup=null;}
  function recordUndo(){
    if(!enabled || !context?.host || replaying || !undoBaseline)return;
    const next=structuredClone(context.state),patches=changes(undoGroup?.baseline || undoBaseline,next);
    if(patches.length)redoSteps=[];
    if(undoGroup){
      if(patches.length){if(undoGroup.recorded)undoSteps[undoGroup.index]=patches;else{undoGroup.index=undoSteps.length;undoSteps.push(patches);undoGroup.recorded=true;}}
      else if(undoGroup.recorded){undoSteps.splice(undoGroup.index,1);undoGroup.recorded=false;}
    }else if(patches.length)undoSteps.push(patches);
    if(undoSteps.length>50){undoSteps.shift();if(undoGroup?.recorded)undoGroup.index--;}
    undoBaseline=next;globalThis.ElementEditor?.refreshUndo();
  }
  function replayHistory(redo=false){
    const source=redo?redoSteps:undoSteps,destination=redo?undoSteps:redoSteps;
    if(!enabled || !context?.host || !source.length)return false;
    const patches=source.at(-1),get=path=>path.reduce((value,key)=>value?.[key],context.state),from=redo?'before':'after',to=redo?'after':'before';
    if(patches.some(patch=>!same(get(patch.path),patch[from])))return false;
    replaying=true;
    try{
      ElementEditor.beforeRender();
      for(const patch of patches){const {path}=patch,value=patch[to];let parent=context.state;for(const key of path.slice(0,-1))parent=parent[key]??={};const key=path.at(-1);if(value===undefined)delete parent[key];else parent[key]=structuredClone(value);}
      source.pop();destination.push(patches);undoBaseline=structuredClone(context.state);context.save();return true;
    }finally{replaying=false;globalThis.ElementEditor?.refreshUndo();}
  }
  const undo=()=>replayHistory(),redo=()=>replayHistory(true);
  function button(text,action,parent,label=text){
    if(!parent || !enabled || !context.host)return;
    const entry=editTargets.get(parent) || {};entry.options??={};entry.options.actions??=[];entry.options.actions.push([label,action]);editTargets.set(parent,entry);cleanup.push(()=>editTargets.delete(parent));
  }
  function beforeRender(){ElementEditor.beforeRender();textRoots.clear();while(cleanup.length)cleanup.pop()();for(const [parent,children] of layoutOriginals)for(const child of children)if(child.isConnected && parent.isConnected)parent.append(child);layoutOriginals.clear();}
  function render(ctx){undoGroup=null;context=ctx;const active=Boolean(enabled && ctx.host);if(!active || !undoActive || undoEvent!==ctx.eventId){undoSteps=[];redoSteps=[];}undoBaseline=active?structuredClone(ctx.state):null;undoEvent=ctx.eventId;undoActive=active;if(!ctx.host)enabled=false;const toggle=document.querySelector('#editItemsButton');toggle.textContent='Edit';toggle.setAttribute('aria-pressed',String(enabled));document.querySelector('#invitationTemplatesButton').hidden=!ctx.host || !enabled;document.body.classList.toggle('site-edit-mode',enabled && ctx.host);}
  function field(target,title,fields,commit,options={}){
    if(!target)return;
    const textBlock=fields.some(spec=>spec.type==='textarea') && !target.matches('section');if(textBlock)textRoots.add(target);
    if(!enabled || !context.host || editTargets.has(target))return;
    editTargets.set(target,{fields,title,commit,options,textBlock,visual:Boolean(fields[0]?.visual)});cleanup.push(()=>editTargets.delete(target));
  }
  function portal(target,title,sources,prepare){if(!target || !enabled || !context.host)return;const entry=editTargets.get(target) || {};entry.portal={title,sources,prepare};editTargets.set(target,entry);cleanup.push(()=>editTargets.delete(target));}
  function formatTextForTarget(target, value, format=context.format) {
    return format(value,{inline:/^(?:H[1-6]|P|ADDRESS)$/.test(target.tagName)});
  }
  function staticTextElements(root) {
    // Text blocks, headings and captions can be changed without changing links or controls.
    return [...root.querySelectorAll('h1,h2,h3,h4,p,footer address')].filter(element =>
      !(element.closest('dialog') && !root.matches('dialog')) && !element.closest('.element-editor-toolbar,#hostToolsPanel,#editItemsButton,#rsvpFirstPageText,#rsvpFirstPageDetails,#menuGrid,[id^="admin"],#hostNotesContent,#brideGroomContent,#perfectExperienceContent,#whatToExpectContent,#weddingTimelineSection,#weddingPartyPersonalPage,#weddingPartyDetails,footer,[role="status"],.form-error,.wedding-party-attire-images,.attire-video-grid') &&
      !element.querySelector('button,input,select,textarea') && !element.matches('#eventAddress,#rsvpDeadline,#signedInAccountName,#customGatheringHeading,#weddingPartyHeading,#weddingPartyKicker'));
  }
  function applyStaticText(root,state,format) {
    const data=state.siteText || {};
    for(const element of staticTextElements(root).filter(element=>!textOwner(element.parentElement))) {
      const path=selectorPath(element,root);
      if(Object.hasOwn(data,path))element.innerHTML=formatTextForTarget(element,data[path],format);
    }
  }
  function staticText(root) {
    const data = context.state.siteText || {};
    const elements=staticTextElements(root).filter(element=>!textOwner(element.parentElement));
    for (const [element, path] of elements.map(element => [element, selectorPath(element, root)])) {
      if (!originals.has(path)) originals.set(path, element.innerHTML);
      const initial = element.innerHTML;
      if (Object.hasOwn(data, path)) element.innerHTML = formatTextForTarget(element,data[path]);
      else if (element.closest('footer') || !element.id) element.innerHTML = originals.get(path);
      cleanup.push(() => { element.innerHTML = initial; });
      field(element, element.tagName === 'ADDRESS' ? 'footer' : 'text', [{ label: 'Text (Markdown supported)', type: 'textarea', value: data[path] ?? element.innerText }], ([value]) => {
        context.state.siteText ??= {}; context.state.siteText[path] = value;
      }, { key: path, placement: 'text' });
    }
  }
  function selectorPath(element, root) {
    const parts = [];
    for (let current = element; current && current !== root; current = current.parentElement) {
      if (current.id) { parts.unshift(`#${current.id}`); break; }
      const siblings = [...current.parentElement.querySelectorAll(':scope > *')].filter(child => child.tagName === current.tagName);
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    return parts.join('>');
  }
  function tabs(nav, config = {}) {
    if (!nav || !nav.id) return;
    const state = context.state;
    const buttons = [...nav.querySelectorAll(':scope > button')];
    const tabKeys = new Map();
    const visibleTabs = () => [...nav.querySelectorAll(':scope > button')].filter(tab => !tab.hidden);
    function moveTab(tab,direction){
      const neighbor=visibleTabs()[visibleTabs().indexOf(tab)+direction];if(!neighbor)return;
      if(direction<0)nav.insertBefore(tab,neighbor);else nav.insertBefore(neighbor,tab);
      state.siteTabOrder??={};state.siteTabOrder[nav.id]=[...nav.querySelectorAll(':scope>button')].map(item=>tabKeys.get(item));context.save();
    }
    // Restore built-in DOM order before the next render so positional tab keys stay stable.
    cleanup.push(() => buttons.forEach(tab => nav.append(tab)));
    const hiddenTabs = state.siteHiddenTabs || [];
    const panelIds = [...new Set([...buttons.map(tab=>tab.getAttribute('aria-controls')),...(config.panelIds || [])].filter(Boolean))];
    let active = false;
    const navOriginallyHidden = nav.hidden;
    const visible = !nav.parentElement.closest('[hidden]') && (!nav.hidden || config.available);
    if (!visible) return;
    // Migrate the host-created Wedding guest information page to its intended audience.
    // Store the audience on the page so subsequent title edits retain that restriction.
    for (const page of state.sitePages || []) {
      if (context.eventId === 'wedding' && page.nav === 'weddingPartyTabs' &&
          String(page.title || '').trim().replace(/\s+/g, ' ').toLowerCase() === 'what to expect' &&
          (!page.audience || page.audience === 'all')) page.audience = 'guests';
    }
    const extraPages = (state.sitePages || []).filter(page => page.nav === nav.id &&
      (context.host || page.audience === 'all' || page.audience === 'party' && context.party || page.audience === 'guests' && !context.party));
    buttons.forEach((tab, index) => {
      const key = `${nav.id}:${Object.entries(tab.dataset).map(([key, value]) => `${key}=${value}`).join('|') || index}`;
      tabKeys.set(tab, key);
      const originalHidden = tab.hidden;
      const originalText = tab.textContent;
      if (state.siteTabTitles?.[key]) tab.textContent = state.siteTabTitles[key];
      cleanup.push(() => { tab.hidden = originalHidden; tab.textContent = originalText; });
      const replacement=config.replacement?.(tab,extraPages);
      if(replacement){
        tab.hidden=true;
        const panel=document.getElementById(tab.getAttribute('aria-controls'));
        if(panel){const hidden=panel.hidden;panel.hidden=true;cleanup.push(()=>{panel.hidden=hidden;});}
        if(tab.getAttribute('aria-selected')==='true')selectedCustom.set(`${context.eventId}:${nav.id}`,replacement.id);
        return;
      }
      if (hiddenTabs.includes(key)) {
        tab.hidden = true;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) { const hidden = panel.hidden; panel.hidden = true; cleanup.push(() => { panel.hidden = hidden; }); }
        return;
      }
      if (!tab.hidden && tab.getAttribute('aria-selected') === 'true') active = true;
      if (enabled && context.host && !tab.hidden) {
        const rename = title => {
          if (config.rename) config.rename(tab, title);
          else { state.siteTabTitles ??= {}; state.siteTabTitles[key] = title; }
        };
        const actions=[['Move left',()=>moveTab(tab,-1)],['Move right',()=>moveTab(tab,1)],['Delete page',()=>{
          if(!window.confirm(`Delete the “${tab.textContent}” page?`))return;
          if(config.remove)config.remove(tab);else{state.siteHiddenTabs??=[];state.siteHiddenTabs.push(key);}context.save();
        }]];
        field(tab,'text',[{label:'Page title',value:tab.textContent,required:true}],([title])=>rename(title),{actions});
      }
      tab.addEventListener('click', clearCustom);
      cleanup.push(() => tab.removeEventListener('click', clearCustom));
    });
    function clearCustom() { selectedCustom.delete(`${context.eventId}:${nav.id}`); }
    const selectionKey = `${context.eventId}:${nav.id}`;
    if(!selectedCustom.has(selectionKey) && config.defaultPage){const page=extraPages.find(config.defaultPage);if(page)selectedCustom.set(selectionKey,page.id);}
    const selected = extraPages.find(page => page.id === selectedCustom.get(selectionKey));
    if (selected) {
      buttons.forEach(tab => tab.setAttribute('aria-selected', 'false'));
      panelIds.forEach(id => { const panel = document.getElementById(id); if (panel) { const hidden = panel.hidden; panel.hidden = true; cleanup.push(() => { panel.hidden = hidden; }); } });
    }
    extraPages.forEach(page => {
      const tab = node('button', page.title); tab.type = 'button'; tab.setAttribute('role',config.toolbar?'button':'tab'); tab.setAttribute('aria-selected', String(selected?.id === page.id));
      tab.setAttribute('aria-controls', `custom-page-${page.id}`);
      tab.hidden=Boolean(config.hidePage?.(page));
      tabKeys.set(tab, `custom:${page.id}`);
      nav.append(tab); cleanup.push(() => tab.remove());
      tab.addEventListener('click', () => { selectedCustom.set(selectionKey, page.id); context.refresh();if(config.scroll)document.getElementById(`custom-page-${page.id}`)?.scrollIntoView({block:'start',behavior:'auto'}); });
      if (enabled && context.host) field(tab,'text',[{label:'Page title',value:page.title,required:true}],([title])=>{page.title=title;},{actions:[['Move left',()=>moveTab(tab,-1)],['Move right',()=>moveTab(tab,1)],['Delete page',()=>{if(window.confirm(`Delete the “${page.title}” page?`)){state.sitePages=state.sitePages.filter(item=>item.id!==page.id);context.save();}}]]});
      if (selected?.id === page.id) {
        const isSubpage = nav.classList.contains('matron-info-tabs');
        const panel = node('section', undefined, `gathering-page inline-custom-page${isSubpage ? ' gathering-subpage' : ''}`);
        if(nav.closest('.fullscreen-flow'))panel.classList.add('flow-panel');
        if(context.eventId==='wedding')panel.classList.add('wedding-tab-page');
        panel.id = `custom-page-${page.id}`; panel.setAttribute('role','tabpanel');
        const heading = isSubpage ? 'h3' : 'h2';
        panel.innerHTML = (config.externalHeading?'':`<p class="section-kicker"></p><${heading}>${context.escape(page.title)}</${heading}>`)+`<div class="bride-groom-content">${context.format(page.content)}</div>`;
        if(context.eventId==='wedding')panel.querySelector('.bride-groom-content').classList.add('wedding-tab-content');
        if(page.weddingDefault==='details')panel.querySelector('.bride-groom-content').setAttribute('data-shared-details','');
        const intro=panel.querySelector('.section-kicker');
        if(intro)intro.innerHTML=formatTextForTarget(intro,page.intro || '');
        if(config.pageHost)config.pageHost.append(panel);else nav.after(panel); cleanup.push(() => panel.remove());
        field(intro, 'text', [{label:'Text above title',type:'textarea',value:page.intro || ''}], ([value]) => { page.intro=value; }, {key:`${page.id}:intro`,placement:'text'});
        if(!config.externalHeading)field(panel.querySelector(heading),'text',[{label:'Title',value:page.title,required:true}],([title])=>{page.title=title;},{key:`${page.id}:title`,placement:'text'});
        field(panel.querySelector('.bride-groom-content'),'text',[{label:'Content',type:'textarea',value:page.content}],([content])=>{page.content=content;},{key:page.id,placement:'text'});
      }
    });
    const order = state.siteTabOrder?.[nav.id] || [];
    const orderedTabs = [...nav.querySelectorAll(':scope > button')];
    const rank = tab => { const index = order.indexOf(tabKeys.get(tab)); return index < 0 ? order.length : index; };
    orderedTabs.sort((a, b) => rank(a) - rank(b)).forEach(tab => nav.append(tab));
    config.onSelect?.(selected || null);
    if(enabled && context.host){
      const entry=editTargets.get(nav) || {};entry.addPage=title=>{
        if(config.add){config.add();context.save();return;}
        const page={id:crypto.randomUUID(),nav:nav.id,title,intro:'',content:'',audience:config.audience || 'all'};
        state.sitePages??=[];state.sitePages.push(page);selectedCustom.set(selectionKey,page.id);context.save();
      };editTargets.set(nav,entry);cleanup.push(()=>editTargets.delete(nav));
    }
    if (extraPages.length && !nav.parentElement.closest('[hidden]')) { nav.hidden = false; cleanup.push(() => { nav.hidden = navOriginallyHidden; }); }
    if (!config.allowNoSelection && !active && !selected && buttons.some(tab => !tab.hidden)) {
      const first = visibleTabs().find(tab => buttons.includes(tab));
      if (first.getAttribute('aria-selected') !== 'true') queueMicrotask(() => { if (first.isConnected) first.click(); });
    }
  }
  function movableText(root,{contentRoot=null,headerIds=[]}={}){
    for(const text of root.querySelectorAll('p[id]'))if(!layoutOriginals.has(text.parentElement))layoutOriginals.set(text.parentElement,[...text.parentElement.children]);
    for(const [path,placement] of Object.entries(context.state.siteElementPlacements || {})){
      let text,parent,before;try{text=document.querySelector(path);parent=document.querySelector(placement.parent);before=placement.before?document.querySelector(placement.before):null;}catch{continue;}
      if(text?.matches('p[id]') && root.contains(text) && root.contains(parent) && !text.contains(parent) && (!before || before.parentElement===parent))parent.insertBefore(text,before);
    }
    const orders=context.state.siteElementOrder || {};
    for(const [path,ids] of Object.entries(orders)){
      let parent;try{parent=document.querySelector(path);}catch{continue;}
      if(!parent || !root.contains(parent) || !Array.isArray(ids))continue;
      const children=[...parent.children].filter(child=>!child.matches('.existing-layout-gap,gathering-gap'));
      const ordered=ids.map(id=>children.find(child=>ElementAppearance.selector(child)===id)).filter(Boolean);
      for(const child of children)if(!ordered.includes(child))ordered.push(child);
      for(const child of ordered)parent.append(child);
    }
    if(contentRoot){for(const id of headerIds){const text=root.querySelector('#'+CSS.escape(id));if(text && (text.parentElement!==root || [...root.children].indexOf(text)>[...root.children].indexOf(contentRoot)))root.insertBefore(text,contentRoot);}const children=[...root.children],panelIndex=children.indexOf(contentRoot),bodyTexts=children.filter(text=>text.matches('p[id]') && !headerIds.includes(text.id));contentRoot.prepend(...bodyTexts.filter(text=>children.indexOf(text)<panelIndex));contentRoot.append(...bodyTexts.filter(text=>children.indexOf(text)>panelIndex));}
    if(!enabled || !context.host)return;
    for(const text of root.querySelectorAll('p[id]')){
      const record=editTargets.get(text);if(!record || text.closest('[role="status"],[role="alert"]'))continue;
      text.draggable=true;cleanup.push(()=>text.removeAttribute('draggable'));record.options??={};record.options.movableRoot=contentRoot && !headerIds.includes(text.id)?contentRoot:root;record.options.headerOnly=headerIds.includes(text.id);
      const move=direction=>{
        const parent=text.parentElement,children=[...parent.children].filter(child=>!child.matches('.existing-layout-gap,gathering-gap'));
        const neighbor=children[children.indexOf(text)+direction];if(!neighbor)return;
        if(direction<0)parent.insertBefore(text,neighbor);else parent.insertBefore(neighbor,text);
        context.state.siteElementOrder??={};context.state.siteElementOrder[ElementAppearance.selector(parent)]=[...parent.children].filter(child=>!child.matches('.existing-layout-gap,gathering-gap')).map(child=>ElementAppearance.selector(child));context.save();
      };
      record.options??={};record.options.actions??=[];record.options.actions.push(['Move up',()=>move(-1)],['Move down',()=>move(1)]);
    }
  }
  function movableTextRoot(element){
    const text=element?.closest('p[id]'),root=text && editTargets.get(text)?.options?.movableRoot;
    return enabled && context.host && root?{text,root}:null;
  }
  function canMoveText(text,anchor){
    const info=movableTextRoot(text),parent=anchor?.parentElement;
    return Boolean(info && (!editTargets.get(text)?.options?.headerOnly || anchor.parentElement===info.root) && text!==anchor && !text.contains(anchor) && info.root.contains(parent) && parent.matches('div,section,article') && !anchor.closest('.wedding-media-gallery,[role="status"],[role="alert"],.element-editor-toolbar'));
  }
  function moveTextTo(text,anchor,before){
    if(!canMoveText(text,anchor))return null;
    SiteEditing.flush();const path=ElementAppearance.selector(text),oldParent=text.parentElement,parent=anchor.parentElement;
    let oldNext=text.nextElementSibling;while(oldNext?.matches('.existing-layout-gap,gathering-gap'))oldNext=oldNext.nextElementSibling;
    let next=before?anchor:anchor.nextElementSibling;while(next?.matches('.existing-layout-gap,gathering-gap'))next=next.nextElementSibling;if(next===text)return text;
    const placements=context.state.siteElementPlacements??={};
    for(const placement of Object.values(placements))if(placement.before===path)placement.before=oldNext?ElementAppearance.selector(oldNext):null;
    parent.insertBefore(text,next);
    placements[path]={parent:ElementAppearance.selector(parent),before:next?ElementAppearance.selector(next):null};
    if(context.state.siteElementOrder){delete context.state.siteElementOrder[ElementAppearance.selector(oldParent)];delete context.state.siteElementOrder[ElementAppearance.selector(parent)];}
    context.save();return document.querySelector(path);
  }
  function textOwner(element){for(let current=element;current;current=current.parentElement)if(textRoots.has(current) || editTargets.get(current)?.textBlock || editTargets.get(current)?.visual)return current;return null;}
  function textElement(target){
    field(target,'text',[{label:'Text',type:target.matches('button,a') && !ElementAppearance.isMultiline(target)?'text':'textarea',visual:true,readonly:['count-values','dish-details','dish-claimants'].includes(ElementAppearance.group(target)) || target.matches('.summary-item,.summary-stat,.counter-row,output,.event-selection-choices>button,label:has(input,select,textarea)'),value:ElementAppearance.textValue(target)}],()=>{},{key:`text-style:${ElementAppearance.selector(target)}`,placement:'element-edit'});
    if(editTargets.has(target))editTargets.get(target).visual=true;
  }
  globalThis.SiteEditing={
    recordUndo,beginUndoGroup,endUndoGroup,undo,redo,get canRedo(){return redoSteps.length>0;},get canUndo(){return undoSteps.length>0;},
    settings(target,title,build){if(!target || !enabled || !context.host)return;const entry=editTargets.get(target) || {};entry.settings={title,build};editTargets.set(target,entry);cleanup.push(()=>editTargets.delete(target));},
    editorFor:target=>editTargets.get(target),get editorTargets(){return [...editTargets.keys()];},
    persist(action){flushing=true;try{action?.();context.save();}finally{flushing=false;}},get editorContext(){return context;},
    beforeRender,render,field,portal,staticText,applyStaticText,tabs,button,textElement,textOwner,movableText,movableTextRoot,canMoveText,moveTextTo,
    resetTabSelection(navId,eventId=context?.eventId){selectedCustom.delete(`${eventId}:${navId}`);},
    flush(){ElementEditor.flush();},get flushing(){return flushing;},get portalOpen(){return Boolean(document.querySelector('.inline-portal-editor'));},
    get enabled(){return enabled && context?.host;},toggle(refresh){if(enabled)this.flush();enabled=!enabled;refresh();}
  };
})();
