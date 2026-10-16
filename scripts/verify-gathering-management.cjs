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
  await page.evaluate(() => {
    appState=initialAppState();appState.accounts=[{name:'Jane Smith',selectedEvents:{thanksgiving:true},invitedEvents:{thanksgiving:true}}];
    hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='wedding';state=appState.events.wedding;showSignedInDestination();render();
  });
  assert.equal(await page.locator('#gatheringColorsButton').isVisible(),false);
  await page.locator('#editItemsButton').click();await page.locator('#gatheringColorsButton').click();
  await page.locator('[data-gathering-color="accent"]').fill('#226688');
  await page.getByRole('button',{name:'Save colors',exact:true}).click();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#rsvpButton')).backgroundColor),'rgb(34, 102, 136)');
  await page.locator('[data-switch-event="thanksgiving"]').click();
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.querySelector('#rsvpButton')).backgroundColor),'rgb(34, 102, 136)');
  await page.locator('#newGatheringButton').click();
  await page.locator('#newGatheringName').fill('Summer Picnic');await page.locator('#newGatheringDate').fill('2027-06-12');await page.locator('#newGatheringAddress').fill('123 Park Lane');
  await page.getByRole('button',{name:'Create gathering',exact:true}).click();
  const id=await page.evaluate(()=>viewedEventId);
  assert.ok(id.startsWith('gathering-'));assert.equal(await page.locator('#customGatheringHeading').textContent(),'Summer Picnic');
  assert.equal(await page.locator('#eventAddress').textContent(),'123 Park Lane');
  assert.equal(await page.evaluate(()=>state.items.length),0);assert.equal(await page.evaluate(()=>state.rsvps.length),0);
  assert.equal(await page.evaluate(()=>state.weddingPartyMembers),undefined);
  assert.equal(await page.evaluate(()=>appState.accounts[0].selectedEvents[viewedEventId]),false);
  assert.equal(await page.locator('#hostNotesContent').isVisible(),true);
  await page.locator('[data-gathering-tab="menu"]').click();assert.equal(await page.locator('#gatheringMenuSection').isVisible(),true);
  await page.locator('#rsvpButton').click();assert.equal(await page.locator('#weddingRsvpMenu').isVisible(),false);await page.locator('#rsvpDialog .modal-close').click();
  await page.locator('#gatheringColorsButton').click();await page.locator('[data-gathering-color="page"]').fill('#ddeeff');await page.getByRole('button',{name:'Save colors',exact:true}).click();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#gatheringMenuSection')).backgroundColor),'rgb(221, 238, 255)');
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');
  await page.evaluate(id=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;enterEvent(id);},id);
  assert.equal(await page.locator('#customGatheringHeading').textContent(),'Summer Picnic');
  assert.equal(await page.evaluate(()=>state.gatheringColors.page),'#ddeeff');
  assert.equal(await page.evaluate(()=>appState.events.wedding.gatheringColors.accent),'#226688');
  assert.ok((await page.evaluate(()=>availableEventIds())).includes(id));
  await page.evaluate(()=>{hostAuthenticated=false;guestName='Jane Smith';signedInPersonName='Jane Smith';});
  assert.ok(!(await page.evaluate(()=>availableEventIds())).includes(id));
  await page.evaluate(id=>{appState.accounts[0].selectedEvents[id]=true;appState.accounts[0].invitedEvents[id]=true;enterEvent(id);},id);
  assert.equal(await page.locator('#newGatheringButton').isVisible(),false);
  assert.equal(await page.locator('#gatheringColorsButton').isVisible(),false);
  assert.equal(await page.locator('#hostNotesContent').isVisible(),false);
  assert.equal(await page.locator('#gatheringMenuSection').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('Gathering creation, independent colors, reload persistence, standard layout and account access passed.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
