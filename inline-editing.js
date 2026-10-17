/* Host-only contextual editors. Direct text saves on blur; structured forms use Save. */
(() => {
  let enabled = false;
  let cleaning = false, flushing = false;
  const savers = new Set();
  const cleanup = [];
  const drafts = new Map();
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
  function overlay(element, target, kind = 'after') {
    layerFor(target).append(element);
    element.classList.add('inline-overlay-item');element.dataset.inlineAnchor=target.id || '';
    const entry={element,target,kind};overlays.push(entry);
    cleanup.push(() => { const index=overlays.indexOf(entry);if(index>=0)overlays.splice(index,1);element.remove(); });
    positionOverlays();
    if (!frame) frame=requestAnimationFrame(tick);
    return element;
  }
  function tick() { frame=0;positionOverlays();if(overlays.length)frame=requestAnimationFrame(tick); }
  function positionOverlays() {
    const width=document.documentElement.clientWidth;
    const dock=document.querySelector('.event-dock');
    const height=dock && !dock.hidden ? Math.min(innerHeight,dock.getBoundingClientRect().top) : innerHeight;
    for (const {element,target,kind} of overlays) {
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
      if(kind==='page'||kind==='delete'){left=rect.right-element.offsetWidth-8;top=rect.top+8;}
      if(kind==='plus'){left=rect.right-element.offsetWidth;top=rect.top-element.offsetHeight-3;}
      place(Math.max(4,Math.min(left,width-element.offsetWidth-4)),top);
      if(!documentLayer && (top+element.offsetHeight<=0 || top>=height))element.style.visibility='hidden';
    }
  }
  function button(text, action, parent, label = text) {
    const isEdit = /^Edit(?: |$)/.test(text);
    const control = node('button', isEdit ? 'Edit' : text, 'inline-edit-control');
    if (isEdit) control.classList.add('inline-edit-action');
    control.type = 'button'; control.setAttribute('aria-label', label);
    control.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (context.host && enabled) action();
    });
    if (parent.isConnected && !parent.closest('.inline-overlay-layer')) overlay(control,parent,'delete');
    else parent.append(control);
    cleanup.push(() => control.remove());
    return control;
  }
  function beforeRender() {
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
    if (!enabled || !context.host) return;
    const key = `${context.eventId}:${options.key || target.id || title}`;
    if (document.querySelector(`[data-inline-field-key="${CSS.escape(key)}"]`)) return;
    const control = node('span', undefined, 'inline-edit-tools');
    control.dataset.inlineFieldKey = key;
    const placement = options.placement || (title === 'page' ? 'page' : 'after');
    const container=placement==='page' ? target.closest('.bride-groom-content,.what-to-expect-content,.perfect-experience-panel,.gathering-page') || target.closest('section') || target : target;
    if(placement==='page')control.classList.add('inline-page-tools');
    overlay(control,container,placement);
    let showing = false;
    const open = () => {
      if (showing) return; showing = true;
      if (['text','page','notes'].includes(title)) {
        control.hidden = true;
        directFields(target, fields, values => { commit(values); fields.forEach((spec,index)=>{spec.value=values[index];}); drafts.delete(key); context.save(); showing=false;control.hidden=false; }, key);
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
        label.append(input); form.append(label); return input;
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
      form.addEventListener('keydown', event => {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') {
          event.preventDefault(); actions.querySelector('button').click();
        }
      });
      form.append(actions);replaceInPlace(form,target);
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
  function directFields(target, fields, commit, key) {
    const editors = [], anchors = [];
    let wrappedBody;
    let pageBody = target.matches('section') ? target.querySelector('.bride-groom-content,.what-to-expect-content') || target : target;
    const heading = target.closest('section')?.querySelector('h2,h3');
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
      input.required = Boolean(spec.required);
      const style = getComputedStyle(anchor), rect = anchor.getBoundingClientRect();
      for (const property of ['font','color','textAlign','lineHeight','letterSpacing','padding','margin','borderRadius','backgroundColor']) input.style[property] = style[property];
      input.style.width = `${rect.width}px`; input.style.maxWidth = '100%';
      if (input.tagName === 'TEXTAREA') {
        input.style.minHeight = `${Math.max(48,rect.height)}px`;
        const resize = () => { input.style.height='auto'; input.style.height=`${input.scrollHeight+2}px`; };
        input.addEventListener('input', resize); requestAnimationFrame(resize);
      }
      input.addEventListener('input', () => { if (key) drafts.set(key,editors.map(editor=>editor.value)); });
      replaceInPlace(input,anchor); editors.push(input); anchors.push(anchor);
    });
    let saved = false;
    const save = () => {
      if (saved || cleaning) return;
      if (!editors.every(editor => { editor.setCustomValidity(editor.required && !editor.value.trim() ? 'Enter a title.' : ''); return editor.reportValidity(); })) return;
      saved=true;
      const wasFlushing=flushing;flushing=true;
      try { commit(editors.map(editor=>editor.value)); } finally { flushing=wasFlushing; }
      // Restore only the edited content. Rebuilding the whole page here drops
      // the click that moved focus away and unnecessarily resets other editors.
      editors.forEach((editor,index) => {
        const anchor=anchors[index];
        if(fields[index].type==='textarea') anchor.innerHTML=formatTextForTarget(anchor,editor.value);
        else anchor.textContent=editor.value;
        anchor.classList.remove('inline-edit-replaced');editor.remove();
      });
      if(wrappedBody?.parentNode)wrappedBody.replaceWith(...wrappedBody.childNodes);
      savers.delete(save);context.directSaved?.();
    };
    savers.add(save); cleanup.push(() => savers.delete(save));
    editors.forEach(editor => {
      editor.addEventListener('blur', event => { if (!editors.includes(event.relatedTarget)) save(); });
      editor.addEventListener('keydown', event => {
        if (event.key==='Enter' && editor.tagName!=='TEXTAREA') { event.preventDefault(); editor.blur(); }
      });
    });
    (editors.find(editor=>editor.tagName==='TEXTAREA') || editors[0])?.focus();
  }
  function editTitle(tab, anchor, value, commit) {
    if (tab.dataset.editingTitle) return;
    tab.dataset.editingTitle = 'true';
    // Hidden single-tab titles are edited at their visible page heading.
    const target = tab.getClientRects().length ? tab : anchor.querySelector('h2,h3') || anchor;
    directFields(target, [{label:'Page title',value,required:true}], values => { commit(values[0].trim()); delete tab.dataset.editingTitle;context.save(); });
    cleanup.push(() => delete tab.dataset.editingTitle);
  }
  function portal(target, title, sources, prepare, options = {}) {
    if (!target || !enabled || !context.host) return;
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
  function formatTextForTarget(target, value) {
    const html=context.format(value);
    // Text inside headings and paragraphs must not acquire nested paragraphs
    // and their default vertical margins. Keep inline Markdown and line breaks.
    return /^(?:H[1-6]|P)$/.test(target.tagName)
      ? html.replace(/<p>([\s\S]*?)<\/p>/g,'$1<br>').replace(/<br>$/,'') : html;
  }
  function staticText(root) {
    const data = context.state.siteText || {};
    // Text blocks, headings and captions can be changed without changing links or controls.
    const elements = [...root.querySelectorAll('h1,h2,h3,h4,p,footer address')].filter(element =>
      !(element.closest('dialog') && !root.matches('dialog')) && !element.closest('.inline-editor,.inline-edit-tools,#menuGrid,[id^="admin"],#hostNotesContent,#brideGroomContent,#perfectExperienceContent,#whatToExpectContent,#weddingTimelineSection,#weddingPartyPersonalPage,#weddingPartyDetails,footer,.inline-edit-masked,[role="status"],.form-error,.wedding-party-attire-images,.attire-video-grid') &&
      !element.querySelector('button,input,select,textarea') && !element.matches('#eventAddress,#rsvpDeadline,#signedInAccountName,#customGatheringHeading'));
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
    const buttons = [...nav.querySelectorAll(':scope > [role="tab"]')];
    const tabKeys = new Map();
    const moveControls = [];
    const visibleTabs = () => [...nav.querySelectorAll(':scope > [role="tab"]')].filter(tab => !tab.hidden);
    function moveControlsFor(tab, tools) {
      for (const [direction, arrow, label] of [[-1, '←', 'left'], [1, '→', 'right']]) {
        const control = button(arrow, () => {
          const current = visibleTabs();
          const index = current.indexOf(tab), neighbor = current[index + direction];
          if (!neighbor) return;
          if (direction < 0) nav.insertBefore(tab, neighbor);
          else nav.insertBefore(neighbor, tab);
          state.siteTabOrder ??= {};
          state.siteTabOrder[nav.id] = [...nav.querySelectorAll(':scope > [role="tab"]')].map(item => tabKeys.get(item));
          context.save();
        }, tools, `Move ${tab.textContent} ${label}`);
        moveControls.push({ tab, direction, control });
      }
    }
    // Restore built-in DOM order before the next render so positional tab keys stay stable.
    cleanup.push(() => buttons.forEach(tab => nav.append(tab)));
    const hiddenTabs = state.siteHiddenTabs || [];
    const panelIds = buttons.map(tab => tab.getAttribute('aria-controls')).filter(Boolean);
    let active = false;
    const navOriginallyHidden = nav.hidden;
    const visible = !nav.parentElement.closest('[hidden]') && (!nav.hidden || config.available);
    if (!visible) return;
    const extraPages = (state.sitePages || []).filter(page => page.nav === nav.id && (context.host || page.audience === 'all' || page.audience === 'party' && context.party));
    buttons.forEach((tab, index) => {
      const key = `${nav.id}:${Object.entries(tab.dataset).map(([key, value]) => `${key}=${value}`).join('|') || index}`;
      tabKeys.set(tab, key);
      const originalHidden = tab.hidden;
      const originalText = tab.textContent;
      if (state.siteTabTitles?.[key]) tab.textContent = state.siteTabTitles[key];
      cleanup.push(() => { tab.hidden = originalHidden; tab.textContent = originalText; });
      if (hiddenTabs.includes(key)) {
        tab.hidden = true;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) { const hidden = panel.hidden; panel.hidden = true; cleanup.push(() => { panel.hidden = hidden; }); }
        return;
      }
      if (!tab.hidden && tab.getAttribute('aria-selected') === 'true') active = true;
      if (enabled && context.host && !tab.hidden) {
        const tools = node('span', undefined, 'inline-tab-tools');tools.dataset.inlineTabGroup=nav.id;
        const anchor=tab.getClientRects().length?tab:nav.nextElementSibling;
        if(anchor)overlay(tools,anchor,'above');
        moveControlsFor(tab, tools);
        button('Edit title', () => {
          editTitle(tab, anchor, tab.textContent, title => {
            if (config.rename) config.rename(tab, title);
            else { state.siteTabTitles ??= {}; state.siteTabTitles[key] = title; }
          });
        }, tools);
        button('×', () => {
          if (!window.confirm(`Delete the “${tab.textContent}” page?`)) return;
          if (config.remove) config.remove(tab);
          else { state.siteHiddenTabs ??= []; state.siteHiddenTabs.push(key); }
          context.save();
        }, tools, `Delete ${tab.textContent} page`);
      }
      tab.addEventListener('click', clearCustom);
      cleanup.push(() => tab.removeEventListener('click', clearCustom));
    });
    function clearCustom() { selectedCustom.delete(`${context.eventId}:${nav.id}`); }
    const selectionKey = `${context.eventId}:${nav.id}`;
    const selected = extraPages.find(page => page.id === selectedCustom.get(selectionKey));
    if (selected) {
      buttons.forEach(tab => tab.setAttribute('aria-selected', 'false'));
      panelIds.forEach(id => { const panel = document.getElementById(id); if (panel) { const hidden = panel.hidden; panel.hidden = true; cleanup.push(() => { panel.hidden = hidden; }); } });
    }
    extraPages.forEach(page => {
      const tab = node('button', page.title); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(selected?.id === page.id));
      tab.setAttribute('aria-controls', `custom-page-${page.id}`);
      tabKeys.set(tab, `custom:${page.id}`);
      nav.append(tab); cleanup.push(() => tab.remove());
      tab.addEventListener('click', () => { selectedCustom.set(selectionKey, page.id); context.refresh(); });
      if (enabled && context.host) {
        const tools = node('span', undefined, 'inline-tab-tools');tools.dataset.inlineTabGroup=nav.id;
        overlay(tools,tab,'above');
        moveControlsFor(tab, tools);
        button('Edit title', () => editTitle(tab, nav.nextElementSibling, page.title, title => { page.title=title; }), tools);
        button('×', () => { if (window.confirm(`Delete the “${page.title}” page?`)) { state.sitePages = state.sitePages.filter(item => item.id !== page.id); context.save(); } }, tools, `Delete ${page.title} page`);
      }
      if (selected?.id === page.id) {
        const isSubpage = nav.classList.contains('matron-info-tabs');
        const panel = node('section', undefined, `gathering-page inline-custom-page${isSubpage ? ' gathering-subpage' : ''}`);
        panel.id = `custom-page-${page.id}`; panel.setAttribute('role','tabpanel');
        const heading = isSubpage ? 'h3' : 'h2';
        panel.innerHTML = `<p class="section-kicker"></p><${heading}>${context.escape(page.title)}</${heading}><div class="bride-groom-content">${context.format(page.content)}</div>`;
        const intro=panel.querySelector('.section-kicker');
        intro.innerHTML=formatTextForTarget(intro,page.intro || '');
        nav.after(panel); cleanup.push(() => panel.remove());
        field(intro, 'text', [{label:'Text above title',type:'textarea',value:page.intro || ''}], ([value]) => { page.intro=value; }, {key:`${page.id}:intro`,placement:'text'});
        field(panel, 'page', [{ label: 'Title', value: page.title, required: true }, { label: 'Content', type: 'textarea', value: page.content }], ([title, content]) => { page.title = title; page.content = content; }, { key: page.id });
      }
    });
    const order = state.siteTabOrder?.[nav.id] || [];
    const orderedTabs = [...nav.querySelectorAll(':scope > [role="tab"]')];
    const rank = tab => { const index = order.indexOf(tabKeys.get(tab)); return index < 0 ? order.length : index; };
    orderedTabs.sort((a, b) => rank(a) - rank(b)).forEach(tab => nav.append(tab));
    const displayedTabs = visibleTabs();
    moveControls.forEach(({tab, direction, control}) => { control.disabled = !displayedTabs[displayedTabs.indexOf(tab) + direction]; });
    positionOverlays();
    if (enabled && context.host) {
      const addTools=node('span',undefined,'inline-tab-tools');
      const anchor=nav.getClientRects().length?nav:nav.nextElementSibling;
      if(anchor)overlay(addTools,anchor,'plus');
      addTools.dataset.inlineAnchor=nav.id;
      button('+', () => {
        if (config.add) { config.add(); context.save(); return; }
        const title = window.prompt('New page title'); if (!title?.trim()) return;
        const page = { id: crypto.randomUUID(), nav: nav.id, title: title.trim(), intro: '', content: '', audience: config.audience || 'all' };
        state.sitePages ??= []; state.sitePages.push(page); selectedCustom.set(selectionKey, page.id); context.save();
      }, addTools, 'Add page');
    }
    if (extraPages.length && !nav.parentElement.closest('[hidden]')) { nav.hidden = false; cleanup.push(() => { nav.hidden = navOriginallyHidden; }); }
    if (!active && !selected && buttons.some(tab => !tab.hidden)) {
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
  const selectedCustom = new Map();
  globalThis.SiteEditing = { beforeRender, render, field, portal, staticText, tabs, button, mount, hide,
    flush() { flushing=true;try { [...savers].forEach(save=>save()); } finally { flushing=false; } },
    get flushing() { return flushing; },
    get portalOpen() { return Boolean(document.querySelector('.inline-portal-editor')); },
    get enabled() { return enabled && context?.host; },
    toggle(refresh) { if(enabled)this.flush(); enabled = !enabled; if (!enabled) drafts.clear(); refresh(); }
  };
})();
