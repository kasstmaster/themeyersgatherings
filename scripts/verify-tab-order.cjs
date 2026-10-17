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
    async function assertTabFormatting(navId,customId){
      const styles=await page.evaluate(([navId,customId])=>{const nav=document.getElementById(navId),custom=nav.querySelector(`[aria-controls="custom-page-${customId}"]`),builtIn=[...nav.querySelectorAll('[role="tab"]')].find(tab=>!tab.hidden&&!tab.getAttribute('aria-controls')?.startsWith('custom-page-'));const snapshot=tab=>{const style=getComputedStyle(tab);return ['fontFamily','fontSize','fontWeight','lineHeight','padding','borderRadius','borderTopWidth','borderTopColor'].map(key=>style[key]);};return [snapshot(custom),snapshot(builtIn)];},[navId,customId]);
      assert.deepEqual(styles[0],styles[1]);
    }
    await assertTabFormatting('weddingPartyTabs','extra');
    const original=await order('weddingPartyTabs'),last=original.at(-1);
    assert.equal(last,'Extra');
    assert.equal(await page.locator(`[data-inline-tab-group="weddingPartyTabs"] [aria-label="Move ${last} right"]`).isDisabled(),true);
    await move('weddingPartyTabs',last,'left');
    const expected=[...original];[expected[expected.length-2],expected[expected.length-1]]=[expected.at(-1),expected.at(-2)];
    assert.deepEqual(await order('weddingPartyTabs'),expected);
    await page.evaluate(()=>render());assert.deepEqual(await order('weddingPartyTabs'),expected);
    await page.locator('[aria-controls="custom-page-extra"]').click();
    assert.equal(await page.locator('#custom-page-extra h2').textContent(),'Extra');
    const formatting=await page.evaluate(()=>{
      const snapshot=(selector,keys)=>{const style=getComputedStyle(document.querySelector(selector));return keys.map(key=>style[key]);};
      const page=['fontFamily','fontSize','lineHeight','padding','borderRadius','borderTopColor','borderTopWidth','backgroundImage'];
      const title=['fontFamily','fontSize','fontWeight','lineHeight','textAlign','color'];
      const copy=['fontFamily','fontSize','lineHeight','padding','borderRadius','borderTopColor','backgroundColor','color'];
      return {newPage:snapshot('#custom-page-extra',page),existingPage:snapshot('#brideGroomSection',page),newTitle:snapshot('#custom-page-extra>h2',title),existingTitle:snapshot('#brideGroomHeading',title),newCopy:snapshot('#custom-page-extra>.bride-groom-content',copy),existingCopy:snapshot('#brideGroomContent',copy),titleGap:getComputedStyle(document.querySelector('#custom-page-extra>h2')).marginBottom,existingGap:getComputedStyle(document.querySelector('#brideGroomSection>.wedding-page-heading')).marginBottom};
    });
    assert.deepEqual(formatting.newPage,formatting.existingPage);assert.deepEqual(formatting.newTitle,formatting.existingTitle);assert.deepEqual(formatting.newCopy,formatting.existingCopy);assert.equal(formatting.titleGap,formatting.existingGap);
    await page.locator('#custom-page-extra').scrollIntoViewIfNeeded();
    async function assertUpperTextMatches(){
      const styles=await page.evaluate(()=>['#custom-page-extra>.section-kicker','#brideGroomSection>.section-kicker'].map(selector=>{const style=getComputedStyle(document.querySelector(selector));return ['color','fontFamily','fontSize','fontWeight','letterSpacing','textTransform','textAlign','marginTop','marginBottom'].map(key=>style[key]);}));
      assert.deepEqual(styles[0],styles[1]);
    }
    await assertUpperTextMatches();
    await page.evaluate(()=>{document.body.classList.add('custom-gathering-gold');document.body.style.setProperty('--gold','#123456');});
    await assertUpperTextMatches();
    assert.equal(await page.locator('#custom-page-extra>.section-kicker').evaluate(el=>getComputedStyle(el).color),'rgb(18, 52, 86)');
    await page.evaluate(()=>{document.body.classList.remove('custom-gathering-gold');document.body.style.removeProperty('--gold');});
    await page.locator('[data-inline-field-key="wedding:extra:intro"] [aria-label="Edit text"]').click();
    await page.getByRole('textbox',{name:'Text above title',exact:true}).fill('A little introduction');
    await page.getByRole('textbox',{name:'Text above title',exact:true}).blur();
    assert.equal(await page.locator('#custom-page-extra>.section-kicker').textContent(),'A little introduction');
    await page.evaluate(()=>render());assert.equal(await page.locator('#custom-page-extra>.section-kicker').textContent(),'A little introduction');
    await page.evaluate(()=>{state.sitePages.push({id:'subextra',nav:'guestInfoTabs',title:'New sub-page',intro:'Intro',content:'First paragraph\n\nSecond paragraph',audience:'all'});render();});
    await page.locator('[data-wedding-tab="guest"]').click();
    await assertTabFormatting('guestInfoTabs','subextra');
    await page.locator('[aria-controls="custom-page-subextra"]').click();
    const subFormatting=await page.evaluate(()=>{
      const snapshot=(selector,keys)=>{const style=getComputedStyle(document.querySelector(selector));return keys.map(key=>style[key]);};
      const surface=['padding','borderRadius','borderTopColor','borderTopWidth','backgroundColor','minHeight'];
      const copy=['fontFamily','fontSize','lineHeight','textAlign','color'];
      return {newPanel:snapshot('#custom-page-subextra',surface),existingPanel:snapshot('#perfectExperiencePanel',surface),newCopy:snapshot('#custom-page-subextra>.bride-groom-content',copy),existingCopy:snapshot('#perfectExperienceContent',copy)};
    });
    assert.deepEqual(subFormatting.newPanel,subFormatting.existingPanel);assert.deepEqual(subFormatting.newCopy,subFormatting.existingCopy);
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
