import test from 'node:test';
import assert from 'node:assert/strict';
import '../gathering-history.js';
import worker from '../github-state-worker/worker.js';
import {bucket,TEST_PASSWORD} from './security-fixture.js';
const date=new Date('2026-10-28T20:00:00Z');
function stateFixture(){
 const account={name:'Casey Example',qrToken:'printed-qr',selectedEvents:{one:true},invitedEvents:{one:true}};
 const event={eventDate:'2026-11-25',gatheringName:'Dinner',hostNotes:'PRIVATE HOST NOTES',items:[{id:'ham',name:'Ham',claims:['Casey Example']}],rsvps:[{name:account.name,adults:1,children:0,people:[{name:account.name,attending:true}]}]};
 const app={accounts:[account,{name:'Other Person',qrToken:'other',selectedEvents:{one:true}}],events:{one:event},gatheringHistory:{one:{'2024-11-25':{eventId:'one',date:'2024-11-25',name:'Dinner 2024',event:{...structuredClone(event),eventDate:'2024-11-25'},accounts:[structuredClone(account)]},'2025-11-25':{eventId:'one',date:'2025-11-25',name:'Dinner 2025',event:{...structuredClone(event),eventDate:'2025-11-25'},accounts:[structuredClone(account)]}}}};
 return app;
}
const command=(action,date='2026-11-25',extra={})=>({action,eventId:'one',date,confirmation:`${action.toUpperCase()} ${date}`,...extra});
test('only older years enter archives; completed current-year selections move to the bottom stably',()=>{
 const app=stateFixture();app.events.past={eventDate:'2026-01-01'};app.events.old={eventDate:'2025-01-01'};app.events.future={eventDate:'2027-01-01'};
 assert.deepEqual(GatheringHistory.selection(app,['past','old','one','future'],date),['one','future','past']);
 assert.deepEqual(GatheringHistory.snapshots(app,date).map(s=>s.date),['2025-11-25','2024-11-25']);
});
test('deletion needs an exact confirmation, targets just one date and is recoverable for exactly 30 days',()=>{
 const app=stateFixture(),before=structuredClone(app);
 assert.throws(()=>GatheringHistory.manage(app,command('delete','2025-11-25',{confirmation:'DELETE'}),date),/exact confirmation/);assert.deepEqual(app,before);
 GatheringHistory.manage(app,command('delete','2025-11-25'),date);
 assert.ok(!app.gatheringHistory.one['2025-11-25']);assert.deepEqual(app.events,before.events);assert.deepEqual(app.gatheringHistory.one['2024-11-25'],before.gatheringHistory.one['2024-11-25']);
 const olderBrowser=structuredClone(app);GatheringHistory.preserve(olderBrowser,before);assert.ok(!olderBrowser.gatheringHistory.one['2025-11-25']);
 assert.equal(GatheringHistory.cleanup(app,new Date(date.getTime()+30*86400000-1)),false);
 assert.equal(GatheringHistory.cleanup(app,new Date(date.getTime()+30*86400000)),true);
 assert.ok(!JSON.stringify(app).includes('Dinner 2025'));assert.throws(()=>GatheringHistory.manage(app,command('restore','2025-11-25'),new Date(date.getTime()+31*86400000)),/not recoverable/);
});
test('restoring and renaming preserve other years and current settings',()=>{
 const app=stateFixture(),previous=structuredClone(app.events.one);
 GatheringHistory.manage(app,command('rename','2025-11-25',{name:'Our old dinner'}),date);
 assert.equal(app.gatheringHistory.one['2025-11-25'].event.gatheringName,'Our old dinner');assert.deepEqual(app.events.one,previous);
 GatheringHistory.manage(app,command('gallery','2025-11-25',{name:'https://example.test/photos'}),date);assert.equal(app.gatheringHistory.one['2025-11-25'].event.mediaGalleryUrl,'https://example.test/photos');assert.ok(!app.events.one.mediaGalleryUrl);
 assert.throws(()=>GatheringHistory.manage(app,command('gallery','2025-11-25',{name:'javascript:alert(1)'}),date),/http or https/);
 GatheringHistory.manage(app,command('delete'),date);assert.ok(!app.events.one);
 GatheringHistory.manage(app,command('restore'),new Date(date.getTime()+1000));assert.deepEqual(app.events.one,previous);
 GatheringHistory.manage(app,command('delete'),date);app.events.one={...previous,eventDate:'2027-11-25',gatheringName:'Next year'};
 GatheringHistory.manage(app,command('restore'),new Date(date.getTime()+1000));assert.equal(app.events.one.gatheringName,'Next year');assert.equal(app.gatheringHistory.one['2026-11-25'].event.eventDate,'2026-11-25');
});
test('cancelled occurrences expire after their Pacific date without an archive and keep other years',()=>{
 const app=stateFixture();GatheringHistory.manage(app,command('cancel'),date);assert.equal(app.events.one.cancelled,true);
 assert.deepEqual(GatheringHistory.selection(app,['one'],new Date('2026-11-26T07:59:59Z')),['one']);
 GatheringHistory.archiveDue(app,new Date('2026-11-26T08:00:00Z'));assert.ok(!app.events.one);assert.ok(!app.gatheringHistory.one['2026-11-25']);assert.equal(Object.keys(app.gatheringHistory.one).length,2);
});
async function fixture(t){
 let state=stateFixture(),sha=1,writes=0;const memory=bucket();
 memory.head=async key=>{const item=memory.objects.get(key);return item?{size:String(item.body).length,customMetadata:item.options?.customMetadata || {}}:null;};
 const env={HOST_PASSWORD:TEST_PASSWORD,AUTH_MIGRATION_READY:'verified-backup-v1',INVITATION_BACKGROUNDS:memory,GITHUB_REPOSITORY:'test/private',GITHUB_TOKEN:'test-only'};
 const original=globalThis.fetch;globalThis.fetch=async(url,options={})=>{
  assert.match(String(url),/^https:\/\/api.github.com\/repos\/test\/private\/contents\//);
  if(options.method==='PUT'){const input=JSON.parse(options.body);if(input.sha!==String(sha))return Response.json({},{status:409});state=JSON.parse(Buffer.from(input.content,'base64'));writes++;sha++;return Response.json({content:{sha:String(sha)}});}
  return Response.json({sha:String(sha),content:Buffer.from(JSON.stringify(state)).toString('base64')});
 };t.after(()=>globalThis.fetch=original);
 const request=(path,options={})=>worker.fetch(new Request('https://service.test'+path,options),env);
 const login=async input=>{const response=await request('/auth/login',{method:'POST',body:JSON.stringify(input)});assert.equal(response.status,200);return response.json();};
 const manage=(session,input,revision=String(sha))=>request('/gathering-management',{method:'PATCH',headers:{Authorization:`Bearer ${session.token}`,'If-Match':revision},body:JSON.stringify(input)});
 return {request,login,manage,memory,get state(){return state;},get writes(){return writes;}};
}
test('past-only guests keep their old QR/name login, see only their history, and cannot mutate archives or manage events',async t=>{
 const f=await fixture(t);f.state.accounts[0].selectedEvents.one=false;
 const guest=await f.login({role:'guest',name:'Casey Example',qrToken:'printed-qr'});
 assert.deepEqual(guest.state.events,{});assert.equal(Object.keys(guest.state.pastGatherings.one).length,2);
 assert.ok(!JSON.stringify(guest.state).includes('PRIVATE HOST NOTES'));assert.ok(!JSON.stringify(guest.state).includes('Other Person'));assert.ok(!JSON.stringify(guest.state).includes('printed-qr'));
 const resumed=await f.request('/auth/session',{method:'POST',headers:{Authorization:`Bearer ${guest.token}`},body:'{}'});assert.equal(resumed.status,200);
 const denied=await f.manage(guest,command('delete'));assert.equal(denied.status,403);assert.equal(f.writes,0);
 const mutation=await f.request('/state',{method:'PATCH',headers:{Authorization:`Bearer ${guest.token}`,'If-Match':guest.revision},body:JSON.stringify({changes:[{path:['pastGatherings','one','2025-11-25'],value:null}]})});assert.equal(mutation.status,403);
});
test('Host commands are revision protected; cancellation blocks guest writes; deleting one year does not expose trash',async t=>{
 const f=await fixture(t),host=await f.login({role:'host',password:TEST_PASSWORD}),guest=await f.login({role:'guest',name:'Casey Example'});
 const stale=await f.manage(host,command('delete'),'old');assert.equal(stale.status,409);assert.equal(f.writes,0);
 assert.equal((await f.manage(host,command('cancel'))).status,200);
 const result=await f.request('/state',{method:'PATCH',headers:{Authorization:`Bearer ${guest.token}`,'If-Match':'2'},body:JSON.stringify({changes:[{path:['events','one','rsvps'],value:[]}]})});assert.equal(result.status,403);
 assert.equal((await f.manage(host,command('delete','2025-11-25'))).status,200);
 const view=await (await f.request('/state',{headers:{Authorization:`Bearer ${guest.token}`}})).json();assert.equal(view.state.events.one.cancelled,true);assert.ok(!view.state.pastGatherings.one['2025-11-25']);assert.ok(!view.state.gatheringLifecycle);
});
test('archive media is read-only, filters tagged years, preserves legacy uploads and revokes deleted-date sessions',async t=>{
 const f=await fixture(t),guest=await f.login({role:'guest',name:'Casey Example'});
 const session=await f.request('/wedding-media/session',{method:'POST',headers:{Authorization:`Bearer ${guest.token}`},body:JSON.stringify({eventId:'one',archiveDate:'2025-11-25'})});assert.equal(session.status,200);const {token}=await session.json();
 const headers={Authorization:`Bearer ${guest.token}`,'X-Media-Session':token};
 const owner=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('printed-qr')))].map(n=>n.toString(16).padStart(2,'0')).join('');
 for(const [id,year] of [['old','2025-11-25'],['new','2026-11-25'],['legacy',null]])await f.memory.put(`wedding-media/uploads/${owner}/${id}`,'',{customMetadata:{name:id,...(year?{eventId:'one',eventDate:year}:{})}});
 const gallery=await (await f.request('/wedding-media/',{headers})).json();assert.deepEqual(gallery.items.map(i=>i.name),['old','legacy']);
 assert.equal((await f.request('/wedding-media/links',{method:'POST',headers,body:JSON.stringify({url:'https://example.test/photos'})})).status,403);
 const host=await f.login({role:'host',password:TEST_PASSWORD});await f.manage(host,command('delete','2025-11-25'));
 assert.equal((await f.request('/wedding-media/',{headers})).status,403);
});

test('deleting and restoring a cancelled occurrence retains scheduled cancellation cleanup',()=>{const app=stateFixture();GatheringHistory.manage(app,command('cancel'),date);GatheringHistory.manage(app,command('delete'),date);GatheringHistory.manage(app,command('restore'),date);assert.equal(app.events.one.cancelled,true);GatheringHistory.archiveDue(app,new Date('2026-11-26T08:00:00Z'));assert.ok(!app.events.one);assert.ok(!app.gatheringHistory.one['2026-11-25']);});
