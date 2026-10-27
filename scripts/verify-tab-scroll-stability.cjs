// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();if(new URL(route.request().url()).pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];const w=appState.events.wedding;w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Help the groom',pages:[]}];w.weddingMealChoices=[{id:'chicken',name:'Chicken',audience:'Adults and children'}];w.sitePages=[{id:'saved-details',nav:'weddingPartyTabs',title:'What to Expect',content:'Default details body',audience:'guests'},{id:'travel',nav:'weddingPartyTabs',title:'Travel',content:'Travel body',audience:'all'}];hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';viewedEventId='wedding';state=w;showSignedInDestination();render();});


const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
await page.evaluate(()=>{const copy='Page information.\n\n'.repeat(50);state.brideGroomPages=[{id:'first',title:'First',content:copy},{id:'second',title:'Second',content:copy+copy}];state.sitePages[0].content=copy;state.timelineContent=Array.from({length:40},(_,i)=>`12:${String(i).padStart(2,'0')}\tEvent ${i}\tNotes`).join('\n');enterEvent('wedding');});
for(const width of [1280,390]){
 await page.setViewportSize({width,height:844});const positions=new Map();
 for(let round=0;round<4;round++)for(const key of ['attire','registry','details','media']){
  await page.locator('#rsvp-nav-'+key).click();await settle();const position=await page.locator('#rsvpDialog').evaluate(e=>({top:e.scrollTop,clamped:Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))<=1})),top=position.top;
  if(!position.clamped){if(positions.has(key))assert.ok(Math.abs(top-positions.get(key))<=1,`${key} scroll drift at ${width}: ${top} vs ${positions.get(key)}`);else positions.set(key,top);}
  assert.equal(await page.evaluate(()=>document.scrollingElement.scrollTop),0);
 }
 await page.locator('#hostFirstPageActions').getByRole('button',{name:'Bride & Groom',exact:true}).click();await settle();
 let subpageTop=null;
 for(let round=0;round<4;round++)for(const key of ['first','second','__wedding-timeline']){
  await page.locator(`[data-bride-groom-page="${key}"]`).click();await settle();const top=await page.locator('#brideGroomSection').evaluate(e=>e.getBoundingClientRect().top);assert.ok(top>=0 && top<=64,`Subpage heading is out of view: ${top}`);if(subpageTop===null)subpageTop=top;else assert.ok(Math.abs(top-subpageTop)<=1,`Subpage heading drift: ${top} vs ${subpageTop}`);
 }
 await page.locator('[data-bride-groom-page="first"]').focus();await page.locator('[data-bride-groom-page="first"]').press('ArrowRight');await settle();assert.ok(Math.abs(await page.locator('#brideGroomSection').evaluate(e=>e.getBoundingClientRect().top)-subpageTop)<=1);
}
assert.deepEqual(errors,[]);await browser.close();console.log('Repeated main/sub-tab clicks and keyboard navigation align within the gathering dialog without cumulative scrolling or moving the outer page.');
})().catch(e=>{console.error(e);process.exit(1);});
