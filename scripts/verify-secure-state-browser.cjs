// Real local Worker + browser integration; no live service or data is contacted.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const {default:worker}=await import('../github-state-worker/worker.js');
 const {bucket,TEST_PASSWORD}=await import('../test/security-fixture.js');
 const base='http://127.0.0.1:8042';let state={accounts:[{name:'Casey Example',qrToken:'already-printed-qr',selectedEvents:{thanksgiving:true},invitedEvents:{thanksgiving:true}},{name:'Alexandertheverylongfirstname Example',selectedEvents:{thanksgiving:true},invitedEvents:{thanksgiving:true}}],events:{thanksgiving:{gatheringName:'Thanksgiving',eventDate:'2099-11-25',rsvpDate:'2099-11-20',items:[{id:'ham',name:'Ham',category:'Main Table',needed:2,unit:'item',claims:[]}],rsvps:[],hostNotes:'Private host notes',siteText:{},quantityUnits:[{id:'item',label:'Item'}]}},gatheringHome:{},invitationTemplates:[],gatheringHistory:{}};
 state.events.thanksgiving.items.push({id:'legacy-overflow',name:'Legacy preserved dish',category:'Sides',needed:1,unit:'item',claims:['Other Household','Other Household']});
 state.events.wedding={gatheringName:'Wedding',eventDate:'2099-08-10',rsvpDate:'2099-08-01',items:[],rsvps:[],sitePages:[{id:'custom-a',nav:'matronInfoTabs',audience:'party',title:'Custom A',content:'A body'},{id:'custom-b',nav:'matronInfoTabs',audience:'party',title:'Custom B',content:'B body'}],weddingPartyMembers:[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Own duties',pages:[{id:'travel',title:'Casey Travel',content:'Casey copy'}]},{id:'jordan',name:'Jordan Example',title:'Bridesmaid',responsibilities:'Other duties',pages:[{id:'travel',title:'Jordan Travel',content:'Jordan copy'}]}],textAppearance:{'#weddingPartyHeading':{parts:[{source:'Saved duties heading',original:'Your Responsibilities',markup:'**Saved duties heading**',overrideText:'Saved duties heading'}]}}};
 state.accounts[0].selectedEvents.wedding=true;
 state.events['copy-source']={gatheringName:'Copy Source',eventDate:'2099-11-24',rsvpDate:'2099-11-20',items:[{id:'copy-ham',name:' HAM ',category:'Main Table',needed:1,claims:[]},{id:'copy-salad',name:'Copied Salad',category:'Sides',needed:3,unit:'item',claims:['Source Household']}],sitDownMenu:[{id:'copy-existing',name:'Private Roast',category:'Main Table'},{id:'copy-new',name:'Copied Roast',category:'Main Table'}],rsvps:[]};
 let sha=1;const env={HOST_PASSWORD:TEST_PASSWORD,AUTH_MIGRATION_READY:'verified-backup-v1',INVITATION_BACKGROUNDS:bucket(),GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'test-only',ALLOWED_ORIGIN:base};
 // Keep synthetic uploaded artwork binary so saved-template reload previews are exercised too.
 const rawPut=env.INVITATION_BACKGROUNDS.put.bind(env.INVITATION_BACKGROUNDS),rawGet=env.INVITATION_BACKGROUNDS.get.bind(env.INVITATION_BACKGROUNDS);
 env.INVITATION_BACKGROUNDS.put=async(key,value,options={})=>typeof value==='string'?rawPut(key,value,options):env.INVITATION_BACKGROUNDS.objects.set(key,{body:new Uint8Array(value),options});
 env.INVITATION_BACKGROUNDS.get=async(key,options)=>{const value=env.INVITATION_BACKGROUNDS.objects.get(key);return value?.body instanceof Uint8Array?{body:value.body,size:value.body.length,httpMetadata:value.options?.httpMetadata || {},text:async()=>new TextDecoder().decode(value.body)}:rawGet(key,options);};
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
  await page.locator('#accountFirstName').fill('Casey');await page.locator('#signInSubmit').click();await page.locator('#accountLastName').fill('Example');await page.locator('#signInSubmit').click();
  await page.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>guestName),'Casey Example');assert.equal(await page.evaluate(()=>JSON.stringify(appState).includes('Private host notes')),false);await page.evaluate(()=>captureGatheringHistory());assert.equal(await page.evaluate(()=>JSON.stringify(appState).includes('OLD_PRIVATE_HISTORY')),false);assert.equal(await page.locator('#editItemsButton').isVisible(),false);
  await page.locator('[data-enter-event="thanksgiving"]').click();await page.locator('#rsvpConfirmEvent').click();
  await page.locator('[data-person-attending][value="yes"]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-children]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-guests]').check();await page.locator('#rsvpNext').click();
  assert.equal(await page.locator('#rsvpDishReference').isVisible(),true);
  assert.equal(await page.locator('#dishReferenceInvited').textContent(),'2');assert.equal(await page.locator('#dishReferenceAttending').textContent(),'0');assert.equal(await page.locator('#dishReferenceDeadline').textContent(),'Nov 20, 2099');
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:720});await page.waitForTimeout(100);
    const reference=await page.evaluate(()=>({top:document.querySelector('#rsvpDishReference').getBoundingClientRect().top,bottom:document.querySelector('#rsvpDishReference').getBoundingClientRect().bottom,form:document.querySelector('#rsvpForm').getBoundingClientRect().top,position:getComputedStyle(document.querySelector('#rsvpDishReference')).position}));
    assert.equal(reference.position,'fixed');assert.ok(reference.top>=0&&reference.top<2);assert.ok(reference.form>=reference.bottom,'dish questions clear the reference toolbar');
  }
  await page.setViewportSize({width:1280,height:900});
  await page.locator('[data-rsvp-dish-answer="yes"]').click();
  await page.evaluate(()=>applyRsvpDeadline());assert.equal(await page.locator('[data-rsvp-dish="legacy-overflow"]').isDisabled(),true);
  await page.locator('#rsvpCustomDish').check();await page.locator('#rsvpNext').click();
  await page.locator('#rsvpCustomDishName').fill('Homemade Soup');await page.locator('#rsvpNext').click();
  await page.locator('#rsvpCustomDishQuantity').fill('2');await page.locator('#rsvpNext').click();
  await page.locator('#rsvpCustomDishCategory').selectOption('Sides');await page.locator('[data-add-custom-dish]:visible').click();
  await page.locator('#rsvpCustomDishName-1').fill('Cornbread');await page.locator('#rsvpNext').click();
  await page.locator('#rsvpCustomDishQuantity-1').fill('3');await page.locator('#rsvpNext').click();
  await page.locator('#rsvpCustomDishCategory-1').selectOption('Sides');await page.locator('#rsvpNext').click();
  assert.match(await page.locator('#rsvpReview').textContent(),/Homemade Soup \(2\).*Cornbread \(3\)/);
  await page.locator('#rsvpNext').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  const customs=state.events.thanksgiving.items.filter(item=>item.id.startsWith('custom-'));
  assert.deepEqual(customs.map(item=>[item.name,item.needed,item.claimGroups['Casey Example'][1]]),[['Homemade Soup',2,2],['Cornbread',3,3]]);
  assert.equal(await page.locator('#rsvpDishReference').isVisible(),false);
  assert.equal(state.events.thanksgiving.rsvps[0].people[0].attending,true);assert.deepEqual(state.events.thanksgiving.items.find(item=>item.id==='legacy-overflow').claims,['Other Household','Other Household']);
  await page.locator('[data-enter-event="thanksgiving"]').click();
  assert.equal(await page.locator('#hostRsvpCounters').isVisible(),true);
  assert.equal(await page.locator('#guestListButton').isDisabled(),true);assert.equal(await page.locator('#invitedListButton').isDisabled(),true);
  assert.equal(await page.locator('#notAttendingButton').isVisible(),false);assert.equal(await page.locator('#noResponseButton').isVisible(),false);
  await page.locator('#rsvp-nav-your-dishes').click();await page.locator('#yourDishesSection').waitFor({state:'visible'});
  const dishExport=await page.evaluate(()=>PageActions.exportPage(document.querySelector('#yourDishesSection')));
  assert.equal(dishExport.title,'Your Dishes');assert.match(dishExport.text,/Homemade Soup/);assert.match(dishExport.text,/Cornbread/);assert.doesNotMatch(dishExport.text,/Other Household|Legacy preserved dish/);
  // Save through the real guest state protocol, preserving the host data.
  await page.evaluate(()=>{setRsvpDishQuantity(state.items[0],rsvpDishQuantity(state.items[0])+1);saveState();});await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(state.events.thanksgiving.items[0].claims[0],'Casey Example');assert.equal(state.events.thanksgiving.hostNotes,'Private host notes');
  // Declining an existing invitation must finish at attendance and release its dishes.
  await page.evaluate(()=>openRsvp());assert.equal(await page.locator('[data-custom-dish-clone]').count(),0);await page.locator('#rsvpConfirmEvent').click();
  await page.locator('[data-person-attending][value="no"]').check();
  assert.equal(await page.locator('#rsvpNext').textContent(),'Save my RSVP');
  await page.locator('#rsvpNext').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.rsvps[0].people[0].attending,false);
  assert.equal(state.events.thanksgiving.rsvps[0].children,0);
  assert.equal(state.events.thanksgiving.items[0].claims.length,0);
  // Restore attendance through the normal questions before the conflict checks.
  await page.locator('[data-enter-event="thanksgiving"]').click();await page.evaluate(()=>openRsvp());await page.locator('#rsvpConfirmEvent').click();
  await page.locator('[data-person-attending][value="yes"]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-children]').check();await page.locator('#rsvpNext').click();
  await page.locator('[data-rsvp-no-guests]').check();await page.locator('#rsvpNext').click();await page.locator('[data-rsvp-dish-answer="no"]').click();
  await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);await page.locator('[data-enter-event="thanksgiving"]').click();
  await page.evaluate(()=>{setRsvpDishQuantity(state.items[0],1);saveState();});await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  state.events.thanksgiving.hostNotes='New private notes from host';sha++;
  await page.evaluate(()=>{setRsvpDishQuantity(state.items[0],rsvpDishQuantity(state.items[0])+1);saveState();});await page.waitForFunction(()=>StateClient.conflicted);
  assert.equal(state.events.thanksgiving.items[0].claims.length,1);assert.equal(await page.getByRole('button',{name:'Load latest information',exact:true}).isVisible(),true);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Load latest information',exact:true}).click();await page.waitForFunction(()=>!StateClient.conflicted);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('-private-draft-'))),true);
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');assert.equal(await page.evaluate(()=>appState.accounts.length),0);
  // An existing long first name must still reach ordinary guest sign-in.
  const longPage=await browser.newPage();await longPage.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await longPage.goto(base+'/');await longPage.waitForFunction(()=>typeof startApp==='function');
  await longPage.locator('#accountFirstName').fill('Alexandertheverylongfirstname');await longPage.locator('#signInSubmit').click();await longPage.locator('#accountLastName').waitFor({state:'visible'});
  await longPage.locator('#accountLastName').fill('Example');await longPage.locator('#signInSubmit').click();await longPage.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await longPage.evaluate(()=>hostAuthenticated),false);await longPage.close();
  await page.goto(base+'/');await page.waitForFunction(()=>typeof startApp==='function');
  assert.equal(await page.locator('#hostSignInToggle,#hostPasswordField,#hostPassword').count(),0);
  const failed='incorrect-hidden-password-value';await page.locator('#accountFirstName').fill(failed);assert.equal(await page.locator('#accountFirstName').getAttribute('type'),'password');await page.locator('#signInSubmit').click();await page.waitForFunction(()=>!signInBusy&&document.querySelector('#accountPasswordError').textContent);
  assert.equal(await page.locator('#accountFirstName').inputValue(),'');assert.equal(await page.evaluate(()=>guestName),'');
  assert.equal(await page.evaluate(value=>JSON.stringify(appState).includes(value)||Object.keys(localStorage).some(key=>(localStorage.getItem(key)||'').includes(value)),failed),false);
  await page.locator('#accountFirstName').fill(TEST_PASSWORD);assert.equal(await page.locator('#accountFirstName').getAttribute('type'),'password');
  const pendingClear=await page.evaluate(()=>{document.querySelector('#passwordForm').requestSubmit();return document.querySelector('#accountFirstName').value===''&&document.querySelector('#signInSubmit').disabled;});assert.equal(pendingClear,true);
  await page.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>hostAuthenticated),true);
  assert.equal(await page.locator('#accountFirstName').inputValue(),'');assert.equal(await page.evaluate(value=>JSON.stringify(appState).includes(value)||Object.keys(localStorage).some(key=>(localStorage.getItem(key)||'').includes(value))||location.href.includes(value),TEST_PASSWORD),false);
  // Configure a private, year-owned sit-down preparation menu through the actual host UI.
  await page.evaluate(()=>enterEvent('thanksgiving'));await page.evaluate(()=>SiteEditing.toggle(render));await page.evaluate(()=>openMenuEditor());
  const sharedMenuHeader=async()=>{assert.equal(await page.getByLabel('Dinner plan',{exact:true}).isVisible(),true);assert.equal(await page.locator('#clearClaimSection').isVisible(),true);assert.equal(await page.locator('.menu-editor-navigation').isVisible(),true);};
  await sharedMenuHeader();assert.equal(await page.evaluate(()=>{const area=document.querySelector('#menuEditorContent'),children=[...area.children];return children.indexOf(document.querySelector('#clearClaimSection'))===1&&children.indexOf(document.querySelector('.menu-editor-navigation'))===2;}),true);
  assert.equal(await page.locator('#adminItems [data-move]').count(),0);assert.equal(await page.locator('#adminItems [data-admin-id="ham"] button').textContent(),'Remove');
  const menuStyles=await page.evaluate(()=>['#sitDownDinnerItems','#adminItems'].map(selector=>{const style=getComputedStyle(document.querySelector(selector));return {maxHeight:style.maxHeight,overflow:style.overflow};}));assert.deepEqual(menuStyles[0],menuStyles[1]);assert.deepEqual(menuStyles[0],{maxHeight:'none',overflow:'visible'});
  assert.equal(await page.getByLabel('Dinner plan',{exact:true}).inputValue(),'potluck');assert.equal(await page.locator('#sitDownDinnerMenu').isVisible(),false);
  const potluckCopy=page.locator('[data-menu-copy-controls="potluck"]');await potluckCopy.getByRole('button',{name:'Copy from',exact:true}).click();await potluckCopy.getByLabel('Copy from gathering').selectOption('copy-source');await potluckCopy.getByRole('button',{name:'Copy items',exact:true}).click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.items.filter(item=>item.name==='Copied Salad').length,1);assert.deepEqual(state.events.thanksgiving.items.find(item=>item.name==='Copied Salad').claims,[]);
  await potluckCopy.getByRole('button',{name:'Copy items',exact:true}).click();assert.match(await potluckCopy.getByRole('status').textContent(),/0 items copied/);
  await page.locator('.menu-editor-navigation').getByRole('button',{name:'Quantity Types',exact:true}).click();assert.equal(await page.locator('#menuAdminFields').isVisible(),false);assert.equal(await page.locator('#menuQuantityTypes').isVisible(),true);await sharedMenuHeader();
  await page.locator('#adminNewUnitName').fill('Test Tray');await page.locator('#adminAddUnitButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(await page.locator('#menuAdminFields').isVisible(),false);assert.equal(await page.locator('#menuQuantityTypes').isVisible(),true);await sharedMenuHeader();
  assert.equal(state.events.thanksgiving.quantityUnits.some(unit=>unit.label==='Test Tray'),true);
  await page.locator('.menu-editor-navigation').getByRole('button',{name:'Sit Down Dinner',exact:true}).click();assert.equal(await page.locator('#menuQuantityTypes').isVisible(),false);assert.equal(await page.locator('#sitDownDinnerMenu').isVisible(),true);await sharedMenuHeader();
  await page.getByLabel('New preparation dish',{exact:true}).fill('Private Roast');await page.locator('#sitDownDinnerMenu').getByRole('button',{name:'Add dish',exact:true}).click();
  await page.getByLabel('Prepare Private Roast',{exact:true}).check();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  const sitDownCopy=page.locator('[data-menu-copy-controls="sit-down"]');await sitDownCopy.getByRole('button',{name:'Copy from',exact:true}).click();await sitDownCopy.getByLabel('Copy from gathering').selectOption('copy-source');await sitDownCopy.getByRole('button',{name:'Copy items',exact:true}).click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.sitDownMenu.filter(item=>item.name==='Private Roast').length,1);assert.equal(state.events.thanksgiving.sitDownMenu.filter(item=>item.name==='Copied Roast').length,1);
  assert.equal(state.events.thanksgiving.dinnerPlans['2099'].type,'potluck');assert.equal(state.events.thanksgiving.dinnerPlans['2099'].selectedItems.length,1);
  await page.getByLabel('Dinner plan',{exact:true}).selectOption('sit-down');assert.equal(await page.locator('#menuAdminFields').isVisible(),false);
  await page.locator('.menu-editor-navigation').getByRole('button',{name:'Potluck',exact:true}).click();assert.equal(await page.locator('#menuAdminFields').isVisible(),true);await sharedMenuHeader();
  await page.locator('#adminItems [data-admin-id="ham"] input').fill('Updated Potluck Ham');await page.locator('#adminItems [data-admin-id="ham"] input').dispatchEvent('change');await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.dinnerPlans['2099'].type,'sit-down');assert.equal(state.events.thanksgiving.items[0].name,'Updated Potluck Ham');
  await page.locator('#menuEditorDialog .modal-close').click();await page.evaluate(()=>SiteEditing.toggle(render));
  const sitdownGuest=await browser.newPage();await sitdownGuest.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());await sitdownGuest.goto(base+'/');
  await sitdownGuest.locator('#accountFirstName').fill('Casey');await sitdownGuest.locator('#signInSubmit').click();await sitdownGuest.locator('#accountLastName').fill('Example');await sitdownGuest.locator('#signInSubmit').click();await sitdownGuest.locator('#eventSelectionPage').waitFor({state:'visible'});
  await sitdownGuest.locator('[data-enter-event="thanksgiving"]').click();assert.equal(await sitdownGuest.locator('#hostRsvpCounters').isVisible(),false);assert.equal(await sitdownGuest.locator('#rsvp-nav-your-dishes').count(),0);
  assert.equal(await sitdownGuest.evaluate(()=>JSON.stringify(appState).includes('Private Roast')),false);
  await sitdownGuest.locator('#rsvpConfirmEvent').click();await sitdownGuest.locator('[data-person-attending][value="yes"]').check();await sitdownGuest.locator('#rsvpNext').click();await sitdownGuest.locator('[data-rsvp-no-children]').check();await sitdownGuest.locator('#rsvpNext').click();await sitdownGuest.locator('[data-rsvp-no-guests]').check();await sitdownGuest.locator('#rsvpNext').click();
  assert.equal(await sitdownGuest.locator('#rsvpHeading').textContent(),'Review your RSVP');assert.equal(await sitdownGuest.locator('#rsvpDishReference').isVisible(),false);await sitdownGuest.close();
  // Return only this year's plan to potluck; its private options and selections stay saved.
  await page.evaluate(()=>SiteEditing.toggle(render));await page.evaluate(()=>openMenuEditor());await page.getByLabel('Dinner plan',{exact:true}).selectOption('potluck');await page.locator('#menuEditorDialog .modal-close').click();await page.evaluate(()=>SiteEditing.toggle(render));await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.events.thanksgiving.sitDownMenu[0].name,'Private Roast');assert.equal(state.events.thanksgiving.dinnerPlans['2099'].selectedItems.length,1);
  await page.evaluate(()=>{document.querySelector('#rsvpDialog').close();showEventSelection();});
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
  // Shared button backgrounds and Photos spacing must survive editing.
  await page.evaluate(()=>{hostWeddingPartyViewName='';guestName=HOST_DISPLAY_NAME;signedInPersonName='';enterEvent('thanksgiving');selectedGatheringTab='media';render();});
  await page.waitForFunction(()=>document.querySelector('#weddingMediaGalleryStatus').textContent.includes('No photos'));
  await page.evaluate(()=>{SiteEditing.toggle(render);state.elementAppearance??={};state.elementAppearance['#weddingMediaShare']={backgroundColor:'#123456',backgroundAlpha:0};render();ElementAppearance.update(document.querySelector('#weddingMediaShare'),{backgroundColor:'#ab1234',backgroundAlpha:100,textHighlight:'#000000',textHighlightAlpha:0});});
  assert.equal(await page.locator('#weddingMediaShare').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(171, 18, 52)');
  const gapInfo=await page.evaluate(()=>{GapLayout.refresh();const gap=GapLayout.elements().find(e=>e.dataset.gapBefore==='#mediaGalleryDescription'&&e.dataset.gapAfter==='#weddingMediaGalleryStatus')||GapLayout.addAfter(document.querySelector('#mediaGalleryDescription'));if(!gap)return false;GapLayout.setSize(gap,72);return true;});assert.equal(gapInfo,true);
  const photoGap=()=>page.evaluate(()=>document.querySelector('#weddingMediaGalleryStatus').getBoundingClientRect().top-document.querySelector('#mediaGalleryDescription').getBoundingClientRect().bottom);
  assert.ok(Math.abs(await photoGap()-72)<2);await page.evaluate(()=>SiteEditing.toggle(render));assert.ok(Math.abs(await photoGap()-72)<2,'photo gap persists outside edit mode');
  await page.evaluate(()=>{SiteEditing.toggle(render);const text=document.querySelector('#mediaGalleryDescription');SiteEditing.moveTextTo(text,document.querySelector('#weddingMediaShare'),false);});
  await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  const follows=()=>page.evaluate(()=>{const record=state.siteGaps.find(g=>g.anchor==='#mediaGalleryDescription');const gap=record&&document.getElementById('gathering-gap-'+record.id),text=document.querySelector('#mediaGalleryDescription');return Boolean(gap&&gap.parentElement===text.parentElement&&gap.previousElementSibling===text&&parseFloat(gap.style.height)===72);});
  assert.equal(await follows(),true,'gap follows text after reparenting');await page.evaluate(()=>SiteEditing.toggle(render));assert.equal(await follows(),true,'gap survives leaving editing after text moves');
  await page.evaluate(()=>WeddingMedia.uploadsFinished({base:SHARED_STATE_URL,eventId:viewedEventId,host:true,name:guestName,account:guestName,preview:false}));assert.equal(await follows(),true,'gallery refresh retains anchored gap');
  await page.setViewportSize({width:390,height:720});await page.addStyleTag({content:'.event-dock{padding-bottom:48px!important}'});
  await page.evaluate(()=>{state.siteText['#mediaGalleryDescription']='A long gallery description. '.repeat(140);render();});
  await page.waitForTimeout(150);await page.evaluate(()=>{const dialog=document.querySelector('#rsvpDialog');dialog.scrollTo({top:dialog.scrollHeight,behavior:'instant'});});
  await page.waitForTimeout(100);const bottomBefore=await page.locator('#rsvpDialog').evaluate(e=>e.scrollTop);await page.evaluate(()=>{for(let i=0;i<5;i++){FittedText.fitAll();GapLayout.refresh();}});await page.waitForTimeout(100);assert.ok(Math.abs(await page.locator('#rsvpDialog').evaluate(e=>e.scrollTop)-bottomBefore)<2,'bottom scroll position remains stable');
  const clearance=await page.evaluate(()=>({contentBottom:document.querySelector('#weddingMediaGalleryStatus').getBoundingClientRect().bottom,toolbarTop:document.querySelector('#hostToolsPanel').getBoundingClientRect().top}));assert.ok(clearance.contentBottom<=clearance.toolbarTop-8,'last content clears the actual mobile toolbar');
  await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>SiteEditing.toggle(render));await page.locator('#mediaGalleryDescription').dblclick();
  await page.evaluate(()=>{const element=document.querySelector('#mediaGalleryDescription'),range=document.createRange();range.selectNodeContents(element);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
  await page.locator('.element-editor-toolbar summary').filter({hasText:'Text effects'}).click();
  await page.getByLabel('Text shadow',{exact:true}).selectOption('On');await page.getByLabel('Shadow blur',{exact:true}).fill('4');await page.getByLabel('Shadow blur',{exact:true}).dispatchEvent('change');
  await page.getByLabel('Text outline',{exact:true}).selectOption('On');await page.getByLabel('Outline width',{exact:true}).fill('1.5');await page.getByLabel('Outline width',{exact:true}).dispatchEvent('change');
  await page.evaluate(()=>ElementEditor.flush());await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.ok(state.events.thanksgiving.siteText['#mediaGalleryDescription'].includes('shadow='));assert.ok(state.events.thanksgiving.siteText['#mediaGalleryDescription'].includes('outline='));
  await page.evaluate(()=>SiteEditing.toggle(render));
  const effects=await page.locator('#mediaGalleryDescription span').last().evaluate(e=>({shadow:getComputedStyle(e).textShadow,stroke:getComputedStyle(e).webkitTextStrokeWidth}));assert.notEqual(effects.shadow,'none');assert.equal(effects.stroke,'1.5px');
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
  await page.evaluate(()=>{enterEvent('thanksgiving');selectedGatheringTab='media';render();});await page.locator('#mediaGalleryDescription span').last().waitFor();
  const reloadedEffects=await page.locator('#mediaGalleryDescription span').last().evaluate(e=>({shadow:getComputedStyle(e).textShadow,stroke:getComputedStyle(e).webkitTextStrokeWidth}));assert.deepEqual(reloadedEffects,effects);assert.equal(await follows(),true,'moved gap survives full reload');
  // Typing must not repaint unrelated shared components on every character.
  await page.evaluate(()=>{SiteEditing.toggle(render);ElementAppearance.update(document.querySelector('#weddingMediaHeading'),{textColor:'#123456'});});
  await page.locator('#mediaGalleryDescription').dblclick();await page.waitForTimeout(100);
  await page.evaluate(()=>{globalThis.typingPaints=0;globalThis.typingObserver=new MutationObserver(records=>typingPaints+=records.length);typingObserver.observe(document.querySelector('#weddingMediaHeading'),{attributes:true,attributeFilter:['style']});});
  await page.locator('#mediaGalleryDescription').press('Control+a');await page.locator('#mediaGalleryDescription').pressSequentially('A sentence typed without repainting the whole gathering.',{delay:15});
  await page.waitForTimeout(1100);const typingPaints=await page.evaluate(()=>{typingObserver.disconnect();return typingPaints;});assert.ok(typingPaints<5,`typing unexpectedly repainted an unrelated heading ${typingPaints} times`);
  await page.evaluate(()=>SiteEditing.toggle(render));await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.ok(state.events.thanksgiving.siteText['#mediaGalleryDescription'].includes('A sentence typed'));
  // Done must preserve non-black effects when replacing older nested effects.
  const otherGatheringBefore=JSON.stringify(state.events.wedding);
  await page.evaluate(()=>{state.siteText['#mediaGalleryDescription']='{{style:font=Verdana;shadow=#112233;shadowBlur=4;outline=#000000;outlineWidth=1}}**Existing** [effect text](https://example.com){{/style}} and plain text';render();});
  for(const selector of ['#weddingMediaHeading','#weddingMediaIntro','#mediaGalleryDescription']){
   await page.locator('#editItemsButton').click();await page.locator(selector).click();await page.locator('.element-editor-toolbar summary').filter({hasText:'Text effects'}).click();
   await page.getByLabel('Text shadow',{exact:true}).selectOption('On');await page.getByLabel('Shadow color hex',{exact:true}).fill('#abcdef');await page.getByLabel('Shadow blur',{exact:true}).fill('0');
   await page.getByLabel('Text outline',{exact:true}).selectOption('On');await page.getByLabel('Outline color hex',{exact:true}).fill('#fedcba');await page.getByLabel('Outline width',{exact:true}).fill('2');
   await page.waitForTimeout(50);await page.locator('#editItemsButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
   const actual=await page.locator(selector).evaluate(e=>{const text=e.querySelector('a')||e;const style=getComputedStyle(text);return {shadow:style.textShadow,color:style.webkitTextStrokeColor,width:style.webkitTextStrokeWidth};});
   assert.equal(actual.shadow,'rgb(171, 205, 239) 1px 1px 0px',selector+' shadow after Done');assert.equal(actual.color,'rgb(254, 220, 186)',selector+' outline color after Done');assert.equal(actual.width,'2px');
  }
  assert.equal(JSON.stringify(state.events.wedding),otherGatheringBefore,'effects must stay in their gathering');
  assert.ok(state.events.thanksgiving.siteText['#mediaGalleryDescription'].includes('outline=#fedcba'));
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});await page.evaluate(()=>{enterEvent('thanksgiving');selectedGatheringTab='media';render();});
  const savedLink=page.locator('#mediaGalleryDescription a');assert.equal(await savedLink.getAttribute('href'),'https://example.com/');assert.equal(await page.locator('#mediaGalleryDescription strong').textContent(),'Existing');
  assert.equal(await savedLink.evaluate(e=>getComputedStyle(e).webkitTextStrokeColor),'rgb(254, 220, 186)');assert.match(await savedLink.evaluate(e=>getComputedStyle(e).fontFamily),/Verdana/);
  await page.locator('#editItemsButton').click();await page.locator('#mediaGalleryDescription').click();await page.locator('.element-editor-toolbar summary').filter({hasText:'Text effects'}).click();
  assert.equal(await page.getByLabel('Text shadow',{exact:true}).inputValue(),'On','reopened effects show the saved shadow');assert.equal(await page.getByLabel('Text outline',{exact:true}).inputValue(),'On','reopened effects show the saved outline');assert.equal(await page.getByLabel('Outline color hex',{exact:true}).inputValue(),'#fedcba');
  await page.getByLabel('Text shadow',{exact:true}).selectOption('Off');await page.getByLabel('Text outline',{exact:true}).selectOption('Off');await page.locator('#editItemsButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  const cleared=await savedLink.evaluate(e=>({shadow:getComputedStyle(e).textShadow,width:getComputedStyle(e).webkitTextStrokeWidth}));assert.deepEqual(cleared,{shadow:'none',width:'0px'});

  // Invitation drafts must validate before saving; copies resolve only the destination's information.
  await page.evaluate(()=>showGatheringsHome());await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  await page.locator('#editItemsButton').click();
  assert.equal(await page.locator('.element-editor-toolbar [data-editor-gathering-management] #manageGatherings').isVisible(),true);
  const managementOrder=await page.evaluate(()=>{const manage=document.querySelector('[data-editor-gathering-management]'),menus=document.querySelector('[data-editor-menu-templates]');return Boolean(manage.compareDocumentPosition(menus)&Node.DOCUMENT_POSITION_FOLLOWING);});assert.equal(managementOrder,true);
  await page.locator('#editItemsButton').click();assert.equal(await page.locator('#hostToolsPanel #manageGatherings').isVisible(),true);

  await page.locator('#manageGatherings').click();await page.locator('#managedGathering').selectOption(JSON.stringify(['thanksgiving','2099-11-25']));
  await page.locator('#managedEventTime').fill('2:00 PM');await page.locator('#managedAddress').fill('123 Main\nBakersfield CA');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>appState.events.thanksgiving.eventTime==='2:00 PM');await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();
  const typography=await page.evaluate(async()=>{
    const background=document.createElement('canvas');background.width=800;background.height=240;background.getContext('2d').fillStyle='#fff';background.getContext('2d').fillRect(0,0,800,240);const url=background.toDataURL();const results=[];
    for(const fontFamily of ['Times New Roman','Arial','Georgia','Garamond'])for(const italic of [false,true]){
      const field={...Invitation.newField('customText',20,20),fontFamily,fontSize:44,fontWeight:italic?'700':'400',italic,textAlign:'center',width:760,height:180,letterSpacing:1,wordSpacing:3,customText:'Saturday November 21st 2026\nEvent Time'};
      const editor=document.createElement('canvas');await Invitation.renderTextField(editor,field,field.customText);
      const composite=document.createElement('canvas');composite.width=760;composite.height=180;const ctx=composite.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,760,180);ctx.drawImage(editor,0,0);
      const output=document.createElement('canvas');await Invitation.render(output,{template:{background:{width:800,height:240,url},fields:[field]},values:{[field.id]:field.customText}},null);
      const a=ctx.getImageData(0,0,760,180).data,b=output.getContext('2d').getImageData(20,20,760,180).data;let maxDifference=0,ink=0;for(let n=0;n<a.length;n++){maxDifference=Math.max(maxDifference,Math.abs(a[n]-b[n]));if(n%4!==3&&a[n]<200)ink++;}results.push({fontFamily,italic,maxDifference,ink});
    }
    const field={...Invitation.newField('eventTime',0,0),fontFamily:'Times New Roman',fontSize:44,lineHeight:3,width:700,height:55};
    const fits=Invitation.overflowDetails(document.createElement('canvas'),{template:{fields:[field]},values:{[field.id]:'Two o’clock in the afternoon'}});
    return {results,fits};
  });
  for(const sample of typography.results){assert.ok(sample.ink>0);assert.ok(sample.maxDifference<=1,JSON.stringify(sample));}assert.deepEqual(typography.fits,[],'line-box leading must not create a false overflow warning');
  const artwork=Buffer.from((await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1200;canvas.getContext('2d').fillRect(0,0,800,1200);return canvas.toDataURL('image/png');})).split(',')[1],'base64');
  await env.INVITATION_BACKGROUNDS.put('invitation-backgrounds/source-layout',artwork,{httpMetadata:{contentType:'image/png'}});
  const sourceLayout=await page.evaluate(base=>{const t=Invitation.createTemplate('Copied wedding layout',{width:800,height:1200,url:base+'/api/invitation-backgrounds/source-layout'});t.eventId='wedding';t.fields=Invitation.mandatoryFields(t.background);t.fields[0].color='#123456';return t;},base);
  state.invitationTemplates=[sourceLayout];sha++;await page.evaluate(()=>loadSharedState());await page.evaluate(()=>enterEvent('thanksgiving'));await page.evaluate(()=>openTemplateManager());
  assert.equal(await page.locator('#invitationEventDate').count(),0);assert.equal(await page.locator('#invitationQrMode').isVisible(),true);
  await page.locator('#copyTemplateSource').selectOption(sourceLayout.id);await page.locator('#newTemplateName').fill('Thanksgiving copy');await page.locator('#newTemplateBackground').setInputFiles({name:'new-art.png',mimeType:'image/png',buffer:artwork});await page.locator('#createTemplateButton').click();await page.locator('#invitationEditorDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#invitationEditorDialog').evaluate(element=>element.tagName),'SECTION');
  assert.equal(await page.locator('[data-editor-workspace]').isVisible(),true);assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#eventSelectionPage').isVisible(),false);assert.equal(await page.locator('#manageGatherings').isVisible(),false);
  assert.equal(state.invitationTemplates.length,1,'creation must not save an incomplete draft');assert.equal(await page.evaluate(()=>templateDraft.fields[0].color),'#123456');await page.locator('#templateFieldLayer .editor-field').first().waitFor({state:'visible'});assert.match(await page.locator('#templateFieldLayer').textContent(),/2:00 PM/);
  assert.equal(await page.locator('[data-editor-workspace]').getByRole('button',{name:'Done',exact:true}).count(),0);
  assert.equal(await page.locator('#saveTemplateButton').textContent(),'Save');assert.equal(await page.locator('#previewEditedTemplateButton').textContent(),'Preview');assert.equal(await page.locator('#centerTemplateField').count(),0);assert.equal(await page.locator('#templateWorkspaceTools details').count(),0);assert.equal(await page.locator('#uploadTemplateBackgroundButton').isVisible(),true);
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});await page.waitForTimeout(80);
    await page.locator('.editor-field').first().click();
    const layout=await page.evaluate(()=>{const bar=document.querySelector('[data-editor-workspace]'),top=bar.querySelector('.element-editor-top'),row=bar.querySelector('.element-editor-formatting'),panel=bar.querySelector('[data-editor-panel]');const before=top.getBoundingClientRect().top;row.scrollTop=100;return {width:bar.clientWidth,tools:document.querySelector('#templateWorkspaceTools').getBoundingClientRect().width,toolbox:document.querySelector('#templateFieldToolbox').getBoundingClientRect().width,overflow:[...bar.querySelectorAll('button,select,input,textarea')].filter(e=>e.getClientRects().length).some(e=>e.getBoundingClientRect().right>bar.getBoundingClientRect().right+1||e.scrollWidth>e.clientWidth+1),scroll:row.scrollHeight>row.clientHeight,before,after:top.getBoundingClientRect().top,headings:row.querySelectorAll(':scope>strong').length,snapFirst:Boolean(document.querySelector('#templateSnapCenter').compareDocumentPosition(document.querySelector('#templateFieldToolbox'))&Node.DOCUMENT_POSITION_FOLLOWING),removeFirst:Boolean(document.querySelector('#removeTemplateField').compareDocumentPosition(document.querySelector('#templateFieldToolbox'))&Node.DOCUMENT_POSITION_FOLLOWING),role:row.getAttribute('role'),fontWidth:panel.querySelector('[aria-label="Font"]').getBoundingClientRect().width};});
assert.ok(layout.tools>=layout.width-24);assert.ok(layout.toolbox>=layout.width-24);assert.ok(layout.fontWidth>=layout.width-28);assert.equal(layout.overflow,false);assert.equal(layout.before,layout.after);assert.equal(layout.headings,0);assert.ok(layout.snapFirst&&layout.removeFirst);assert.equal(layout.role,'region');if(width===390)assert.equal(layout.scroll,true);
  }
  await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(80);
  const geometry=await page.locator('#templateCanvasStage').boundingBox();
  await page.locator('[data-field-key="customText"]').click();await page.mouse.click(geometry.x+geometry.width/2,geometry.y+40);
  const centered=await page.evaluate(()=>{const field=templateDraft.fields.find(f=>f.id===selectedTemplateFieldId);return {x:field.x,width:field.width,canvas:templateDraft.background.width};});assert.equal(centered.x+centered.width/2,centered.canvas/2);
  assert.equal(await page.locator('#templateCenterGuide').isVisible(),true);
  let valueRect=await page.locator('.editor-field.selected').boundingBox();await page.mouse.move(valueRect.x+valueRect.width/2,valueRect.y+8);await page.mouse.down();await page.mouse.move(valueRect.x+valueRect.width/2+40,valueRect.y+8,{steps:5});await page.mouse.up();
  assert.notEqual(await page.evaluate(()=>templateDraft.fields.find(f=>f.id===selectedTemplateFieldId).x),centered.x);
  valueRect=await page.locator('.editor-field.selected').boundingBox();await page.mouse.move(valueRect.x+valueRect.width/2,valueRect.y+8);await page.mouse.down();await page.mouse.move(geometry.x+geometry.width/2+3,valueRect.y+8,{steps:5});assert.equal(await page.locator('#templateCenterGuide').isVisible(),true);await page.mouse.up();assert.equal(await page.evaluate(()=>templateDraft.fields.find(f=>f.id===selectedTemplateFieldId).x),centered.x);
  await page.getByRole('textbox',{name:'Custom text',exact:true}).fill('Centered value');await page.getByRole('textbox',{name:'Custom text',exact:true}).blur();
  await page.getByLabel('Font',{exact:true}).selectOption('Times New Roman');assert.equal(await page.evaluate(()=>templateDraft.fields.find(f=>f.id===selectedTemplateFieldId).fontFamily),'Times New Roman');
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>templateDraft.fields.find(f=>f.id===selectedTemplateFieldId).fontFamily),'Georgia');await page.getByRole('button',{name:'Redo',exact:true}).click();
  const customFieldId=await page.evaluate(()=>selectedTemplateFieldId);
  await page.keyboard.press('Escape');
  const dateFieldId=await page.evaluate(()=>templateDraft.fields.find(f=>f.key==='eventDate').id),timeFieldId=await page.evaluate(()=>templateDraft.fields.find(f=>f.key==='eventTime').id);
  await page.locator(`[data-field-id="${dateFieldId}"]`).click();assert.equal(await page.getByLabel('Font',{exact:true}).isVisible(),true);assert.equal(await page.getByLabel('Font',{exact:true}).inputValue(),'Georgia');
  await page.getByLabel('Text color hex',{exact:true}).fill('#335577');
  await page.locator(`[data-field-id="${timeFieldId}"]`).click();assert.equal(await page.getByLabel('Font',{exact:true}).isVisible(),true);assert.equal(await page.evaluate(id=>templateDraft.fields.find(f=>f.id===id).color,dateFieldId),'#335577');
  for(let n=0;n<3;n++){await page.keyboard.press('Escape');await page.locator(`[data-field-id="${customFieldId}"]`).click();assert.equal(await page.getByLabel('Font',{exact:true}).isVisible(),true);assert.equal(await page.getByLabel('Font',{exact:true}).inputValue(),'Times New Roman');}
  await page.screenshot({path:'/tmp/invitation-workspace.png'});await page.locator('#removeTemplateField').click();
  const logo=Buffer.from((await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=40;const ctx=canvas.getContext('2d');ctx.fillStyle='#ee3322';ctx.fillRect(4,4,72,32);return canvas.toDataURL('image/png');})).split(',')[1],'base64');
  const originalBackground=await page.evaluate(()=>templateDraft.background.url);
  await page.locator('#invitationImageFile').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:logo});await page.waitForFunction(()=>templateDraft.fields.some(field=>field.type==='image')&&!document.querySelector('#addInvitationImage').disabled);
  const imageId=await page.evaluate(()=>templateDraft.fields.find(field=>field.type==='image').id);await page.waitForFunction(id=>{const image=document.querySelector(`[data-field-id="${id}"] img`);return image?.complete&&image.naturalWidth>0;},imageId);
  assert.equal(await page.evaluate(()=>templateDraft.background.url),originalBackground);await page.getByLabel('Width',{exact:true}).fill('150');assert.equal(await page.getByLabel('Height',{exact:true}).inputValue(),'75');
  const imageRect=await page.locator(`[data-field-id="${imageId}"]`).boundingBox();await page.mouse.move(imageRect.x+imageRect.width-5,imageRect.y+imageRect.height-5);await page.mouse.down();await page.mouse.move(imageRect.x+imageRect.width+25,imageRect.y+imageRect.height+10,{steps:5});await page.mouse.up();assert.equal(await page.evaluate(id=>{const field=templateDraft.fields.find(f=>f.id===id);return field.width/field.height;},imageId),2);
  await page.getByLabel('Width',{exact:true}).fill('160');await page.getByLabel('X',{exact:true}).fill('20');await page.getByLabel('Y',{exact:true}).fill('20');
  await page.locator('#previewEditedTemplateButton').click();await page.locator('#invitationPreviewDialog').waitFor({state:'visible'});const imagePixel=await page.locator('#invitationCanvas').evaluate(canvas=>[...canvas.getContext('2d').getImageData(100,60,1,1).data]);assert.ok(imagePixel[0]>200&&imagePixel[1]<80&&imagePixel[2]<80);await page.locator('#invitationPreviewDialog .modal-close').click();
  const savedField=await page.evaluate(()=>{const field=templateDraft.fields.find(f=>f.key==='rsvpBy');templateDraft.fields=templateDraft.fields.filter(f=>f!==field);renderEditorFields();return field;});
  await page.locator('#saveTemplateButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(await page.locator('#templateEditorError').textContent(),'');assert.equal(state.invitationTemplates.length,2);assert.equal(await page.locator('[data-field-key="rsvpBy"]').evaluate(element=>element.classList.contains('template-required-missing')),true);
  await page.evaluate(field=>{templateDraft.fields.push(field);renderEditorFields();},savedField);await page.locator('#saveTemplateButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  assert.equal(state.invitationTemplates.length,2);const savedCopy=state.invitationTemplates.find(t=>t.eventId==='thanksgiving');assert.ok(savedCopy);assert.notEqual(savedCopy.background.url,sourceLayout.background.url);assert.deepEqual(state.invitationTemplates.find(t=>t.id===sourceLayout.id),sourceLayout);
  await page.locator('#replaceTemplateBackground').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:artwork});await page.waitForFunction(previous=>templateDraft.background.url!==previous,savedCopy.background.url);assert.equal(state.invitationTemplates.find(t=>t.id===savedCopy.id).background.url,savedCopy.background.url,'artwork replacement must remain a draft until validated Save');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#invitationEditorDialog .modal-close').click();await page.evaluate(()=>showGatheringsHome());await page.locator('#manageGatherings').click();await page.locator('#managedGathering').selectOption(JSON.stringify(['thanksgiving','2099-11-25']));await page.locator('#managedEventTime').fill('');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>appState.events.thanksgiving.eventTime==='');await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();await page.evaluate(()=>enterEvent('thanksgiving'));await page.evaluate(()=>closeHostDialogs());await page.evaluate(()=>{if(!document.querySelector('#invitationTemplatesDialog').open)openTemplateManager();});await page.locator(`[data-template-edit="${savedCopy.id}"]`).click();await page.waitForFunction(()=>templateDraft.fields.some(field=>field.type==='image'&&field.width===160&&field.height===80));await page.locator('#saveTemplateButton').click();await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);assert.equal(await page.locator('#templateEditorError').textContent(),'');const missingTime=await page.evaluate(()=>templateDraft.fields.find(field=>field.key==='eventTime').id);assert.equal(await page.locator(`[data-field-id="${missingTime}"]`).evaluate(element=>element.classList.contains('template-required-missing')),true);await page.locator('#invitationEditorDialog .modal-close').click();
  await page.evaluate(()=>showGatheringsHome());await page.locator('#manageGatherings').click();await page.locator('#managedGathering').selectOption(JSON.stringify(['thanksgiving','2099-11-25']));await page.locator('#managedEventTime').fill('3:00 PM');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>appState.events.thanksgiving.eventTime==='3:00 PM');await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();
  // Year-specific management and archive-only access use the actual UI and Worker.
  await page.evaluate(()=>showGatheringsHome());await page.waitForFunction(()=>!sharedSavePending&&!sharedSaveInProgress);
  const oldEvent={...structuredClone(state.events.thanksgiving),eventDate:'2025-11-25',hostNotes:'ARCHIVE HOST SECRET'};
  state.gatheringHistory={thanksgiving:{'2025-11-25':{eventId:'thanksgiving',date:'2025-11-25',name:'Old Thanksgiving',event:oldEvent,accounts:[structuredClone(state.accounts[0])]}}};sha++;
  await page.evaluate(()=>loadSharedState());await page.locator('#manageGatherings').click();
  await page.locator('#managedGathering').selectOption(JSON.stringify(['thanksgiving','2025-11-25']));
  await page.locator('#managedGatheringName').fill('Thanksgiving Memories');await page.locator('[data-manage-gathering="rename"]').click();
  await page.waitForFunction(()=>appState.gatheringHistory?.thanksgiving?.['2025-11-25']?.name==='Thanksgiving Memories');
  assert.equal(state.events.thanksgiving.gatheringName,'Thanksgiving');
  await page.locator('[data-manage-gathering="delete"]').click();await page.locator('#gatheringActionConfirmation').fill('DELETE');await page.locator('#gatheringActionSubmit').click();
  await page.waitForFunction(()=>document.querySelector('#gatheringActionError').textContent.includes('exact confirmation'));assert.ok(state.gatheringHistory.thanksgiving['2025-11-25']);
  await page.locator('#gatheringActionConfirmation').fill('DELETE 2025-11-25');await page.locator('#gatheringActionSubmit').click();await page.waitForFunction(()=>!document.querySelector('#confirmGatheringAction').open);
  assert.ok(!state.gatheringHistory.thanksgiving['2025-11-25']);
  await page.locator('[data-manage-gathering="restore"]').click();await page.waitForFunction(()=>Boolean(appState.gatheringHistory?.thanksgiving?.['2025-11-25']));
  await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();
  state.accounts[0].selectedEvents={thanksgiving:false,wedding:false};sha++;
  const archiveGuest=await browser.newPage();archiveGuest.on('pageerror',error=>errors.push(error.message));
  await archiveGuest.goto(base+'/#/signin/account/already-printed-qr');await archiveGuest.waitForFunction(()=>typeof startApp==='function');
  await archiveGuest.locator('#accountFirstName').fill('Casey');await archiveGuest.locator('#signInSubmit').click();await archiveGuest.locator('#accountLastName').fill('Example');await archiveGuest.locator('#signInSubmit').click();
  await archiveGuest.locator('#eventSelectionPage').waitFor({state:'visible'});
  assert.equal(await archiveGuest.locator('[data-enter-event]').count(),0);assert.equal(await archiveGuest.locator('#manageGatherings').isVisible(),false);
  const archivePosition=await archiveGuest.evaluate(()=>({archive:document.querySelector('#pastGatheringsDropdown').getBoundingClientRect().top,choices:document.querySelector('#eventSelectionChoices').getBoundingClientRect().bottom}));assert.ok(archivePosition.archive>=archivePosition.choices);
  await archiveGuest.locator('#viewPastGatherings').click();await archiveGuest.locator('#pastGatheringsList button').click();
  await archiveGuest.waitForFunction(()=>!document.querySelector('[data-archive-media-status]').textContent.includes('Loading'));
  assert.match(await archiveGuest.locator('#pastGatheringDetails').textContent(),/Thanksgiving Memories/);
  assert.ok(!await archiveGuest.evaluate(()=>JSON.stringify(appState).includes('ARCHIVE HOST SECRET')));
  await archiveGuest.close();
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
  await page.locator('#manageGatherings').click();await page.locator('#managedGathering').selectOption(JSON.stringify(['thanksgiving','2099-11-25']));
  await page.locator('#managedGatheringName').fill('Family Feast');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>appState.events.thanksgiving.gatheringName==='Family Feast');
  await page.locator('#managedGatheringName').fill('');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>document.querySelector('#managedGatheringStatus').textContent.includes('Enter a name'));assert.equal(await page.locator('#managedGatheringName').inputValue(),'');
  await page.locator('#managedGatheringName').fill('Family Feast');await page.locator('[data-manage-gathering="information"]').click();await page.waitForFunction(()=>!document.querySelector('[data-manage-gathering="information"]').disabled);await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();
  assert.match(await page.locator('[data-enter-event="thanksgiving"]').textContent(),/Family Feast/);
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});
  assert.match(await page.locator('[data-enter-event="thanksgiving"]').textContent(),/Family Feast/);assert.equal(await page.evaluate(()=>EVENT_DETAILS.thanksgiving.name),'Family Feast');assert.equal(state.events.wedding.gatheringName,'Wedding');
  await page.locator('#manageGatherings').click();await page.locator('#managedGathering').selectOption(JSON.stringify(['copy-source','2099-11-24']));await page.locator('[data-manage-gathering="cancel"]').click();await page.locator('#gatheringActionConfirmation').fill('CANCEL 2099-11-24');await page.locator('#gatheringActionSubmit').click();await page.waitForFunction(()=>!document.querySelector('#confirmGatheringAction').open);await page.locator('#manageGatheringsDialog [data-close-lifecycle]').click();
  await page.evaluate(()=>enterEvent('thanksgiving'));await page.locator('#editItemsButton').click();assert.equal(await page.locator('.element-editor-toolbar #manageGatherings').isVisible(),true);await page.locator('#editItemsButton').click();await page.evaluate(()=>showGatheringsHome());
  assert.equal(await page.locator('[data-enter-event="copy-source"]').isDisabled(),true);assert.match(await page.locator('[data-enter-event="copy-source"]').textContent(),/Cancelled/);
  // Removing all current events must not recreate the built-in defaults on reload.
  for(const [id,current] of Object.entries(state.events)){
    const now=new Date().toISOString();state.gatheringLifecycle ||= {};state.gatheringLifecycle[id] ||= {};state.gatheringLifecycle[id][current.eventDate]={status:'deleted',deletedAt:now,name:current.gatheringName,current:structuredClone(current),accounts:structuredClone(state.accounts)};
  }
  state.events={};sha++;await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.locator('#accountFirstName').fill(TEST_PASSWORD);await page.locator('#signInSubmit').click();await page.locator('#eventSelectionPage').waitFor({state:'visible'});assert.equal(await page.locator('[data-enter-event]').count(),0);
  await page.locator('#newGatheringButton').click();assert.equal(await page.locator('#newGatheringDialog').isVisible(),true);await page.locator('#newGatheringDialog').evaluate(dialog=>dialog.close());

  assert.deepEqual(errors,[]);assert.equal(state.accounts[0].qrToken,'already-printed-qr');console.log('Security/QR/editor, invitation font/fit parity, incomplete draft saves/red reminders, central information, yearly lifecycle and archive-only access pass against the real local Worker.');
 }finally{await browser.close();server.close();global.fetch=originalFetch;}
})().catch(error=>{console.error(error);process.exitCode=1;});
