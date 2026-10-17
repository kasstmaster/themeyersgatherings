// Optional Chromium integration check. External requests and live state writes are blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/, '') + '/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let fixture;
  await page.route('**/test-state', async route => {
    if(route.request().method()==='PUT'){fixture=route.request().postDataJSON();return route.fulfill({status:204});}
    return fixture ? route.fulfill({json:fixture}) : route.fulfill({status:204});
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().url().includes('/test-state')) return route.fallback();
    if (!route.request().url().startsWith(base)) return route.abort();
    if (new URL(route.request().url()).pathname === '/') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/, '$1'+base+'test-state') });
    }
    return route.continue();
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof startApp === 'function' && !document.querySelector('#signInPage').hidden);

  await page.evaluate(()=>{
    clearTimeout(sharedSaveTimer);sharedSavePending=false;sharedSaveInProgress=false;
    appState=normalizeState(initialAppState());hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='wedding';state=appState.events.wedding;
    appState.accounts=[{name:'David,Cameron Poretta/Sherie Porretta',anyListCategoryId:'porretta',qrToken:'keep',invitationPeople:{wedding:{'Cameron Poretta':2}}}];
    showSignedInDestination();render();openAccountsAdmin();
  });
  fixture=await page.evaluate(()=>structuredClone(appState));
  await page.route('**/test-state/anylist-sync',async route=>{
    fixture.accounts[0].name='David,Sherie,Cameron Porretta';
    fixture.accounts[0].invitationPeople.wedding={'Cameron Porretta':2};
    return route.fulfill({json:{syncId:'test'}});
  });
  await page.route('**/test-state/anylist-sync/status?*',route=>route.fulfill({json:{state:'complete',added:0,updated:1,skipped:0}}));
  assert.ok((await page.locator('#adminAccounts').innerText()).includes('Poretta'));
  await page.locator('#syncAnyListButton').click();
  await page.waitForFunction(()=>document.querySelector('#anyListSyncResult').textContent.includes('account updated'));
  const text=await page.locator('#adminAccounts').innerText();assert.ok(text.includes('Porretta'));assert.ok(!text.includes('Poretta'));
  assert.equal(await page.locator('#accountsDialog').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#adminAccounts').inert),false);
  assert.equal(await page.evaluate(()=>appState.accounts[0].qrToken),'keep');
  assert.equal(await page.evaluate(()=>appState.accounts[0].invitationPeople.wedding['Cameron Porretta']),2);
  assert.deepEqual(errors,[]);await browser.close();console.log('AnyList sync refreshes corrected names inside the open Accounts dialog');
})().catch(error=>{console.error(error);process.exit(1)});
