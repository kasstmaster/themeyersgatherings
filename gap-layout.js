/* Saved directional spacers use stable anchors and the same layout in every gathering. */
(() => {
  let context,dragging,marker,placement,movingSpace,draggingText,draggingAxis='y';
  const nodes=new Map(),virtuals=new Map(),virtualInfo=new WeakMap(),originalStyles=[];
  const excluded='.editor-ribbon-space,#hostToolsPanel,.element-editor-toolbar,.host-fixed-edit,.gap-drop-marker,.existing-layout-gap,.editor-dialog,#newGatheringDialog,#gatheringHistoryDialog';
  const find=selector=>{try{return document.querySelector(selector);}catch{return null;}};
  let sideFrame=0;
  const sideResize=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(sideFrame)return;sideFrame=requestAnimationFrame(()=>{sideFrame=0;if(context){applySpacing();scanSpaces();}});}):null;
  const size=value=>Math.max(0,Math.min(1000,Math.round(Number(value)||0)));
  function enabled(){return context?.host && context.editing;}
  function beforeRender(){sideResize?.disconnect();if(sideFrame)cancelAnimationFrame(sideFrame);sideFrame=0;for(const element of virtuals.values())element.remove();virtuals.clear();restoreSpacing();for(const element of nodes.values())element.remove();nodes.clear();clearMarker();}
  function paintGap(element,gap){
    const axis=gap.axis==='x'?'x':'y',amount=size(gap.size);element.dataset.gapAxis=axis;
    element.hidden=false;Object.assign(element.style,{left:'',top:'',display:'block',position:axis==='x'?'absolute':'relative',width:axis==='x'?amount+'px':'100%',height:axis==='x'?'1em':amount+'px',flexBasis:axis==='x'?amount+'px':'auto'});
    element.dataset.gapLabel=`${axis==='x'?'Vertical':'Horizontal'} gap · ${amount} px`;element.setAttribute('aria-label',element.dataset.gapLabel);element.setAttribute('aria-orientation',axis==='x'?'vertical':'horizontal');
  }
  function render(ctx){
    context=ctx;
    const remaining=(Array.isArray(ctx.state.siteGaps)?ctx.state.siteGaps:[]).filter(gap=>gap && typeof gap.id==='string' && typeof gap.parent==='string');
    for(let pass=0,total=remaining.length;pass<=total;pass++){
      let progress=false;
      for(let index=remaining.length-1;index>=0;index--){
        const gap=remaining[index],parent=find(gap.parent),before=gap.before?find(gap.before):null;
        if(!parent || gap.before && !before || before && before.parentElement!==parent || parent.closest(excluded) || !parent.matches('div,section,main,header,footer,form,fieldset,nav,article'))continue;
        let element=nodes.get(gap.id);
        if(!element){element=document.createElement('gathering-gap');element.id='gathering-gap-'+gap.id;element.dataset.gapId=gap.id;element.style.display='block';nodes.set(gap.id,element);}
        paintGap(element,gap);
        element.draggable=enabled();element.tabIndex=enabled()?0:-1;element.setAttribute('role','separator');element.setAttribute('aria-label',element.dataset.gapLabel);element.setAttribute('aria-hidden',String(!enabled()));
        parent.insertBefore(element,before);remaining.splice(index,1);progress=true;
      }
      if(!progress)break;
    }
    applySpacing();scanSpaces();sideResize?.disconnect();for(const gap of ctx.state.siteGaps || [])if(gap.axis==='x'){const node=nodes.get(gap.id),anchor=gap.anchor?find(gap.anchor):gap.before?find(gap.before):node?.previousElementSibling;if(anchor){sideResize?.observe(anchor);if(anchor.parentElement)sideResize?.observe(anchor.parentElement);}}
  }
  function candidate(start,axis='y'){
    const virtual=start?.closest('.existing-layout-gap');if(virtual){const info=virtualInfo.get(virtual);start=info?find(info.after):null;}
    if(!start || start.closest(excluded) || start.closest('[hidden],[data-rsvp-flow-hidden]'))return null;
    const root=globalThis.activeHostDialog?.() || document.querySelector('#eventPage:not([hidden]),#eventSelectionPage:not([hidden]),#attirePage:not([hidden]),#signInPage:not([hidden])');
    if(!root?.contains(start))return null;
    let element=start.closest('gathering-gap') || SiteEditing.textOwner(start) || start.closest('button,h1,h2,h3,h4,p,time,img,article,section,fieldset,nav,.wedding-tab-content,.event-header-text');
    const control=element?.closest('button,a,label');if(control)element=control;
    const nav=element?.closest('nav:not(.toolbar-page-navigation)');if(nav && axis!=='x')element=nav;
    if(!element || !element.parentElement || element.closest(excluded) || !element.parentElement.matches('div,section,main,header,footer,form,fieldset,nav,article'))return null;
    return element;
  }
  function put(element,before,id,axis='y'){
    if(!enabled() || !element?.parentElement)return null;
    const parent=element.parentElement,next=before?element:element.nextElementSibling;
    if(id && next?.dataset.gapId===id)return nodes.get(id);
    context.state.siteGaps??=[];
    const record=context.state.siteGaps.find(gap=>gap.id===id) || {id:crypto.randomUUID(),size:24,axis};
    const own=nodes.get(record.id);let anchor=next;
    if(anchor===own)anchor=own.nextElementSibling;
    const previous=own?.previousElementSibling;
    for(const info of Object.values(context.state.siteSpacing || {}))if(info.before==='#'+own?.id && previous)info.before=ElementAppearance.selector(previous);
    if(own)for(const gap of context.state.siteGaps)if(gap!==record && gap.before==='#'+own.id)gap.before=own.nextElementSibling?ElementAppearance.selector(own.nextElementSibling):null;
    record.parent=ElementAppearance.selector(parent);record.before=anchor?ElementAppearance.selector(anchor):null;
    record.anchor=ElementAppearance.selector(element);record.side=before?'before':'after';
    for(const gap of context.state.siteGaps)if(gap!==record && gap.parent===record.parent && gap.before===record.before)gap.before='#gathering-gap-'+record.id;

    for(const [key,info] of Object.entries(context.state.siteSpacing || {}))if(!info.padding && info.axis==='y' && info.parent===record.parent && info.after===record.before){delete context.state.siteSpacing[key];info.before='#gathering-gap-'+record.id;info.key=[info.parent,info.before,info.after,info.axis,''].join('|');context.state.siteSpacing[info.key]=info;}

    if(!context.state.siteGaps.includes(record))context.state.siteGaps.push(record);
    normalizeSpacing();
    own?.remove();render(context);context.save();return nodes.get(record.id);
  }
  function normalizeSpacing(){if(context.state.siteSpacing){const spacing={};for(const info of Object.values(context.state.siteSpacing)){info.key=[info.parent,info.before || '',info.after,info.axis,info.padding || ''].join('|');spacing[info.key]=info;}context.state.siteSpacing=spacing;}}
  function getAxis(element){return virtualInfo.get(element)?.axis || element?.dataset.gapAxis || 'y';}
  function getSize(element){return virtualInfo.get(element)?.size ?? (parseFloat(element?.style[getAxis(element)==='x'?'width':'height']) || 0);}
  function setAxis(element,axis){const gap=context?.state.siteGaps?.find(gap=>gap.id===element?.dataset.gapId);if(!enabled() || !gap)return;gap.axis=axis==='x'?'x':'y';paintGap(element,gap);applySpacing();scanSpaces();context.save();}
  function setSize(element,value){
    if(!enabled())return;
    const info=virtualInfo.get(element);
    if(info){context.state.siteSpacing??={};context.state.siteSpacing[info.key]={...info,size:size(value)};applySpacing();scanSpaces();context.save();return;}
    const gap=context.state.siteGaps?.find(gap=>gap.id===element?.dataset.gapId);if(!gap)return;gap.size=size(value);paintGap(element,gap);applySpacing();scanSpaces();context.save();
  }
  function remove(element){
    if(!enabled())return;
    if(virtualInfo.has(element)){setSize(element,0);return;}
    const id=element?.dataset.gapId;context.state.siteGaps=(context.state.siteGaps || []).filter(gap=>gap.id!==id);for(const gap of context.state.siteGaps)if(gap.before==='#'+element.id)gap.before=element.nextElementSibling?ElementAppearance.selector(element.nextElementSibling):null;for(const [key,info] of Object.entries(context.state.siteSpacing || {})){if(info.after==='#'+element.id)delete context.state.siteSpacing[key];else if(info.before==='#'+element.id){if(element.previousElementSibling)info.before=ElementAppearance.selector(element.previousElementSibling);else delete context.state.siteSpacing[key];}}element.remove();nodes.delete(id);normalizeSpacing();applySpacing();scanSpaces();context.save();
  }
  function restoreSpacing(){for(const [element,property,value,priority] of originalStyles.reverse()){if(value)element.style.setProperty(property,value,priority);else element.style.removeProperty(property);}originalStyles.length=0;}
  function setStyle(element,property,value){originalStyles.push([element,property,element.style.getPropertyValue(property),element.style.getPropertyPriority(property)]);element.style.setProperty(property,value+'px','important');}
  function applySideGaps(){
    const anchors=new Map();
    for(const gap of context?.state.siteGaps || []){
      if(gap.axis!=='x')continue;const element=nodes.get(gap.id),anchor=gap.anchor?find(gap.anchor):gap.before?find(gap.before):element?.previousElementSibling;
      if(!element || !anchor || anchor.matches('gathering-gap') || anchor.parentElement!==element.parentElement || !anchor.getClientRects().length || anchor.closest('[hidden],[data-rsvp-flow-hidden]')){if(element)element.hidden=true;continue;}
      element.hidden=false;if(!anchors.has(anchor))anchors.set(anchor,[]);anchors.get(anchor).push({element,gap,side:gap.side || (gap.before?'before':'after')});
    }
    for(const [anchor,entries] of anchors){
      const left=entries.filter(entry=>entry.side==='before').reduce((sum,entry)=>sum+size(entry.gap.size),0),right=entries.filter(entry=>entry.side==='after').reduce((sum,entry)=>sum+size(entry.gap.size),0),style=getComputedStyle(anchor),parent=anchor.parentElement,parentStyle=getComputedStyle(parent);
      if(left)setStyle(anchor,'margin-left',(parseFloat(style.marginLeft)||0)+left);if(right)setStyle(anchor,'margin-right',(parseFloat(style.marginRight)||0)+right);
      const width=parent.clientWidth-(parseFloat(parentStyle.paddingLeft)||0)-(parseFloat(parentStyle.paddingRight)||0)-left-right;
      const originalLimit=style.maxWidth.endsWith('%')?parent.clientWidth*parseFloat(style.maxWidth)/100:parseFloat(style.maxWidth);
      setStyle(anchor,'max-width',Math.max(0,Math.min(width,Number.isFinite(originalLimit)?originalLimit:Infinity)));const rect=anchor.getBoundingClientRect();let before=left,after=0;
      for(const {element,gap,side} of entries){const amount=size(gap.size),owner=element.offsetParent || document.documentElement,origin=owner.getBoundingClientRect();const x=side==='before'?rect.left-before:rect.right+after;if(side==='before')before-=amount;else after+=amount;Object.assign(element.style,{left:(x-origin.left-owner.clientLeft+owner.scrollLeft)+'px',top:(rect.top-origin.top-owner.clientTop+owner.scrollTop)+'px',height:rect.height+'px'});}
    }
  }
  function applySpacing(){
    restoreSpacing();applySideGaps();
    for(const info of Object.values(context?.state.siteSpacing || {})){
      const after=find(info.after),before=info.before?find(info.before):null,parent=find(info.parent);if(!after || !parent || after.parentElement!==parent || parent.closest(excluded) || !after.getClientRects().length || before && !before.getClientRects().length)continue;
      const horizontal=info.axis==='x',property=horizontal?'margin-left':'margin-top';
      if(before && before.parentElement===parent){
        setStyle(before,horizontal?'margin-right':'margin-bottom',0);
        setStyle(after,property,0);
        for(let pass=0;pass<3;pass++){const a=before.getBoundingClientRect(),b=after.getBoundingClientRect(),actual=horizontal?b.left-a.right:b.top-a.bottom,current=parseFloat(getComputedStyle(after).getPropertyValue(property))||0;setStyle(after,property,current+size(info.size)-actual);}
      }else if(info.padding && ['padding-top','padding-bottom','padding-left','padding-right'].includes(info.padding))setStyle(parent,info.padding,size(info.size));
    }
  }
  function scanSpaces(){
    if(!enabled()){for(const element of virtuals.values())element.remove();virtuals.clear();return;}
    const root=globalThis.activeHostDialog?.() || document.querySelector('#eventPage:not([hidden]),#eventSelectionPage:not([hidden]),#attirePage:not([hidden]),#signInPage:not([hidden])');if(!root)return;
    const seen=new Set(),owner=globalThis.activeHostDialog?.() || document.body;
    const add=(parent,before,after,axis,rect,padding)=>{
      const value=axis==='x'?rect.width:rect.height;if(value<2 || rect.width<2 || rect.height<2)return;
      const info={key:[ElementAppearance.selector(parent),before?ElementAppearance.selector(before):'',ElementAppearance.selector(after),axis,padding || ''].join('|'),parent:ElementAppearance.selector(parent),before:before?ElementAppearance.selector(before):null,after:ElementAppearance.selector(after),axis,padding,size:Math.round(value)};
      seen.add(info.key);let element=virtuals.get(info.key);if(!element){element=document.createElement('div');element.className='existing-layout-gap';element.id='existing-gap-'+crypto.randomUUID();element.tabIndex=0;element.draggable=true;element.setAttribute('role','separator');virtuals.set(info.key,element);owner.append(element);}
      virtualInfo.set(element,info);element.dataset.gapAfter=info.after;element.dataset.gapBefore=info.before || '';element.dataset.gapLabel=`Gap · ${info.size} px`;element.setAttribute('aria-label',`${element.dataset.gapLabel} · ${padding || (before?ElementAppearance.label(before)+' → ':'')+ElementAppearance.label(after)}`);Object.assign(element.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',display:rect.bottom<0||rect.top>innerHeight?'none':'block',pointerEvents:'auto'});
    };
    for(const parent of [root,...root.querySelectorAll('div,section,main,header,footer,form,fieldset,nav,article')]){
      if(parent.closest(excluded) || parent.closest('[hidden],[data-rsvp-flow-hidden]') || !parent.getClientRects().length)continue;
      const children=[...parent.querySelectorAll(':scope>*')].filter(element=>!element.matches('.existing-layout-gap,script,style') && !element.closest(excluded) && !element.hidden && !element.hasAttribute('data-rsvp-flow-hidden') && element.getClientRects().length && !['absolute','fixed'].includes(getComputedStyle(element).position));
      if(!SiteEditing.textOwner(parent))for(let index=1;index<children.length;index++){
        const before=children[index-1],after=children[index],a=before.getBoundingClientRect(),b=after.getBoundingClientRect();
        let spacer=false;for(let sibling=before.nextElementSibling;sibling && sibling!==after;sibling=sibling.nextElementSibling)if(sibling.matches('gathering-gap'))spacer=true;if(spacer)continue;
        if(b.top-a.bottom>=2 && Math.min(a.right,b.right)-Math.max(a.left,b.left)>10)add(parent,before,after,'y',{left:Math.max(a.left,b.left),top:a.bottom,width:Math.min(a.right,b.right)-Math.max(a.left,b.left),height:b.top-a.bottom,bottom:b.top});
        else if(b.left-a.right>=2 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>10)add(parent,before,after,'x',{left:a.right,top:Math.max(a.top,b.top),width:b.left-a.right,height:Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top),bottom:Math.min(a.bottom,b.bottom)});
      }
      if(children.length){const rect=parent.getBoundingClientRect();for(const [padding,top,height] of [['padding-top',rect.top+(parseFloat(getComputedStyle(parent).borderTopWidth)||0),parseFloat(getComputedStyle(parent).paddingTop)],['padding-bottom',rect.bottom-(parseFloat(getComputedStyle(parent).borderBottomWidth)||0)-parseFloat(getComputedStyle(parent).paddingBottom),parseFloat(getComputedStyle(parent).paddingBottom)]])if(height>=2)add(parent,null,children[padding==='padding-top'?0:children.length-1],'y',{left:rect.left+2,top,width:Math.max(0,rect.width-4),height,bottom:top+height},padding);}
    }
    for(const parent of [root,...root.querySelectorAll('div,section,main,header,footer,form,fieldset,article')]){
      if(parent.closest(excluded) || parent.closest('[hidden],[data-rsvp-flow-hidden]') || !parent.getClientRects().length)continue;
      const child=parent.querySelector(':scope>*:not(script):not(style):not([hidden])');if(!child)continue;const rect=parent.getBoundingClientRect(),computed=getComputedStyle(parent);
      for(const [padding,width,left] of [['padding-left',parseFloat(computed.paddingLeft),rect.left],['padding-right',parseFloat(computed.paddingRight),rect.right-parseFloat(computed.paddingRight)]])if(width>=2)add(parent,null,child,'x',{left,top:rect.top+2,width,height:Math.max(0,rect.height-4),bottom:rect.bottom-2},padding);
    }
    for(const [key,element] of virtuals)if(!seen.has(key)){element.remove();virtuals.delete(key);}
  }
  let scheduled=false;function scheduleScan(){for(const element of virtuals.values())element.style.pointerEvents='none';if(scheduled || !enabled())return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scanSpaces();});}
  window.addEventListener('resize',scheduleScan);document.addEventListener('scroll',scheduleScan,true);
  function clearMarker(){marker?.remove();marker=null;placement=null;}
  document.addEventListener('dragstart',event=>{
    if(!enabled())return;
    const text=SiteEditing.movableTextRoot(event.target);
    if(text && text.text.draggable){draggingText=text.text;dragging='text';document.body.classList.add('dragging-gap');event.dataTransfer.setData('application/x-gathering-text',ElementAppearance.selector(draggingText));event.dataTransfer.effectAllowed='move';return;}
    const gap=event.target.closest('gathering-gap,.existing-layout-gap,[data-new-gap]');if(!gap)return;
    movingSpace=virtualInfo.get(gap)?{element:gap,size:virtualInfo.get(gap).size}:null;draggingAxis=gap.hasAttribute('data-new-gap')?(gap.dataset.newGap==='x'?'x':'y'):getAxis(gap);dragging=gap.dataset.gapId || (movingSpace?'existing':'new');document.body.classList.add('dragging-gap');event.dataTransfer.setData('application/x-gathering-gap',dragging);event.dataTransfer.effectAllowed=dragging==='new'?'copy':'move';
  });
  document.addEventListener('dragover',event=>{
    if(!enabled() || !dragging)return;
    const element=candidate(event.target,draggingText?'y':draggingAxis);if(!element || element.dataset.gapId===dragging || draggingText && !SiteEditing.canMoveText(draggingText,element)){clearMarker();return;}
    event.preventDefault();const rect=element.getBoundingClientRect(),before=draggingAxis==='x'&&!draggingText?event.clientX<rect.left+rect.width/2:event.clientY<rect.top+rect.height/2;placement={element,before};
    if(!marker){marker=document.createElement('div');marker.className='gap-drop-marker';(globalThis.activeHostDialog?.() || document.body).append(marker);}
    const horizontal=draggingAxis==='x'&&!draggingText;marker.classList.toggle('horizontal-gap-marker',horizontal);Object.assign(marker.style,horizontal?{left:(before?rect.left:rect.right)+'px',top:rect.top+'px',height:rect.height+'px',width:'0px'}:{left:rect.left+'px',top:(before?rect.top:rect.bottom)+'px',width:rect.width+'px',height:'0px'});
  });
  document.addEventListener('drop',event=>{
    if(!enabled() || !dragging || !placement)return;
    event.preventDefault();const {element,before}=placement;
    if(draggingText){const result=SiteEditing.moveTextTo(draggingText,element,before);draggingText=null;clearMarker();dragging=null;document.body.classList.remove('dragging-gap');if(result)ElementEditor.select(result);return;}
    if(movingSpace)setSize(movingSpace.element,0);const result=put(element,before,['new','existing'].includes(dragging)?null:dragging,draggingAxis);if(result && movingSpace)setSize(result,movingSpace.size);movingSpace=null;clearMarker();dragging=null;document.body.classList.remove('dragging-gap');if(result)ElementEditor.select(result);
  });
  document.addEventListener('dragend',()=>{dragging=null;draggingText=null;movingSpace=null;document.body.classList.remove('dragging-gap');clearMarker();});
  globalThis.GapLayout={render,refresh:()=>{if(context)render(context);},beforeRender,setSize,remove,addAfter:(element,axis='y')=>put(candidate(element,axis),false,null,axis),getAxis,setAxis,getSize,isGap:element=>element?.matches('gathering-gap,.existing-layout-gap'),elements:()=>[...nodes.values(),...virtuals.values()]};
})();
