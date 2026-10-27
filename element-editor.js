/* One fixed, selection-based editor for every gathering. No page content is replaced. */
(() => {
  let ribbonSpace,ribbonResize;
  let context,toolbar,target,entry,range,fieldDraft,dirty=false,panelName='',restores=[],portalRestores=[],editables=[],allowAction=false;
  const excluded='.gap-drop-marker,#newGatheringDialog,#gatheringHistoryDialog,#invitationEditorDialog,#invitationPreviewDialog,.page-export-options,.element-editor-toolbar,.editor-dialog,.appearance-editor,.inline-overlay-layer';
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const button=(text,action,parent)=>{const control=node('button',text);control.type='button';control.addEventListener('click',action);parent.append(control);return control;};
  function markup(root){
    function walk(element){
      if(element.nodeType===3)return element.textContent;
      if(element.nodeType!==1)return '';
      const text=[...element.childNodes].map(walk).join('');
      if(element.matches('br'))return '\n';
      if(element.matches('strong,b'))return `**${text}**`;
      if(element.matches('em,i'))return `*${text}*`;
      if(element.matches('u'))return TextStyles.mark(text,{underline:'true'});
      if(element.matches('code'))return '`'+text+'`';
      if(element.matches('a')){try{const url=new URL(element.getAttribute('href'),document.baseURI);if(['http:','https:','mailto:'].includes(url.protocol))return `[${text}](${url.href})`;}catch{return text;}}
      if(element.matches('li')){const siblings=[...element.parentElement.querySelectorAll(':scope>li')];return `${element.parentElement.matches('ol')?`${siblings.indexOf(element)+1}.`:'-'} ${text.trim()}\n`;}
      if(element.matches('ul,ol'))return '\n'+text+'\n';
      const styles={};
      const font=element.style.fontFamily.replaceAll('"','').replaceAll("'",'');if(TextStyles.fonts.includes(font))styles.font=font;
      const size=parseFloat(element.style.fontSize.replace(/^calc\(/,''));if(size>=8 && size<=96)styles.size=Math.round(size);
      for(const [key,value] of [['color',element.style.color],['highlight',element.style.backgroundColor]])if(value){const parts=ElementAppearance.colorParts(value);styles[key]=parts.hex+(parts.alpha<100?Math.round(parts.alpha/100*255).toString(16).padStart(2,'0'):'');}
      let result=Object.keys(styles).length?TextStyles.mark(text,styles):text;
      if(element.matches('p,div,h1,h2,h3,h4,h5,h6'))result+='\n';
      return result;
    }
    return [...root.childNodes].map(walk).join('').replace(/\n$/,'');
  }
  function rememberSelection(){const selected=window.getSelection();if(target && selected.rangeCount && editables.some(element=>element.contains(selected.anchorNode)))range=selected.getRangeAt(0).cloneRange();}
  function currentTextElement(){
    const selected=window.getSelection();
    const anchor=selected?.anchorNode;
    if(anchor && editables.some(part=>part.contains(anchor)))return anchor.nodeType===1?anchor:anchor.parentElement;
    return editables[0] || target;
  }
  function ancestorsUntilTarget(element){const parents=[];for(let parent=element.parentElement;parent && target.contains(parent);parent=parent.parentElement)parents.push(parent);return parents;}
  function syncTextControls(){
    if(!target)return;
    if(panelName==='Lists'){for(const control of toolbar.querySelectorAll('[data-text-command]'))control.setAttribute('aria-pressed',String(document.queryCommandState(control.dataset.textCommand)));return;}
    if(panelName!=='Text' || target.matches('.event-dock'))return;
    const element=currentTextElement(),style=getComputedStyle(element),panel=toolbar.querySelector('[data-editor-panel]');
    const setSelect=(name,value)=>{const control=panel.querySelector(`[aria-label="${name}"]`);if(!control)return;if(![...control.options].some(option=>option.value===String(value))){const option=node('option',String(value));option.value=String(value);control.append(option);}control.value=String(value);};
    setSelect('Font',style.fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g,''));
    const scale=parseFloat(style.getPropertyValue('--fitted-text-scale')) || 1;
    setSelect('Size',Math.round(parseFloat(style.fontSize)/scale*100)/100);
    for(const [name,property] of [['Text color','color'],['Highlight','backgroundColor']]){
      const color=ElementAppearance.colorParts(style[property]);
      const picker=panel.querySelector(`[aria-label="${name}"]`),hex=panel.querySelector(`[aria-label="${name} hex"]`);
      if(picker)picker.value=color.hex;if(hex)hex.value=color.hex+(color.alpha<100?Math.round(color.alpha/100*255).toString(16).padStart(2,'0'):'');
    }
    for(const [command,active] of [['bold',Number(style.fontWeight)>=600],['italic',style.fontStyle==='italic'],['underline',[element,...ancestorsUntilTarget(element)].some(part=>getComputedStyle(part).textDecorationLine.includes('underline'))]])panel.querySelector(`[data-text-command="${command}"]`)?.setAttribute('aria-pressed',String(active));
  }
  function restoreSelection(){if(!range)return false;try{const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return true;}catch{return false;}}
  function textCommand(command,value){
    if(['buttons','dish-available','dish-claimed','dish-bringing','dish-details','dish-claimants','tabs','titles','counts','count-values','count-titles','toolbar-options'].includes(ElementAppearance.group(target)) && ['bold','italic','underline','removeFormat'].includes(command)){
      const current=getComputedStyle(currentTextElement()),values=command==='bold'?{fontWeight:Number(current.fontWeight)>=600?'400':'700'}:command==='italic'?{fontStyle:current.fontStyle==='italic'?'normal':'italic'}:command==='underline'?{textDecoration:current.textDecorationLine.includes('underline')?'none':'underline'}:{fontFamily:'',fontSize:null,fontWeight:'',fontStyle:'',textDecoration:'',textColor:'',textHighlight:''};
      ElementAppearance.update(target,values);return;
    }

    if(!editables.length || entry?.fields?.[0]?.readonly && ['insertUnorderedList','insertOrderedList','indent','outdent'].includes(command))return;
    if(!restoreSelection()){editables[0].focus();const selection=window.getSelection();selection.selectAllChildren(editables[0]);}
    document.execCommand(command,false,value);dirty=true;rememberSelection();
  }
  function textStyle(key,value){
    if(['buttons','dish-available','dish-claimed','dish-bringing','dish-details','dish-claimants','tabs','titles','counts','count-values','count-titles','toolbar-options'].includes(ElementAppearance.group(target))){const property={font:'fontFamily',size:'fontSize',color:'textColor',highlight:'textHighlight'}[key];if(property){const color=['color','highlight'].includes(key)?ElementAppearance.colorParts(value):null;ElementAppearance.update(target,color?{[property]:color.hex,[key==='color'?'textAlpha':'textHighlightAlpha']:color.alpha}:{[property]:key==='size'?Number(value):value});}return;}

    if(!editables.length)return;
    if(!restoreSelection() || range.collapsed){range=document.createRange();range.selectNodeContents(editables[0]);}
    const existing=range.startContainer===range.endContainer && range.startContainer.nodeType===1 && range.startContainer.matches('span') && range.startOffset===0 && range.endOffset===range.startContainer.childNodes.length ? range.startContainer : null;
    const span=existing || node('span');
    if(key==='font')span.style.fontFamily=value;
    if(key==='size')span.style.fontSize=value+'px';
    if(key==='color'){span.style.color=value;span.className='text-selection-color';span.style.setProperty('--selection-text-color',value);}
    if(key==='highlight')span.style.backgroundColor=value;
    if(!existing){span.append(range.extractContents());range.insertNode(span);}range.selectNodeContents(span);restoreSelection();dirty=true;
  }
  function flush(){
    let structured=false;
    if(fieldDraft && fieldDraft.inputs.some((input,index)=>input.value!==String(fieldDraft.entry.fields[index].value??''))){
      const {inputs,entry:record}=fieldDraft;if(!inputs.every(input=>input.reportValidity()))return false;
      const values=inputs.map(input=>input.value);SiteEditing.persist(()=>{record.commit?.(values);record.fields.forEach((spec,index)=>{spec.value=values[index];});});structured=true;
    }
    if(!target || !dirty)return structured;
    dirty=false;
    const current=target,record=entry;
    const values=record?.fields?.map(spec=>spec.value??'') || [];
    if(editables.length){
      const text=editables.map(markup).join('\n');
      if(record?.fields?.length===1 && !record.visual && ['text','page','notes'].includes(record.title)){
        if(record.fields[0].required && !editables[0].textContent.trim()){status('This text is required.');dirty=true;return;}
        values[0]=record.fields[0].type==='textarea'?text:editables.map(part=>part.textContent).join(' ');
        if(record.fields[0].type!=='textarea')ElementAppearance.storeText(current,text,undefined,true);
        SiteEditing.persist(()=>{record.commit?.(values);record.fields[0].value=values[0];});
      }else{
        const readonly=record?.fields?.[0]?.readonly || !record?.visual;
        ElementAppearance.storeText(current,text,undefined,!readonly);SiteEditing.persist();
      }
    }
    return structured;
  }
  function closeSettings(){for(const area of toolbar?.querySelectorAll('.element-editor-settings') || [])globalThis.commitPendingEditorInputs?.(area);for(const restore of portalRestores.reverse())restore();portalRestores=[];}
  function release(){
    flush();closeSettings();
    for(const restore of restores.reverse())restore();restores=[];
    for(const element of editables){element.removeAttribute('contenteditable');element.removeAttribute('spellcheck');}
    editables=[];target?.classList.remove('element-editor-selected');target=null;entry=null;range=null;fieldDraft=null;dirty=false;
    const panel=toolbar?.querySelector('[data-editor-panel]');if(panel){panel.replaceChildren();panel.hidden=true;}
    if(toolbar){toolbar.querySelector('[data-editor-selection]').textContent='Click an element to edit';toolbar.querySelectorAll('[data-editor-move]').forEach(button=>button.hidden=true);}
  }
  function status(text){const live=toolbar?.querySelector('[data-editor-status]');if(live)live.textContent=text;}
  function labelInput(parent,title,type,value,change){
    const label=node('label',title);const input=node(type==='textarea'?'textarea':'input');if(type==='textarea')input.rows=2;else input.type=type;input.value=value??'';input.setAttribute('aria-label',title);label.append(input);parent.append(label);input.addEventListener('change',()=>change(input.value,input));if(['number','range','color'].includes(type))input.addEventListener('input',()=>change(input.value,input));return input;
  }
  function selectInput(parent,title,values,value,change){
    const label=node('label',title),select=node('select');select.setAttribute('aria-label',title);
    for(const item of values){const option=node('option',String(item));option.value=String(item);select.append(option);}if(![...select.options].some(option=>option.value===String(value))){const option=node('option',String(value));option.value=String(value);select.append(option);}select.value=value;label.append(select);parent.append(label);select.addEventListener('change',()=>change(select.value));return select;
  }
  function colorControls(parent,title,property,alpha,css){
    let current=getComputedStyle(target).getPropertyValue(css);
    if(css.startsWith('--toolbar-') && target.matches('.event-dock')){
      const probe=node('button');probe.setAttribute('aria-pressed',String(css!=='--toolbar-text' && css!=='--toolbar-option-background'));probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none';target.append(probe);
      current=getComputedStyle(probe)[css.includes('background')?'backgroundColor':'color'];probe.remove();
    }
    if(css==='border-top-color'){
      const style=getComputedStyle(target),side=['Top','Right','Bottom','Left'].find(side=>parseFloat(style['border'+side+'Width'])>0 && style['border'+side+'Style']!=='none');if(side)current=style['border'+side+'Color'];
    }
    const computed=ElementAppearance.colorParts(current);
    const saved=ElementAppearance.values(target);let color=saved[property] || computed.hex,opacity=saved[alpha]??computed.alpha;
    const update=()=>ElementAppearance.update(target,{[property]:color,[alpha]:opacity});
    const picker=labelInput(parent,title,'color',color,value=>{color=value;hex.value=value;update();});
    const hex=labelInput(parent,title+' hex','text',color,(value,input)=>{if(!/^#[\da-f]{6}$/i.test(value)){input.setCustomValidity('Enter a six-digit hex color.');input.reportValidity();return;}input.setCustomValidity('');color=value;picker.value=value;update();});hex.maxLength=7;hex.size=8;hex.addEventListener('input',()=>{if(/^#[\da-f]{6}$/i.test(hex.value)){hex.setCustomValidity('');color=hex.value;picker.value=color;update();}});
    const slider=labelInput(parent,title+' opacity','range',opacity,value=>{opacity=Number(value);output.textContent=value+'%';update();});slider.min=0;slider.max=100;
    const output=node('output',opacity+'%');parent.append(output);
  }
  function fieldsPanel(parent){
    const fields=entry?.fields || [];
    if(fields.length && (fields.length>1 || !editables.length || !['text','page','notes'].includes(entry.title))){
      const controls=fields.map(spec=>spec.options?selectInput(parent,spec.label,spec.options,spec.value,()=>{}):labelInput(parent,spec.label,spec.type || 'text',spec.value,()=>{}));
      controls.forEach((input,index)=>{const spec=fields[index];input.required=Boolean(spec.required);if(spec.min!==undefined)input.min=spec.min;});
      fieldDraft={inputs:controls,entry};
      button('Apply',()=>{if(!controls.every(input=>input.reportValidity()))return;flush();const values=controls.map(input=>input.value);SiteEditing.persist(()=>{entry.commit?.(values);fields.forEach((spec,index)=>{spec.value=values[index];});});SiteEditing.editorContext.refresh();},parent);
    }
    for(const [title,action] of entry?.options?.actions || [])if(!['Move left','Move right'].includes(title))button(title,()=>{flush();action();},parent);
    if(entry?.addPage){const input=labelInput(parent,'New page title','text','',()=>{});button('Add page',()=>{if(input.value.trim()){flush();entry.addPage(input.value.trim());}},parent);}
    if(entry?.settings)button('Edit '+entry.settings.title,()=>{flush();closeSettings();parent.querySelector('.element-editor-settings')?.remove();const area=node('div');area.className='element-editor-settings';parent.append(area);entry.settings.build(area);},parent);
    if(entry?.portal){
      button('Edit '+entry.portal.title,()=>{
        flush();closeSettings();const {sources,prepare}=entry.portal;prepare();const area=node('div');area.className='element-editor-settings inline-portal-editor';
        for(const selector of sources){const source=document.querySelector(selector);if(!source)continue;const anchor=document.createComment('settings home'),hidden=source.hidden;source.before(anchor);source.hidden=false;area.append(source);portalRestores.push(()=>{anchor.replaceWith(source);source.hidden=hidden;});}
        parent.append(area);
      },parent);
    }
  }
  function showPanel(name){
    rememberSelection();if(fieldDraft)flush();fieldDraft=null;closeSettings();panelName=panelName===name?'':name;
    const panel=toolbar.querySelector('[data-editor-panel]');panel.replaceChildren();panel.hidden=!panelName;
    toolbar.querySelectorAll('[data-editor-group]').forEach(control=>control.setAttribute('aria-expanded',String(control.dataset.editorGroup===panelName)));
    if(!panelName || !target)return;
    if(name==='Gap'){
      if(GapLayout.isGap(target)){const current=GapLayout.getSize(target);const number=labelInput(panel,'Gap size (px)','number',current,value=>GapLayout.setSize(target,value));number.min=0;number.max=1000;const slider=labelInput(panel,'Gap size','range',Math.min(current,300),value=>{number.value=value;GapLayout.setSize(target,value);});slider.min=0;slider.max=300;button('Remove gap',()=>{GapLayout.remove(target);release();},panel);}
      else{button('Add gap after selection',()=>{const gap=GapLayout.addAfter(target);if(gap)select(gap);else status('Drag Gap from the toolbar between page elements.');},panel);panel.append(node('span','Drag Gap from the toolbar to place a new spacer.'));}
    }
    if(name==='Text' && target.matches('.event-dock')){
      colorControls(panel,'Unselected text and icons','toolbarTextColor','toolbarTextAlpha','--toolbar-text');
      colorControls(panel,'Selected text and icons','toolbarSelectedColor','toolbarSelectedAlpha','--toolbar-active-text');
    }else if(name==='Text' && ElementAppearance.group(target)==='counts'){
      for(const [title,selector] of [['Count','.summary-item>strong,.summary-stat>strong,.counter-row output'],['Count title','.summary-item>span,.summary-stat>span,.counter-row strong']])button(title,()=>{const part=target.querySelector(selector);if(part)select(part);},panel);
    }else if(name==='Text'){
      for(const [title,command] of [['Bold','bold'],['Italic','italic'],['Underline','underline'],['Remove formatting','removeFormat']]){const control=button(title,()=>{textCommand(command);syncTextControls();},panel);control.dataset.textCommand=command;}
      selectInput(panel,'Font',TextStyles.fonts,'Times New Roman',value=>textStyle('font',value));
      selectInput(panel,'Size',TextStyles.sizes,16,value=>textStyle('size',value));
      for(const [title,key] of [['Text color','color'],['Highlight','highlight']]){
        const picker=labelInput(panel,title,'color','#000000',value=>textStyle(key,value));
        const hex=labelInput(panel,title+' hex','text','#000000',(value,input)=>{if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)){input.setCustomValidity('');picker.value=value.slice(0,7);textStyle(key,value);}else{input.setCustomValidity('Enter a hex color such as #123456.');input.reportValidity();}});hex.size=8;hex.addEventListener('input',()=>{if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex.value)){hex.setCustomValidity('');picker.value=hex.value.slice(0,7);textStyle(key,hex.value);}});
      }
      const currentLink=currentTextElement().closest('a');
      const link=labelInput(panel,'Link URL','url',currentLink && target.contains(currentLink)?currentLink.getAttribute('href') || '':'',()=>{});button('Add link',()=>{try{const url=new URL(link.value);if(!['http:','https:','mailto:'].includes(url.protocol))throw new Error();textCommand('createLink',url.href);}catch{status('Enter an http, https, or mailto link.');}},panel);
      button('Remove link',()=>textCommand('unlink'),panel);
      fieldsPanel(panel);
      syncTextControls();
    }
    if(name==='Lists'){
      for(const [title,command] of [['Bullets','insertUnorderedList'],['Numbering','insertOrderedList']]){const control=button(title,()=>{textCommand(command);control.setAttribute('aria-pressed',String(document.queryCommandState(command)));},panel);control.dataset.textCommand=command;control.setAttribute('aria-pressed',String(document.queryCommandState(command)));}
      button('Indent',()=>textCommand('indent'),panel);button('Outdent',()=>textCommand('outdent'),panel);
    }
    if(name==='Background'){
      colorControls(panel,'Background','backgroundColor','backgroundAlpha','background-color');
      if(target.matches('.event-dock')){colorControls(panel,'Unselected option background','toolbarOptionBackground','toolbarOptionAlpha','--toolbar-option-background');colorControls(panel,'Selected option background','toolbarSelectedBackground','toolbarSelectedBackgroundAlpha','--toolbar-selected-background');}
      const values=ElementAppearance.values(target);
      const image=ElementAppearance.imageElement(target);
      const computedImage=getComputedStyle(target).backgroundImage;
      const currentImage=computedImage.startsWith('url(')?computedImage.slice(4,-1).replace(/^['"]|['"]$/g,''):'';
      const imageUrlInput=labelInput(panel,'Image URL','url',image?(image.getAttribute('src') || ''):values.backgroundImage ?? currentImage,(value,input)=>{const safe=ElementAppearance.imageUrl(value.trim());if(safe===null){input.setCustomValidity('Use an http or https image URL.');input.reportValidity();return;}input.setCustomValidity('');ElementAppearance.updateImage(target,safe);});
      const upload=labelInput(panel,'Upload image','file','',async(_value,input)=>{
        const file=input.files[0],selected=target,eventId=context.eventId;if(!file)return;
        input.disabled=true;status('Uploading image…');
        try{const url=await ElementAppearance.upload(file);if(context.eventId===eventId){ElementAppearance.updateImage(selected,url);if(imageUrlInput.isConnected)imageUrlInput.value=url;status('Image saved.');}}catch(error){status(error.message);}finally{input.disabled=false;}
      });upload.accept='image/png,image/jpeg,image/webp';
      selectInput(panel,'Image fit',image?['cover','contain','fill','none','scale-down']:['cover','contain','auto'],values.imageFit || (image?getComputedStyle(image).objectFit:getComputedStyle(target).backgroundSize),value=>ElementAppearance.update(target,{imageFit:value}));
      button('Remove image',()=>{ElementAppearance.updateImage(target,'');imageUrlInput.value='';},panel);
    }
    if(name==='Border'){
      colorControls(panel,'Border','borderColor','borderAlpha','border-top-color');
      for(const [title,key,max,computed] of [['Width','borderWidth',24,'borderTopWidth'],['Radius','borderRadius',100,'borderTopLeftRadius']]){
        const input=labelInput(panel,title,'number',ElementAppearance.values(target)[key]??(key==='borderWidth'?Math.max(...['Top','Right','Bottom','Left'].map(side=>parseFloat(getComputedStyle(target)['border'+side+'Width']) || 0)):parseFloat(getComputedStyle(target)[computed]) || 0),(value,input)=>{if(input.checkValidity())ElementAppearance.update(target,{[key]:Number(value)});});input.min=0;input.max=max;
      }
    }
  }
  function select(element){
    if(element===target)return;
    release();target=element;entry=SiteEditing.editorFor(target);
    if(!entry?.fields && (target.matches('button,a,h1,h2,h3,h4,h5,h6,p,li,time,legend,address,output,.summary-item,.summary-stat,.counter-row,label') || ['count-values','count-titles','dish-details','dish-claimants'].includes(ElementAppearance.group(target)))){SiteEditing.textElement(target,ElementAppearance.label(target));entry=SiteEditing.editorFor(target);}
    target.classList.add('element-editor-selected');
    if(toolbar.querySelector('[data-editor-chooser]'))toolbar.querySelector('[data-editor-chooser]').value=ElementAppearance.selector(target);
    const kind=ElementAppearance.group(target);
    toolbar.querySelector('[data-editor-selection]').textContent=ElementAppearance.label(target)+(kind?' · Shared '+kind.replaceAll('-',' '):'');
    toolbar.querySelectorAll('[data-editor-move]').forEach(button=>button.hidden=!entry?.options?.actions?.some(([title])=>title===button.dataset.editorMove));
    const fields=entry?.fields;
    const readonly=Boolean(fields?.[0]?.readonly || fields?.length===1 && !['text','page','notes'].includes(entry.title));
    if((fields?.length===1 || entry?.visual) && target.getClientRects().length && target.getBoundingClientRect().height){
      editables=ElementAppearance.textParts(target).filter(part=>!part.querySelector('input,select,textarea,button,svg'));
      for(const part of editables){
        part.setAttribute('contenteditable','true');part.spellcheck=!readonly;
        if(readonly){const prevent=event=>event.preventDefault();part.addEventListener('beforeinput',prevent);restores.push(()=>part.removeEventListener('beforeinput',prevent));}
        const input=()=>{dirty=true;};part.addEventListener('input',input);restores.push(()=>part.removeEventListener('input',input));
        const keydown=event=>{event.stopPropagation();if(!readonly && [' ','Spacebar'].includes(event.key) && target.matches('button,a,[role="tab"]')){event.preventDefault();document.execCommand('insertText',false,' ');dirty=true;rememberSelection();return;}if(readonly){if(event.key.length===1 || ['Backspace','Delete','Enter'].includes(event.key))event.preventDefault();}else if(event.key==='Enter'){event.preventDefault();if(target.matches('button,a'))flush();else textCommand('insertLineBreak');}};part.addEventListener('keydown',keydown);restores.push(()=>part.removeEventListener('keydown',keydown));
        const keyup=event=>{event.stopPropagation();if([' ','Spacebar','Enter'].includes(event.key) && target.matches('button,a,[role="tab"]'))event.preventDefault();};part.addEventListener('keyup',keyup);restores.push(()=>part.removeEventListener('keyup',keyup));
        const paste=event=>{event.preventDefault();if(!readonly){const value=event.clipboardData.getData('text/plain');textCommand('insertText',target.matches('button,a')?value.replace(/\r?\n/g,' '):value);}};part.addEventListener('paste',paste);restores.push(()=>part.removeEventListener('paste',paste));
      }
    }
    toolbar.querySelector('[data-editor-open]').hidden=!target.matches('button,a,[role="tab"],summary');
    const current=GapLayout.isGap(target)?'Gap':panelName;panelName='';showPanel(current || (fields?.length && !editables.length?'Text':''));
  }
  function pick(start){
    const gap=start.closest('gathering-gap,.existing-layout-gap');if(gap)return gap;
    const root=(globalThis.activeHostDialog?.() || [...document.querySelectorAll('dialog[open]')].at(-1)) || document.querySelector('#eventPage:not([hidden])') || document.body;
    if(!root.contains(start) || start.closest(excluded))return null;
    const claimants=start.closest('.dish-claimants');if(claimants && root.contains(claimants))return claimants;
    const dishDetails=start.closest('.dish-status,.rsvp-dish-choice small');if(dishDetails && root.contains(dishDetails))return dishDetails;
    const countPart=start.closest('.summary-item>strong,.summary-stat>strong,.summary-item>span,.summary-stat>span,.counter-row>div>output,.counter-row>div>strong,.counter-row>div>span');
    if(countPart && root.contains(countPart))return countPart;
    const group=start.closest('button,.summary-item,.summary-stat,.counter-row,label:has(input,select,textarea)');
    if(group && root.contains(group))return group;
    const owner=SiteEditing.textOwner(start);if(owner && root.contains(owner))return owner;
    const link=start.closest('a');if(link && root.contains(link))return link;
    for(let current=start;current && root.contains(current);current=current.parentElement){
      if(SiteEditing.editorFor(current) || current.matches('h1,h2,h3,h4,h5,h6,p,li,time,legend,address,output,img,video') || ElementAppearance.isSurface(current,root))return current;
    }
    return null;
  }
  function sizeRibbon(){if(!toolbar || !ribbonSpace)return;const height=Math.ceil(toolbar.getBoundingClientRect().height);if(ribbonSpace.style.height!==height+'px'){ribbonSpace.style.height=height+'px';globalThis.GapLayout?.refresh();}}
  function render(ctx){
    context=ctx;
    if(!ctx?.host || !ctx.enabled){beforeRender();return;}
    const root=(globalThis.activeHostDialog?.() || [...document.querySelectorAll('dialog[open]')].at(-1)) || document.body;
    if(!toolbar){
      toolbar=node('div');toolbar.className='element-editor-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Element editor');
      const row=node('div');row.className='element-editor-row';toolbar.append(row);
      const chooser=node('select');chooser.dataset.editorChooser='';chooser.setAttribute('aria-label','Select an element');row.append(chooser);chooser.addEventListener('change',()=>{const element=document.querySelector(chooser.value);if(element)select(element);});
      const selection=node('span','Click an element to edit');selection.dataset.editorSelection='';row.append(selection);
      for(const title of ['Text','Lists','Background','Border','Gap']){const control=button(title,()=>showPanel(title),row);control.dataset.editorGroup=title;control.setAttribute('aria-expanded','false');if(title==='Gap'){control.draggable=true;control.dataset.newGap='';control.title='Drag a new gap between elements';}}
      for(const title of ['Move left','Move right']){
        const move=button(title,()=>{
          if(!target)return;const path=ElementAppearance.selector(target);flush();
          const current=document.querySelector(path),record=current && SiteEditing.editorFor(current);
          record?.options?.actions?.find(([name])=>name===title)?.[1]();
          const next=document.querySelector(path);if(next){select(next);editables[0]?.focus({preventScroll:true});}
        },row);move.dataset.editorMove=title;move.hidden=true;
      }
      const parent=button('Select container',()=>{if(target?.parentElement && !target.matches('body,dialog')){flush();select(target.parentElement);}},row);parent.title='Select the container around this element';
      const open=button('Open page / use button',()=>{if(!target)return;const current=target;release();allowAction=true;try{current.click();}finally{allowAction=false;}},row);open.dataset.editorOpen='';open.hidden=true;
      button('Save',()=>{const structured=flush();if(structured)SiteEditing.editorContext.refresh();status('Saved.');},row);
      button('Done editing',()=>SiteEditing.toggle(()=>SiteEditing.editorContext.refresh()),row);
      const panel=node('div');panel.dataset.editorPanel='';panel.className='element-editor-panel';panel.hidden=true;toolbar.append(panel);
      const live=node('span');live.dataset.editorStatus='';live.setAttribute('role','status');toolbar.append(live);
      toolbar.addEventListener('pointerdown',event=>{rememberSelection();if(event.target.matches('button:not([draggable="true"])'))event.preventDefault();});
    }
    if(toolbar.parentElement!==root)root.append(toolbar);
    if(!ribbonSpace){ribbonSpace=node('editor-ribbon-space');ribbonSpace.className='editor-ribbon-space';ribbonSpace.setAttribute('aria-hidden','true');ribbonResize=new ResizeObserver(sizeRibbon);ribbonResize.observe(toolbar);}
    if(ribbonSpace.parentElement!==root)root.prepend(ribbonSpace);
    const templates=document.querySelector('#invitationTemplatesButton');if(templates){templates.hidden=false;toolbar.querySelector('.element-editor-row').append(templates);}
    const chooser=toolbar.querySelector('[data-editor-chooser]');chooser.replaceChildren();const hint=node('option','Select an element');hint.value='';chooser.append(hint);
    for(const element of [...new Set([...SiteEditing.editorTargets,...GapLayout.elements(),...root.querySelectorAll('*')].filter(element=>SiteEditing.editorFor(element) || GapLayout.isGap(element) || ['containers','inner-containers'].includes(ElementAppearance.group(element))))].filter(element=>root.contains(element) && !element.parentElement.closest('[hidden],[data-rsvp-flow-hidden],dialog:not([open])') && !element.hasAttribute('data-rsvp-flow-hidden') && (!element.hidden || SiteEditing.editorFor(element)?.fields?.every(spec=>!spec.value)))){const option=node('option',ElementAppearance.label(element));option.value=ElementAppearance.selector(element);chooser.append(option);}chooser.value=target?ElementAppearance.selector(target):'';sizeRibbon();
  }
  function beforeRender(){release();ribbonResize?.disconnect();ribbonResize=null;ribbonSpace?.remove();ribbonSpace=null;const templates=document.querySelector('#invitationTemplatesButton');if(templates){templates.hidden=true;document.body.append(templates);}toolbar?.remove();toolbar=null;panelName='';}
  document.addEventListener('selectionchange',()=>{rememberSelection();if(!toolbar?.contains(document.activeElement))syncTextControls();});
  document.addEventListener('click',event=>{
    if(!context?.host || !context.enabled || allowAction || event.target.closest(excluded) || event.target.closest('#editItemsButton,#hostToolsPanel .host-tool-actions,#hostQuickActions,#hostToolsButton,#invitationTemplatesButton'))return;
    if(target && editables.some(part=>part.contains(event.target))){event.stopImmediatePropagation();if(target.matches('button,a,[role="tab"]'))event.preventDefault();return;}
    const element=pick(event.target);if(!element)return;
    event.preventDefault();event.stopImmediatePropagation();select(element);
    const part=editables.find(part=>part.contains(event.target)) || editables[0];
    if(part){part.focus({preventScroll:true});const caret=document.caretRangeFromPoint?.(event.clientX,event.clientY) || document.createRange();if(!part.contains(caret.startContainer)){caret.selectNodeContents(part);caret.collapse(false);}const selection=window.getSelection();selection.removeAllRanges();selection.addRange(caret);rememberSelection();}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && target){event.preventDefault();event.stopImmediatePropagation();release();status('Selection cleared.');}},true);
  globalThis.ElementEditor={activate:element=>{release();allowAction=true;try{element.click();}finally{allowAction=false;}},render,beforeRender,flush,select,refresh:()=>render(context)};
})();
