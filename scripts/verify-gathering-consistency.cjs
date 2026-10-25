// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});

await page.locator('#newGatheringButton').click();await page.locator('#newGatheringName').fill('Neutral Gathering');await page.locator('#newGatheringDate').fill('2027-12-01');await page.getByRole('button',{name:'Create gathering',exact:true}).click();await page.waitForFunction(()=>state.gatheringName==='Neutral Gathering');
const neutral=await page.evaluate(()=>viewedEventId);assert.equal(await page.evaluate(()=>state.gatheringTheme),'neutral');assert.equal(await page.evaluate(()=>EVENT_DETAILS[viewedEventId].theme),'neutral');
await page.evaluate(()=>{appState.events['legacy-custom']={...makeEvent([],'2027-12-01'),gatheringName:'Existing gathering'};syncGatheringDefinitions(appState.events);});assert.equal(await page.evaluate(()=>EVENT_DETAILS['legacy-custom'].theme),'thanksgiving');
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});let expected;
 for(const id of ['thanksgiving','christmas','legacy-custom',neutral]){
  await page.evaluate(id=>enterEvent(id),id);
  const snapshot=await page.locator('#hostNotesSection').evaluate(e=>{const s=getComputedStyle(e),h=getComputedStyle(e.querySelector('h2'));return {padding:s.padding,border:s.borderTopWidth,radius:s.borderRadius,font:h.fontFamily,size:h.fontSize,line:h.lineHeight};});
  if(expected)assert.deepEqual(snapshot,expected);else expected=snapshot;
  assert.equal(await page.locator('#hostNotesSection').isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(243, 243, 243)');
 assert.equal(await page.locator('#hostNotesSection').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
}
await page.evaluate(()=>{SiteEditing.toggle(render);ElementAppearance.update(document.querySelector('#hostNotesSection'),{backgroundColor:'#123456'});});
assert.equal(await page.locator('#hostNotesSection').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
await page.evaluate(()=>{SiteEditing.toggle(render);enterEvent('thanksgiving');});assert.notEqual(await page.locator('#hostNotesSection').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
await page.evaluate(id=>enterEvent(id),neutral);assert.equal(await page.locator('#hostNotesSection').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
assert.deepEqual(errors,[]);await browser.close();console.log('Shared desktop/mobile layouts, neutral creation, legacy themes and isolated editable colors pass.');})().catch(e=>{console.error(e);process.exit(1);});
