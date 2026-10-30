import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';
import {bucket,TEST_PASSWORD} from './security-fixture.js';
import {projectState} from '../github-state-worker/state-access.js';
const initial=()=>({accounts:[{name:'Casey Example',qrToken:'existing-qr-token',children:['Child'],selectedEvents:{one:true,wedding:true},invitedEvents:{one:true},plusOnePeople:{wedding:[]}}, {name:'Other Person',qrToken:'other-token',selectedEvents:{one:true}}],events:{one:{eventDate:'2099-01-01',rsvpDate:'2098-12-01',hostNotes:'PRIVATE NOTES',brideGroomPages:[{content:'PRIVATE HOST PAGE'}],sitePages:[{id:'private',audience:'host',title:'Private',content:'HOST ONLY'}],siteText:{'#hostNotesContent':'PRIVATE NOTES'},textAppearance:{'#hostNotesContent':{parts:[{source:'PRIVATE NOTES',markup:'PRIVATE NOTES'}]}},elementAppearance:{'@group:titles':{fontSize:24}},items:[{id:'ham',name:'Ham',category:'Main Table',needed:2,unit:'item',claims:['Other Person']}],rsvps:[{name:'Other Person',people:[{name:'Other Person',attending:true}],adults:1,children:0}]},wedding:{eventDate:'2099-01-01',rsvpDate:'2098-12-01',items:[],rsvps:[],weddingMealChoices:[{id:'meal',name:'Meal',audience:'Adults and children'}]},hidden:{hostNotes:'PRIVATE OTHER GATHERING',items:[],rsvps:[]}},invitationTemplates:[{eventId:'one',fields:[{customText:'PRIVATE TEMPLATE'}]}],gatheringHome:{siteText:{title:'Welcome'}},gatheringHistory:{},savedAt:'2026-01-01'});
async function fixture(t){
 const memory=bucket(),env={HOST_PASSWORD:TEST_PASSWORD,AUTH_MIGRATION_READY:'verified-backup-v1',INVITATION_BACKGROUNDS:memory,GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'test-only',ALLOWED_ORIGIN:'https://site.test'};
 let state=initial(),sha=1,writes=0,conflict=false;
 const previous=globalThis.fetch;t.after(()=>globalThis.fetch=previous);
 globalThis.fetch=async(url,options={})=>{
  assert.match(String(url),/^https:\/\/api.github.com\/repos\/test\/private\/contents\//);
  if(options.method==='PUT'){
   const body=JSON.parse(options.body);if(conflict){conflict=false;sha++;return Response.json({message:'Conflict'},{status:409});}
   assert.equal(body.sha,String(sha));state=JSON.parse(Buffer.from(body.content,'base64').toString());sha++;writes++;return Response.json({content:{sha:String(sha)}});
  }
  return Response.json({sha:String(sha),content:Buffer.from(JSON.stringify(state)).toString('base64')});
 };
 const request=(path='',options={})=>worker.fetch(new Request('https://service.test/'+path,options),env);
 const login=async body=>{const response=await request('auth/login',{method:'POST',body:JSON.stringify(body)});return {response,...await response.json()};};
 const host=()=>login({role:'host',password:TEST_PASSWORD});
 const guest=(extra={})=>login({role:'guest',name:'Casey Example',...extra});
 const patch=(session,changes,revision=session.revision)=>request('state',{method:'PATCH',headers:{Authorization:`Bearer ${session.token}`,'If-Match':revision},body:JSON.stringify({changes})});
 return {env,memory,request,login,host,guest,patch,get state(){return state;},get writes(){return writes;},race(){conflict=true;}};
}
test('hidden first-name Host access uses the same server-only password/session rules without storing credentials',async t=>{
 const f=await fixture(t),before=structuredClone(f.state);
 const session=await f.login({role:'first-name',password:TEST_PASSWORD});
 assert.equal(session.response.status,200);assert.equal(session.role,'host');assert.ok(session.token);
 assert.ok(!JSON.stringify(session.state).includes(TEST_PASSWORD));assert.deepEqual(f.state,before);assert.equal(f.writes,0);
 for(const value of f.memory.objects.values())assert.ok(!String(value.body).includes(TEST_PASSWORD));
 assert.equal((await f.request('state',{headers:{Authorization:`Bearer ${session.token}`}})).status,200);
 f.env.HOST_PASSWORD='short';assert.equal((await f.login({role:'first-name',password:'short'})).response.status,503);
});
test('normal and long guest first names never receive a Host session or administrative data',async t=>{
 const f=await fixture(t);
 const short=await f.login({role:'first-name',password:'Casey'});assert.equal(short.response.status,200);assert.equal(short.next,'guest');assert.equal(short.token,undefined);assert.equal(short.state,undefined);
 const first='Alexandertheverylongfirstname';f.state.accounts.push({name:first+' Example',selectedEvents:{one:true}});
 const long=await f.login({role:'first-name',password:first});assert.equal(long.response.status,200);assert.equal(long.next,'guest');assert.equal(long.token,undefined);assert.equal(long.state,undefined);
 const guest=await f.login({role:'guest',name:first+' Example'});assert.equal(guest.response.status,200);assert.equal(guest.role,'guest');assert.ok(!JSON.stringify(guest.state).includes('PRIVATE'));assert.equal(f.writes,0);
});
test('page-owned Wedding Party headings expose only the member and pages authorized for that guest',async t=>{
 const f=await fixture(t),w=f.state.events.wedding;
 w.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',pages:[{id:'same',title:'Own page',content:'Own copy'}]},{id:'other',name:'Other Person',title:'Bridesmaid',pages:[{id:'same',title:'Other page',content:'PRIVATE page'}]}];
 const path=(owner)=>WeddingParty.headingPath(owner,'title');
 w.siteText={[path(['duties','casey'])]:'Own title',[path(['duties','other'])]:'PRIVATE other title',[path(['duties'])]:'PRIVATE host heading',[path(['shared-details'])]:'Party details',[path(['member-page','other','same'])]:'PRIVATE other page',[path(['member-page','casey','same'])]:'Own page title'};
 w.textAppearance={'#weddingPartyHeading':{parts:[{original:'Other Person',source:'PRIVATE',markup:'PRIVATE member override'}]}};
 w.elementAppearance={'@group:titles':{fontSize:28}};f.state.accounts.push({name:'Third Example',selectedEvents:{wedding:true}});const before=structuredClone(f.state);
 const own=await f.guest();assert.equal(own.response.status,200);assert.equal(own.state.events.wedding.siteText[path(['duties','casey'])],'Own title');assert.equal(own.state.events.wedding.siteText[path(['member-page','casey','same'])],'Own page title');assert.ok(!JSON.stringify(own.state).includes('PRIVATE'));assert.equal(own.state.events.wedding.elementAppearance['@group:titles'].fontSize,28);
 const ordinary=projectState(f.state,{role:'guest',person:'Third Example',accountId:'Third Example'});assert.deepEqual(ordinary.events.wedding.siteText,{});assert.equal(ordinary.events.wedding.elementAppearance['@group:titles'].fontSize,28);assert.deepEqual(f.state,before);assert.equal(f.writes,0);
});
test('failed hidden password candidates are rate limited and never retained as guest data or in errors',async t=>{
 const f=await fixture(t),candidate='not-the-host-password-value',before=structuredClone(f.state);
 for(let i=0;i<20;i++){
  const result=await f.login({role:'first-name',password:candidate});assert.equal(result.response.status,401);assert.ok(!JSON.stringify(result).includes(candidate));
 }
 assert.equal((await f.login({role:'first-name',password:candidate})).response.status,429);assert.deepEqual(f.state,before);assert.equal(f.writes,0);
 for(const value of f.memory.objects.values())assert.ok(!String(value.body).includes(candidate));
});
test('state is never readable or replaceable anonymously or through the former host header',async t=>{
 const f=await fixture(t);
 for(const path of ['', 'state','unknown'])for(const method of ['GET','PUT','PATCH']){const response=await f.request(path,{method,headers:{'X-Host-Password':TEST_PASSWORD},...(method==='GET'?{}:{body:JSON.stringify(initial())})});assert.ok([401,404].includes(response.status));assert.ok(!(await response.text()).includes('PRIVATE'));}
 assert.equal(f.writes,0);
 assert.equal((await f.request('auth/login',{method:'POST',body:JSON.stringify({role:'host',password:'wrong'})})).status,401);
});
test('host sign-in fails closed until the backup gate and a replacement server-only password are configured',async t=>{
 const f=await fixture(t);delete f.env.AUTH_MIGRATION_READY;assert.equal((await f.host()).response.status,503);
 f.env.AUTH_MIGRATION_READY='verified-backup-v1';f.env.HOST_PASSWORD='short';assert.equal((await f.login({role:'host',password:'short'})).response.status,503);
});
test('unchanged guest name and QR sign-in return a restricted view, never the administrative snapshot',async t=>{
 const f=await fixture(t),guest=await f.guest({qrToken:'existing-qr-token'});assert.equal(guest.response.status,200);
 const text=JSON.stringify(guest.state);assert.ok(!text.includes('PRIVATE'));assert.ok(!text.includes('HOST ONLY'));assert.ok(!text.includes('Other Person'));assert.ok(!text.includes('other-token'));assert.ok(!text.includes('existing-qr-token'));
 assert.deepEqual(Object.keys(guest.state.events),['one','wedding']);assert.equal(guest.state.events.one.items[0].claims[0],'__other_claim__');assert.equal(guest.state.events.one.elementAppearance['@group:titles'].fontSize,24);
 assert.equal((await f.guest({qrToken:'other-token'})).response.status,401);assert.equal((await f.guest({name:'Unknown Person'})).response.status,401);
 assert.equal(f.state.accounts[0].qrToken,'existing-qr-token');assert.equal(f.writes,0);
});
test('guests cannot change settings, permissions, other households, history or host integrations',async t=>{
 const f=await fixture(t),guest=await f.guest();
 for(const path of [['accounts'],['events','one','elementAppearance'],['events','hidden','items'],['gatheringHistory']])assert.equal((await f.patch(guest,[{path,value:[]}])).status,403);
 assert.equal((await f.patch(guest,[{path:['events','one','rsvps'],value:[{name:'Other Person',people:[],adults:0,children:0}]}])).status,403);
 assert.equal((await f.request('anylist-sync',{method:'POST',headers:{Authorization:`Bearer ${guest.token}`}})).status,401);
 assert.equal((await f.request('invitation-backgrounds/new',{method:'PUT',headers:{Authorization:`Bearer ${guest.token}`,'Content-Type':'image/png'},body:new Uint8Array([1])})).status,401);
 assert.equal(f.writes,0);
});
test('permitted RSVP and dish actions merge only the household data, preserving every other field',async t=>{
 const f=await fixture(t),guest=await f.guest(),before=structuredClone(f.state);
 const items=structuredClone(guest.state.events.one.items);items[0].claims.push('Casey Example');
 const own={name:'Casey Example',people:[{name:'Casey Example',attending:true}],adults:1,children:1,childNames:['Child'],extraGuests:0};
 const response=await f.patch(guest,[{path:['events','one','rsvps'],value:[own]},{path:['events','one','items'],value:items}]);assert.equal(response.status,200);
 assert.deepEqual(f.state.accounts,before.accounts);assert.deepEqual(f.state.invitationTemplates,before.invitationTemplates);assert.deepEqual(f.state.events.wedding,before.events.wedding);assert.deepEqual(f.state.events.hidden,before.events.hidden);
 assert.equal(f.state.events.one.hostNotes,before.events.one.hostNotes);assert.deepEqual(f.state.events.one.rsvps[0],before.events.one.rsvps[0]);assert.deepEqual(f.state.events.one.rsvps[1].people,own.people);assert.equal(f.state.events.one.rsvps[1].children,1);assert.deepEqual(f.state.events.one.items[0].claims,['Other Person','Casey Example']);
});
test('two stale devices and a race between read and GitHub write cannot replace newer information',async t=>{
 const f=await fixture(t),one=await f.host(),two=await f.host();
 assert.equal((await f.patch(one,[{path:['events','one','hostNotes'],value:'Newer notes'}])).status,200);
 assert.equal((await f.patch(two,[{path:['events','wedding','hostNotes'],value:'Stale device edit'}])).status,409);
 assert.equal(f.state.events.one.hostNotes,'Newer notes');assert.equal(f.state.events.wedding.hostNotes,undefined);assert.equal(f.writes,1);
 const latest=await f.host();f.race();assert.equal((await f.patch(latest,[{path:['events','one','hostNotes'],value:'Racing overwrite'}])).status,409);assert.equal(f.writes,1);assert.equal(f.state.events.one.hostNotes,'Newer notes');
});
test('missing revisions, prototype paths and expired/revoked sessions fail without writing',async t=>{
 const f=await fixture(t),host=await f.host();assert.equal((await f.request('state',{method:'PATCH',headers:{Authorization:`Bearer ${host.token}`},body:'{"changes":[]}'})).status,428);
 assert.ok((await f.patch(host,[{path:['__proto__','polluted'],value:true}])).status>=400);assert.equal({}.polluted,undefined);
 assert.equal((await f.request('auth/logout',{method:'POST',headers:{Authorization:`Bearer ${host.token}`}})).status,204);
 assert.equal((await f.request('state',{headers:{Authorization:`Bearer ${host.token}`}})).status,401);assert.equal(f.writes,0);
});
test('name-only guest identification is explicitly not proof of identity; it never grants host privileges',async t=>{
 const f=await fixture(t);const first=await f.guest(),second=await f.guest();assert.equal(first.response.status,200);assert.equal(second.response.status,200);assert.equal(first.role,'guest');assert.equal(second.role,'guest');assert.notEqual(first.token,second.token);
});
test('revoking an account’s access or removing its member invalidates its state session',async t=>{
 const f=await fixture(t),guest=await f.guest();f.state.accounts[0].selectedEvents={};
 assert.equal((await f.request('state',{headers:{Authorization:`Bearer ${guest.token}`}})).status,401);assert.equal(f.writes,0);
});
test('retired or expired sessions and failed sign-in floods do not gain administrative access',async t=>{
 const f=await fixture(t),host=await f.host();
 const session=[...f.memory.objects.values()].find(value=>JSON.parse(String(value.body)).role==='host');const data=JSON.parse(session.body);data.expires=0;session.body=JSON.stringify(data);
 assert.equal((await f.request('state',{headers:{Authorization:`Bearer ${host.token}`}})).status,401);
 for(let attempt=0;attempt<20;attempt++)assert.equal((await f.login({role:'host',password:'wrong'})).response.status,401);
 assert.equal((await f.login({role:'host',password:'wrong'})).response.status,429);assert.equal(f.writes,0);
});
test('forged other-invitation buckets and dish ownership are rejected atomically',async t=>{
 const f=await fixture(t),guest=await f.guest();
 const response={name:'Casey Example',people:[{name:'Casey Example',attending:true}],adults:1,children:0,invitationResponses:{2:{children:10}}};
 assert.equal((await f.patch(guest,[{path:['events','one','rsvps'],value:[response]}])).status,403);
 const items=structuredClone(guest.state.events.one.items);items[0].claims=['Casey Example'];
 assert.equal((await f.patch(guest,[{path:['events','one','items'],value:items}])).status,403);assert.equal(f.writes,0);
});
test('guest projection preserves public custom pages and legacy palette settings while excluding host/other-member copies',async t=>{
 const f=await fixture(t);f.state.events.one.gatheringColors={accent:'#123456',details:{}};
 f.state.events.one.sitePages=[{id:'public',nav:'weddingPartyTabs',audience:'all',title:'Public title',intro:'Public introduction',content:'Public copy'},{id:'private',nav:'brideGroomTabs',audience:'all',content:'PRIVATE host copy'}];
 f.state.events.one.siteText['#custom-page-private>h2']='PRIVATE copied heading';
 f.state.events.wedding.weddingPartyMembers=[{id:'casey',name:'Casey Example',title:'Groomsman',responsibilities:'Own responsibilities',pages:[{id:'own',title:'Own page',content:'Own copy'}]},{id:'other',name:'Other Person',title:'Bridesmaid',responsibilities:'PRIVATE other member'}];
 f.state.events.wedding.weddingPartyAttireNotes={ladies:'PRIVATE ladies note',gentlemen:'Own attire'};
 const guest=await f.guest();assert.deepEqual(guest.state.events.one.gatheringColors,{accent:'#123456',details:{}});assert.equal(guest.state.events.one.sitePages[0].title,'Public title');assert.equal(guest.state.events.one.sitePages.length,1);
 assert.equal(guest.state.events.wedding.weddingPartyMembers.length,1);assert.equal(guest.state.events.wedding.weddingPartyAttireNotes.gentlemen,'Own attire');assert.equal(guest.state.events.wedding.weddingPartyAttireNotes.ladies,undefined);assert.ok(!JSON.stringify(guest.state).includes('PRIVATE'));
});
test('deadline attendance changes reuse the existing locked RSVP rules instead of rejecting valid updates',async t=>{
 const f=await fixture(t),account=f.state.accounts[0],names=GuestPlanning.accountNames(account.name);
 f.state.events.wedding.rsvpDate='2000-01-01';account.plusOnePeople.wedding=['Casey Example'];
 const previous=InvitationGroups.merge(account,'wedding',names,1,null,{name:account.name,people:[{name:'Casey Example',attending:true,guestChoice:'guest',guestName:'Invited Guest'}],adults:2,children:0,childNames:[],extraGuests:0,extraGuestNames:[],menuSelections:[{type:'adult',index:0,name:'Casey Example',meal:'Meal',customName:'',dietaryRestrictions:''}]});
 f.state.events.wedding.rsvps=[previous];const guest=await f.guest();
 const group=InvitationGroups.response(account,'wedding',names,1,previous);group.people[0].attending=false;
 const locked=GuestPlanning.lockedRsvp(InvitationGroups.response(account,'wedding',names,1,previous),group);
 const response=InvitationGroups.merge(account,'wedding',names,1,previous,locked);
 assert.equal((await f.patch(guest,[{path:['events','wedding','rsvps'],value:[response]}])).status,200);assert.equal(f.state.events.wedding.rsvps[0].people[0].attending,false);assert.equal(f.state.events.wedding.rsvps[0].savedMenuSelections[0].meal,'Meal');
});


test('Last Name signs in suffix-free people; recognized suffixes return only a rate-limited next step',async t=>{
 const f=await fixture(t);
 f.state.accounts.push({name:'Jamie Example IV',qrToken:'four',selectedEvents:{one:true},signInAliases:[{alias:'Jay Example',name:'Jamie Example IV'}]},{name:'Jamie Example V',qrToken:'five',selectedEvents:{one:true},signInAliases:[{alias:'Jay Example',name:'Jamie Example V'}]});
 const before=structuredClone(f.state),plain=await f.guest({checkSuffix:true});assert.equal(plain.response.status,200);assert.equal(plain.person,'Casey Example');assert.ok(plain.token);
 const sessionCount=()=>[...f.memory.objects.keys()].filter(key=>key.startsWith('security-v1/sessions/')).length,count=sessionCount();
 const next=await f.login({role:'guest',name:'Jay Example',checkSuffix:true});assert.equal(next.next,'suffix');assert.deepEqual(Object.keys(next).sort(),['next','response']);assert.equal(sessionCount(),count);
 const four=await f.login({role:'guest',name:'Jay Example IV',checkSuffix:false});assert.equal(four.person,'Jamie Example IV');assert.equal(four.state.accounts[0].name,'Jamie Example IV');assert.equal(four.state.accounts[0].qrToken,undefined);
 const five=await f.login({role:'guest',name:'Jamie Example V',checkSuffix:false,qrToken:'five'});assert.equal(five.person,'Jamie Example V');
 assert.equal((await f.login({role:'guest',name:'Jamie Example',checkSuffix:true,qrToken:'existing-qr-token'})).response.status,401);
 assert.equal((await f.login({role:'guest',name:'Unknown Example',checkSuffix:true})).response.status,401);
 assert.equal((await f.login({role:'guest',name:'Jamie Example IV',qrToken:'five'})).response.status,401);
 assert.deepEqual(f.state,before);assert.equal(f.writes,0);
});

test('suffix discovery remains subject to the existing login attempt limit',async t=>{
 const f=await fixture(t);f.state.accounts[0].name='Casey Example IV';
 for(let i=0;i<20;i++)assert.equal((await f.login({role:'guest',name:'Casey Example',checkSuffix:true})).next,'suffix');
 assert.equal((await f.login({role:'guest',name:'Casey Example',checkSuffix:true})).response.status,429);
 assert.equal([...f.memory.objects.keys()].some(key=>key.startsWith('security-v1/sessions/')),false);assert.equal(f.writes,0);
});

test('a declined invitation releases only its dishes; sibling invitation data and other gatherings survive',async t=>{
 const f=await fixture(t),account=f.state.accounts[0];
 account.name='Casey Example / Jordan Example';account.invitationQuantities={one:2};account.invitationPeople={one:{'Casey Example':1,'Jordan Example':2}};
 const actor={role:'guest',accountId:account.qrToken,person:'Casey Example'};
 const item=f.state.events.one.items[0];item.needed=8;item.claims=[account.name,'Other Person'];
 InvitationGroups.setDishQuantity(item,account.name,1,2);InvitationGroups.setDishQuantity(item,account.name,2,1);
 const rsvp={name:account.name,people:[{name:'Casey Example',attending:true},{name:'Jordan Example',attending:true}],adults:2,children:1,invitationResponses:{1:{children:0,extraGuests:0,extraGuestNames:[],childNames:[],menuSelections:[],savedMenuSelections:[]},2:{children:1,extraGuests:0,extraGuestNames:[],childNames:['Child'],menuSelections:[],savedMenuSelections:[]}}};
 f.state.events.one.rsvps.push(rsvp);
 const untouched=structuredClone(f.state.events.wedding),beforeSibling=structuredClone(rsvp.invitationResponses[2]);
 const session=await f.login({role:'guest',name:'Casey Example'});assert.equal(session.response.status,200);
 const incoming=InvitationGroups.merge(account,'one',GuestPlanning.accountNames(account.name),1,rsvp,{name:account.name,people:[{name:'Casey Example',attending:false,guestChoice:'no-guest',guestName:''}],adults:0,children:0,childNames:[],extraGuests:0,extraGuestNames:[],menuSelections:[]});
 const response=await f.patch(session,[{path:['events','one','rsvps'],value:[incoming]}]);
 assert.equal(response.status,200);
 const saved=f.state.events.one.items[0];assert.equal(InvitationGroups.dishQuantity(saved,account.name,1),0);assert.equal(InvitationGroups.dishQuantity(saved,account.name,2),1);
 assert.equal(InvitationGroups.dishGroups(saved,account.name).unassigned,1);
 assert.equal(saved.claims.filter(name=>name==='Other Person').length,1);
 assert.deepEqual(f.state.events.one.rsvps.find(value=>value.name===account.name).invitationResponses[2],beforeSibling);assert.deepEqual(f.state.events.wedding,untouched);
 const projected=projectState(f.state,actor);assert.ok(!JSON.stringify(projected.events.one.items).includes('Other Person'));
});

test('invitation attribution cannot be forged to remove a sibling group; partial declines retain dishes',async t=>{
 const f=await fixture(t),account=f.state.accounts[0];account.name='Casey Example / Jordan Example';account.invitationQuantities={one:2};account.invitationPeople={one:{'Casey Example':1,'Jordan Example':2}};
 const item=f.state.events.one.items[0];item.needed=8;InvitationGroups.setDishQuantity(item,account.name,1,1);InvitationGroups.setDishQuantity(item,account.name,2,2);
 const session=await f.login({role:'guest',name:'Casey Example'}),items=structuredClone(session.state.events.one.items);items[0].claimGroups[account.name][2]=0;items[0].claims.splice(items[0].claims.indexOf(account.name),2);
 assert.equal((await f.patch(session,[{path:['events','one','items'],value:items}])).status,403);assert.equal(f.writes,0);
 // A partial decline inside a single group must not trigger server-side release.
 account.invitationPeople.one['Jordan Example']=1;
 const current=await f.login({role:'guest',name:'Casey Example'}),response={name:account.name,people:[{name:'Casey Example',attending:false,guestChoice:'no-guest',guestName:''},{name:'Jordan Example',attending:true}],adults:1,children:0,extraGuests:0};
 const before=structuredClone(f.state.events.one.items);
 assert.equal((await f.patch(current,[{path:['events','one','rsvps'],value:[response]}])).status,200);assert.deepEqual(f.state.events.one.items,before);
});

test('one RSVP can save multiple custom dishes with independent quantities and invitation ownership',async t=>{
 const f=await fixture(t),session=await f.guest(),items=structuredClone(session.state.events.one.items),before=structuredClone(f.state.events.wedding);
 for(const [id,name,quantity] of [['custom-abcd','Soup',2],['custom-efab','Bread',3]])items.push({id,name,category:'Sides',needed:quantity,unit:'item',claims:Array(quantity).fill('Casey Example'),claimGroups:{'Casey Example':{1:quantity}}});
 assert.equal((await f.patch(session,[{path:['events','one','items'],value:items}])).status,200);
 assert.deepEqual(f.state.events.one.items.slice(1).map(item=>[item.name,item.needed,item.claimGroups['Casey Example'][1]]),[['Soup',2,2],['Bread',3,3]]);
 assert.deepEqual(f.state.events.wedding,before);assert.deepEqual(f.state.events.one.items[0].claims,['Other Person']);
});

test('legacy over-capacity dishes do not block other RSVP changes or allow new overflow',async t=>{
 const f=await fixture(t),item=f.state.events.one.items[0];item.needed=1;item.claims=['Other Person','Other Person'];
 const session=await f.guest(),items=structuredClone(session.state.events.one.items);
 InvitationGroups.setDishQuantity(items[0],'Casey Example',1,0,true);
 assert.equal((await f.patch(session,[{path:['events','one','items'],value:items}])).status,200);
 assert.deepEqual(f.state.events.one.items[0].claims,['Other Person','Other Person']);
 const latest=await f.guest(),increase=structuredClone(latest.state.events.one.items);InvitationGroups.setDishQuantity(increase[0],'Casey Example',1,1,true);
 assert.equal((await f.patch(latest,[{path:['events','one','items'],value:increase}])).status,403);
});

test('potluck guests receive only aggregate public counts and sit-down menus remain private',async t=>{
 const f=await fixture(t),event=f.state.events.one;
 f.state.accounts[1].invitedEvents={one:true};f.state.accounts[1].children=['Other Child'];
 event.sitDownMenu=[{id:'private-dinner',name:'PRIVATE PREPARATION DISH',category:'Main Table'}];event.dinnerPlans={2099:{type:'potluck',selectedItems:['private-dinner']}};
 const potluck=await f.guest();assert.equal(potluck.response.status,200);
 assert.deepEqual(potluck.state.events.one.dinnerSummary,{invited:{adults:2,children:2},attending:{adults:1,children:0}});
 assert.ok(!JSON.stringify(potluck.state).includes('PRIVATE PREPARATION DISH'));assert.ok(!JSON.stringify(potluck.state).includes('private-dinner'));assert.ok(!JSON.stringify(potluck.state).includes('Other Person'));
 event.dinnerPlans[2099].type='sit-down';const sitdown=await f.guest();
 assert.equal(sitdown.state.events.one.dinnerSummary,undefined);assert.equal(sitdown.state.events.one.sitDownMenu,undefined);assert.deepEqual(sitdown.state.events.one.items,[]);
 assert.equal((await f.patch(sitdown,[{path:['events','one','dinnerPlans'],value:{2099:{type:'potluck'}}}])).status,403);
 assert.equal((await f.patch(sitdown,[{path:['events','one','items'],value:[{id:'custom-ab',name:'No',category:'Sides',needed:1,unit:'item',claims:['Casey Example']}]}])).status,403);
 const host=await f.host();assert.equal(host.state.events.one.sitDownMenu[0].name,'PRIVATE PREPARATION DISH');assert.equal(f.writes,0);
});

test('guest home projection retains public entry palette version without exposing private metadata',()=>{
 const state=initial();state.gatheringHome.entryNavyVersion=1;state.gatheringHome.privateNotes='PRIVATE HOME NOTES';const view=projectState(state,{role:'guest',accountId:'existing-qr-token',person:'Casey Example'});assert.equal(view.gatheringHome.entryNavyVersion,1);assert.equal(view.gatheringHome.siteText.title,'Welcome');assert.equal(view.gatheringHome.privateNotes,undefined);
});

test('guest projections expose banner captions with the public gathering design',()=>{
 const state=initial();state.events.one.siteBannerText='Main caption';state.events.one.rsvpBannerText='RSVP caption';const view=projectState(state,{role:'guest',accountId:'existing-qr-token',person:'Casey Example'});assert.equal(view.events.one.siteBannerText,'Main caption');assert.equal(view.events.one.rsvpBannerText,'RSVP caption');assert.equal(view.events.one.hostNotes,undefined);
});

test('None keeps all menus private, rejects guest food writes, and preserves existing claims when saving RSVP',async t=>{
 const f=await fixture(t),event=f.state.events.one;event.dinnerPlans={2099:{type:'none',selectedItems:['private-dish']}};event.sitDownMenu=[{id:'private-dish',name:'PRIVATE MENU'}];const beforeItems=structuredClone(event.items);
 const guest=await f.guest();assert.equal(guest.response.status,200);assert.equal(guest.state.events.one.dinnerPlans[2099].type,'none');assert.equal(guest.state.events.one.dinnerSummary,undefined);assert.equal(guest.state.events.one.sitDownMenu,undefined);assert.deepEqual(guest.state.events.one.items,[]);
 assert.equal((await f.patch(guest,[{path:['events','one','items'],value:[{id:'custom-ab',name:'No',category:'Sides',needed:1,unit:'item',claims:['Casey Example']}]}])).status,403);
 assert.equal((await f.patch(guest,[{path:['events','one','dinnerPlans'],value:{2099:{type:'potluck'}}}])).status,403);
 const response=[{name:'Casey Example',people:[{name:'Casey Example',attending:true}],adults:1,children:1,childNames:['Own Child']}];const saved=await f.patch(guest,[{path:['events','one','rsvps'],value:response}]);assert.equal(saved.status,200);assert.deepEqual(f.state.events.one.items,beforeItems);assert.deepEqual(f.state.events.one.dinnerPlans,event.dinnerPlans);assert.deepEqual(f.state.events.one.sitDownMenu,event.sitDownMenu);
 const host=await f.host();assert.deepEqual(host.state.events.one.items,beforeItems);assert.equal(host.state.events.one.sitDownMenu[0].name,'PRIVATE MENU');
});

test('Drinks projects and authorizes only the alcoholic-drinks menu while preserving food and other claims',async t=>{
 const f=await fixture(t),event=f.state.events.one;event.dinnerPlans={2099:{type:'drinks'}};event.drinksItems=[{id:'wine',name:'Wine',category:'Drinks',needed:3,unit:'item',claims:['Other Person']}];const food=structuredClone(event.items);
 const guest=await f.guest();assert.deepEqual(guest.state.events.one.items,[]);assert.equal(guest.state.events.one.drinksItems[0].name,'Wine');assert.deepEqual(guest.state.events.one.drinksItems[0].claims,['__other_claim__']);assert.ok(guest.state.events.one.dinnerSummary);
 assert.equal((await f.patch(guest,[{path:['events','one','items'],value:[{id:'custom-ab',name:'Food',category:'Sides',needed:1,unit:'item',claims:['Casey Example']}]}])).status,403);
 const drinks=structuredClone(guest.state.events.one.drinksItems);drinks[0].claims.push('Casey Example');assert.equal((await f.patch(guest,[{path:['events','one','drinksItems'],value:drinks}])).status,200);assert.deepEqual(f.state.events.one.items,food);assert.deepEqual(f.state.events.one.drinksItems[0].claims,['Other Person','Casey Example']);
 event.dinnerPlans[2099].type='potluck';f.state.events.one.dinnerPlans[2099].type='potluck';const potluck=await f.guest();assert.deepEqual(potluck.state.events.one.drinksItems,[]);assert.equal((await f.patch(potluck,[{path:['events','one','drinksItems'],value:drinks}])).status,403);
});
