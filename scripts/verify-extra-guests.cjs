// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

await page.evaluate(()=>{
 const account={name:'Jane Smith/John Jones',selectedEvents:{thanksgiving:true,wedding:true},invitationPeople:{thanksgiving:{'John Jones':2}},plusOnePeople:{thanksgiving:['Jane Smith'],wedding:['Jane Smith']}};
 appState.accounts=[account];guestName=account.name;signedInPersonName='Jane Smith';viewedEventId='thanksgiving';state=appState.events.thanksgiving;state.rsvpDate='2000-01-01';state.rsvps=[];render();
});
await page.locator('#rsvpButton').click();assert.equal(await page.locator('#rsvpGuestsCounter').isVisible(),true);assert.equal(await page.locator('[data-person-guest]').count(),0);
await page.locator('[data-person-attending]').selectOption('yes');await page.locator('[data-target="extraGuests"][data-step="1"]').click();await page.locator('[data-target="extraGuests"][data-step="1"]').click();
await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();assert.equal(await page.evaluate(()=>state.rsvps[0].adults),3);
await page.evaluate(()=>signedInPersonName='John Jones');await page.locator('#rsvpButton').click();assert.equal(await page.locator('#extraGuests').textContent(),'0');
await page.locator('[data-person-attending]').selectOption('yes');await page.locator('[data-target="extraGuests"][data-step="1"]').click();await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();assert.equal(await page.evaluate(()=>state.rsvps[0].adults),5);
await page.evaluate(()=>signedInPersonName='Jane Smith');await page.locator('#rsvpButton').click();assert.equal(await page.locator('#extraGuests').textContent(),'2');
await page.locator('[data-target="extraGuests"][data-step="-1"]').click();await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();assert.equal(await page.evaluate(()=>state.rsvps[0].adults),4);
await page.evaluate(()=>{guestName=HOST_DISPLAY_NAME;signedInPersonName='';render();renderGuestAttendance();});assert.equal(await page.locator('#guestCount').textContent(),'4');assert.equal(await page.locator('#guestList .guest-entry').count(),2);assert.equal(await page.locator('#guestListTotals').evaluate(element=>element.hidden),false);assert.deepEqual(await page.locator('#guestListTotals .attendance-totals dd').allTextContents(),['4','0']);assert.equal(await page.locator('#guestListTotals .meal-totals').count(),0);
await page.evaluate(()=>{guestName=appState.accounts[0].name;signedInPersonName='Jane Smith';viewedEventId='wedding';state=appState.events.wedding;render();});await page.locator('#rsvpButton').click();assert.equal(await page.locator('#rsvpGuestsCounter').isVisible(),false);assert.ok(await page.locator('[data-person-guest]').count()>0);
assert.deepEqual(errors,[]);await browser.close();console.log('Non-Wedding guest counter saves per invitation, updates totals, works after deadlines, and stays hidden for Wedding');})().catch(e=>{console.error(e);process.exit(1)});
