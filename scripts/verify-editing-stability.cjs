// Optional Chromium integration check. External requests and live state writes are blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/, '') + '/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let fixture;
  let holdNext=false, releaseLoad, loadStarted;
  await page.route('**/test-state', async route => {
    if(route.request().method()==='PUT'){fixture=route.request().postDataJSON();return route.fulfill({status:204});}
    if(holdNext){holdNext=false;loadStarted();await new Promise(resolve=>{releaseLoad=resolve;});}
    return fixture ? route.fulfill({json:fixture}) : route.fulfill({status:204});
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().url().endsWith('/test-state')) return route.fallback();
    if (!route.request().url().startsWith(base)) return route.abort();
    if (new URL(route.request().url()).pathname === '/') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/, '$1'+base+'test-state') });
    }
    return route.continue();
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof startApp === 'function' && !document.querySelector('#signInPage').hidden);
  await page.evaluate(() => {
    clearTimeout(sharedSaveTimer);sharedSavePending=false;sharedSaveInProgress=false;appState=normalizeState(initialAppState());hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='wedding';state=appState.events.wedding;
    state.weddingPartyMembers=[{id:'melissa',name:'Melissa Raudman',title:'Matron of Honor',responsibilities:'Original responsibilities',pages:[]}];
    state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'Original page'}];
    selectedWeddingTab='party';selectedMatronTab='duties';showSignedInDestination();render();
    window.renderCount=0;const original=render;render=(...args)=>{window.renderCount++;return original(...args);};
  });
  fixture=await page.evaluate(()=>structuredClone(appState));
  fixture=Object.fromEntries(Object.entries(fixture).reverse());
  await page.route('**/data/app-state.json',route=>route.fulfill({json:fixture}));
  await page.evaluate(()=>loadSharedState());
  assert.equal(await page.evaluate(()=>renderCount),0,'unchanged remote state must not rebuild the page');
  fixture.events.wedding.whatToExpectContent='Remote change';
  holdNext=true;const started=new Promise(resolve=>{loadStarted=resolve;});
  await page.evaluate(()=>{window.pendingLoad=loadSharedState();});await started;
  await page.locator('#editItemsButton').click();releaseLoad();await page.evaluate(()=>pendingLoad);
  assert.equal(await page.locator('#weddingPartyDetails').isVisible(),false);
  assert.equal(await page.locator('.inline-members-edit-area #weddingPartyAdmin').isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Edit party members',exact:true}).count(),0);
  await page.getByRole('button',{name:'Edit Melissa Raudman',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Responsibilities for Melissa Raudman',exact:true});
  await input.fill('Responsibilities saved while typing');
  await input.evaluate(el=>{window.memberInput=el;window.memberScroll=scrollY;el.setSelectionRange(7,7);window.rendersBeforeTyping=renderCount;});
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(()=>state.weddingPartyMembers[0].responsibilities),'Responsibilities saved while typing');
  assert.equal(await input.evaluate(el=>el===window.memberInput && document.activeElement===el && el.selectionStart===7),true,'autosave preserves input identity, focus, and cursor');
  assert.equal(await page.evaluate(()=>renderCount),await page.evaluate(()=>rendersBeforeTyping));
  await page.locator('#gatheringColorsButton').click();await page.locator('[data-gathering-color="gold"]').fill('#aabb22');await page.getByRole('button',{name:'Save colors',exact:true}).click();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.summary-strip strong')).color),'rgb(170, 187, 34)');
  assert.equal(await input.evaluate(el=>el===window.memberInput),true,'changing colors does not rebuild member inputs');
  fixture.events.wedding.weddingPartyMembers[0].responsibilities='Remote stale text';
  await page.evaluate(()=>loadSharedState());
  assert.equal(await input.inputValue(),'Responsibilities saved while typing');
  assert.equal(await page.getByRole('button',{name:'Done editing Melissa Raudman',exact:true}).isVisible(),true);
  await page.locator('#editItemsButton').click();
  assert.equal(await page.locator('#weddingPartyDetails').isVisible(),true);
  assert.equal(await page.locator('.inline-members-edit-area').count(),0);
  assert.ok((await page.locator('#weddingPartyDetails').textContent()).includes('Responsibilities saved while typing'));
  // Deferred refreshes cannot replace a direct editor, and pagehide flushes it without rebuilding.
  await page.evaluate(()=>{selectedWeddingTab='couple';render();});await page.locator('#editItemsButton').click();
  await page.locator('#brideGroomContent').scrollIntoViewIfNeeded();await page.waitForTimeout(40);
  await page.getByRole('button',{name:'Edit page',exact:true}).click();
  const content=page.getByRole('textbox',{name:'Content',exact:true});await content.fill('Direct draft survives refresh');
  await content.evaluate(el=>{window.directInput=el;window.rendersBeforeTyping=renderCount;});await page.evaluate(()=>loadSharedState());
  assert.equal(await content.evaluate(el=>el===window.directInput && document.activeElement===el),true);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  assert.equal(await page.evaluate(()=>state.brideGroomPages[0].content),'Direct draft survives refresh');
  assert.equal(await page.evaluate(()=>renderCount),await page.evaluate(()=>rendersBeforeTyping));
  await page.locator('#editItemsButton').click();
  assert.equal(await page.locator('#brideGroomContent').textContent(),'Direct draft survives refresh');
  // The click that leaves a direct editor must still open its next editor.
  await page.locator('#editItemsButton').click();await page.locator('#brideGroomContent').scrollIntoViewIfNeeded();await page.waitForTimeout(40);
  await page.getByRole('button',{name:'Edit page',exact:true}).click();await page.getByRole('textbox',{name:'Content',exact:true}).fill('One-click transition');
  await page.locator('#eventDate').scrollIntoViewIfNeeded();await page.waitForTimeout(40);await page.getByRole('button',{name:'Edit date',exact:true}).click();
  assert.equal(await page.locator('.inline-editor[aria-label="Edit date"]').isVisible(),true);
  assert.equal(await page.evaluate(()=>state.brideGroomPages[0].content),'One-click transition');
  await page.getByRole('button',{name:'Cancel editing date',exact:true}).click();await page.locator('#editItemsButton').click();
  // Opening and closing another editor must not write stale hidden Bride & Groom controls back.
  await page.evaluate(()=>{selectedWeddingTab='party';selectedMatronTab='duties';render();});await page.locator('#editItemsButton').click();await page.locator('#editItemsButton').click();
  assert.equal(await page.evaluate(()=>state.brideGroomPages[0].content),'One-click transition');
  await page.setViewportSize({width:390,height:900});await page.locator('#editItemsButton').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'member editor fits mobile viewport');
  await page.locator('#editItemsButton').click();
  assert.deepEqual(errors,[]);console.log('Unchanged refresh, active drafts, portal autosave focus/cursor, automatic member editor, lifecycle flush, and stale hidden controls passed.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
