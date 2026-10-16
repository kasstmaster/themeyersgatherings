// Compare page geometry and typography around edit mode, accounting for the explicitly requested toolbar rows.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});
const snapshot=()=>page.evaluate(()=>{
const all=[...document.querySelectorAll('#eventPage header,#eventPage time,#eventPage main,#eventPage .summary-strip,#eventPage .welcome,#eventPage h2,#eventPage h3,#eventPage p,#eventPage [role="tablist"],#eventPage [role="tab"],#eventPage .bride-groom-content,#eventPage .perfect-experience-panel,#eventPage .affordable-attire-guidance,#eventPage .category-card,#eventPage footer,#hostToolsPanel,#hostToolsPanel button')].filter(el=>!el.closest('.inline-overlay-layer,dialog,#hostToolsPanel'));
return all.filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&!el.closest('[hidden]')}).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.id||el.tagName,text:el.textContent.trim().slice(0,20),x:r.x+scrollX,y:r.y+scrollY-((document.querySelector('#hostToolsPanel').compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)?document.querySelector('#hostToolsPanel').getBoundingClientRect().height:0),width:r.width,height:r.height,font:s.fontSize,lineHeight:s.lineHeight};});});
for(const width of [1280,390]){
await page.setViewportSize({width,height:900});
for(const [event,tab,sub] of [['wedding','guest','attire'],['wedding','couple',''],['wedding','party','attire'],['thanksgiving','notes',''],['thanksgiving','menu','']]){
await page.evaluate(([event,tab,sub])=>{if(SiteEditing.enabled)SiteEditing.toggle(()=>{});viewedEventId=event;state=appState.events[event];selectedWeddingTab=tab;selectedGuestTab=sub||'attire';selectedMatronTab=sub||'experience';selectedGatheringTab=tab;render();},[event,tab,sub]);await page.evaluate(()=>document.fonts.ready);const before=await snapshot();await page.locator('#editItemsButton').click();const after=await snapshot();
const filtered=arr=>arr.filter(x=>x.tag!=='invitationTemplatesButton').map(x=>({...x,text:x.tag==='editItemsButton'?'toggle':x.text}));
const a=filtered(before),b=filtered(after);try{assert.deepEqual(b,a);}catch(e){console.log('FAIL',width,event,tab);for(let i=0;i<Math.max(a.length,b.length);i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i]))console.log(i,a[i],b[i]);throw e;}
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#editItemsButton').click();assert.deepEqual(filtered(await snapshot()),a);console.log('Stable',width,event,tab);
}}
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});
 await page.evaluate(()=>{viewedEventId='wedding';state=appState.events.wedding;selectedWeddingTab='guest';render();});await page.locator('#rsvpButton').click();
 const positions=()=>page.evaluate(()=>['#rsvpForm','#rsvpAttendance','#rsvpChildrenCounter','#weddingRsvpMenu'].map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return [selector,r.x,r.y,r.width,r.height,getComputedStyle(el).fontSize];}));
 const before=await positions();await page.evaluate(()=>SiteEditing.toggle(render));assert.deepEqual(await positions(),before);await page.evaluate(()=>SiteEditing.toggle(render));assert.deepEqual(await positions(),before);await page.locator('#rsvpDialog .modal-close').click();console.log('Stable RSVP',width);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
