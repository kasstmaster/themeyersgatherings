/* One fixed, selection-based editor for every gathering. No page content is replaced. */
(() => {
  let sidebarResize,sidebarRoot,autosaveTimer,workspace;
  let context,toolbar,target,entry,range,fieldDraft,dirty=false,panelName='',restores=[],portalRestores=[],editables=[],allowAction=false,typing=false;
  const excluded='.gap-drop-marker,#newGatheringDialog,#gatheringHistoryDialog,#invitationEditorDialog,#invitationPreviewDialog,.page-export-options,.element-editor-toolbar,.editor-dialog,.appearance-editor,.inline-overlay-layer';
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const button=(text,action,parent)=>{const control=node('button',text);control.type='button';control.addEventListener('click',action);parent.append(control);return control;};
  function markup(root){
    function walk(element){
      if(element.nodeType===3)return element.textContent;
      if(element.nodeType!==1)return '';
      const text=element.matches('li,ul,ol')?'':[...element.childNodes].map(walk).join('');
      if(element.matches('br'))return '\n';
      if(element.matches('strong,b'))return `**${text}**`;
      if(element.matches('em,i'))return `*${text}*`;
      if(element.matches('u'))return TextStyles.mark(text,{underline:'true'});
      if(element.matches('code'))return '`'+text+'`';
      if(element.matches('a')){const popup=globalThis.TextPopups?.href(element);if(popup)return `[${text}](${popup})`;try{const url=new URL(element.getAttribute('href'),document.baseURI);if(['http:','https:','mailto:'].includes(url.protocol))return `[${text}](${url.href})`;}catch{return text;}}
      if(element.matches('blockquote'))return text.replace(/\n$/,'').split('\n').map(line=>'> '+line).join('\n')+'\n';
      if(element.matches('li')){const siblings=[...element.parentElement.querySelectorAll(':scope>li')],body=[...element.childNodes].filter(child=>!child.matches?.('ul,ol')).map(walk).join('').trim(),nested=[...element.children].filter(child=>child.matches('ul,ol')).map(walk).join('').trimEnd();return `${element.parentElement.matches('ol')?`${siblings.indexOf(element)+1}.`:'-'} ${body}\n`+(nested?nested.split('\n').map(line=>'  '+line).join('\n')+'\n':'');}
      if(element.matches('ul,ol'))return [...element.childNodes].map(child=>{const value=walk(child);return child.matches?.('ul,ol')?value.trimEnd().split('\n').map(line=>'  '+line).join('\n')+'\n':value;}).join('');
      const styles={};
      const font=element.style.fontFamily.replaceAll('"','').replaceAll("'",'');if(TextStyles.fonts.includes(font))styles.font=font;
      const size=parseFloat(element.style.fontSize.replace(/^calc\(/,''));if(size>=8 && size<=96)styles.size=Math.round(size);
      for(const [key,value] of [['color',element.style.color],['highlight',element.style.backgroundColor]])if(value){const parts=ElementAppearance.colorParts(value);styles[key]=parts.hex+(parts.alpha<100?Math.round(parts.alpha/100*255).toString(16).padStart(2,'0'):'');}
      Object.assign(styles,TextStyles.effects(element.style,ElementAppearance.colorParts,()=>getComputedStyle(element)));
      let result=Object.keys(styles).length?TextStyles.mark(text,styles):text;
      if(element.matches('p,div,h1,h2,h3,h4,h5,h6'))result+='\n';
      return result;
    }
    return [...root.childNodes].map(walk).join('').replace(/\n$/,'');
  }
  function boundedTextRange(candidate){
    if(!candidate || !target?.isConnected)return null;
    const owner=editables.find(element=>element.isConnected && target.contains(element) && (element.contains(candidate.startContainer)||element.contains(candidate.endContainer)));
    if(!owner)return null;
    const bounded=candidate.cloneRange(),bounds=document.createRange();bounds.selectNodeContents(owner);
    if(!owner.contains(bounded.startContainer))bounded.setStart(bounds.startContainer,bounds.startOffset);
    if(!owner.contains(bounded.endContainer))bounded.setEnd(bounds.endContainer,bounds.endOffset);
    return bounded;
  }
  function rememberSelection(){const selected=window.getSelection();if(!selected?.rangeCount)return;const bounded=boundedTextRange(selected.getRangeAt(0));if(bounded)range=bounded;}
  function currentTextElement(){
    const selected=window.getSelection();
    const anchor=selected?.anchorNode;
    if(anchor && editables.some(part=>part.contains(anchor)))return anchor.nodeType===1?anchor:anchor.parentElement;
    const root=editables[0] || target;
    // Inline effects/fonts live on text spans, not necessarily the text-box
    // root. With no highlighted range, show the first displayed text's style.
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let text;
    while((text=walker.nextNode()))if(text.textContent.trim())return text.parentElement;
    return root;
  }
  function ancestorsUntilTarget(element){const parents=[];for(let parent=element.parentElement;parent && target.contains(parent);parent=parent.parentElement)parents.push(parent);return parents;}
  function syncTextControls(){
    if(!target)return;
    if(panelName!=='Format' || target.matches('.event-dock'))return;
    for(const command of ['insertUnorderedList','insertOrderedList'])toolbar.querySelector(`[data-text-command="${command}"]`)?.setAttribute('aria-pressed',String(document.queryCommandState(command)));
    const element=currentTextElement(),style=getComputedStyle(element),panel=toolbar.querySelector('[data-editor-panel]');
    const setSelect=(name,value)=>{const control=panel.querySelector(`[aria-label="${name}"]`);if(!control)return;if(![...control.options].some(option=>option.value===String(value))){const option=node('option',String(value));option.value=String(value);control.append(option);}control.value=String(value);};
    setSelect('Alignment',style.textAlign);
    setSelect('Font',style.fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g,''));
    const scale=parseFloat(style.getPropertyValue('--fitted-text-scale')) || 1;
    setSelect('Size',Math.round(parseFloat(style.fontSize)/scale*100)/100);
    const height=panel.querySelector('[aria-label="Line height"]');if(height && document.activeElement!==height){height.value=style.lineHeight==='normal'?'':String(Math.round(parseFloat(style.lineHeight)/parseFloat(style.fontSize)*100)/100);height.dataset.editorCommitted=height.value;}
    for(const [name,property] of [['Text color','color'],['Highlight','backgroundColor']]){
      const color=ElementAppearance.colorParts(style[property]);
      const picker=panel.querySelector(`[aria-label="${name}"]`),hex=panel.querySelector(`[aria-label="${name} hex"]`);
      for(const [control,value] of [[picker,color.hex],[hex,color.hex+(color.alpha<100?Math.round(color.alpha/100*255).toString(16).padStart(2,'0'):'')]])if(control && document.activeElement!==control){control.value=value;control.dataset.editorCommitted=value;}
    }
    const popupControl=panel.querySelector('[aria-label="Popup text"]'),popupHref=globalThis.TextPopups?.href(element.closest('a'))||'';if(popupControl && document.activeElement!==popupControl && popupControl.dataset.popupHref!==popupHref){popupControl.value=globalThis.TextPopups?.decode(popupHref)||'';popupControl.dataset.editorCommitted=popupControl.value;popupControl.dataset.popupHref=popupHref;}
    for(const [command,active] of [['bold',Number(style.fontWeight)>=600],['italic',style.fontStyle==='italic'],['underline',[element,...ancestorsUntilTarget(element)].some(part=>getComputedStyle(part).textDecorationLine.includes('underline'))]])panel.querySelector(`[data-text-command="${command}"]`)?.setAttribute('aria-pressed',String(active));
  }
  function restoreSelection(){range=boundedTextRange(range);if(!range)return false;try{const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return true;}catch{return false;}}
  function textCommand(command,value){
    if((['buttons','dish-available','dish-claimed','dish-bringing','dish-details','dish-claimants','tabs','titles','dates','introductions','counts','count-values','count-titles','toolbar-options'].includes(ElementAppearance.group(target)) || ElementAppearance.group(target)?.startsWith('count-list-')) && ['bold','italic','underline','removeFormat'].includes(command)){
      const current=getComputedStyle(currentTextElement()),values=command==='bold'?{fontWeight:Number(current.fontWeight)>=600?'400':'700'}:command==='italic'?{fontStyle:current.fontStyle==='italic'?'normal':'italic'}:command==='underline'?{textDecoration:current.textDecorationLine.includes('underline')?'none':'underline'}:{fontFamily:'',fontSize:null,fontWeight:'',fontStyle:'',textDecoration:'',textColor:'',textHighlight:''};
      ElementAppearance.update(target,values);return;
    }

    if(!editables.length || entry?.fields?.[0]?.readonly && ['insertUnorderedList','insertOrderedList','indent','outdent'].includes(command))return;
    const temporary=!typing;if(temporary)for(const part of editables)part.setAttribute('contenteditable','true');
    if(!restoreSelection() || range.collapsed&&['bold','italic','underline','removeFormat'].includes(command)){editables[0].focus({preventScroll:true});const selection=window.getSelection();selection.selectAllChildren(editables[0]);}
    document.execCommand(command,false,value);if(temporary)for(const part of editables)part.removeAttribute('contenteditable');dirty=true;refreshUndo();rememberSelection();
  }
  function textEffect(values){
    const group=ElementAppearance.group(target);
    if(['buttons','dish-available','dish-claimed','dish-bringing','dish-details','dish-claimants','tabs','titles','dates','introductions','counts','count-values','count-titles','toolbar-options'].includes(group)||group?.startsWith('count-list-')){
      const update={};
      if(values.shadow){const parts=ElementAppearance.colorParts(values.shadow==='none'?'#000000':values.shadow);Object.assign(update,{textShadowEnabled:values.shadow!=='none',textShadowColor:parts.hex,textShadowAlpha:parts.alpha,textShadowX:Number(values.shadowX??1),textShadowY:Number(values.shadowY??1),textShadowBlur:Number(values.shadowBlur??2)});}
      if(values.outline){const parts=ElementAppearance.colorParts(values.outline==='none'?'#000000':values.outline);Object.assign(update,{textOutlineColor:parts.hex,textOutlineAlpha:parts.alpha,textOutlineWidth:values.outline==='none'?0:Number(values.outlineWidth??1)});}
      ElementAppearance.update(target,update);return;
    }
    textStyle('effects',values);
  }
  function textStyle(key,value){
    if((['buttons','dish-available','dish-claimed','dish-bringing','dish-details','dish-claimants','tabs','titles','dates','introductions','counts','count-values','count-titles','toolbar-options'].includes(ElementAppearance.group(target)) || ElementAppearance.group(target)?.startsWith('count-list-'))){const property={font:'fontFamily',size:'fontSize',color:'textColor',highlight:'textHighlight'}[key];if(property){const color=['color','highlight'].includes(key)?ElementAppearance.colorParts(value):null;ElementAppearance.update(target,color?{[property]:color.hex,[key==='color'?'textAlpha':'textHighlightAlpha']:color.alpha}:{[property]:key==='size'?Number(value):value});}return;}

    if(!editables.length)return;
    if(!restoreSelection() || range.collapsed){range=document.createRange();range.selectNodeContents(editables[0]);}
    const existing=range.startContainer===range.endContainer && range.startContainer.nodeType===1 && range.startContainer.matches('span') && !editables.includes(range.startContainer) && range.startOffset===0 && range.endOffset===range.startContainer.childNodes.length ? range.startContainer : null;
    const span=existing || node('span');span.classList.add('inline-text-appearance-style');
    if(key==='font')span.style.fontFamily=value;
    if(key==='size')span.style.fontSize=value+'px';
    if(key==='color'){span.style.color=value;span.className='text-selection-color';span.style.setProperty('--selection-text-color',value);}
    if(key==='highlight')span.style.backgroundColor=value;
    if(key==='effects'){
      const css=TextStyles.properties(value);if(!css)return;span.style.cssText+=';'+css;
    }
    if(!existing){span.append(range.extractContents());range.insertNode(span);}
    if(key==='effects'){
      // The new effect applies to the entire selection, including text that
      // already has nested effects. Keep unrelated fonts, emphasis and links.
      const properties=Object.hasOwn(value,'shadow')?['text-shadow']:[];
      if(Object.hasOwn(value,'outline'))properties.push('-webkit-text-stroke-width','-webkit-text-stroke-color','paint-order');
      for(const child of span.querySelectorAll('[style]'))for(const property of properties)child.style.removeProperty(property);
    }
    range.selectNodeContents(span);restoreSelection();dirty=true;refreshUndo();
  }
  function flush(){
    clearTimeout(autosaveTimer);
    commitToolbarInput();
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
    flush();closeSettings();if(target)ElementAppearance.clearEditState(target);
    for(const restore of restores.reverse())restore();restores=[];
    typing=false;for(const element of editables){element.removeAttribute('contenteditable');element.removeAttribute('spellcheck');}
    editables=[];target?.classList.remove('element-editor-selected');target=null;entry=null;range=null;fieldDraft=null;dirty=false;
    const panel=toolbar?.querySelector('[data-editor-panel]');if(panel){panel.replaceChildren();panel.hidden=true;}
    if(toolbar){toolbar.querySelector('[data-editor-state]')?.closest('label').setAttribute('hidden','');const selection=toolbar.querySelector('[data-editor-selection]');if(selection)selection.textContent='';const open=toolbar.querySelector('[data-editor-open]');if(open)open.disabled=true;toolbar.querySelectorAll('[data-editor-move]').forEach(button=>button.hidden=true);}
  }
  function commitToolbarInput(){const input=document.activeElement;if(toolbar?.contains(input) && input.matches('[data-editor-committed]') && input.value!==input.dataset.editorCommitted)input.dispatchEvent(new Event('change',{bubbles:true}));}
  function scheduleAutosave(){clearTimeout(autosaveTimer);const owner=context;autosaveTimer=setTimeout(()=>{if(context===owner && context?.enabled && SiteEditing.enabled)flush();},800);}
  function refreshUndo(){if(workspace){workspace.refresh?.();return;}scheduleAutosave();const redo=toolbar?.querySelector('[data-editor-redo]');if(redo)redo.disabled=!SiteEditing.canRedo;const control=toolbar?.querySelector('[data-editor-undo]');if(control)control.disabled=!(SiteEditing.canUndo || dirty || [...(toolbar?.querySelectorAll('[data-editor-committed]') || [])].some(input=>input.value!==input.dataset.editorCommitted) || fieldDraft?.inputs.some((input,index)=>input.value!==String(fieldDraft.entry.fields[index].value??'')));}
  function status(text){const live=toolbar?.querySelector('[data-editor-status]');if(live)live.textContent=text;}
  function labelInput(parent,title,type,value,change){
    const label=node('label',title);const input=node(type==='textarea'?'textarea':'input');if(type==='textarea')input.rows=2;else input.type=type;input.value=value??'';input.setAttribute('aria-label',title);label.append(input);parent.append(label);input.dataset.editorCommitted=input.value;const commit=()=>{if(!input.isConnected || !target)return;change(input.value,input);input.dataset.editorCommitted=input.value;refreshUndo();};input.addEventListener('change',commit);input.addEventListener('input',()=>{if(['number','range','color'].includes(type))commit();else refreshUndo();});return input;
  }
  function selectInput(parent,title,values,value,change){
    const label=node('label',title),select=node('select');select.setAttribute('aria-label',title);
    for(const item of values){const option=node('option',typeof item==='object'?item.label:String(item));option.value=String(typeof item==='object'?item.value:item);select.append(option);}if(![...select.options].some(option=>option.value===String(value))){const option=node('option',String(value));option.value=String(value);select.append(option);}select.value=value;label.append(select);parent.append(label);select.addEventListener('change',()=>{if(select.isConnected && target)change(select.value);});return select;
  }
  function colorControls(parent,title,property,alpha,css){
    let current=getComputedStyle(ElementAppearance.surfaceElement(target)).getPropertyValue(css);
    if(css.startsWith('--toolbar-') && target.matches('.event-dock')){
      const probe=node('button');probe.setAttribute('aria-pressed',String(css!=='--toolbar-text' && css!=='--toolbar-option-background'));probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none';target.append(probe);
      current=getComputedStyle(probe)[css.includes('background')?'backgroundColor':'color'];probe.remove();
    }
    if(css==='border-top-color'){
      const style=getComputedStyle(ElementAppearance.surfaceElement(target)),side=['Top','Right','Bottom','Left'].find(side=>parseFloat(style['border'+side+'Width'])>0 && style['border'+side+'Style']!=='none');if(side)current=style['border'+side+'Color'];
    }
    const computed=ElementAppearance.colorParts(current);
    const saved=ElementAppearance.values(target);let color=saved[property] || computed.hex,opacity=saved[alpha]??computed.alpha;
    const update=()=>ElementAppearance.update(target,{[property]:color,[alpha]:opacity});
    const picker=labelInput(parent,title,'color',color,value=>{color=value;hex.value=value;update();});
    const hex=labelInput(parent,title+' hex','text',color,(value,input)=>{if(!/^#[\da-f]{6}$/i.test(value)){input.setCustomValidity('Enter a six-digit hex color.');input.reportValidity();return;}input.setCustomValidity('');color=value;picker.value=value;update();});hex.maxLength=7;hex.size=8;hex.addEventListener('input',()=>{if(/^#[\da-f]{6}$/i.test(hex.value)){hex.setCustomValidity('');color=hex.value;picker.value=color;update();}});
    const slider=labelInput(parent,title+' opacity','range',opacity,value=>{opacity=Number(value);output.textContent=value+'%';update();});slider.min=0;slider.max=100;
    const output=node('output',opacity+'%');parent.append(output);
  }
  function textEffectsPanel(parent){
    const details=node('details'),summary=node('summary','Text effects');details.append(summary);parent.append(details);
    const current=TextStyles.effects(getComputedStyle(currentTextElement()),ElementAppearance.colorParts);
    const encode=(color,alpha)=>color+(alpha<100?Math.round(alpha/100*255).toString(16).padStart(2,'0'):'');
    function effectColor(title,value,change){
      const initial=ElementAppearance.colorParts(value||'#000000');let color=initial.hex,alpha=initial.alpha;
      const picker=labelInput(details,title,'color',color,value=>{color=value;hex.value=value;change(encode(color,alpha));});
      const hex=labelInput(details,title+' hex','text',color,(value,input)=>{
        if(!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)){input.setCustomValidity('Enter a six- or eight-digit hex color.');input.reportValidity();return;}
        input.setCustomValidity('');const parts=ElementAppearance.colorParts(value);color=parts.hex;if(value.length===9)alpha=parts.alpha;picker.value=color;opacity.value=alpha;change(encode(color,alpha));
      });hex.maxLength=9;hex.size=9;hex.addEventListener('input',()=>hex.setCustomValidity(''));
      const opacity=labelInput(details,title+' opacity','range',alpha,value=>{alpha=Number(value);change(encode(color,alpha));});opacity.min=0;opacity.max=100;
    }
    function number(title,value,min,max,change){const input=labelInput(details,title,'number',value,(value,input)=>{if(input.checkValidity())change(Number(value));});input.min=min;input.max=max;input.step=.5;}
    let shadow=current.shadow&&current.shadow!=='none'?current.shadow:'#000000',shadowOn=current.shadow&&current.shadow!=='none',x=Number(current.shadowX??1),y=Number(current.shadowY??1),blur=Number(current.shadowBlur??2);
    const applyShadow=()=>textEffect(shadowOn?{shadow,shadowX:x,shadowY:y,shadowBlur:blur}:{shadow:'none'});
    selectInput(details,'Text shadow',['Off','On'],shadowOn?'On':'Off',value=>{shadowOn=value==='On';applyShadow();});
    effectColor('Shadow color',shadow,value=>{shadow=value;applyShadow();});number('Shadow horizontal',x,-20,20,value=>{x=value;applyShadow();});number('Shadow vertical',y,-20,20,value=>{y=value;applyShadow();});number('Shadow blur',blur,0,40,value=>{blur=value;applyShadow();});
    let outline=current.outline&&current.outline!=='none'?current.outline:'#000000',outlineOn=current.outline&&current.outline!=='none',width=Number(current.outlineWidth)||1;
    const applyOutline=()=>textEffect(outlineOn?{outline,outlineWidth:width}:{outline:'none'});
    selectInput(details,'Text outline',['Off','On'],outlineOn?'On':'Off',value=>{outlineOn=value==='On';applyOutline();});
    effectColor('Outline color',outline,value=>{outline=value;applyOutline();});number('Outline width',width,0,8,value=>{width=value;applyOutline();});
  }
  function fieldsPanel(parent){
    const fields=entry?.fields || [];
    if(fields.length && (target.closest('#hostToolsPanel') || fields.length>1 || !editables.length || !['text','page','notes'].includes(entry.title))){
      const controls=fields.map(spec=>spec.options?selectInput(parent,spec.label,spec.options,spec.value,()=>{}):labelInput(parent,spec.label,spec.type || 'text',spec.value,()=>{}));
      controls.forEach((input,index)=>{input.addEventListener('input',refreshUndo);input.addEventListener('change',refreshUndo);const spec=fields[index];input.required=Boolean(spec.required);if(spec.min!==undefined)input.min=spec.min;});
      fieldDraft={inputs:controls,entry};
      button('Apply',()=>{if(!controls.every(input=>input.reportValidity()))return;flush();const values=controls.map(input=>input.value);SiteEditing.persist(()=>{entry.commit?.(values);fields.forEach((spec,index)=>{spec.value=values[index];});});SiteEditing.editorContext.refresh();},parent);
    }
    for(const [title,action] of entry?.options?.actions || [])if(!['Move left','Move right','Move up','Move down'].includes(title))button(title,()=>{flush();action();},parent);
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
    toolbar.querySelectorAll('[data-editor-group]').forEach(control=>control.setAttribute('aria-expanded',String(control.dataset.editorGroup===panelName && (!control.dataset.gapDirection || GapLayout.isGap(target) && GapLayout.getAxis(target)===control.dataset.gapDirection))));
    if(!panelName || !target)return;
    if(name==='Gap'){
      if(GapLayout.isGap(target)){if(target.matches('gathering-gap'))selectInput(panel,'Gap direction',['Vertical','Horizontal'],GapLayout.getAxis(target)==='x'?'Vertical':'Horizontal',value=>GapLayout.setAxis(target,value==='Vertical'?'x':'y'));const current=GapLayout.getSize(target);const number=labelInput(panel,'Gap size (px)','number',current,value=>GapLayout.setSize(target,value));number.min=0;number.max=1000;const slider=labelInput(panel,'Gap size','range',Math.min(current,300),value=>{number.value=value;GapLayout.setSize(target,value);});slider.min=0;slider.max=300;button('Remove gap',()=>{GapLayout.remove(target);release();},panel);}
      else panel.append(node('span','Drag ↑ Gap or → Gap from the toolbar, or click one to add it after the selection.'));
    }
    const textual=editables.length>0 && !target.matches('img,video');
    if(name==='Format' && target.matches('.event-dock')){
      colorControls(panel,'Unselected text and icons','toolbarTextColor','toolbarTextAlpha','--toolbar-text');
      colorControls(panel,'Selected text and icons','toolbarSelectedColor','toolbarSelectedAlpha','--toolbar-active-text');
    }else if(name==='Format' && ElementAppearance.group(target)==='counts'){
      for(const [title,selector] of [['Count','.summary-item>strong,.summary-stat>strong,.counter-row output'],['Count title','.summary-item>span,.summary-stat>span,.counter-row strong']])button(title,()=>{const part=target.querySelector(selector);if(part)select(part);},panel);
    }else if(name==='Format' && textual){
      for(const [title,command] of [['Bold','bold'],['Italic','italic'],['Underline','underline'],['Remove formatting','removeFormat']]){const control=button(title,()=>{textCommand(command);syncTextControls();},panel);control.dataset.textCommand=command;}
      selectInput(panel,'Alignment',['left','center','right','justify'],getComputedStyle(target).textAlign,value=>ElementAppearance.update(target,{textAlign:value}));
      selectInput(panel,'Font',TextStyles.fonts,'Times New Roman',value=>textStyle('font',value));
      selectInput(panel,'Size',TextStyles.sizes,16,value=>textStyle('size',value));
      const lineHeight=labelInput(panel,'Line height','number','',(value,input)=>{const height=Number(value);if(value.trim() && Number.isFinite(height) && height>=0.5 && height<=5){input.setCustomValidity('');ElementAppearance.update(target,{lineHeight:height});}else{input.setCustomValidity('Enter a line height from 0.5 to 5.');input.reportValidity();}});lineHeight.min=0.5;lineHeight.max=5;lineHeight.step=0.05;lineHeight.placeholder='Auto';lineHeight.title='Line spacing as a multiple of the font size (1 = single spacing)';
      for(const [title,key] of [['Text color','color'],['Highlight','highlight']]){
        const picker=labelInput(panel,title,'color','#000000',value=>textStyle(key,value));
        const hex=labelInput(panel,title+' hex','text','#000000',(value,input)=>{if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)){input.setCustomValidity('');picker.value=value.slice(0,7);textStyle(key,value);}else{input.setCustomValidity('Enter a hex color such as #123456.');input.reportValidity();}});hex.size=8;hex.addEventListener('input',()=>{if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex.value)){hex.setCustomValidity('');picker.value=hex.value.slice(0,7);textStyle(key,hex.value);}});
      }
      const currentLink=currentTextElement().closest('a');
      const link=labelInput(panel,'Link URL','url',currentLink && target.contains(currentLink)?currentLink.getAttribute('href') || '':'',()=>{});button('Add link',()=>{try{const url=new URL(link.value);if(!['http:','https:','mailto:'].includes(url.protocol))throw new Error();textCommand('createLink',url.href);}catch{status('Enter an http, https, or mailto link.');}},panel);
      const popup=labelInput(panel,'Popup text','textarea',globalThis.TextPopups?.decode(globalThis.TextPopups?.href(currentLink))||'',()=>{});popup.dataset.popupHref=globalThis.TextPopups?.href(currentLink)||'';
      button('Add popup link',()=>{
        if(!popup.value.trim()){status('Enter the text to show in the popup.');return;}
        const selected=restoreSelection(),anchor=currentTextElement().closest('a');
        if(anchor && target.contains(anchor) && (!selected || range.collapsed || anchor.contains(range.startContainer)&&anchor.contains(range.endContainer))){range=document.createRange();range.selectNodeContents(anchor);}
        else if(!selected || range.collapsed){status('Highlight the words to turn into a popup link.');return;}
        textCommand('createLink',TextPopups.encode(popup.value));syncTextControls();status('Popup link saved. Click it after leaving Edit mode to read it.');
      },panel);
      button('Remove link',()=>textCommand('unlink'),panel);
      textEffectsPanel(panel);
      fieldsPanel(panel);
      syncTextControls();
    }
    if(name==='Format' && !textual && !target.matches('.event-dock'))fieldsPanel(panel);
    if(name==='Format' && textual && !target.matches('button,a,h1,h2,h3,h4,h5,h6,time,legend,output,.section-kicker') && !entry?.fields?.[0]?.readonly){
      for(const [title,command] of [['Bullets','insertUnorderedList'],['Numbering','insertOrderedList']]){const control=button(title,()=>{textCommand(command);control.setAttribute('aria-pressed',String(document.queryCommandState(command)));},panel);control.dataset.textCommand=command;control.setAttribute('aria-pressed',String(document.queryCommandState(command)));}
      button('Indent',()=>textCommand('indent'),panel);button('Outdent',()=>textCommand('outdent'),panel);
    }
    if(name==='Format'){
      colorControls(panel,'Background','backgroundColor','backgroundAlpha','background-color');
      if(target.matches('.event-dock')){colorControls(panel,'Unselected option background','toolbarOptionBackground','toolbarOptionAlpha','--toolbar-option-background');colorControls(panel,'Selected option background','toolbarSelectedBackground','toolbarSelectedBackgroundAlpha','--toolbar-selected-background');}
      const values=ElementAppearance.values(target);
      const image=ElementAppearance.imageElement(target);
      const computedImage=getComputedStyle(ElementAppearance.surfaceElement(target)).backgroundImage;
      const currentImage=computedImage.startsWith('url(')?computedImage.slice(4,-1).replace(/^['"]|['"]$/g,''):'';
      // Banner artwork is uploaded from a file, not entered as a URL.
      const bannerImage=Boolean(image?.matches('#eventHeaderImage,#rsvpFirstPageImage') || target.matches('.header-art'));
      if(bannerImage)labelInput(panel,'Banner text (optional)','textarea',ElementAppearance.bannerText(target),value=>ElementAppearance.updateBannerText(target,value));
      const imageUrlInput=bannerImage?null:labelInput(panel,'Image URL','url',image?(image.getAttribute('src') || ''):values.backgroundImage ?? currentImage,(value,input)=>{const safe=ElementAppearance.imageUrl(value.trim());if(safe===null){input.setCustomValidity('Use an http or https image URL.');input.reportValidity();return;}input.setCustomValidity('');ElementAppearance.updateImage(target,safe);});
      const upload=labelInput(panel,'Upload image','file','',async(_value,input)=>{
        const file=input.files[0],selected=target,eventId=context.eventId;if(!file)return;
        input.disabled=true;status('Uploading image…');
        try{const url=await ElementAppearance.upload(file);if(context.eventId===eventId){ElementAppearance.updateImage(selected,url);if(imageUrlInput?.isConnected)imageUrlInput.value=url;status('Image saved.');}}catch(error){status(error.message);}finally{input.disabled=false;}
      });upload.accept='image/png,image/jpeg,image/webp';
      selectInput(panel,'Image fit',image?['cover','contain','fill','none','scale-down']:['cover','contain','auto'],values.imageFit || (image?getComputedStyle(image).objectFit:getComputedStyle(ElementAppearance.surfaceElement(target)).backgroundSize),value=>ElementAppearance.update(target,{imageFit:value}));
      button('Remove image',()=>{ElementAppearance.updateImage(target,'');if(imageUrlInput)imageUrlInput.value='';},panel);
    }
    if(name==='Format'){
      colorControls(panel,'Border','borderColor','borderAlpha','border-top-color');
      for(const [title,key,max,computed] of [['Width','borderWidth',24,'borderTopWidth'],['Radius','borderRadius',100,'borderTopLeftRadius']]){
        const input=labelInput(panel,title,'number',ElementAppearance.values(target)[key]??(key==='borderWidth'?Math.max(...['Top','Right','Bottom','Left'].map(side=>parseFloat(getComputedStyle(ElementAppearance.surfaceElement(target))['border'+side+'Width']) || 0)):parseFloat(getComputedStyle(ElementAppearance.surfaceElement(target))[computed]) || 0),(value,input)=>{if(input.checkValidity())ElementAppearance.update(target,{[key]:Number(value)});});input.min=0;input.max=max;
      }
    }
  }
  function select(element){
    if(element===target)return;
    release();target=element;entry=SiteEditing.editorFor(target);
    if(!entry?.fields && (target.matches('button,a,h1,h2,h3,h4,h5,h6,p,li,time,legend,address,output,.dish-title,.summary-item,.summary-stat,.counter-row,label') || ['count-values','count-titles','dish-details','dish-claimants','count-list-names','count-list-details','count-list-item-titles'].includes(ElementAppearance.group(target)))){SiteEditing.textElement(target,ElementAppearance.label(target));entry=SiteEditing.editorFor(target);}
    target.classList.add('element-editor-selected');
    if(SiteEditing.movableTextRoot(target)){target.draggable=true;restores.push(()=>target.draggable=true);}

    const kind=ElementAppearance.group(target);const stateControl=toolbar.querySelector('[data-editor-state]');if(stateControl){stateControl.closest('label').hidden=!ElementAppearance.selectedState(target);stateControl.value=ElementAppearance.selectedState(target) || 'unselected';}
    toolbar.querySelector('[data-editor-selection]').textContent=kind?'Shared '+(ElementAppearance.selectedState(target)?ElementAppearance.selectedState(target)+' ':'')+kind.replaceAll('-',' '):'';
    toolbar.querySelectorAll('[data-editor-move]').forEach(button=>button.hidden=!entry?.options?.actions?.some(([title])=>title===button.dataset.editorMove));
    const fields=entry?.fields;
    const readonly=Boolean(entry?.options?.contentReadOnly || fields?.[0]?.readonly || fields?.length===1 && !['text','page','notes'].includes(entry.title));
    if((fields?.length===1 || entry?.visual || entry?.options?.contentReadOnly) && target.getClientRects().length && target.getBoundingClientRect().height){
      editables=ElementAppearance.textParts(target).filter(part=>!part.querySelector('input,select,textarea,button,svg'));
      for(const part of editables){
        part.spellcheck=!readonly;
        if(readonly){const prevent=event=>{if(!event.inputType?.startsWith('format')&&!['insertOrderedList','insertUnorderedList'].includes(event.inputType))event.preventDefault();};part.addEventListener('beforeinput',prevent);restores.push(()=>part.removeEventListener('beforeinput',prevent));}
        const input=()=>{dirty=true;refreshUndo();};part.addEventListener('input',input);restores.push(()=>part.removeEventListener('input',input));
        const keydown=event=>{event.stopPropagation();if(!readonly && [' ','Spacebar'].includes(event.key) && target.matches('button,a,[role="tab"]')){event.preventDefault();document.execCommand('insertText',false,' ');dirty=true;refreshUndo();rememberSelection();return;}if(readonly){if(event.key.length===1 || ['Backspace','Delete','Enter'].includes(event.key))event.preventDefault();}else if(event.key==='Enter'){event.preventDefault();if(target.matches('button,a'))flush();else textCommand('insertLineBreak');}};part.addEventListener('keydown',keydown);restores.push(()=>part.removeEventListener('keydown',keydown));
        const keyup=event=>{event.stopPropagation();if([' ','Spacebar','Enter'].includes(event.key) && target.matches('button,a,[role="tab"]'))event.preventDefault();};part.addEventListener('keyup',keyup);restores.push(()=>part.removeEventListener('keyup',keyup));
        const paste=event=>{event.preventDefault();if(!readonly){const value=event.clipboardData.getData('text/plain');textCommand('insertText',target.matches('button,a')?value.replace(/\r?\n/g,' '):value);}};part.addEventListener('paste',paste);restores.push(()=>part.removeEventListener('paste',paste));
      }
    }
    toolbar.querySelector('[data-editor-open]').disabled=!target.matches('button,a,[role="tab"],summary');
    if(editables.length && !typing)status(entry?.options?.contentReadOnly?'Formatting selected. Edit gathering information in Manage Gatherings.':SiteEditing.movableTextRoot(target)?'Double-click to edit text; drag to move.':'Double-click to edit text.');
    panelName='';showPanel(GapLayout.isGap(target)?'Gap':'Format');
  }
  function pick(start){
    const gap=start.closest('gathering-gap,.existing-layout-gap');if(gap)return gap;
    const root=(globalThis.activeHostDialog?.() || [...document.querySelectorAll('dialog[open]')].at(-1)) || document.querySelector('#eventPage:not([hidden])') || document.body;
    if(!root.contains(start) || start.closest(excluded))return null;
    const countText=start.closest('.count-list-dialog :is(.invited-entry-names,.invited-entry-heading>strong,.invited-entry-heading>span)');if(countText && root.contains(countText))return countText;
    const dishTitle=start.closest('.dish-title');if(dishTitle && root.contains(dishTitle))return dishTitle;
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
  function sizeSidebar(){
    if(!toolbar)return;const width=Math.ceil(toolbar.getBoundingClientRect().width),value=width+'px';
    if(document.body.style.getPropertyValue('--editor-sidebar-width')!==value){document.body.style.setProperty('--editor-sidebar-width',value);globalThis.GapLayout?.refresh();}
  }

  function toolbarFrame(label='Element editor') {
    const frame=node('div');frame.className='element-editor-toolbar';frame.setAttribute('role','toolbar');frame.setAttribute('aria-label',label);return frame;
  }
  function openWorkspace(adapter) {
    beforeRender();workspace=adapter;context={host:true,enabled:false};target=adapter.root;
    toolbar=toolbarFrame(adapter.label || 'Element editor');toolbar.dataset.editorWorkspace='';
    const top=node('div');top.className='element-editor-top';toolbar.append(top);
    const actions=node('div');actions.className='element-editor-pair';top.append(actions);
    for(const [title,action] of adapter.actions || [])button(title,action,actions);
    const actionsSlot=node('div');actionsSlot.className='element-editor-pair';top.append(actionsSlot);adapter.mountActions?.(actionsSlot);
    top.append(node('hr'));const additions=node('div');additions.className='element-editor-row';top.append(additions);adapter.mount?.(additions);
    const row=node('div');row.className='element-editor-row element-editor-formatting';row.setAttribute('role','region');row.setAttribute('aria-label','Formatting');toolbar.append(row);
    const panel=node('div');panel.className='element-editor-panel';panel.dataset.editorPanel='';row.append(panel);
    const live=node('span');live.dataset.editorStatus='';live.setAttribute('role','status');toolbar.append(live);
    document.body.append(toolbar);sidebarRoot=document.body;sidebarRoot.setAttribute('data-editor-sidebar-root','');
    sidebarResize=new ResizeObserver(sizeSidebar);sidebarResize.observe(toolbar);sizeSidebar();
  }
  function workspaceControls(title,specs,change) {
    if(!workspace||!toolbar)return;const panel=toolbar.querySelector('[data-editor-panel]');panel.replaceChildren();panel.hidden=false;panel.parentElement.scrollTop=0;
    panel.setAttribute('aria-label',title?title+' formatting':'Formatting');
    for(const spec of specs){
      const commit=value=>change(spec.key,spec.type==='number'?Number(value):spec.type==='checkbox'?value==='true':value);
      if(spec.type==='toggle'){const input=button(spec.label,()=>{const value=input.getAttribute('aria-pressed')!=='true';input.setAttribute('aria-pressed',String(value));change(spec.key,value);},panel);input.setAttribute('aria-pressed',String(Boolean(spec.value)));input.dataset.workspaceField=spec.key;continue;}
      const input=spec.options?selectInput(panel,spec.label,spec.options,spec.value,commit):spec.type==='checkbox'?selectInput(panel,spec.label,['false','true'],String(Boolean(spec.value)),commit):labelInput(panel,spec.label,spec.type || 'text',spec.value,commit);
      input.dataset.workspaceField=spec.key;if(spec.type==='color'){const hex=labelInput(panel,spec.label+' hex','text',spec.value,commit);hex.dataset.workspaceField=spec.key;}if(spec.min!==undefined)input.min=spec.min;if(spec.step!==undefined)input.step=spec.step;
    }
    workspace.refresh?.();
  }
  function updateWorkspaceValues(values){for(const input of toolbar?.querySelectorAll('[data-workspace-field]') || [])if(Object.hasOwn(values,input.dataset.workspaceField)&&input!==document.activeElement)input.value=values[input.dataset.workspaceField];}
  function workspaceStatus(text){status(text);}
  function render(ctx){
    if(workspace)return;
    context=ctx;
    if(!ctx?.host || !ctx.enabled){beforeRender();return;}
    const root=(globalThis.activeHostDialog?.() || [...document.querySelectorAll('dialog[open]')].at(-1)) || document.body;
    if(!toolbar){
      toolbar=toolbarFrame();
      const row=node('div');row.className='element-editor-row';toolbar.append(row);
      const selection=node('span');selection.dataset.editorSelection='';row.append(selection);
      const stateControl=selectInput(row,'Formatting state',['unselected','selected'],'unselected',value=>{if(!target)return;commitToolbarInput();flush();ElementAppearance.editState(target,value);toolbar.querySelector('[data-editor-selection]').textContent='Shared '+value+' '+ElementAppearance.group(target);if(panelName){const name=panelName;panelName='';showPanel(name);}});selection.before(stateControl.closest('label'));stateControl.dataset.editorState='';for(const option of stateControl.options)option.textContent=option.value==='selected'?'Selected':'Unselected';stateControl.closest('label').hidden=true;
      for(const title of ['Format']){const control=button(title,()=>{panelName='';showPanel(title);},row);row.prepend(control);control.dataset.editorGroup=title;control.setAttribute('aria-expanded','false');}
      const gaps=node('div');gaps.className='element-editor-pair';gaps.dataset.editorGaps='';
      for(const [title,axis] of [['↑ Gap','x'],['→ Gap','y']]){
        const control=button(title,()=>{
          if(!target){status('Select an element to add a gap after it, or drag this gap between elements.');return;}
          if(GapLayout.isGap(target)){GapLayout.setAxis(target,axis);panelName='';showPanel('Gap');}
          else{const gap=GapLayout.addAfter(target,axis);if(gap)select(gap);}
        },gaps);control.draggable=true;control.dataset.newGap=axis;control.dataset.gapDirection=axis;control.dataset.editorGroup='Gap';control.title=axis==='x'?'Drag to the left or right of an element':'Drag above or below an element';control.setAttribute('aria-expanded','false');
      }
      const moves=node('div');moves.className='element-editor-context-actions';
      for(const title of ['Move left','Move right','Move up','Move down']){
        const move=button(title,()=>{
          if(!target)return;const path=ElementAppearance.selector(target);flush();
          const current=document.querySelector(path),record=current && SiteEditing.editorFor(current);
          record?.options?.actions?.find(([name])=>name===title)?.[1]();
          const next=document.querySelector(path);if(next){select(next);editables[0]?.focus({preventScroll:true});}
        },moves);move.dataset.editorMove=title;move.hidden=true;
      }
      const actions=node('div');actions.className='element-editor-pair';actions.dataset.editorActions='';
      const open=button('Use Button',()=>{if(!target)return;const current=target;release();allowAction=true;try{current.click();}finally{allowAction=false;}},actions);open.dataset.editorOpen='';open.disabled=true;
      const parent=button('Container',()=>{if(target?.parentElement && !target.matches('body,dialog')){flush();select(target.parentElement);}},actions);parent.title='Select the container around this element';
      const templatesSlot=node('span');templatesSlot.dataset.editorTemplates='';
      const management=node('div');management.className='element-editor-management element-editor-pair';management.dataset.editorManagement='';
      const menu=button('Menu',()=>{commitToolbarInput();flush();globalThis.openMenuEditor?.();},row);menu.id='editMenuButton';
      const menuTemplates=node('div');menuTemplates.className='element-editor-pair';menuTemplates.dataset.editorMenuTemplates='';menuTemplates.append(menu,templatesSlot);
      const history=node('div');history.className='element-editor-history';row.append(history);
      const undo=button('Undo',()=>{commitToolbarInput();flush();SiteEditing.endUndoGroup();status(SiteEditing.undo()?'Change undone.':'There is no change to undo, or the data has changed elsewhere.');},history);undo.dataset.editorUndo='';undo.setAttribute('aria-label','Undo');undo.title='Undo';undo.disabled=true;
      const redo=button('Redo',()=>{commitToolbarInput();flush();SiteEditing.endUndoGroup();status(SiteEditing.redo()?'Change redone.':'There is no change to redo, or the data has changed elsewhere.');},history);redo.dataset.editorRedo='';redo.setAttribute('aria-label','Redo');redo.title='Redo';redo.disabled=true;
      const gatheringManagement=node('div');gatheringManagement.className='element-editor-management';gatheringManagement.dataset.editorGatheringManagement='';
      const addText=button('Add text box',()=>{commitToolbarInput();flush();context?.addTextBlock?.();},row);addText.dataset.editorAddText='';
      const top=node('div');top.className='element-editor-top';top.append(history,node('hr'),gatheringManagement,menuTemplates,management,node('hr'),addText,gaps,actions,moves);toolbar.prepend(top);
      const panel=node('div');panel.dataset.editorPanel='';panel.className='element-editor-panel';panel.hidden=true;row.append(panel);
      const live=node('span');live.dataset.editorStatus='';live.setAttribute('role','status');toolbar.append(live);
      toolbar.addEventListener('focusin',event=>{if(event.target.matches('input,select,textarea'))SiteEditing.beginUndoGroup();});
      toolbar.addEventListener('focusout',event=>{if(event.target.matches('input[type="color"]') && !event.relatedTarget)return;SiteEditing.endUndoGroup();});
      toolbar.addEventListener('pointerdown',event=>{rememberSelection();if(event.target.matches('input,select,textarea'))SiteEditing.beginUndoGroup();else SiteEditing.endUndoGroup();if(event.target.matches('button:not([draggable="true"])'))event.preventDefault();});
    }
    if(sidebarRoot!==root){sidebarRoot?.removeAttribute('data-editor-sidebar-root');sidebarRoot=root;root.setAttribute('data-editor-sidebar-root','');}
    if(toolbar.parentElement!==root)root.append(toolbar);
    if(!sidebarResize){sidebarResize=new ResizeObserver(sizeSidebar);sidebarResize.observe(toolbar);}
    const manage=document.querySelector('#manageGatherings');if(manage){manage.hidden=false;toolbar.querySelector('[data-editor-gathering-management]').append(manage);}
    const templates=document.querySelector('#invitationTemplatesButton');if(templates){templates.hidden=false;toolbar.querySelector('[data-editor-templates]').append(templates);}
    for(const id of ['editAccountsButton','gatheringHistoryButton']){const control=document.getElementById(id);if(control)toolbar.querySelector('[data-editor-management]').append(control);}
    toolbar.querySelector('[data-editor-add-text]').hidden=!context?.addTextBlock;
    toolbar.querySelector('#editMenuButton').disabled=!globalThis.hasGatheringToolbarContext?.();
    refreshUndo();sizeSidebar();
  }
  function beforeRender(){workspace?.restore?.();workspace=null;release();clearTimeout(autosaveTimer);sidebarResize?.disconnect();sidebarResize=null;sidebarRoot?.removeAttribute('data-editor-sidebar-root');sidebarRoot=null;document.body.style.removeProperty('--editor-sidebar-width');const manage=document.querySelector('#manageGatherings');if(manage){manage.hidden=true;document.querySelector('#hostToolsPanel .host-tool-actions').append(manage);}const templates=document.querySelector('#invitationTemplatesButton');if(templates){templates.hidden=true;document.body.append(templates);}for(const id of ['editAccountsButton','gatheringHistoryButton']){const control=document.getElementById(id);if(control)document.querySelector('#hostEditorManagement').append(control);}toolbar?.remove();toolbar=null;panelName='';}
  document.addEventListener('selectionchange',()=>{rememberSelection();if(!toolbar?.contains(document.activeElement))syncTextControls();});
  document.addEventListener('pointerdown',event=>{
    if(context?.enabled && toolbar && !toolbar.contains(event.target))SiteEditing.endUndoGroup();
    if(!target || !SiteEditing.movableTextRoot(target) || !target.contains(event.target))return;
    const rect=target.getBoundingClientRect();target.draggable=!typing || Math.min(event.clientX-rect.left,rect.right-event.clientX,event.clientY-rect.top,rect.bottom-event.clientY)<=6;
  },true);
  document.addEventListener('click',event=>{
    if(!context?.host || !context.enabled || allowAction || event.target.closest(excluded) || event.target.closest('#accountLogoutButton,#editItemsButton,#newGatheringButton,#hostToolsPanel .host-tool-actions,#hostQuickActions,#hostToolsButton,#invitationTemplatesButton'))return;
    if(target && editables.some(part=>part.contains(event.target))){event.stopImmediatePropagation();if(target.matches('button,a,[role="tab"]'))event.preventDefault();return;}
    const element=pick(event.target);if(!element)return;
    event.preventDefault();event.stopImmediatePropagation();select(element);
    const part=editables.find(part=>part.contains(event.target)) || editables[0];
    if(part && typing){part.focus({preventScroll:true});const caret=document.caretRangeFromPoint?.(event.clientX,event.clientY) || document.createRange();if(!part.contains(caret.startContainer)){caret.selectNodeContents(part);caret.collapse(false);}const selection=window.getSelection();selection.removeAllRanges();selection.addRange(caret);rememberSelection();}
  },true);
  document.addEventListener('dblclick',event=>{
    if(!context?.enabled || !target || entry?.fields?.[0]?.readonly || entry?.options?.contentReadOnly)return;
    const part=editables.find(part=>part.contains(event.target));if(!part)return;
    event.preventDefault();event.stopImmediatePropagation();typing=true;for(const editable of editables)editable.setAttribute('contenteditable','true');if(SiteEditing.movableTextRoot(target))target.draggable=false;
    part.focus({preventScroll:true});const caret=document.caretRangeFromPoint?.(event.clientX,event.clientY);if(caret && part.contains(caret.startContainer)){const selection=window.getSelection();selection.removeAllRanges();selection.addRange(caret);rememberSelection();}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && workspace){commitToolbarInput();if(toolbar?.contains(event.target)&&event.target.matches('input,select,textarea'))return;event.preventDefault();event.stopImmediatePropagation();workspace.clearSelection?.();return;}if(event.key==='Escape' && target){event.preventDefault();event.stopImmediatePropagation();release();status('Selection cleared.');}},true);
  globalThis.ElementEditor={openWorkspace,workspaceControls,updateWorkspaceValues,workspaceStatus,ownsText:part=>Boolean(context?.enabled && editables.includes(part)),refreshUndo,activate:element=>{release();allowAction=true;try{element.click();}finally{allowAction=false;}},render,beforeRender,flush,select,refresh:()=>render(context)};
})();
