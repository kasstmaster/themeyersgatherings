// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

await page.evaluate(()=>{
 const names=['John Smith','Jane Smith','Joe Smith','Michael Jones','Sally Jones'];
 const account={name:names.join('/'),invitedEvents:{wedding:true},invitationPeople:{wedding:{'Michael Jones':2,'Sally Jones':2}},plusOnePeople:{wedding:['John Smith','Michael Jones']}};
 appState.accounts=[account];state.rsvps=[{name:account.name,adults:2,children:0,people:names.map((name,index)=>({name,attending:index===2?null:index===0||index===3,guestChoice:'no-guest'}))}];render();renderGuestAttendance();
});
assert.equal(await page.locator('#invitedCount').textContent(),'7');
for(const selector of ['#guestList','#notAttendingList']){
 assert.equal(await page.locator(selector+' .guest-entry').count(),2);
 const rows=await page.locator(selector+' .guest-entry').allTextContents();assert.ok(rows[0].includes('Smith'));assert.ok(rows[1].includes('Jones'));assert.ok(rows.every(row=>!row.includes('Inv #')));
 if(selector==='#notAttendingList'){assert.ok(rows[0].includes('Jane Smith'));assert.ok(rows[1].includes('Sally Jones'));assert.ok(!rows.join('').includes('Joe Smith:'))}
}
await page.locator('#invitedListButton').click();assert.equal(await page.locator('#invitedList .guest-entry').count(),2);
const invited=await page.locator('#invitedList .guest-entry').allTextContents();assert.ok(invited.every(row=>!row.includes('Inv #')));assert.ok(invited[0].includes('4 adults (1 plus one)'));assert.ok(invited[1].includes('3 adults (1 plus one)'));
assert.deepEqual(errors,[]);await browser.close();console.log('Adults invited includes plus ones; invited, attending and declined lists use invitation groups');})().catch(e=>{console.error(e);process.exit(1)});
