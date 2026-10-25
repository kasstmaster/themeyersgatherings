/* Host-only contextual editors. Direct text saves on blur; structured forms use Save. */
(() => {
  let enabled = false;
  let cleaning = false, flushing = false;
  const savers = new Set();
  const cleanup = [];
  const drafts = new Map();
  const editTargets=new Map();
  const textRoots=new Set();
  let context;
  const originals = new Map();
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const overlays = [];
  const layers = new Map();
  let frame = 0;
  function layerFor(target) {
    const owner = target.closest('dialog') || document.body;
    if (!layers.has(owner)) {
      const layer = node('div', undefined, 'inline-overlay-layer');owner.append(layer);layers.set(owner,layer);
      cleanup.push(() => { layer.remove();layers.delete(owner); });
    }
    return layers.get(owner);
  }
  function overlay(element, target, kind = 'after', deferred = false) {
    layerFor(target).append(element);
    element.classList.add('inline-overlay-item');element.dataset.inlineAnchor=target.id || '';
    const entry={element,target,kind};overlays.push(entry);
    cleanup.push(() => { const index=overlays.indexOf(entry);if(index>=0)overlays.splice(index,1);element.remove(); });
    if(!deferred)positionOverlays();
    if (!frame) frame=requestAnimationFrame(tick);
    return element;
  }
  function tick() { frame=0;positionOverlays();if(overlays.length)frame=requestAnimationFrame(tick); }
  function positionOverlays() {
    const width=document.documentElement.clientWidth;
    const dock=document.querySelector('.event-dock');
    const height=dock && !dock.hidden ? Math.min(innerHeight,dock.getBoundingClientRect().top) : innerHeight;
    for (const {element,target,kind} of overlays) {
      if(!element.parentElement)continue;
      const rect=target.getBoundingClientRect();
      const documentLayer=element.parentElement?.parentElement===document.body;
      const layerRect=element.parentElement.getBoundingClientRect();
      const offsetX=-layerRect.left,offsetY=-layerRect.top;
      const place=(left,top)=>{element.style.left=`${left+offsetX}px`;element.style.top=`${top+offsetY}px`;};
      const emptyText = !target.textContent.trim() && !target.querySelector('img,video,input,select,textarea');
      let visible=target.isConnected && target.getClientRects().length && !target.closest('[hidden]') && (emptyText || rect.width>0 && rect.height>0);
      if (visible && kind!=='editor') {
        if(!documentLayer)visible=rect.bottom>0 && rect.top<height && rect.right>0 && rect.left<width;
        if(getComputedStyle(target).visibility==='hidden' && !target.closest('.inline-edit-masked'))visible=false;
        for(let parent=target.parentElement;visible && parent && parent!==document.body;parent=parent.parentElement) {
          if(/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) {
            const clip=parent.getBoundingClientRect();visible=rect.bottom>clip.top && rect.top<clip.bottom;
          }
        }
      }
      element.style.visibility=visible?'visible':'hidden';
      if(!visible || element.hidden) continue;
      if(kind==='frame') {
        element.style.width=`${rect.width}px`;element.style.height=`${rect.height}px`;
        place(rect.left,rect.top);element.style.maxHeight=`${rect.height}px`;continue;
      }
      if(kind==='editor'||kind==='panel') {
        element.style.width=`${Math.min(780,width-24)}px`;
        const top=Math.max(12,Math.min(rect.top,height-180));
        place(Math.max(12,Math.min(rect.left,width-element.offsetWidth-12)),top);element.style.maxHeight=`${Math.max(120,height-top-12)}px`;
        continue;
      }
      let anchor=rect;
      if(kind==='text') {
        const range=document.createRange();range.selectNodeContents(target);
        const text=range.getBoundingClientRect();if(text.width)anchor=text;
      }
      let left=emptyText ? anchor.left : anchor.right+6,top=anchor.top;
      if(kind==='above'){
        element.style.maxWidth=`${rect.width}px`;left=rect.left;top=rect.top-element.offsetHeight-3;
        const nav=target.closest('[role="tablist"]');
        if(nav){
          const rows=[...new Set([...nav.querySelectorAll(':scope > [role="tab"]')].filter(tab=>!tab.hidden).map(tab=>tab.getBoundingClientRect().top))].sort((a,b)=>a-b);
          const row=rows.indexOf(rect.top);
          if(row>0)top=rows[0]-(row+1)*(element.offsetHeight+3);
        }
      }
      if(kind==='page'||kind==='delete'){
        left=rect.right-element.offsetWidth-8;top=rect.top+8;
        const actions=target.querySelector(':scope > [data-page-actions]');
        if(actions?.getClientRects().length)top=Math.max(top,actions.getBoundingClientRect().bottom+6);
      }
      if(kind==='appearance'||kind==='element-edit'){
        left=target.matches('body,dialog,nav,header,form,main,section,div,footer')?rect.left+4:rect.right-element.offsetWidth-3;top=rect.top+3;
        const dock=target.closest('.event-dock'),action=target.closest('button,a');
        if(dock)top=dock.getBoundingClientRect().top-element.offsetHeight-3;
        else if(action && action!==target)top=action.getBoundingClientRect().top-element.offsetHeight-3;
        else if(action && (rect.width<40 || action.matches('.modal-close'))){left=rect.left-element.offsetWidth-3;top=rect.top;}
      }
      if(kind==='plus'){left=rect.right-element.offsetWidth;top=rect.top-element.offsetHeight-3;}
      place(Math.max(4,Math.min(left,width-element.offsetWidth-4)),top);
      if(!documentLayer && (top+element.offsetHeight<=0 || top>=height))element.style.visibility='hidden';
    }
  }
  function button(text, action, parent, label = text) {
    if(globalThis.ElementEditor && parent.isConnected && !parent.closest('.element-editor-toolbar')){const entry=editTargets.get(parent) || {};entry.options??={};entry.options.actions??=[];entry.options.actions.push([label,action]);editTargets.set(parent,entry);cleanup.push(()=>editTargets.delete(parent));return node('button');}
    const isEdit = /^Edit(?: |$)/.test(text);
    const control = node('button', isEdit && text!=='Edit tab names' ? 'Edit' : text, 'inline-edit-control');
    if (isEdit) control.classList.add('inline-edit-action');
    control.type = 'button'; control.setAttribute('aria-label', label);
    control.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (context.host && enabled) action();
    });
    if (parent.isConnected && !parent.closest('.inline-overlay-layer,.inline-edit-tools,.inline-meal-editor')) overlay(control,parent,'delete');
    else parent.append(control);
    cleanup.push(() => control.remove());
    return control;
  }
  function beforeRender() {
    globalThis.ElementEditor?.beforeRender();
    textRoots.clear();
    cancelAnimationFrame(frame);frame=0;
    cleaning = true;
    try { while (cleanup.length) cleanup.pop()(); } finally { cleaning = false; }
  }
  function render(ctx) {
    context = ctx;
    if (!ctx.host) { enabled = false; drafts.clear(); }
    const toggle = document.querySelector('#editItemsButton');
    toggle.textContent = enabled ? 'Done editing' : 'Edit website';
    toggle.setAttribute('aria-pressed', String(enabled));
    document.querySelector('#invitationTemplatesButton').hidden = !ctx.host;
    document.body.classList.toggle('site-edit-mode', enabled && ctx.host);
  }
  function field(target, title, fields, commit, options = {}) {
    if (!target) return;
    if(fields.some(spec=>spec.type==='textarea') && !target.matches('section'))textRoots.add(target);
    if (!enabled || !context.host || editTargets.has(target)) return;
    const key = `${context.eventId}:${options.key || target.id || title}`;
    if (document.querySelector(`[data-inline-field-key="${CSS.escape(key)}"]`)) return;
    if(globalThis.ElementEditor){
      editTargets.set(target,{fields,title,commit,options,textBlock:fields.some(spec=>spec.type==='textarea') && !target.matches('section'),visual:Boolean(fields[0]?.visual)});
      cleanup.push(()=>editTargets.delete(target));return;
    }
    // Empty fields still need an anchor for their Edit control. Keep inactive
    // pages hidden; only reveal a field itself when its values are empty.
    const wasHidden=target.hidden;
    const emptyValues=fields.every(spec=>spec.value === '' || spec.value == null);
    if(wasHidden && emptyValues)target.hidden=false;
    if(!target.getBoundingClientRect().height)target.classList.add('inline-empty-field');
    cleanup.push(()=>{target.classList.remove('inline-empty-field');if(wasHidden && emptyValues)target.hidden=true;});
    const control = node('span', undefined, 'inline-edit-tools');
    control.dataset.inlineFieldKey = key;
    const placement = options.placement || (title === 'page' ? 'page' : 'after');
    const container=placement==='page' ? target.closest('.bride-groom-content,.what-to-expect-content,.perfect-experience-panel,.gathering-page') || target.closest('section') || target : target;
    if(placement==='page')control.classList.add('inline-page-tools');
    if(placement==='inline') { target.after(control);cleanup.push(()=>control.remove()); }
    else overlay(control,container,placement);
    editTargets.set(target,{fields,title,textBlock:fields.some(spec=>spec.type==='textarea') && !target.matches('section')});
    cleanup.push(()=>editTargets.delete(target));
    let showing = false;
    const open = () => {
      if (showing) return; showing = true;
      if (['text','page','notes'].includes(title)) {
        control.hidden = true;
        directFields(target, fields, values => { commit(values); fields.forEach((spec,index)=>{spec.value=values[index];}); drafts.delete(key); context.save(); showing=false;control.hidden=false; }, key, options.titleTarget);
        return;
      }
      const form = node('div', undefined, 'inline-editor');
      form.setAttribute('role', 'group'); form.setAttribute('aria-label', `Edit ${title}`);
      const inputs = fields.map((spec, index) => {
        const label = node('label'); label.append(node('span', spec.label));
        const input = node(spec.options ? 'select' : spec.type === 'textarea' ? 'textarea' : 'input');
        if (input.tagName === 'INPUT') input.type = spec.type || 'text';
        if (spec.options) spec.options.forEach(value => { const option = node('option', value); option.value = value; input.append(option); });
        input.value = drafts.get(key)?.[index] ?? spec.value ?? '';
        if (spec.required) input.required = true;
        if (spec.min !== undefined) input.min = spec.min;
        if (input.tagName === 'TEXTAREA') input.rows = 10;
        input.addEventListener('input', () => drafts.set(key, inputs.map(element => element.value)));
        input.setAttribute('aria-label',spec.label);label.append(input);form.append(label);if(input.tagName==='TEXTAREA')form.append(textToolbar(input,target,spec));return input;
      });
      const actions = node('div', undefined, 'inline-editor-actions');
      button('Save', () => {
        if (!inputs.every(input => {
          input.setCustomValidity('');
          if (input.type === 'url' && input.value && !/^https?:\/\//i.test(input.value)) input.setCustomValidity('Use an https:// or http:// link.');
          return input.reportValidity();
        })) return;
        commit(inputs.map(input => input.value)); drafts.delete(key); context.save();
      }, actions, `Save ${title}`);
      button('Cancel', () => { drafts.delete(key); context.refresh(); }, actions, `Cancel editing ${title}`);
      button('Appearance',()=>ElementAppearance.open(target),actions,'Edit element appearance');
      form.addEventListener('keydown', event => {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') {
          event.preventDefault(); actions.querySelector('button').click();
        }
      });
      form.append(actions);if(target.closest('.event-dock'))overlay(form,target.closest('dialog') || target.closest('.event-dock'),'editor');else replaceInPlace(form,target);
      control.hidden = true;
      inputs[0]?.focus();
    };
    button(`Edit ${title}`, open, control);
    if (drafts.has(key) && target.getClientRects().length) open();
  }
  function replaceInPlace(editor, target) {
    target.before(editor);
    target.classList.add('inline-edit-replaced');
    cleanup.push(() => { editor.remove(); target.classList.remove('inline-edit-replaced'); });
  }
  function textToolbar(input,target,spec={}){
        const toolbar=node('div',undefined,'inline-text-formatting');
        toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Text formatting');
        const apply=(kind,value)=>{
          const start=input.selectionStart,end=input.selectionEnd,selected=input.value.slice(start,end);
          if(spec.readonly && !selected)return;
          if(['font','size','color','highlight','border'].includes(kind)&&!selected)return;
          const replacement=formatTextSelection(kind,selected,value);
          input.setRangeText(replacement,start,end,'select');
          input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
          input.setSelectionRange(start,start+replacement.length);
        };
        for(const [kind,label] of [['bold','Bold'],['italic','Italic'],['code','Code'],['bullets','Bullets'],['numbers','Numbered list'],['link','Link']]) {
          if((spec.readonly || input.tagName!=='TEXTAREA') && ['bullets','numbers','link'].includes(kind))continue;
          const control=node('button',label,'inline-edit-control');control.type='button';
          control.setAttribute('aria-label',`Format ${label.toLowerCase()}`);
          control.addEventListener('mousedown',event=>event.preventDefault());
          control.addEventListener('click',()=>apply(kind));toolbar.append(control);
        }
        for(const [kind,label,values] of [['font','Font',TextStyles.fonts],['size','Size',TextStyles.sizes]]) {
          const wrapper=node('label',undefined,'inline-text-style');
          const select=node('select');select.setAttribute('aria-label',kind==='font'?'Font family':'Font size in pixels');
          const placeholder=node('option',label);placeholder.value='';placeholder.disabled=true;placeholder.selected=true;select.append(placeholder);
          for(const value of values){const option=node('option',String(value));option.value=String(value);select.append(option);}
          select.addEventListener('change',()=>apply(kind,select.value));wrapper.append(select);toolbar.append(wrapper);
        }
        const appearance=node('details',undefined,'inline-text-appearance');appearance.append(node('summary','Text appearance'));
        for(const [kind,label] of [['color','Text color'],['highlight','Highlight color'],['border','Text border color']]){
          const row=node('label');row.append(node('span',label));const picker=node('input'),hex=node('input');picker.type='color';hex.type='text';hex.value=picker.value='#000000';picker.setAttribute('aria-label',label);hex.setAttribute('aria-label',label+' hex');hex.pattern='#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?';
          picker.addEventListener('change',()=>{hex.value=picker.value;apply(kind,hex.value);});hex.addEventListener('change',()=>{if(!hex.checkValidity())return;picker.value=hex.value.slice(0,7);apply(kind,hex.value);});row.append(picker,hex);appearance.append(row);
        }
        const surface=node('button','Element appearance','inline-edit-control');surface.type='button';surface.addEventListener('mousedown',event=>event.preventDefault());surface.addEventListener('click',()=>ElementAppearance.open(target.matches('label')?target.querySelector('input:not([type="checkbox"]):not([type="radio"]),textarea,select') || target:target));appearance.append(surface);toolbar.append(appearance);spec.actions?.(toolbar);
        input.addEventListener('keydown',event=>{
          if((event.ctrlKey||event.metaKey) && ['b','i'].includes(event.key.toLowerCase())) {
            event.preventDefault();apply(event.key.toLowerCase()==='b'?'bold':'italic');
          }
        });
    return toolbar;
  }
  function directFields(target, fields, commit, key, titleTarget) {
    const editors = [], anchors = [], toolbars = [],wrappers=[];
    let wrappedBody;
    let pageBody = target.matches('section') ? target.querySelector('.bride-groom-content,.what-to-expect-content') || target : target;
    const heading = titleTarget || target.closest('section')?.querySelector('h2,h3');
    if (pageBody === target && target.matches('section') && heading && fields.length > 1) {
      const body = node('div');wrappedBody=body;
      const children = [...target.childNodes].filter(child => child !== heading);
      target.append(body); children.forEach(child => body.append(child));
      cleanup.push(() => { body.replaceWith(...body.childNodes); }); pageBody=body;
    }
    fields.forEach((spec, index) => {
      const isTitle = fields.length > 1 && index === 0 && spec.label === 'Title';
      const anchor = isTitle && heading ? heading : pageBody;
      const input = node(spec.type === 'textarea' ? 'textarea' : 'input');
      input.className = 'inline-direct-input';
      input.setAttribute('aria-label', spec.label);
      input.value = drafts.get(key)?.[index] ?? spec.value ?? '';
      input.required = Boolean(spec.required);input.readOnly=Boolean(spec.readonly);
      const style = getComputedStyle(anchor), rect = anchor.getBoundingClientRect();
      for (const property of ['font','color','textAlign','letterSpacing','padding','margin','borderRadius','backgroundColor']) input.style[property] = style[property];
      input.style.lineHeight='var(--copy-line-height,1.65)';
      input.style.width = `${rect.width}px`; input.style.maxWidth = '100%';
      if (input.tagName === 'TEXTAREA') {
        input.style.minHeight = `${Math.max(48,rect.height)}px`;
        const resize = () => { input.style.height='auto'; input.style.height=`${input.scrollHeight+2}px`; };
        input.addEventListener('input', resize); requestAnimationFrame(resize);
      }
      input.addEventListener('input', () => { if (key) drafts.set(key,editors.map(editor=>editor.value)); });
      replaceInPlace(input,anchor); editors.push(input); anchors.push(anchor);
      if(input.tagName==='TEXTAREA' || input.type==='text') {
        const toolbar=textToolbar(input,anchor,spec);
        const wrapper=node('div',undefined,'inline-text-editor');input.before(wrapper);wrapper.append(toolbar,input);toolbars.push(toolbar);wrappers.push(wrapper);cleanup.push(()=>wrapper.remove());
        if(anchor.closest('.event-dock')){anchor.classList.remove('inline-edit-replaced');wrapper.classList.add('inline-editor');overlay(wrapper,anchor.closest('dialog') || anchor,'editor');}
      }
    });
    let saved = false;
    const save = () => {
      if (saved || cleaning) return;
      if (!editors.every(editor => { const plain=node('span');plain.innerHTML=context.format(editor.value,{inline:true});editor.setCustomValidity(editor.required && !plain.textContent.trim() ? 'Enter a title.' : ''); return editor.reportValidity(); })) return;
      saved=true;
      const wasFlushing=flushing;flushing=true;
      try { commit(editors.map((editor,index)=>{
        if(fields[index].visual){ElementAppearance.storeText(anchors[index],editor.value,undefined,!fields[index].readonly);return editor.value;}
        if(fields[index].type!=='textarea'){
          const plain=node('span');plain.innerHTML=context.format(editor.value,{inline:true});
          ElementAppearance.storeText(anchors[index],editor.value,plain.textContent);return plain.textContent;
        }
        return editor.value;
      })); } finally { flushing=wasFlushing; }
      // Restore only the edited content. Rebuilding the whole page here drops
      // the click that moved focus away and unnecessarily resets other editors.
      editors.forEach((editor,index) => {
        const anchor=anchors[index];
        if(!fields[index].visual){if(fields[index].type==='textarea')anchor.innerHTML=formatTextForTarget(anchor,editor.value);else {const plain=node('span');plain.innerHTML=context.format(editor.value,{inline:true});anchor.textContent=plain.textContent;}}
        anchor.classList.remove('inline-edit-replaced');editor.remove();
      });
      if(wrappedBody?.parentNode)wrappedBody.replaceWith(...wrappedBody.childNodes);
      toolbars.forEach(toolbar=>toolbar.remove());wrappers.forEach(wrapper=>{const index=overlays.findIndex(entry=>entry.element===wrapper);if(index>=0)overlays.splice(index,1);wrapper.remove();});
      savers.delete(save);context.directSaved?.();ElementAppearance.applyText();
    };
    savers.add(save); cleanup.push(() => savers.delete(save));
    const insideEditor=element=>editors.includes(element)||toolbars.some(toolbar=>toolbar.contains(element));
    toolbars.forEach(toolbar=>toolbar.addEventListener('focusout',event=>{if(!insideEditor(event.relatedTarget))save();}));
    editors.forEach(editor => {
      editor.addEventListener('blur', event => { if (!insideEditor(event.relatedTarget)) save(); });
      editor.addEventListener('keydown', event => {
        if (event.key==='Enter' && editor.tagName!=='TEXTAREA') { event.preventDefault(); editor.blur(); }
      });
    });
    (editors.find(editor=>editor.tagName==='TEXTAREA') || editors[0])?.focus();
  }
  function formatTextSelection(kind,selected,value) {
    if(['font','size','color','highlight','border'].includes(kind))return TextStyles.mark(selected,{[kind]:value});
    if(kind==='bullets'||kind==='numbers')return (selected||'List item').split('\n').map((line,index)=>`${kind==='bullets'?'-':`${index+1}.`} ${line}`).join('\n');
    if(kind==='link')return `[${selected||'Link text'}](https://example.com)`;
    const marker={bold:'**',italic:'*',code:'`'}[kind];
    // The renderer formats each line separately; markers must not span lines.
    return (selected||'Text').split('\n').map(line=>{
      if(!line.trim())return line;
      const whitespace=line.match(/^(\s*)(.*?)(\s*)$/);
      const text=whitespace[2];
      const formatted=text.startsWith(marker) && text.endsWith(marker) && text.length>marker.length*2
        && !(kind==='italic' && text.startsWith('**') && !text.startsWith('***'))
        ? text.slice(marker.length,-marker.length) : `${marker}${text}${marker}`;
      return whitespace[1]+formatted+whitespace[3];
    }).join('\n');
  }
  function editTitle(tab, anchor, value, commit,actions) {
    if (tab.dataset.editingTitle) return;
    tab.dataset.editingTitle = 'true';
    // Hidden single-tab titles are edited at their visible page heading.
    const target = tab.getClientRects().length ? tab : anchor.querySelector('h2,h3') || anchor;
    directFields(target, [{label:'Page title',value:ElementAppearance.textValue(tab) || value,required:true,actions}], values => { commit(values[0].trim()); delete tab.dataset.editingTitle;context.save(); });
    cleanup.push(() => delete tab.dataset.editingTitle);
  }
  function portal(target, title, sources, prepare, options = {}) {
    if (!target || !enabled || !context.host) return;
    if(globalThis.ElementEditor){
      const entry=editTargets.get(target) || {};entry.portal={title,sources,prepare};editTargets.set(target,entry);cleanup.push(()=>editTargets.delete(target));return;
    }
    const control = node('span', undefined, 'inline-edit-tools');
    if(options.automatic)target.append(control);else overlay(control,target);
    cleanup.push(() => control.remove());
    const open = () => {
      prepare();
      const area = node('div', undefined, 'inline-editor inline-portal-editor');
      const anchors = sources.map(selector => {
        const source = document.querySelector(selector), anchor = document.createComment('editor home');
        source.before(anchor); const hidden = source.hidden; source.hidden = false; area.append(source);
        return () => { anchor.replaceWith(source); source.hidden = hidden; };
      });
      if (!options.automatic) button('Done', () => context.refresh(), area, `Done editing ${title}`);
      if(options.automatic)control.after(area);else overlay(area,target,'editor');
      cleanup.push(() => { anchors.forEach(restore => restore()); area.remove(); });
      control.hidden = true;
    };
    if (options.automatic) open(); else button(`Edit ${title}`, open, control);
  }
  function formatTextForTarget(target, value, format=context.format) {
    return format(value,{inline:/^(?:H[1-6]|P|ADDRESS)$/.test(target.tagName)});
  }
  function staticTextElements(root) {
    // Text blocks, headings and captions can be changed without changing links or controls.
    return [...root.querySelectorAll('h1,h2,h3,h4,p,footer address')].filter(element =>
      !(element.closest('dialog') && !root.matches('dialog')) && !element.closest('.inline-editor,.inline-edit-tools,#rsvpFirstPageText,#rsvpFirstPageDetails,#menuGrid,[id^="admin"],#hostNotesContent,#brideGroomContent,#perfectExperienceContent,#whatToExpectContent,#weddingTimelineSection,#weddingPartyPersonalPage,#weddingPartyDetails,footer,.inline-edit-masked,[role="status"],.form-error,.wedding-party-attire-images,.attire-video-grid') &&
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
    const moveControls = [];
    const visibleTabs = () => [...nav.querySelectorAll(':scope > button')].filter(tab => !tab.hidden);
    function moveTab(tab,direction){
      const neighbor=visibleTabs()[visibleTabs().indexOf(tab)+direction];if(!neighbor)return;
      if(direction<0)nav.insertBefore(tab,neighbor);else nav.insertBefore(neighbor,tab);
      state.siteTabOrder??={};state.siteTabOrder[nav.id]=[...nav.querySelectorAll(':scope>button')].map(item=>tabKeys.get(item));context.save();
    }
    function moveControlsFor(tab, tools) {
      for (const [direction, arrow, label] of [[-1, '←', 'left'], [1, '→', 'right']]) {
        const control = button(arrow, () => {
          globalThis.SiteEditing.flush();
          const current = visibleTabs();
          const index = current.indexOf(tab), neighbor = current[index + direction];
          if (!neighbor) return;
          if (direction < 0) nav.insertBefore(tab, neighbor);
          else nav.insertBefore(neighbor, tab);
          state.siteTabOrder ??= {};
          state.siteTabOrder[nav.id] = [...nav.querySelectorAll(':scope > button')].map(item => tabKeys.get(item));
          context.save();
        }, tools, `Move ${tab.textContent} ${label}`);
        control.disabled=!visibleTabs()[visibleTabs().indexOf(tab)+direction];
        moveControls.push({ tab, direction, control });
      }
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
    const displayedTabs = visibleTabs();
    moveControls.forEach(({tab, direction, control}) => { control.disabled = !displayedTabs[displayedTabs.indexOf(tab) + direction]; });
    positionOverlays();
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
  function hide(element) {
    if (!element) return; element.classList.add('inline-edit-masked');cleanup.push(()=>element.classList.remove('inline-edit-masked'));
  }
  function mount(target, className, kind = 'panel') {
    if (!enabled || !context.host || !target) return null;
    const element = node('div', undefined, className);
    if(kind==='inline') { target.before(element);target.classList.add('inline-edit-replaced');cleanup.push(()=>{element.remove();target.classList.remove('inline-edit-replaced');}); }
    else overlay(element,target,kind);
    return element;
  }
  function textOwner(element){for(let current=element;current;current=current.parentElement)if(textRoots.has(current) || editTargets.get(current)?.textBlock || editTargets.get(current)?.visual)return current;return null;}
  function textElement(target,label){
    field(target,'text',[{label:'Text',type:target.matches('button,a') && !ElementAppearance.isMultiline(target)?'text':'textarea',visual:true,readonly:target.matches('.summary-item,.summary-stat,.counter-row,output,.event-selection-choices>button,label:has(input,select,textarea)'),value:ElementAppearance.textValue(target)}],()=>{},{key:`text-style:${ElementAppearance.selector(target)}`,placement:'element-edit'});
    if(editTargets.has(target))editTargets.get(target).visual=true;
  }
  function appearance(target,action,label){
    if(!target || !enabled || !context.host)return;
    const tools=node('span',undefined,'inline-appearance-tools');overlay(tools,target,'appearance',true);
    const control=button('Appearance',action,tools,`Edit appearance: ${label}`);control.title=`Edit appearance: ${label}`;
    control.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20h2a3 3 0 0 0 0-6h-1a1 1 0 0 1 0-2h3a6 6 0 0 0 6-6c0-4-5-6-10-6Zm-5 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm5-4a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm5 3a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>';
    return ()=>{const index=overlays.findIndex(entry=>entry.element===tools);if(index>=0)overlays.splice(index,1);tools.remove();};
  }
  const selectedCustom = new Map();
  globalThis.SiteEditing = {
    settings(target,title,build){if(!target || !enabled || !context.host)return;const entry=editTargets.get(target) || {};entry.settings={title,build};editTargets.set(target,entry);cleanup.push(()=>editTargets.delete(target));},
    editorFor:target=>editTargets.get(target),
    get editorTargets(){return [...editTargets.keys()];},
    persist(action){flushing=true;try{action?.();context.save();}finally{flushing=false;}},
    get editorContext(){return context;},
    beforeRender, render, field, portal, staticText, applyStaticText, tabs, button, mount, hide, appearance, positionOverlays, textElement, textOwner, hasEditor:element=>editTargets.has(element),
    resetTabSelection(navId,eventId=context?.eventId) { selectedCustom.delete(`${eventId}:${navId}`); },
    flush() { globalThis.ElementEditor?.flush();flushing=true;try { [...savers].forEach(save=>save()); } finally { flushing=false; } },
    get flushing() { return flushing; },
    get portalOpen() { return Boolean(document.querySelector('.inline-portal-editor')); },
    get enabled() { return enabled && context?.host; },
    toggle(refresh) { if(enabled)this.flush(); enabled = !enabled; if (!enabled) drafts.clear(); refresh(); }
  };
})();
