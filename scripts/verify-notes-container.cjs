// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});
await page.evaluate(()=>{appState.events['test-gathering']={...makeEvent([],'2027-08-10'),gatheringName:'Test gathering',gatheringTheme:'neutral'};});
for(const eventId of ['thanksgiving','christmas','test-gathering']){
 await page.evaluate(id=>enterEvent(id),eventId);
 await page.locator('#rsvpPageNavigation [data-page-key="notes"]').click();
 await page.locator('#editItemsButton').click();
 await page.evaluate(()=>ElementAppearance.update(document.querySelector('#rsvpForm'),{backgroundColor:'#123456',backgroundAlpha:100,borderColor:'#334455',borderWidth:3}));
 const outer=await page.locator('#rsvpForm').evaluate(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,width:getComputedStyle(e).borderWidth}));
 await page.evaluate(()=>ElementEditor.select(document.querySelector('#hostNotesSection')));
 assert.equal(await page.locator('.element-editor-selected').getAttribute('id'),'hostNotesSection');
 const background=page.getByRole('button',{name:'Format',exact:true});if(await background.getAttribute('aria-expanded')!=='true')await background.click();
 await page.getByLabel('Background hex',{exact:true}).fill('#abcdef');await page.getByLabel('Background hex',{exact:true}).press('Tab');await page.getByLabel('Background opacity',{exact:true}).evaluate(e=>{e.value='60';e.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#hostNotesContent').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(171, 205, 239, 0.6)');
 assert.equal(await page.locator('#hostRsvpCounters').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(171, 205, 239, 0.6)');
 assert.deepEqual(await page.locator('#rsvpForm').evaluate(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,width:getComputedStyle(e).borderWidth})),outer);
 await page.getByRole('button',{name:'Done Editing',exact:true}).click();await page.evaluate(()=>render());
 assert.deepEqual(await page.locator('#rsvpForm').evaluate(e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,width:getComputedStyle(e).borderWidth})),outer);
 assert.equal(await page.locator('#hostNotesContent').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(171, 205, 239, 0.6)');
 assert.equal(await page.evaluate(()=>state.elementAppearance['@group:containers'].backgroundColor),'#123456');
 assert.equal(await page.evaluate(()=>state.elementAppearance['@group:inner-containers'].backgroundColor),'#abcdef');
 await page.locator('#hostHomeButton').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
}
assert.deepEqual(errors,[]);await browser.close();console.log('Selecting and coloring Notes changes the inner panel while the full RSVP background and border stay unchanged across gatherings and redraws.');
})().catch(e=>{console.error(e);process.exit(1);});
