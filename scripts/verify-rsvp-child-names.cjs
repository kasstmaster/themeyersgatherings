// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

for(const eventId of ['thanksgiving','christmas','wedding']){
 await page.evaluate(eventId=>{
 appState.accounts=[{name:'Jane Smith',selectedEvents:{[eventId]:true}}];guestName='Jane Smith';signedInPersonName='Jane Smith';viewedEventId=eventId;state=appState.events[eventId];state.rsvps=[];state.rsvpDate='2028-01-01';state.weddingMealOptions=['Chicken'];render();
 },eventId);
 await page.locator('#rsvpButton').click();await page.locator('[data-person-attending]').selectOption('yes');
 await page.locator('[data-target="children"][data-step="1"]').click();await page.locator('[data-rsvp-child-name="0"]').fill('Tyson');
 await page.locator('[data-target="children"][data-step="1"]').click();await page.locator('[data-rsvp-child-name="1"]').fill('Avery');
 await page.locator('[data-target="children"][data-step="-1"]').click();assert.equal(await page.locator('[data-rsvp-child-name="0"]').inputValue(),'Tyson');
 await page.locator('[data-target="children"][data-step="1"]').click();assert.equal(await page.locator('[data-rsvp-child-name="1"]').inputValue(),'Avery');
 if(eventId==='wedding')for(const card of await page.locator('.wedding-rsvp-guest').all())await card.locator('[data-rsvp-meal]').first().check();
 await page.locator('#rsvpForm>.primary-button').click();await page.waitForFunction(()=>!document.querySelector('#rsvpDialog').open);
 assert.deepEqual(await page.evaluate(()=>state.rsvps[0].childNames),['Tyson','Avery']);
 await page.locator('#rsvpButton').click();assert.equal(await page.locator('[data-rsvp-child-name="0"]').inputValue(),'Tyson');await page.locator('#rsvpDialog .modal-close').click();
 await page.evaluate(()=>{guestName=HOST_DISPLAY_NAME;signedInPersonName='';render();renderGuestAttendance();});
 const list=await page.locator('#guestList').textContent();assert.ok(list.includes('Child 1 - Tyson'));assert.ok(list.includes('Child 2 - Avery'));
 assert.equal(list.split('Child 1 - Tyson').length-1,1);assert.equal(list.split('Child 2 - Avery').length-1,1);assert.ok(!list.includes(': Attending'));
 assert.equal(await page.locator('#guestList .guest-menu-summary>div').count(),3);
 assert.equal(await page.locator('#guestList .guest-menu-summary').evaluate(element=>getComputedStyle(element).borderTopWidth),'0px');
 console.log('Named children save, reopen and display',eventId);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
