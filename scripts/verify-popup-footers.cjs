// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

for(const width of [1280,390]){
 await page.setViewportSize({width,height:800});
 const results=await page.evaluate(()=>{
  const results=[];
  for(const dialog of document.querySelectorAll('dialog')){
   const card=dialog.querySelector(':scope>.modal-card'),footer=card?.querySelector(':scope>.modal-dialog-footer,:scope>.editor-dialog-footer');
   if(!card)continue;
   if(!footer){results.push({id:dialog.id,error:'Missing persistent footer'});continue;}
   const spacer=document.createElement('div');spacer.style.height='1500px';footer.before(spacer);dialog.showModal();
   for(const scroll of [0,card.scrollHeight]){
    card.scrollTop=scroll;
    const actions=[...footer.querySelectorAll('button')].filter(button=>button.getClientRects().length);
    const bounds=card.getBoundingClientRect();
    for(const button of actions){const rect=button.getBoundingClientRect();if(rect.top<Math.max(0,bounds.top)-1||rect.bottom>Math.min(innerHeight,bounds.bottom)+1||rect.left<0||rect.right>innerWidth)results.push({id:dialog.id,error:'Footer action offscreen',scroll,top:rect.top,bottom:rect.bottom,bounds:[bounds.top,bounds.bottom]});}
   }
   dialog.close();spacer.remove();
  }
  return results;
 });
 assert.deepEqual(results,[]);console.log('Persistent footer actions passed for every popup',width);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
