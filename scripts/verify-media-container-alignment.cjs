// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});
 for(const id of ['wedding','thanksgiving','christmas']){
  await page.evaluate(id=>{appState.events[id].siteElementPlacements={'#mediaGalleryDescription':{parent:'#weddingMediaSection',before:'#weddingMediaUpload'},'#sharedGalleryPending':{parent:'#weddingMediaSection',before:null}};enterEvent(id);},id);await page.locator('#rsvpPageNavigation').getByRole('button',{name:'Photos & Videos',exact:true}).click();
  assert.equal(await page.locator('#weddingMediaIntro').evaluate(e=>e.parentElement.id),'weddingMediaSection');assert.equal(await page.locator('#weddingMediaHeading').evaluate(e=>e.parentElement.id),'weddingMediaSection');
  const media=await page.locator('#weddingMediaUpload').evaluate(e=>{const rect=e.getBoundingClientRect(),page=e.parentElement.getBoundingClientRect();return {left:rect.left,width:rect.width,pageLeft:page.left,pageWidth:page.width};});assert.ok(Math.abs(media.left-media.pageLeft)<1);assert.ok(Math.abs(media.width-media.pageWidth)<1);
  for(const selector of ['#weddingMediaShare','#sharedGalleryLink','#sharedGalleryPending','#mediaGalleryDescription','#weddingMediaGallery'])assert.equal(await page.locator(selector).evaluate(e=>document.querySelector('#weddingMediaUpload').contains(e)),true);
  await page.locator('#editItemsButton').click();
  await page.evaluate(()=>{ElementAppearance.update(document.querySelector('#weddingMediaHeading'),{textColor:'#123456'});ElementAppearance.update(document.querySelector('#weddingMediaIntro'),{textColor:'#654321'});});
  assert.equal(await page.locator('#weddingMediaHeading').evaluate(e=>getComputedStyle(e).color),'rgb(18, 52, 86)');
  assert.equal(await page.locator('#weddingMediaIntro').evaluate(e=>getComputedStyle(e).color),'rgb(101, 67, 33)');
  await page.locator('#editItemsButton').click();
  // A saved gap from the collapsed view must not pull later content over expanded options.
  await page.evaluate(()=>{state.siteSpacing={mediaGap:{parent:'#weddingMediaUpload',before:'#weddingMediaShare',after:'#weddingMediaView',axis:'y',size:28}};GapLayout.refresh();});
  await page.locator('#weddingMediaShare').click();
  const checkFlow=async selector=>{await page.waitForTimeout(150);const boxes=await page.evaluate(selector=>({panel:document.querySelector(selector).getBoundingClientRect().bottom,view:document.querySelector('#weddingMediaView').getBoundingClientRect().top}),selector);assert.ok(boxes.view>=boxes.panel,'Expanded sharing content must remain above the gallery');};
  await checkFlow('#weddingMediaShareOptions');
  await page.locator('#weddingMediaShareLink').click();await checkFlow('#weddingMediaLinkForm');
  await page.locator('#weddingMediaChooseUpload').click();await checkFlow('#weddingMediaUploadForm');
  await page.locator('#weddingMediaShare').click();
  if(id==='wedding'){await page.locator('#rsvp-nav-registry').click();const registry=await page.locator('#registrySection .registry-gift-note').evaluate(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width}));assert.ok(Math.abs(media.left-registry.left)<1);assert.ok(Math.abs(media.width-registry.width)<1);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#hostHomeButton').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
 }
}
assert.deepEqual(errors,[]);await browser.close();console.log('Photos content panels fill the shared page width and match Registry alignment, including all media controls and text, on desktop/mobile across gatherings.');
})().catch(e=>{console.error(e);process.exit(1);});
