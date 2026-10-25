/* Shared per-gathering appearance editing. Untouched declarations keep their defaults. */
(() => {
  let context,editor,preview=null;
  const applied=new Map();
  const styledText=new Map();
  const controls=[];
  const properties=['background-color','background-image','background-size','background-position','background-repeat','color','border-color','border-width','border-style','border-radius'];
  const excluded='#hostToolsPanel,#editItemsButton,.element-editor-toolbar,.inline-overlay-layer,.inline-editor,.inline-text-editor,.inline-text-formatting,.inline-edit-tools,.inline-direct-input,.inline-portal-editor,.inline-meal-editor,.appearance-editor,.appearance-trigger,.inline-appearance-tools,script,style,link,meta';
  function label(element){
    if(element===document.body)return 'Page background';
    if(element.tagName.toLowerCase()==='svg')return 'Icon';
    const name=element.getAttribute('aria-label') || element.id || `${element.tagName.toLowerCase()}${element.textContent?.trim()?' — '+element.textContent.trim().replace(/\s+/g,' ').slice(0,48):''}`;
    return name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ');
  }
  function selector(element){
    if(element===document.body)return 'body';
    const parts=[];
    for(let current=element;current && current!==document.body;current=current.parentElement){
      if(current.id){parts.unshift(`#${CSS.escape(current.id)}`);break;}
      if(current.matches('.page-export-options')){parts.unshift('.page-export-options');break;}
      const identity=['data-wedding-tab','data-gathering-tab','data-matron-tab','data-media-tab','data-bride-groom-page','data-member-page','data-attire-group','data-switch-event','data-enter-event','data-claim','aria-controls'].find(key=>current.hasAttribute(key));
      if(identity){parts.unshift(`${current.tagName.toLowerCase()}[${identity}="${CSS.escape(current.getAttribute(identity))}"]`);continue;}
      const siblings=[...current.parentElement.querySelectorAll(':scope>*')].filter(item=>item.tagName===current.tagName && !item.matches('.inline-overlay-layer,.appearance-trigger,.appearance-editor'));
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current)+1})`);
    }
    return parts.join('>');
  }
  function find(path){try{return [...document.querySelectorAll(path)];}catch{return [];}}
  function colorParts(value){
    const hex=/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(String(value).trim());
    if(hex){let digits=hex[1];if(digits.length<5)digits=[...digits].map(char=>char+char).join('');return {hex:'#'+digits.slice(0,6).toLowerCase(),alpha:digits.length===8?Math.round(parseInt(digits.slice(6),16)/255*100):100};}
    if(value==='transparent')return {hex:'#000000',alpha:0};
    const rgb=/^rgba?\(([^)]+)\)/.exec(value || '');
    if(rgb){const parts=rgb[1].split(/[,\s/]+/).filter(Boolean);return {hex:'#'+parts.slice(0,3).map(part=>Math.max(0,Math.min(255,Math.round(parseFloat(part)*(part.endsWith('%')?2.55:1)))).toString(16).padStart(2,'0')).join(''),alpha:parts[3]===undefined?100:Math.round(parseFloat(parts[3])*(parts[3].endsWith('%')?1:100))};}
    return {hex:'#000000',alpha:100};
  }
  function rgba(hex,alpha=100){const parts=colorParts(hex);return `rgba(${[1,3,5].map(index=>parseInt(parts.hex.slice(index,index+2),16)).join(',')},${Math.max(0,Math.min(100,Number(alpha)))/100})`;}
  function imageUrl(value){
    if(value==='')return '';
    try{const url=new URL(value,document.baseURI);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}
  }
  function restore(includeText=true){
    if(includeText){for(const [part,record] of styledText)if(part.innerHTML===record.applied)part.innerHTML=record.html;styledText.clear();}
    for(const [element,values] of applied){for(const [property,{value,priority}] of values){if(value)element.style.setProperty(property,value,priority);else element.style.removeProperty(property);}}
    applied.clear();
  }
  function set(element,property,value){
    if(!applied.has(element))applied.set(element,new Map());
    const original=applied.get(element);
    if(!original.has(property))original.set(property,{value:element.style.getPropertyValue(property),priority:element.style.getPropertyPriority(property)});
    element.style.setProperty(property,value,'important');
  }
  function paint(element,values){
    const color=(key,property,alpha)=>{if(/^#[\da-f]{6}$/i.test(values[key] || ''))set(element,property,rgba(values[key],values[alpha]??100));};
    color('backgroundColor','background-color','backgroundAlpha');color('textColor','color','textAlpha');color('borderColor','border-color','borderAlpha');
    if(values.backgroundColor && !Object.hasOwn(values,'backgroundImage'))set(element,'background-image','none');
    if(Object.hasOwn(values,'backgroundImage')){
      const url=imageUrl(values.backgroundImage);
      if(url!==null){set(element,'background-image',url?`url(${JSON.stringify(url)})`:'none');if(url){set(element,'background-size',values.imageFit==='contain'?'contain':'cover');set(element,'background-position','center');set(element,'background-repeat','no-repeat');}}
    }
    if(Number.isFinite(values.borderWidth) && values.borderWidth>=0 && values.borderWidth<=24){set(element,'border-width',values.borderWidth+'px');set(element,'border-style','solid');}
    if(Number.isFinite(values.borderRadius) && values.borderRadius>=0 && values.borderRadius<=100)set(element,'border-radius',values.borderRadius+'px');
  }
  function textParts(target){
    if(target.matches('label') && target.querySelector('input,select,textarea')){
      for(const node of [...target.childNodes])if(node.nodeType===3 && node.textContent.trim()){const span=document.createElement('span');span.className='element-text-fragment';node.replaceWith(span);span.append(node);}
      return [...target.querySelectorAll(':scope>span')];
    }
    if(target.matches('.summary-item,.summary-stat'))return [...target.querySelectorAll(':scope>strong,:scope>span')];
    if(target.matches('.counter-row'))return [...target.querySelectorAll(':scope>div>strong,:scope>div>span,:scope>div>output')];
    if(target.matches('.event-selection-choices>button'))return [...target.querySelectorAll('.event-selection-label>span,.event-selection-label>small')];
    if(target.matches('[role="tab"],[data-wedding-tab],[data-switch-event],[data-page-export],.toolbar-upload-action') && target.querySelector(':scope>span'))return [target.querySelector(':scope>span:last-of-type')];
    if(target.matches('button,a') && target.querySelector(':scope>svg,:scope>img'))return [...target.querySelectorAll(':scope>span')];
    return [target];
  }
  function plainText(part){const copy=part.cloneNode(true);copy.querySelectorAll('br').forEach(line=>line.replaceWith('\n'));return copy.textContent;}
  function isMultiline(target){const parts=textParts(target);return parts.length>1 || parts.some(part=>plainText(part).includes('\n'));}
  function textValue(target){
    const saved=context?.state.textAppearance?.[selector(target)];
    return textParts(target).map((part,index)=>{const value=plainText(part);const entry=saved?.parts?.[index];return entry && typeof entry.markup==='string'?TextStyles.rebase(entry.markup,entry.source,entry.overrideText??value):value;}).join('\n');
  }
  function storeText(target,markup,source,override=false){
    if(!context?.host)return;
    const parts=textParts(target),lines=parts.length===1?[String(markup)]:String(markup).split('\n'),previous=context.state.textAppearance?.[selector(target)];
    context.state.textAppearance??={};
    context.state.textAppearance[selector(target)]={parts:parts.map((part,index)=>{const line=lines[index] || '';if(override){const holder=document.createElement('span');holder.innerHTML=context.format(line,{inline:true});return {source:plainText(holder),markup:line,overrideText:plainText(holder),original:previous?.parts?.[index]?.original??plainText(part)};}return {source:source??plainText(part),markup:line};})};
  }
  function applyText(){
    if(!context?.format)return;
    const desired=new Map();
    for(const [path,entry] of Object.entries(context.state.textAppearance || {}))if(entry && Array.isArray(entry.parts))for(const target of find(path)){
      textParts(target).forEach((part,index)=>{if(part.isContentEditable)return;const saved=entry.parts?.[index];if(!saved || typeof saved.markup!=='string' || typeof saved.source!=='string')return;const markup=TextStyles.rebase(saved.markup,saved.source,saved.overrideText??plainText(part));desired.set(part,context.format(markup,{inline:true}));});
    }
    for(const [part,html] of desired){
      const record=styledText.get(part);
      if(!record || part.innerHTML!==record.applied)styledText.set(part,{html:part.innerHTML,applied:html});else record.applied=html;
      if(part.innerHTML!==html)part.innerHTML=html;
    }
  }
  function apply(extra=null){
    preview=extra;restore(false);
    for(const [path,values] of Object.entries(context?.state.elementAppearance || {}).sort(([a],[b])=>a.length-b.length))for(const element of find(path))paint(element,values);
    if(extra)for(const element of find(extra.path))paint(element,extra.values);
    applyText();
  }
  function open(target){
    if(globalThis.ElementEditor && context?.host && context.enabled){ElementEditor.select(target);return;}
    if(!context?.host || !context.enabled || !target)return;
    editor?.close();
    const eventId=context.eventId,path=selector(target);
    const dialog=document.createElement('dialog');editor=dialog;dialog.className='appearance-editor';dialog.setAttribute('aria-label','Edit appearance');
    dialog.innerHTML='<form><h2>Edit appearance</h2><p data-appearance-name></p><div data-appearance-fields></div><p role="status" aria-live="polite"></p><div class="appearance-actions"><button type="submit">Save appearance</button><button type="button" data-reset>Reset this element</button><button type="button" data-cancel>Cancel</button></div></form>';
    const form=dialog.querySelector('form'),fields=dialog.querySelector('[data-appearance-fields]'),status=dialog.querySelector('[role="status"]');
    dialog.querySelector('[data-appearance-name]').textContent=label(target);
    let draft,changed=new Set(),file;
    function populate(){
      apply();const element=find(path)[0];if(!element)return;
      draft={...context.state.elementAppearance?.[path]};changed=new Set();file=null;fields.replaceChildren();status.textContent='';
      const computed=getComputedStyle(element);
      for(const [key,title,property,alpha] of [['backgroundColor','Background','background-color','backgroundAlpha'],['textColor','Text','color','textAlpha'],['borderColor','Border','border-color','borderAlpha']]){
        const initial=colorParts(computed.getPropertyValue(property));
        const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=title;group.append(legend);
        group.innerHTML+='<label>Color<div class="appearance-color-row"><input type="color" aria-label="'+title+' color"><input type="text" aria-label="'+title+' hex code" placeholder="#RRGGBB" pattern="#[0-9a-fA-F]{6}"></div></label><label>Opacity<input type="range" min="0" max="100" aria-label="'+title+' opacity"><output></output></label>';
        const picker=group.querySelector('[type="color"]'),hex=group.querySelector('[type="text"]'),range=group.querySelector('[type="range"]'),output=group.querySelector('output');
        picker.value=hex.value=draft[key] || initial.hex;range.value=draft[alpha]??initial.alpha;output.textContent=range.value+'%';
        function update(source){if(source===picker)hex.value=picker.value;if(!/^#[\da-f]{6}$/i.test(hex.value))return;picker.value=hex.value;if((source===picker || source===hex) && Number(range.value)===0 && !Object.hasOwn(draft,key))range.value=100;draft[key]=hex.value;draft[alpha]=Number(range.value);output.textContent=range.value+'%';changed.add(key);changed.add(alpha);apply({path,values:draft});}
        picker.addEventListener('input',()=>update(picker));hex.addEventListener('input',()=>update(hex));range.addEventListener('input',()=>update(range));fields.append(group);
      }
      for(const [key,title,max,initial] of [['borderWidth','Border width',24,parseFloat(computed.borderTopWidth)||0],['borderRadius','Corner radius',100,parseFloat(computed.borderTopLeftRadius)||0]]){
        const wrapper=document.createElement('label');wrapper.textContent=title+' (px)';const input=document.createElement('input');input.type='number';input.min='0';input.max=String(max);input.value=draft[key]??initial;input.addEventListener('input',()=>{if(!input.checkValidity())return;draft[key]=Number(input.value);changed.add(key);apply({path,values:draft});});wrapper.append(input);fields.append(wrapper);
      }
      const background=document.createElement('fieldset');background.innerHTML='<legend>Background image</legend><label>Image URL<input type="url" data-background-url placeholder="https://…"></label><label>Or upload an image<input type="file" accept="image/png,image/jpeg,image/webp"></label><label>Image fit<select><option value="cover">Fill the element</option><option value="contain">Show the whole image</option></select></label><button type="button" data-remove-image>Remove background image</button>';
      const url=background.querySelector('[type="url"]'),upload=background.querySelector('[type="file"]'),fit=background.querySelector('select');
      const currentImage=/^url\(["']?(.*?)["']?\)$/.exec(computed.backgroundImage || '');url.value=draft.backgroundImage??currentImage?.[1]??'';fit.value=draft.imageFit || 'cover';
      url.addEventListener('input',()=>{const safe=imageUrl(url.value.trim());url.setCustomValidity(safe===null?'Use an http or https image URL.':'');if(safe===null)return;draft.backgroundImage=safe;changed.add('backgroundImage');file=null;apply({path,values:draft});});
      upload.addEventListener('change',()=>{file=upload.files[0];if(file)url.setCustomValidity('');status.textContent=file?'The image will upload when you save.':'';});
      fit.addEventListener('change',()=>{draft.imageFit=fit.value;draft.backgroundImage=url.value.trim();changed.add('imageFit');changed.add('backgroundImage');apply({path,values:draft});});
      background.querySelector('[data-remove-image]').addEventListener('click',()=>{file=null;upload.value='';url.value='';status.textContent='';draft.backgroundImage='';changed.add('backgroundImage');apply({path,values:draft});});fields.append(background);
    }
    dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-reset]').addEventListener('click',()=>{if(context.eventId!==eventId)return;delete context.state.elementAppearance?.[path];const saved=context.state.textAppearance?.[path];textParts(target).forEach((part,index)=>{const entry=saved?.parts?.[index];if(entry)part.innerHTML=context.format(entry.overrideText!==undefined?entry.original:plainText(part),{inline:true});});delete context.state.textAppearance?.[path];apply();context.save();dialog.close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!context.host || context.eventId!==eventId || !form.reportValidity())return;
      const button=form.querySelector('[type="submit"]');button.disabled=true;status.textContent='';
      try{
        if(file){draft.backgroundImage=await context.upload(file);changed.add('backgroundImage');}
        if(context.eventId!==eventId || editor!==dialog || !dialog.open)return;
        const values={...context.state.elementAppearance?.[path]};for(const key of changed)values[key]=draft[key];
        context.state.elementAppearance??={};if(Object.keys(values).length)context.state.elementAppearance[path]=values;
        apply();context.save();dialog.close();
      }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
    dialog.addEventListener('close',()=>{dialog.remove();if(editor===dialog)editor=null;apply();},{once:true});
    document.body.append(dialog);populate();dialog.showModal();
  }
  function eligible(element){return element instanceof Element && !element.closest(excluded) && !element.closest('[hidden]') && !element.closest('dialog:not([open])') && !element.closest('#rsvpDialog [data-rsvp-flow-hidden]');}
  function render(ctx){
    if(editor && (context?.eventId!==ctx.eventId || !ctx.host || !ctx.enabled))editor.close();context=ctx;apply(preview);
    document.body.classList.toggle('element-appearance-editing',ctx.host && ctx.enabled);
    refreshControls();
  }
  function isSurface(target,root){
    if(target===root || target.matches('img,video,input,textarea,select,table,figure'))return true;
    const style=getComputedStyle(target);
    return style.backgroundImage!=='none' || colorParts(style.backgroundColor).alpha>0 || ['Top','Right','Bottom','Left'].some(side=>parseFloat(style['border'+side+'Width'])>0 && style['border'+side+'Style']!=='none');
  }
  function refreshControls(){
    if(globalThis.ElementEditor){ElementEditor.render(context);return;}
    while(controls.length)controls.pop()?.();
    if(!context?.host || !context.enabled)return;
    const root=[...document.querySelectorAll('dialog[open]')].at(-1) || document.querySelector('#eventPage:not([hidden])') || document.body;
    const targets=[root,...root.querySelectorAll('*')].filter(target=>eligible(target) && !target.closest('[aria-hidden="true"]') && !target.matches('svg,path,source,option,br,hr') && !(target.matches('span,strong,em,small') && !target.textContent.trim()) && !target.closest('dialog:not([open])') && target.getClientRects().length);
    const groups=targets.filter(target=>target.matches('.summary-item,.summary-stat,.counter-row,button,label:has(input,select,textarea),[role="tab"],.event-selection-choices>button'));
    for(const target of groups)if(!SiteEditing.hasEditor(target) && !SiteEditing.textOwner(target.parentElement))SiteEditing.textElement(target,label(target));
    for(const target of targets){
      if(SiteEditing.hasEditor(target) || SiteEditing.textOwner(target))continue;
      if(target.matches('h1,h2,h3,h4,h5,h6,p,li,time,legend,address,span,strong,em,small,a,label,output,b,i,code') && target.textContent.trim())SiteEditing.textElement(target,label(target));
      else if(isSurface(target,root))controls.push(SiteEditing.appearance(target,()=>open(target),label(target)));
    }
    SiteEditing.positionOverlays();
  }
  if(globalThis.MutationObserver)new MutationObserver(records=>{if(context){apply(preview);if(records.some(record=>record.type==='attributes'))refreshControls();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  globalThis.ElementAppearance={
    textParts,label,isSurface,eligible,
    values:target=>({...context?.state.elementAppearance?.[selector(target)]}),
    update(target,values){if(!context?.host || !context.enabled)return;context.state.elementAppearance??={};const path=selector(target);context.state.elementAppearance[path]={...context.state.elementAppearance[path],...values};apply();context.save();},
    upload:file=>context.upload(file),
    render,restore,open,refreshControls,selector,colorParts,imageUrl,properties,textValue,storeText,applyText,isMultiline,manages:element=>applied.has(element)};
})();
