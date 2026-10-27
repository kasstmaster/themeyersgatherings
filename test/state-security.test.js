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
 f.state.events.wedding.rsvpDate='2000-01-01';
 const previous=InvitationGroups.merge(account,'wedding',names,1,null,{name:account.name,people:[{name:'Casey Example',attending:true,guestChoice:'no-guest',guestName:''}],adults:1,children:0,childNames:[],extraGuests:0,extraGuestNames:[],menuSelections:[{type:'adult',index:0,name:'Casey Example',meal:'Meal',customName:'',dietaryRestrictions:''}]});
 f.state.events.wedding.rsvps=[previous];const guest=await f.guest();
 const group=InvitationGroups.response(account,'wedding',names,1,previous);group.people[0].attending=false;
 const locked=GuestPlanning.lockedRsvp(InvitationGroups.response(account,'wedding',names,1,previous),group);
 const response=InvitationGroups.merge(account,'wedding',names,1,previous,locked);
 assert.equal((await f.patch(guest,[{path:['events','wedding','rsvps'],value:[response]}])).status,200);assert.equal(f.state.events.wedding.rsvps[0].people[0].attending,false);assert.equal(f.state.events.wedding.rsvps[0].savedMenuSelections[0].meal,'Meal');
});
