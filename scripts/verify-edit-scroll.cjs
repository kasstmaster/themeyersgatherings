// Regression check: scrolling must move controls synchronously with their items.
// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

await page.locator('#editItemsButton').click();await page.waitForTimeout(100);
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
 const result=await page.evaluate(()=>{
  const target=document.querySelector('#eventDate'),control=document.querySelector('[data-inline-field-key="wedding:eventDate"]');
  const before=control.getBoundingClientRect().top-target.getBoundingClientRect().top;
  scrollTo(0,60);
  // Check synchronously, before requestAnimationFrame can reposition anything.
  return {before,after:control.getBoundingClientRect().top-target.getBoundingClientRect().top,position:getComputedStyle(control.parentElement).position,dockZ:getComputedStyle(document.querySelector('.event-dock')).zIndex};
 });
 assert.equal(result.after,result.before);assert.equal(result.position,'absolute');assert.ok(Number(result.dockZ)>200);
 console.log('Native scroll anchoring passed',width);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
