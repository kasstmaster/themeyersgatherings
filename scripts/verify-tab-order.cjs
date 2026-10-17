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

  const order = id => page.locator(`#${id}>[role="tab"]`).evaluateAll(tabs=>tabs.filter(tab=>!tab.hidden).map(tab=>tab.textContent));
  async function move(id,title,direction){
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.locator(`[data-inline-tab-group="${id}"] [aria-label="Move ${title} ${direction}"]`).click();
  }
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>{
      SiteEditing.beforeRender();appState=initialAppState();viewedEventId='wedding';state=appState.events.wedding;
      state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'Welcome'},{id:'venue',title:'Venue',content:'Venue info'}];
      state.sitePages=[{id:'extra',nav:'weddingPartyTabs',title:'Extra',content:'Extra page',audience:'all'}];
      hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();render();
    });
    if(await page.locator('#editItemsButton').getAttribute('aria-pressed')!=='true')await page.locator('#editItemsButton').click();
    const original=await order('weddingPartyTabs'),last=original.at(-1);
    assert.equal(last,'Extra');
    assert.equal(await page.locator(`[data-inline-tab-group="weddingPartyTabs"] [aria-label="Move ${last} right"]`).isDisabled(),true);
    await move('weddingPartyTabs',last,'left');
    const expected=[...original];[expected[expected.length-2],expected[expected.length-1]]=[expected.at(-1),expected.at(-2)];
    assert.deepEqual(await order('weddingPartyTabs'),expected);
    await page.evaluate(()=>render());assert.deepEqual(await order('weddingPartyTabs'),expected);
    await page.locator('[aria-controls="custom-page-extra"]').click();
    assert.equal(await page.locator('#custom-page-extra h2').textContent(),'Extra');
    await page.locator('#custom-page-extra').scrollIntoViewIfNeeded();
    await page.locator('[data-inline-field-key="wedding:extra:intro"] [aria-label="Edit text"]').click();
    await page.getByRole('textbox',{name:'Text above title',exact:true}).fill('A little introduction');
    await page.getByRole('textbox',{name:'Text above title',exact:true}).blur();
    assert.equal(await page.locator('#custom-page-extra>.section-kicker').textContent(),'A little introduction');
    await page.evaluate(()=>render());assert.equal(await page.locator('#custom-page-extra>.section-kicker').textContent(),'A little introduction');
    await page.locator('[data-wedding-tab="couple"]').click();
    await move('brideGroomTabs','Venue','left');assert.deepEqual(await order('brideGroomTabs'),['Venue','Bride & Groom']);
    await page.locator('#editItemsButton').click();assert.equal(await page.locator('[aria-label^="Move "]').count(),0);
    assert.deepEqual(await order('brideGroomTabs'),['Venue','Bride & Groom']);
    await page.evaluate(()=>{appState=loadState();state=appState.events.wedding;render();});
    assert.deepEqual(await order('weddingPartyTabs'),expected);assert.deepEqual(await order('brideGroomTabs'),['Venue','Bride & Groom']);
    await page.evaluate(()=>{hostAuthenticated=false;guestName='Jane Smith';signedInPersonName='Jane Smith';appState.accounts=[{name:'Jane Smith',selectedEvents:{wedding:true}}];render();});
    assert.equal(await page.locator('[aria-label^="Move "]').count(),0);
    const guestTabs=await order('weddingPartyTabs');assert.deepEqual(guestTabs,expected.filter(title=>guestTabs.includes(title)));
    await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='thanksgiving';state=appState.events.thanksgiving;showSignedInDestination();render();});
    await page.locator('#editItemsButton').click();
    // A cleared title still has a usable edit anchor without adding placeholder text.
    await page.evaluate(()=>{state.siteText ??= {};state.siteText['#welcome-title']='';render();});
    await page.locator('#welcome-title').scrollIntoViewIfNeeded();
    const blankEdit=page.locator('[data-inline-field-key="thanksgiving:#welcome-title"] [aria-label="Edit text"]');
    await blankEdit.click();await page.getByRole('textbox',{name:'Text (Markdown supported)',exact:true}).fill('Restored title');
    await page.getByRole('textbox',{name:'Text (Markdown supported)',exact:true}).blur();
    assert.equal(await page.locator('#welcome-title').textContent(),'Restored title');
    const standard=await order('gatheringTabs');await move('gatheringTabs',standard[1],'left');assert.deepEqual(await order('gatheringTabs'),[standard[1],standard[0]]);
    assert.equal(await page.evaluate(()=>appState.events.christmas.siteTabOrder),undefined);
    page.once('dialog',dialog=>dialog.accept('New test page'));
    await page.locator('#gatheringTabs').scrollIntoViewIfNeeded();
    await page.locator('[data-inline-anchor="gatheringTabs"] [aria-label="Add page"]').click();
    const newId=await page.evaluate(()=>state.sitePages.at(-1).id);
    assert.equal(await page.locator(`#custom-page-${newId}>h2`).textContent(),'New test page');
    assert.equal(await page.locator(`#custom-page-${newId}>.section-kicker`).count(),1);
    await page.locator(`[data-inline-field-key="thanksgiving:${newId}:intro"] [aria-label="Edit text"]`).click();
    await page.getByRole('textbox',{name:'Text above title',exact:true}).fill('New page introduction');
    await page.getByRole('textbox',{name:'Text above title',exact:true}).blur();
    assert.equal(await page.evaluate(()=>state.sitePages.at(-1).intro),'New page introduction');
    await page.locator('#editItemsButton').click();
    console.log('Saved main/custom/sub-tab ordering, boundaries, guest gating and gathering isolation passed',width);
  }
  assert.deepEqual(errors,[]);await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
