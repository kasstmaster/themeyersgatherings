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
    for(const role of ['host','guest','party']){
      await page.evaluate(role=>{
        appState=initialAppState();viewedEventId='wedding';state=appState.events.wedding;
        appState.accounts=[{name:'Jane Smith',selectedEvents:{wedding:true}}];
        state.weddingPartyMembers=role==='party'?[{id:'jane',name:'Jane Smith',title:'Bridesmaid',responsibilities:'Help',pages:[]}]:[];
        hostAuthenticated=role==='host';guestName=hostAuthenticated?HOST_DISPLAY_NAME:'Jane Smith';signedInPersonName=hostAuthenticated?'':'Jane Smith';
        DropboxUpload.show=ctx=>{window.lastUploadContext=ctx;document.querySelector('#dropboxInlineUpload').hidden=false;};
        showSignedInDestination();render();
      },role);
      assert.equal(await page.locator('[data-wedding-tab="media"]').count(),0);
      const rsvp=await page.locator('#rsvpButton').boundingBox(),upload=await page.locator('#uploadPhotosButton').boundingBox();
      assert.ok(upload.y>rsvp.y+rsvp.height);assert.equal(upload.x,rsvp.x);
      await page.locator('#rsvp-nav-media').click();
      const rect=await page.locator('#weddingMediaDialog').boundingBox();assert.equal(rect.x,0);assert.equal(rect.y,0);assert.equal(rect.width,width);assert.equal(rect.height,900);
      assert.equal(await page.locator('#weddingMediaUpload').isVisible(),true);
      await page.evaluate(()=>renderRsvpAttire());
      async function sharedColors(){
        const result=await page.evaluate(()=>{
          const style=selector=>getComputedStyle(document.querySelector(selector));
          const panel=selector=>{const s=style(selector);return [s.backgroundColor,s.borderTopColor,s.borderTopWidth,s.color];};
          return {upload:panel('#weddingMediaUpload'),gallery:panel('#weddingMediaView'),rsvp:panel('#rsvpAttireColumns>article'),uploadBackground:style('#weddingMediaDialog').backgroundImage,rsvpBackground:style('#rsvpDialog').backgroundImage,label:style('#weddingMediaUpload label').color,rsvpText:style('#rsvpAttire h4').color};
        });
        assert.deepEqual(result.upload,result.rsvp);assert.deepEqual(result.gallery,result.rsvp);assert.equal(result.uploadBackground,result.rsvpBackground);assert.equal(result.label,result.rsvpText);
      }
      await sharedColors();
      const buttons=await page.evaluate(()=>{
        const keys=['fontFamily','fontSize','fontWeight','lineHeight','padding','border','borderRadius','backgroundColor','color','boxShadow'];
        const snapshot=selector=>{const style=getComputedStyle(document.querySelector(selector));return keys.map(key=>style[key]);};
        return {upload:snapshot('#dropboxUpload'),save:snapshot('#weddingMediaSaveLink'),rsvp:snapshot('#rsvpNext'),uploadClose:snapshot('#weddingMediaDialog .modal-close'),rsvpClose:snapshot('#rsvpDialog .modal-close'),uploadBack:snapshot('#weddingMediaDialog .sign-in-back'),rsvpBack:snapshot('#rsvpBack')};
      });
      assert.deepEqual(buttons.upload,buttons.rsvp);assert.deepEqual(buttons.save,buttons.rsvp);assert.deepEqual(buttons.uploadClose,buttons.rsvpClose);assert.deepEqual(buttons.uploadBack,buttons.rsvpBack);
      const theme=await page.addStyleTag({content:'.fullscreen-flow{--flow-text:rgb(240, 241, 242);--flow-panel-background:rgb(30, 50, 75);--flow-panel-border:rgb(100, 120, 145)}'});
      await sharedColors();
      assert.equal(await page.locator('#weddingMediaUpload').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(30, 50, 75)');
      await theme.evaluate(el=>el.remove());
      assert.equal(await page.locator('#dropboxFiles').getAttribute('multiple'),'');
      assert.equal(await page.evaluate(()=>lastUploadContext.host),role==='host');
      assert.equal(await page.evaluate(()=>lastUploadContext.account),role==='host'?'The Host':'Jane Smith');
      assert.ok(await page.locator('#weddingMediaDialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
      await page.locator('[data-media-tab="view"]').click();assert.equal(await page.locator('#weddingMediaView').isVisible(),true);
      await page.locator('[data-media-tab="upload"]').click();assert.equal(await page.locator('#weddingMediaUpload').isVisible(),true);
      await page.locator('#weddingMediaDialog [data-close-wedding-media]').last().click();assert.equal(await page.locator('#weddingMediaDialog').isVisible(),false);
      await page.locator('#rsvp-nav-media').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#weddingMediaDialog').isVisible(),false);
      assert.equal(await page.locator('#eventPage').isVisible(),true);
    }
    await page.evaluate(()=>{viewedEventId='thanksgiving';state=appState.events.thanksgiving;render();});assert.equal(await page.locator('#uploadPhotosButton').isVisible(),false);
    console.log('Full-page upload shell, button placement, gallery tabs and account context passed',width);
  }
  assert.deepEqual(errors,[]);await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
