// Real local Worker + browser integration; no live service or data is contacted.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {default:worker}=await import('../github-state-worker/worker.js');
 const {bucket,TEST_PASSWORD}=await import('../test/security-fixture.js');
 const base='http://127.0.0.1:8042';let state={accounts:[{name:'Casey Example',qrToken:'already-printed-qr',selectedEvents:{thanksgiving:true},invitedEvents:{thanksgiving:true}},{name:'Alexandertheverylongfirstname Example',selectedEvents:{thanksgiving:true},invitedEvents:{thanksgiving:true}}],events:{thanksgiving:{gatheringName:'Thanksgiving',eventDate:'2099-11-25',rsvpDate:'2099-11-20',items:[{id:'ham',name:'Ham',category:'Main Table',needed:2,unit:'item',claims:[]}],rsvps:[],hostNotes:'Private host notes',siteText:{},quantityUnits:[{id:'item',label:'Item'}]}},gatheringHome:{},invitationTemplates:[],gatheringHistory:{}};
 state.events.wedding={gatheringName:'Wedding',eventDate:'2099-08-10',rsvpDate:'2099-08-01',items:[],rsvps:[],sitePages:[{id:'custom-a',nav:'matronInfoTabs',audience:'party',title:'Custom A',content:'A body'},{id:'custom-b',nav:'matronInfoTabs',audience:'party',title:'Custom B',content:'B body'}],weddingPartyMembers:[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Own duties',pages:[{id:'travel',title:'Casey Travel',content:'Casey copy'}]},{id:'jordan',name:'Jordan Example',title:'Bridesmaid',responsibilities:'Other duties',pages:[{id:'travel',title:'Jordan Travel',content:'Jordan copy'}]}],textAppearance:{'#weddingPartyHeading':{parts:[{source:'Saved duties heading',original:'Your Responsibilities',markup:'**Saved duties heading**',overrideText:'Saved duties heading'}]}}};
 state.accounts[0].selectedEvents.wedding=true;
 let sha=1;const env={HOST_PASSWORD:TEST_PASSWORD,AUTH_MIGRATION_READY:'verified-backup-v1',INVITATION_BACKGROUNDS:bucket(),GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'test-only',ALLOWED_ORIGIN:base};
 const originalFetch=global.fetch;
 global.fetch=async(url,options={})=>{assert.match(String(url),/^https:\/\/api.github.com\/repos\/test\/private\/contents\//);if(options.method==='PUT'){const body=JSON.parse(options.body);if(body.sha!==String(sha))return Response.json({},{status:409});state=JSON.parse(Buffer.from(body.content,'base64'));sha++;return Response.json({content:{sha:String(sha)}});}return Response.json({sha:String(sha),content:Buffer.from(JSON.stringify(state)).toString('base64')});};
 const server=http.createServer(async(req,res)=>{try{
  if(req.url.startsWith('/api')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const request=new Request(base+req.url.replace(/^\/api/,'')||'/',{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)&&body.length?{body}: {})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  const file=path.join(process.cwd(),req.url==='/'?'index.html':req.url.split('?')[0]);let body=await fs.readFile(file);if(file.endsWith('index.html'))body=Buffer.from(body.toString().replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1'+base+'/api'));
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
 }catch{res.statusCode=500;res.end('Local fixture failure');}});
 await new Promise(resolve=>server.listen(8042,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.addInitScript(()=>{if(!localStorage.getItem('fixture-seeded')){localStorage.setItem('meyers-thanksgiving-v2',JSON.stringify({accounts:[{name:'Cached Private Person'}],events:{},gatheringHistory:{privateMarker:'OLD_PRIVATE_HISTORY'}}));localStorage.setItem('fixture-seeded','true');}});
  await page.goto(base+'/#/signin/account/already-printed-qr');await page.waitForFunction(()=>typeof startApp==='function');
  assert.equal(await page.evaluate(()=>appState.accounts.length),0);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('-private-draft-')&&localStorage.getItem(key).includes('OLD_PRIVATE_HISTORY'))),true);assert.equal(await page.locator('#guestAccessCode').count(),0);
  await page.locator('#accountFirstName').fill('Casey');await page.locator('#signInSubmit').click();await page.locator('#accountLastName').fill('Example');await page.locator('#signInSubmit').click();await page.locator('#signInSubmit').click();
  await page.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>guestName),'Casey Example');assert.equal(await page.evaluate(()=>JSON.stringify(appState).includes('Private host notes')),false);await page.evaluate(()=>captureGatheringHistory());assert.equal(await page.evaluate(()=>JSON.stringify(appState).includes('OLD_PRIVATE_HISTORY')),false);assert.equal(await page.locator('#editItemsButton').isVisible(),false);
  await page.locator('[data-enter-event="thanksgiving"]').click();await page.locator('#rsvpConfirmEvent').click();
  await page.locator('[data-person-attending][value="yes"]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-children]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-guests]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-dish-answer="no"]').click();
  await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.rsvps[0].people[0].attending,true);
  await page.locator('[data-enter-event="thanksgiving"]').click();
  // Save through the real guest state protocol, preserving the host data.
  await page.evaluate(()=>{state.items[0].claims.push(guestName);saveState();});await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(state.events.thanksgiving.items[0].claims[0],'Casey Example');assert.equal(state.events.thanksgiving.hostNotes,'Private host notes');
  state.events.thanksgiving.hostNotes='New private notes from host';sha++;
  await page.evaluate(()=>{state.items[0].claims.push(guestName);saveState();});await page.waitForFunction(()=>StateClient.conflicted);
  assert.equal(state.events.thanksgiving.items[0].claims.length,1);assert.equal(await page.getByRole('button',{name:'Load latest information',exact:true}).isVisible(),true);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Load latest information',exact:true}).click();await page.waitForFunction(()=>!StateClient.conflicted);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('-private-draft-'))),true);
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');assert.equal(await page.evaluate(()=>appState.accounts.length),0);
  // An existing long first name must still reach ordinary guest sign-in.
  const longPage=await browser.newPage();await longPage.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await longPage.goto(base+'/');await longPage.waitForFunction(()=>typeof startApp==='function');
  await longPage.locator('#accountFirstName').fill('Alexandertheverylongfirstname');await longPage.locator('#signInSubmit').click();await longPage.locator('#accountLastName').waitFor({state:'visible'});
  await longPage.locator('#accountLastName').fill('Example');await longPage.locator('#signInSubmit').click();await longPage.locator('#signInSubmit').click();await longPage.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await longPage.evaluate(()=>hostAuthenticated),false);await longPage.close();
  await page.goto(base+'/');await page.waitForFunction(()=>typeof startApp==='function');
  assert.equal(await page.locator('#hostSignInToggle,#hostPasswordField,#hostPassword').count(),0);
  const failed='incorrect-hidden-password-value';await page.locator('#accountFirstName').fill(failed);assert.equal(await page.locator('#accountFirstName').getAttribute('type'),'password');await page.locator('#signInSubmit').click();await page.waitForFunction(()=>!signInBusy&&document.querySelector('#accountPasswordError').textContent);
  assert.equal(await page.locator('#accountFirstName').inputValue(),'');assert.equal(await page.evaluate(()=>guestName),'');
  assert.equal(await page.evaluate(value=>JSON.stringify(appState).includes(value)||Object.keys(localStorage).some(key=>(localStorage.getItem(key)||'').includes(value)),failed),false);
  await page.locator('#accountFirstName').fill(TEST_PASSWORD);assert.equal(await page.locator('#accountFirstName').getAttribute('type'),'password');
  const pendingClear=await page.evaluate(()=>{document.querySelector('#passwordForm').requestSubmit();return document.querySelector('#accountFirstName').value===''&&document.querySelector('#signInSubmit').disabled;});assert.equal(pendingClear,true);
  await page.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>hostAuthenticated),true);
  assert.equal(await page.locator('#accountFirstName').inputValue(),'');assert.equal(await page.evaluate(value=>JSON.stringify(appState).includes(value)||Object.keys(localStorage).some(key=>(localStorage.getItem(key)||'').includes(value))||location.href.includes(value),TEST_PASSWORD),false);
  await page.evaluate(()=>{appState.events.thanksgiving.hostNotes='New host notes';saveState();});await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(state.events.thanksgiving.hostNotes,'New host notes');
  // A second device updates the canonical file while this browser retains its old revision.
  state.events.thanksgiving.hostNotes='Newer device notes';sha++;
  await page.evaluate(()=>{appState.events.thanksgiving.headerText='Unsynced host draft';saveState();});await page.waitForFunction(()=>StateClient.conflicted);
  assert.equal(state.events.thanksgiving.hostNotes,'Newer device notes');assert.equal(state.events.thanksgiving.headerText,undefined);assert.equal(await page.getByRole('button',{name:'Load latest information',exact:true}).isVisible(),true);
  // Exercise A5 through the actual editor, renderer, server save and refresh.
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Load latest information',exact:true}).click();await page.waitForFunction(()=>!StateClient.conflicted);
  await page.evaluate(()=>{enterEvent('wedding');selectedWeddingTab='party';selectedMatronTab='duties';render();});
  await page.locator('#weddingPartyHeading').waitFor({state:'visible'});assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Saved duties heading');
  await page.evaluate(()=>SiteEditing.toggle(render));
  const editHeading=async(text,id='weddingPartyHeading')=>{await page.locator('#'+id).dblclick();await page.locator('#'+id).fill(text);await page.evaluate(()=>ElementEditor.flush());await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);};
  const selectParty=async tab=>page.evaluate(tab=>{SiteEditing.resetTabSelection('matronInfoTabs');selectedMatronTab=tab;render();},tab);
  await editHeading('Only Responsibilities');await editHeading('Own Responsibilities intro','weddingPartyKicker');
  await selectParty('shared-details');assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Details');assert.equal(await page.locator('#weddingPartyKicker').textContent(),'The people by our side');await editHeading('Only Details');
  await selectParty('shared-timeline');assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Timeline');
  await page.locator('#weddingPartyHeading').dblclick();await page.locator('#weddingPartyHeading').fill('Timeline own heading');await selectParty('duties');await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Responsibilities');await selectParty('shared-timeline');assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Timeline own heading');
  await selectParty('member-page:'+JSON.stringify(['casey','travel']));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Casey Travel');await editHeading('Only Casey Travel');
  await selectParty('member-page:'+JSON.stringify(['jordan','travel']));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Jordan Travel');
  await page.evaluate(()=>ElementEditor.activate(document.querySelector('#matronInfoTabs [aria-controls="custom-page-custom-a"]')));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Custom A');await editHeading('Only Custom A');
  await page.evaluate(()=>ElementEditor.activate(document.querySelector('#matronInfoTabs [aria-controls="custom-page-custom-b"]')));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Custom B');
  await page.evaluate(()=>ElementEditor.activate(document.querySelector('#matronInfoTabs [aria-controls="custom-page-custom-a"]')));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Custom A');
  await page.evaluate(()=>ElementAppearance.update(document.querySelector('#weddingPartyHeading'),{fontSize:27,textColor:'#123456'}));await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  await selectParty('duties');assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Responsibilities');assert.equal(await page.locator('#weddingPartyKicker').textContent(),'Own Responsibilities intro');
  assert.equal(await page.locator('#weddingPartyHeading').evaluate(e=>getComputedStyle(e).color),'rgb(18, 52, 86)');
  await selectParty('shared-details');assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Details');assert.equal(await page.locator('#weddingPartyHeading').evaluate(e=>getComputedStyle(e).color),'rgb(18, 52, 86)');
  assert.equal(state.events.thanksgiving.elementAppearance?.['@group:titles'],undefined);
  assert.equal(state.events.wedding.textAppearance['#weddingPartyHeading'].parts[0].markup,'**Saved duties heading**');
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
  await page.evaluate(()=>{enterEvent('wedding');selectedWeddingTab='party';selectedMatronTab='shared-details';render();});assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Details');
  await page.evaluate(()=>{hostWeddingPartyViewName='Casey Example';guestName='Casey Example';signedInPersonName='Casey Example';selectedWeddingTab='party';selectedMatronTab='duties';render();});assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Casey Example');
  await selectParty('member-page:'+JSON.stringify(['casey','travel']));assert.equal(await page.locator('#weddingPartyHeading').textContent(),'Only Casey Travel');
  assert.deepEqual(errors,[]);assert.equal(state.accounts[0].qrToken,'already-printed-qr');console.log('QR/name flow, hidden Host access, security/concurrency and page-owned Wedding Party heading edits/formatting/save/reload pass against the real local Worker.');
 }finally{await browser.close();server.close();global.fetch=originalFetch;}
})().catch(error=>{console.error(error);process.exitCode=1;});
