/* Shared per-gathering appearance editing. Untouched declarations keep their defaults. */
(() => {
  let context;
  const applied=new Map();
  const styledText=new Map();
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
  function apply(){
    restore(false);
    for(const [path,values] of Object.entries(context?.state.elementAppearance || {}).sort(([a],[b])=>a.length-b.length))for(const element of find(path))paint(element,values);
    applyText();
  }
  function render(ctx){context=ctx;apply();refreshControls();}
  function isSurface(target,root){
    if(target===root || target.matches('img,video,input,textarea,select,table,figure'))return true;
    const style=getComputedStyle(target);
    return style.backgroundImage!=='none' || colorParts(style.backgroundColor).alpha>0 || ['Top','Right','Bottom','Left'].some(side=>parseFloat(style['border'+side+'Width'])>0 && style['border'+side+'Style']!=='none');
  }
  function refreshControls(){ElementEditor.render(context);}
  if(globalThis.MutationObserver)new MutationObserver(records=>{if(context){apply();if(records.some(record=>record.type==='attributes'))refreshControls();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  globalThis.ElementAppearance={
    textParts,label,isSurface,
    values:target=>({...context?.state.elementAppearance?.[selector(target)]}),
    update(target,values){if(!context?.host || !context.enabled)return;context.state.elementAppearance??={};const path=selector(target);context.state.elementAppearance[path]={...context.state.elementAppearance[path],...values};apply();context.save();},
    upload:file=>context.upload(file),
    render,restore,refreshControls,selector,colorParts,imageUrl,textValue,storeText,applyText,isMultiline,manages:element=>applied.has(element)};
})();
