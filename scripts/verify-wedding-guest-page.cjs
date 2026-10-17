// Optional Chromium integration check. External requests and live state writes are blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/, '') + '/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (!route.request().url().startsWith(base)) return route.abort();
    if (new URL(route.request().url()).pathname === '/') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/, '$1') });
    }
    return route.continue();
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof startApp === 'function' && !document.querySelector('#signInPage').hidden);


  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>{
      appState=initialAppState();viewedEventId='wedding';state=appState.events.wedding;
      state.weddingPartyMembers=[{id:'jane',name:'Jane Smith',title:'Bridesmaid',responsibilities:'Help',pages:[]}];
      state.sitePages=[{id:'expect',nav:'weddingPartyTabs',title:'What to Expect',content:'Guest-only information',audience:'all'},{id:'shared',nav:'weddingPartyTabs',title:'Shared information',content:'For everyone',audience:'all'}];
      appState.accounts=[{name:'Jane Smith,John Smith',selectedEvents:{wedding:true}}];
      hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';showSignedInDestination();render();
    });
    const guestTab=page.locator('[aria-controls="custom-page-expect"]');
    await guestTab.click();assert.equal(await page.locator('#custom-page-expect').isVisible(),true);
    assert.equal(await page.evaluate(()=>state.sitePages[0].audience),'guests');
    await page.evaluate(()=>{hostAuthenticated=false;guestName='Jane Smith,John Smith';signedInPersonName='Jane Smith';selectedWeddingTab='party';render();});
    assert.equal(await guestTab.count(),0);assert.equal(await page.locator('#custom-page-expect').count(),0);
    assert.equal(await page.locator('#whatToExpectSection').isVisible(),false);
    assert.equal(await page.locator('[aria-controls="custom-page-shared"]').isVisible(),true);
    await page.evaluate(()=>{signedInPersonName='John Smith';selectedWeddingTab='guest';render();});
    await guestTab.click();assert.equal(await page.locator('#custom-page-expect').isVisible(),true);
    // Saved audience survives renaming, and only Wedding gets the default restriction.
    await page.evaluate(()=>{state.sitePages[0].title='Guest plans';saveState();appState=loadState();state=appState.events.wedding;signedInPersonName='Jane Smith';selectedWeddingTab='party';render();});
    assert.equal(await guestTab.count(),0);assert.equal(await page.locator('#custom-page-expect').count(),0);
    await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';render();});
    await guestTab.click();assert.equal(await page.locator('#custom-page-expect').isVisible(),true);
    await page.evaluate(()=>{viewedEventId='thanksgiving';state=appState.events.thanksgiving;state.sitePages=[{id:'standard',nav:'gatheringTabs',title:'What to Expect',content:'For everyone',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';selectedGatheringTab='notes';render();});
    assert.equal(await page.locator('[aria-controls="custom-page-standard"]').isVisible(),true);
    assert.equal(await page.evaluate(()=>state.sitePages[0].audience),'all');
    console.log('Wedding What to Expect audience, stale selection, saved restriction and gathering isolation passed',width);
  }
  assert.deepEqual(errors,[]);await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
