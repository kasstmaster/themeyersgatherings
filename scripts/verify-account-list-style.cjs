// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

await page.evaluate(()=>{
 appState.accounts=[{name:'Benjamin Hall IV,Sherri Hall/Buddy Raudman',address:'123 Main Street',selectedEvents:{wedding:true},invitedEvents:{wedding:true},invitationPeople:{wedding:{'Buddy Raudman':2}},plusOnePeople:{wedding:['Buddy Raudman']}}];render();openAccountsAdmin();
});
assert.equal(await page.locator('#adminAccounts .account-invitation-group').count(),2);
assert.deepEqual(await page.locator('#adminAccounts .account-person-name').allTextContents(),['Benjamin Hall IV','Sherri Hall','Buddy Raudman']);
assert.equal(await page.locator('[data-person-invitation]').count(),3);assert.equal(await page.locator('[data-plus-one-person]').count(),3);
assert.equal(await page.locator('#adminAccounts .invited-entry-heading>span').last().textContent(),'2 adults (1 plus one)');
await page.locator('[data-plus-one-person="Sherri Hall"]').check();assert.equal(await page.locator('#adminAccounts .invited-entry-heading>span').first().textContent(),'3 adults (1 plus one)');
for(const width of [1280,390]){
 await page.setViewportSize({width,height:800});
 assert.ok(await page.locator('#adminAccounts').evaluate(el=>el.scrollWidth<=el.clientWidth));
 const alignment=await page.locator('.account-invitation-group').evaluateAll(groups=>groups.map(group=>{
  const heading=group.querySelector('.invited-entry-heading'),title=heading.querySelector('strong').getBoundingClientRect(),count=heading.querySelector('span').getBoundingClientRect(),names=[...group.querySelectorAll('.account-person-name')].map(el=>el.getBoundingClientRect().top);
  return {aligned:Math.abs(title.top-count.top)<5,separate:names.every((top,index)=>index===0||top>names[index-1]),background:getComputedStyle(group).backgroundColor,border:getComputedStyle(group).borderBottomWidth};
 }));
 for(const group of alignment){assert.ok(group.aligned);assert.ok(group.separate);assert.equal(group.background,'rgba(0, 0, 0, 0)');assert.equal(group.border,'1px');}
 console.log('Account list styling and controls passed',width);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
