// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});
await page.evaluate(()=>enterEvent('wedding'));
await page.locator('#editItemsButton').click();
await page.locator('#guestCount').click();await page.getByRole('button',{name:'Format',exact:true}).click();
await page.getByLabel('Font',{exact:true}).selectOption('Georgia');
await page.getByLabel('Size',{exact:true}).selectOption('32');
await page.evaluate(()=>ElementAppearance.update(document.querySelector('#guestCount'),{textColor:'#123456'}));
const number=await page.locator('#guestCount').evaluate(e=>({font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,color:getComputedStyle(e).color}));
const title=page.locator('#guestListButton>span');await title.click();
await page.getByLabel('Font',{exact:true}).selectOption('Verdana');await page.getByLabel('Size',{exact:true}).selectOption('14');
await page.evaluate(()=>ElementAppearance.update(document.querySelector('#guestListButton>span'),{textColor:'#654321',fontStyle:'italic'}));
for(const id of ['guestCount','notAttendingCount','noResponseCount','invitedCount','remainingCount']){
 const style=await page.locator('#'+id).evaluate(e=>({font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,color:getComputedStyle(e).color}));assert.deepEqual(style,number);
}
for(const parent of ['guestListButton','notAttendingButton','noResponseButton','invitedListButton','remainingSummary']){
 const style=await page.locator('#'+parent+'>span').evaluate(e=>({font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,color:getComputedStyle(e).color,italic:getComputedStyle(e).fontStyle}));
 assert.match(style.font,/Verdana/);assert.equal(style.size,'14px');assert.equal(style.color,'rgb(101, 67, 33)');assert.equal(style.italic,'italic');
}
assert.equal(await page.locator('#guestCount').getAttribute('contenteditable'),null);
await page.locator('#guestCount').click();
assert.equal(await page.getByLabel('Font',{exact:true}).inputValue(),'Georgia');
assert.equal(await page.getByLabel('Size',{exact:true}).inputValue(),'32');
assert.equal(await page.getByLabel('Text color hex',{exact:true}).inputValue(),'#123456');
await title.click();
assert.equal(await page.getByLabel('Font',{exact:true}).inputValue(),'Verdana');
assert.equal(await page.getByLabel('Size',{exact:true}).inputValue(),'14');
assert.equal(await page.getByLabel('Text color hex',{exact:true}).inputValue(),'#654321');
assert.equal(await page.getByRole('button',{name:'Italic',exact:true}).getAttribute('aria-pressed'),'true');

await page.getByRole('button',{name:'Done Editing',exact:true}).click();await page.evaluate(()=>{state.rsvps.push({name:'Casey Example',adults:1,children:0,attending:true,people:[{name:'Casey Example',attending:true}]});render();});
assert.deepEqual(await page.locator('#guestCount').evaluate(e=>({font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,color:getComputedStyle(e).color})),number);
assert.equal(await page.locator('#guestListButton>span').evaluate(e=>getComputedStyle(e).fontSize),'14px');
const snapshot=await page.evaluate(()=>JSON.stringify(appState.events.wedding.elementAppearance));
await page.locator('#hostHomeButton').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});await page.locator('[data-enter-event="thanksgiving"]').click();
assert.notEqual(await page.locator('#guestCount').evaluate(e=>getComputedStyle(e).color),'rgb(18, 52, 86)');
assert.equal(await page.evaluate(()=>JSON.stringify(appState.events.wedding.elementAppearance)),snapshot);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);await browser.close();console.log('Counter values and titles format independently, stay shared within their type, survive data redraws, and remain isolated per gathering.');
})().catch(e=>{console.error(e);process.exit(1);});
