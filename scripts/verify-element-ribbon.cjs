// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});

await page.evaluate(()=>{state.rsvpIntroText="Welcome friends";openRsvp();});
const layout=()=>page.evaluate(()=>Object.fromEntries(['rsvpFirstPageDate','rsvpFirstPageText','rsvpFirstPageDetails','rsvpConfirmEvent','weddingPartyTabs','weddingRsvpUploadToolbar'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,[r.x,r.y,r.width,r.height]];})));
for(const tab of ['attire','party']){
 await page.evaluate(tab=>{selectedWeddingTab=tab;selectedMatronTab='duties';render();},tab);
 const boxes=()=>page.evaluate(tab=>[...document.querySelectorAll(tab==='attire'?'#registryAttireSection,#weddingPartyAttireIntroText,[data-attire-group]':'#weddingPartySection,#weddingPartyDetails,[data-responsibilities-member]')].map(e=>[e.id||e.className,e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight]).filter(row=>row[4]>0),tab);
 const original=await boxes();await page.evaluate(()=>SiteEditing.toggle(render));assert.deepEqual((await boxes()).map(row=>[row[0],row[1],row[3],row[4]]),original.map(row=>[row[0],row[1],row[3],row[4]]));assert.equal(await page.locator('.inline-members-edit-area,.inline-attire-edit-area,.inline-portal-editor:visible').count(),0);await page.evaluate(()=>SiteEditing.toggle(render));
}
await page.evaluate(()=>{selectedWeddingTab='details';render();});
const before=await layout();await page.evaluate(()=>SiteEditing.toggle(render));
const shifted=await layout();for(const key of Object.keys(before))assert.deepEqual([shifted[key][2],shifted[key][3]],[before[key][2],before[key][3]]);
assert.equal(await page.locator('.inline-edit-control:visible,.appearance-editor:visible,.inline-meal-editor:visible,.inline-portal-editor:visible').count(),0);
assert.equal(await page.getByRole('toolbar',{name:'Element editor',exact:true}).count(),1);
await page.locator('#rsvpFirstPageText').dblclick();
assert.equal(await page.locator('#rsvpFirstPageText').getAttribute('contenteditable'),'true');
assert.equal(await page.evaluate(()=>document.activeElement.id),'rsvpFirstPageText');
assert.equal(await page.locator('.element-editor-selected').count(),1);
await page.locator('#rsvpFirstPageText').fill('First line\nSecond line');
await page.evaluate(()=>{const e=document.getElementById('rsvpFirstPageText');e.textContent='Welcome friends';e.dispatchEvent(new Event('input',{bubbles:true}));const range=document.createRange();range.selectNodeContents(e);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
await page.getByRole('button',{name:'Format',exact:true}).click();
await page.getByRole('button',{name:'Italic',exact:true}).click();
await page.getByRole('button',{name:'Save',exact:true}).click();
assert.equal(await page.evaluate(()=>state.rsvpIntroText),'*Welcome friends*');
await page.evaluate(()=>{const text=document.querySelector('#rsvpFirstPageText :is(em,i)').firstChild;const selected=document.createRange();selected.setStart(text,8);selected.setEnd(text,15);const selection=getSelection();selection.removeAllRanges();selection.addRange(selected);document.dispatchEvent(new Event('selectionchange'));});
await page.getByRole('combobox',{name:'Font',exact:true}).selectOption('Georgia');await page.getByRole('button',{name:'Save',exact:true}).click();
assert.match(await page.evaluate(()=>state.rsvpIntroText),/Welcome \{\{style:font=Georgia\}\}friends/);

await page.locator('#rsvpConfirmEvent').click();
await page.getByRole('button',{name:'Format',exact:true}).click();
await page.getByRole('textbox',{name:'Background hex',exact:true}).fill('#123456');await page.getByRole('textbox',{name:'Background hex',exact:true}).press('Tab');
assert.equal(await page.locator('#rsvpConfirmEvent').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
await page.getByRole('slider',{name:'Background opacity',exact:true}).evaluate(e=>{e.value=40;e.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(await page.locator('#rsvpConfirmEvent').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(18, 52, 86, 0.4)');
await page.evaluate(()=>{ElementAppearance.upload=async()=>new URL('/assets/thanksgiving-header.svg',location.href).href;});
await page.getByLabel('Upload image',{exact:true}).setInputFiles({name:'background.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=','base64')});
await page.waitForFunction(()=>document.querySelector('.element-editor-toolbar [data-editor-status]').textContent==='Image saved.');
assert.match(await page.locator('#rsvpConfirmEvent').evaluate(e=>getComputedStyle(e).backgroundImage),/thanksgiving-header.svg/);
await page.getByRole('button',{name:'Remove image',exact:true}).click();

await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('spinbutton',{name:'Width',exact:true}).fill('3');await page.getByRole('spinbutton',{name:'Width',exact:true}).press('Tab');
assert.equal(await page.locator('#rsvpConfirmEvent').evaluate(e=>getComputedStyle(e).borderTopWidth),'3px');

await page.locator('#hostFirstPageActions').getByRole('button',{name:'Travel',exact:true}).click();await page.getByRole('button',{name:'Open page / use button',exact:true}).click();
await page.locator('#custom-page-travel .bride-groom-content').dblclick();await page.locator('#custom-page-travel .bride-groom-content').fill('First item');
await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Bullets',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
assert.match(await page.evaluate(()=>state.sitePages.find(p=>p.id==='travel').content),/- First item/);
await page.locator('#rsvpPageNavigation').getByRole('button',{name:'Registry',exact:true}).click();await page.getByRole('button',{name:'Open page / use button',exact:true}).click();
assert.equal(await page.locator('#registrySection').isVisible(),true);
assert.equal(await page.locator('.element-editor-toolbar').count(),1);

await page.locator('.element-editor-toolbar').getByRole('button',{name:'Done Editing',exact:true}).click();
assert.equal(await page.locator('.element-editor-toolbar').count(),0);
assert.equal(await page.locator('.element-editor-selected').count(),0);
assert.match(await page.evaluate(()=>state.rsvpIntroText),/font=Georgia/);
await page.locator('#rsvpDialog .modal-close').click();await page.waitForTimeout(100);await page.evaluate(()=>openRsvp());
assert.equal(await page.locator('#rsvpFirstPageText em').textContent(),'Welcome friends');
assert.equal(await page.locator('#rsvpConfirmEvent').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(18, 52, 86, 0.4)');
await page.evaluate(()=>SiteEditing.toggle(render));
await page.locator('#rsvpConfirmEvent').click();await page.getByRole('button',{name:'Open page / use button',exact:true}).click();
for(let n=0;n<12 && !await page.locator('#weddingRsvpMenu').isVisible();n++){const advance=page.locator('#rsvpDialog [data-rsvp-advance]:visible').first();if(await advance.count())await advance.click();else await page.locator('#rsvpNext').click();await page.getByRole('button',{name:'Open page / use button',exact:true}).click();}
assert.equal(await page.locator('#weddingRsvpMenu').isVisible(),true);
const mealLayout=await page.locator('#weddingRsvpGuests').innerHTML();
await page.evaluate(()=>ElementEditor.select(document.querySelector('#weddingRsvpMenu')));
await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Edit meal options',exact:true}).click();
assert.equal(await page.locator('#weddingRsvpGuests').innerHTML(),mealLayout);
await page.getByRole('textbox',{name:'Meal name: Chicken',exact:true}).fill('Roasted chicken');await page.getByRole('textbox',{name:'Meal name: Chicken',exact:true}).press('Tab');
assert.equal(await page.evaluate(()=>GuestPlanning.weddingMeals(state)[0].name),'Roasted chicken');
await page.locator('.element-editor-toolbar').getByRole('button',{name:'Done Editing',exact:true}).click();
assert.equal(await page.evaluate(()=>state.rsvps.length),0);
console.log('Fixed ribbon preserves page layouts; text, lists, backgrounds, opacity, uploaded images, borders, and meal editing pass.');
await page.locator('#rsvpDialog .modal-close').click();await page.waitForTimeout(100);
await page.evaluate(()=>{hostAuthenticated=false;guestName='Casey Example';signedInPersonName='Casey Example';enterEvent('wedding');});assert.equal(await page.locator('#weddingMediaSection').isVisible(),true);await page.locator('#rsvpPageNavigation').getByRole('button',{name:"Casey",exact:true}).click();assert.equal(await page.locator('#weddingPartySection').isVisible(),true);assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Casey Example');assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="party"] span').textContent(),"Casey");assert.match(await page.locator('#weddingPartyTabs [data-wedding-tab="party"] path').getAttribute('d'),/^M12 2a5/);assert.equal(await page.locator('#custom-page-saved-details').count(),0);assert.equal(await page.locator('#rsvpPageNavigation').getByRole('button',{name:"Casey",exact:true}).isVisible(),true);console.log('Wedding party members start on Photos & Videos and open personal information from the toolbar.');
await page.locator('#rsvp-nav-media').click();assert.equal(await page.locator('#weddingMediaSection').isVisible(),true);assert.equal(await page.locator('#weddingPartySection').isVisible(),false);await page.locator('#weddingMediaShare').click();await page.locator('#weddingMediaShareLink').click();assert.equal(await page.locator('#weddingMediaLinkForm').isVisible(),true);
await page.locator('#rsvpPageNavigation').getByRole('button',{name:'Registry',exact:true}).click();assert.equal(await page.locator('#registrySection').isVisible(),true);await page.evaluate(()=>{window.printedPage=null;PageActions.printPage=page=>{window.printedPage=page;};});await page.locator('#rsvpPageToolbar [data-page-export]').click();await page.locator('[data-export-print]').click();assert.match(await page.evaluate(()=>printedPage.headerHtml),/Welcome/);
await page.locator('#rsvpDialog .modal-close').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});await page.evaluate(()=>{state.weddingPartyMembers=[];enterEvent('wedding');});assert.equal(await page.locator('#weddingMediaSection').isVisible(),true);await page.locator('#rsvpPageNavigation').getByRole('button',{name:'Details',exact:true}).click();assert.equal(await page.locator('#custom-page-saved-details').isVisible(),true);assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="party"]').isVisible(),false);assert.equal(await page.locator('.inline-appearance-tools').count(),0);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('Regular guests default to Photos & Videos and open Details from the toolbar; editing stays host-only and mobile has no horizontal page overflow.');
await page.locator('#rsvpConfirmEvent').click();
for(let n=0;n<18 && !await page.evaluate(()=>state.rsvps.some(r=>r.name===guestName));n++){
 if(await page.locator('#rsvpAttire').isVisible()){await page.locator('#rsvpAttireAcknowledge').click();continue;}
 await page.evaluate(()=>{
  const visible=e=>e && !e.closest('[hidden],[data-rsvp-flow-hidden]') && e.getClientRects().length;
  for(const row of document.querySelectorAll('[data-rsvp-person]')){const yes=row.querySelector('[data-person-attending][value="yes"]');if(visible(yes)&&!yes.checked){yes.checked=true;yes.dispatchEvent(new Event('change',{bubbles:true}));}}
  for(const selector of ['[data-rsvp-no-children]','[data-rsvp-no-guests]']){const input=document.querySelector(selector);if(visible(input)&&!input.checked){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}}
  for(const group of document.querySelectorAll('.wedding-meal-options')){const input=group.querySelector('input');if(visible(input)){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}}
 });
 await page.locator('#rsvpNext').click();
}
await page.waitForFunction(()=>state.rsvps.some(r=>r.name===guestName) && document.querySelector('#rsvpDialog').open && !document.querySelector('#registrySection').hidden);
assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="registry"]').getAttribute('aria-pressed'),'true');await page.locator('#rsvpDialog .modal-close').click();await page.waitForTimeout(100);
await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';showSignedInDestination();render();openRsvp();SiteEditing.toggle(render);});
await page.locator('#invitedListButton').click();await page.getByRole('button',{name:'Format',exact:true}).click();
await page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('#invitedCount'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
await page.getByRole('textbox',{name:'Text color hex',exact:true}).fill('#cc3311');await page.getByRole('textbox',{name:'Text color hex',exact:true}).press('Tab');await page.getByRole('button',{name:'Save',exact:true}).click();
const oldCount=await page.locator('#invitedCount').textContent();await page.evaluate(()=>{appState.accounts.push({name:'Second Person',source:'website',selectedEvents:{wedding:true},invitedEvents:{wedding:true}});render();});
assert.notEqual(await page.locator('#invitedCount').textContent(),oldCount);assert.equal(await page.locator('#invitedCount').evaluate(e=>getComputedStyle(e).color),'rgb(204, 51, 17)');
await page.evaluate(()=>{viewedEventId='thanksgiving';state=appState.events.thanksgiving;render();});assert.equal(await page.evaluate(()=>Boolean(state.textAppearance?.['#invitedListButton'])),false);
await page.locator('.element-editor-toolbar').getByRole('button',{name:'Done Editing',exact:true}).click();
assert.deepEqual(errors,[]);console.log('Completing the real guest RSVP flow retains the saved response and opens Registry.');await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
