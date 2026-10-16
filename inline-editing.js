/* Host-only, contextual editors. Draft text stays local until Save. */
(() => {
  let enabled = false;
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
  function button(text, action, parent, label = text) {
    const control = node('button', text, 'inline-edit-control');
    control.type = 'button'; control.setAttribute('aria-label', label);
    control.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (context.host && enabled) action();
    });
    parent.append(control); cleanup.push(() => control.remove());
    return control;
  }
  function beforeRender() {
    while (cleanup.length) cleanup.pop()();
  }
  function render(ctx) {
    context = ctx;
    if (!ctx.host) { enabled = false; drafts.clear(); }
    const toggle = document.querySelector('#editItemsButton');
    toggle.textContent = enabled ? 'Done editing' : 'Edit website';
    toggle.setAttribute('aria-pressed', String(enabled));
    document.querySelector('#editAccountsButton').hidden = !enabled;
    document.querySelector('#invitationTemplatesButton').hidden = !enabled;
    document.body.classList.toggle('site-edit-mode', enabled && ctx.host);
  }
  function field(target, title, fields, commit, options = {}) {
    if (!target) return;
    if (!enabled || !context.host) return;
    const key = `${context.eventId}:${options.key || target.id || title}`;
    if (document.querySelector(`[data-inline-field-key="${CSS.escape(key)}"]`)) return;
    const control = node('span', undefined, 'inline-edit-tools');
    control.dataset.inlineFieldKey = key;
    control.hidden = target.hidden || Boolean(target.parentElement.closest('[hidden]'));
    target.after(control); cleanup.push(() => control.remove());
    let showing = false;
    const open = () => {
      if (showing) return; showing = true;
      const form = node('div', undefined, 'inline-editor');
      form.setAttribute('role', 'group'); form.setAttribute('aria-label', `Edit ${title}`);
      const previousHidden = target.hidden;
      if (options.replace !== false) target.hidden = true;
      cleanup.push(() => { target.hidden = previousHidden; form.remove(); });
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
      form.append(actions); control.after(form);
      inputs[0]?.focus();
    };
    button(`Edit ${title}`, open, control);
    if (drafts.has(key) && !control.hidden) open();
  }
  function portal(target, title, sources, prepare) {
    if (!target || !enabled || !context.host) return;
    const control = node('span', undefined, 'inline-edit-tools'); target.append(control);
    cleanup.push(() => control.remove());
    button(`Edit ${title}`, () => {
      prepare();
      const area = node('div', undefined, 'inline-editor');
      const anchors = sources.map(selector => {
        const source = document.querySelector(selector), anchor = document.createComment('editor home');
        source.before(anchor); const hidden = source.hidden; source.hidden = false; area.append(source);
        return () => { anchor.replaceWith(source); source.hidden = hidden; };
      });
      button('Done', () => context.refresh(), area, `Done editing ${title}`);
      control.after(area);
      cleanup.push(() => { anchors.forEach(restore => restore()); area.remove(); });
      control.hidden = true;
    }, control);
  }
  function staticText(root) {
    const data = context.state.siteText || {};
    // Text blocks, headings and captions can be changed without changing links or controls.
    const elements = [...root.querySelectorAll('h1,h2,h3,h4,p,footer address')].filter(element =>
      !(element.closest('dialog') && !root.matches('dialog')) && !element.closest('.inline-editor,.inline-edit-tools,#menuGrid,[id^="admin"],#hostNotesContent,#brideGroomContent,#perfectExperienceContent,#whatToExpectContent,#weddingTimelineSection,#weddingPartyPersonalPage,#weddingPartyDetails,footer,[role="status"],.form-error,.wedding-party-attire-images,.attire-video-grid') &&
      !element.querySelector('button,input,select,textarea') && !element.matches('#eventAddress,#signedInAccountName'));
    for (const element of elements) {
      const path = selectorPath(element, root);
      if (!originals.has(path)) originals.set(path, element.innerHTML);
      const initial = element.innerHTML;
      if (Object.hasOwn(data, path)) element.innerHTML = context.format(data[path]);
      else if (element.closest('footer') || !element.id) element.innerHTML = originals.get(path);
      cleanup.push(() => { element.innerHTML = initial; });
      field(element, element.tagName === 'ADDRESS' ? 'footer' : 'text', [{ label: 'Text (Markdown supported)', type: 'textarea', value: data[path] ?? element.innerText }], ([value]) => {
        context.state.siteText ??= {}; context.state.siteText[path] = value;
      }, { key: path });
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
    const hiddenTabs = state.siteHiddenTabs || [];
    const panelIds = buttons.map(tab => tab.getAttribute('aria-controls')).filter(Boolean);
    let active = false;
    const navOriginallyHidden = nav.hidden;
    const visible = !nav.parentElement.closest('[hidden]') && (!nav.hidden || config.available);
    if (!visible) return;
    const extraPages = (state.sitePages || []).filter(page => page.nav === nav.id && (context.host || page.audience === 'all' || page.audience === 'party' && context.party));
    buttons.forEach((tab, index) => {
      const key = `${nav.id}:${Object.entries(tab.dataset).map(([key, value]) => `${key}=${value}`).join('|') || index}`;
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
        const tools = node('span', undefined, 'inline-tab-tools'); tab.after(tools); cleanup.push(() => tools.remove());
        button('Edit title', () => {
          const title = window.prompt('Page title', tab.textContent);
          if (!title?.trim()) return;
          if (config.rename) config.rename(tab, title.trim());
          else { state.siteTabTitles ??= {}; state.siteTabTitles[key] = title.trim(); }
          context.save();
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
      nav.append(tab); cleanup.push(() => tab.remove());
      tab.addEventListener('click', () => { selectedCustom.set(selectionKey, page.id); context.refresh(); });
      if (enabled && context.host) {
        const tools = node('span', undefined, 'inline-tab-tools'); nav.append(tools); cleanup.push(() => tools.remove());
        button('×', () => { if (window.confirm(`Delete the “${page.title}” page?`)) { state.sitePages = state.sitePages.filter(item => item.id !== page.id); context.save(); } }, tools, `Delete ${page.title} page`);
      }
      if (selected?.id === page.id) {
        const panel = node('section', undefined, 'gathering-page inline-custom-page');
        panel.id = `custom-page-${page.id}`; panel.setAttribute('role','tabpanel');
        panel.innerHTML = `<h2>${context.escape(page.title)}</h2><div class="bride-groom-content">${context.format(page.content)}</div>`;
        nav.after(panel); cleanup.push(() => panel.remove());
        field(panel, 'page', [{ label: 'Title', value: page.title, required: true }, { label: 'Content', type: 'textarea', value: page.content }], ([title, content]) => { page.title = title; page.content = content; }, { key: page.id });
      }
    });
    if (enabled && context.host) {
      nav.hidden = false; nav.classList.add('inline-edit-tabs');
      cleanup.push(() => { nav.hidden = navOriginallyHidden; nav.classList.remove('inline-edit-tabs'); });
      button('+', () => {
        if (config.add) { config.add(); context.save(); return; }
        const title = window.prompt('New page title'); if (!title?.trim()) return;
        const page = { id: crypto.randomUUID(), nav: nav.id, title: title.trim(), content: '', audience: config.audience || 'all' };
        state.sitePages ??= []; state.sitePages.push(page); selectedCustom.set(selectionKey, page.id); context.save();
      }, nav, 'Add page');
    }
    if (extraPages.length && !nav.parentElement.closest('[hidden]')) { nav.hidden = false; cleanup.push(() => { nav.hidden = navOriginallyHidden; }); }
    if (!active && !selected && buttons.some(tab => !tab.hidden)) {
      const first = buttons.find(tab => !tab.hidden);
      if (first.getAttribute('aria-selected') !== 'true') queueMicrotask(() => { if (first.isConnected) first.click(); });
    }
  }
  function mount(target, className) {
    if (!enabled || !context.host || !target) return null;
    const element = node('div', undefined, className); target.append(element);
    cleanup.push(() => element.remove()); return element;
  }
  const selectedCustom = new Map();
  globalThis.SiteEditing = { beforeRender, render, field, portal, staticText, tabs, button, mount,
    get enabled() { return enabled && context?.host; },
    toggle(refresh) { enabled = !enabled; if (!enabled) drafts.clear(); refresh(); }
  };
})();
