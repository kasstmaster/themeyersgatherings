import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('../gathering-features.js');
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const closeCode=source.slice(source.indexOf("document.querySelector('#rsvpDialog').addEventListener('close',()=>{"),source.indexOf('function renderRsvpAttire()'));
function close({event='thanksgiving',host=false,saved=false,fromEntry=false}={}){
 const destinations=[],form={dataset:{saved:String(saved),fromEntry:String(fromEntry)}};
 let handler;
 const context=vm.createContext({viewedEventId:event,GatheringFeatures,SiteEditing:{resetTabSelection(){}},openRsvp:()=>destinations.push('registry'),isHostView:()=>host,document:{querySelector:selector=>selector==='#rsvpForm'?form:{scrollIntoView(){},addEventListener:(type,callback)=>{handler=callback;}}},showEventSelection:()=>destinations.push('welcome'),showSignedInDestination:()=>destinations.push('gathering'),render:()=>destinations.push('render')});
 vm.runInContext(closeCode,context);handler();return {destinations,form};
}
test('non-Wedding gathering guests return home on RSVP cancel or completion',()=>{
 for(const event of ['thanksgiving','christmas','new-gathering'])for(const saved of [false,true])for(const fromEntry of [false,true]){
  const result=close({event,saved,fromEntry});assert.deepEqual(result.destinations,['welcome']);assert.equal(result.form.dataset.fromEntry,'false');
 }
});
test('Wedding completion opens Registry for guests and hosts; cancellation keeps existing destinations',()=>{
 assert.deepEqual(close({host:true,saved:true}).destinations,[]);
 assert.deepEqual(close({host:true,saved:true,fromEntry:true}).destinations,['gathering','render']);
 assert.deepEqual(close({event:'wedding',saved:true,fromEntry:true}).destinations,['gathering','registry']);
 assert.deepEqual(close({event:'wedding',saved:false,fromEntry:true}).destinations,['welcome']);
 assert.deepEqual(close({event:'wedding',saved:true}).destinations,['gathering','registry']);
 assert.deepEqual(close({event:'wedding',saved:false}).destinations,['welcome']);
 assert.deepEqual(close({event:'wedding',host:true,saved:true}).destinations,['gathering','registry']);
});
test('guest sign-in stays at welcome for all gatherings instead of resuming a pending RSVP',()=>{
 const start=source.indexOf('  showEventSelection();\n  pendingAccountAction = null;');
 const code=source.slice(start,source.indexOf('\n});',start));
 for(const event of ['thanksgiving','christmas','new-gathering','wedding']){
  const calls=[];
  const context=vm.createContext({viewedEventId:event,GatheringFeatures,availableEventIds:()=>[event],pendingAccountAction:()=>calls.push('action'),showEventSelection:()=>calls.push('welcome')});
  vm.runInContext(code,context);
  assert.deepEqual(calls,['welcome']);
  assert.equal(context.pendingAccountAction,null);
 }
});

test('choosing any gathering opens RSVP directly, including wedding party and submitted responses',()=>{
 const code=source.slice(source.indexOf('function enterEvent('),source.indexOf('function ensureAccount('));
 for(const event of ['thanksgiving','christmas','new-gathering','wedding'])for(const host of [false,true])for(const submitted of [false,true])for(const partyMember of [false,true]){
  const calls=[];
  const context=vm.createContext({SiteEditing:{resetTabSelection(){}},appState:{events:{[event]:{}}},EVENT_DETAILS:{[event]:{}},GatheringFeatures,selectedGatheringTab:null,viewedEventId:'',state:{},isHostView:()=>host,isSignedInWeddingPartyMember:()=>partyMember,hasSubmittedInvitationRsvp:()=>submitted,showSignedInDestination:()=>calls.push('gathering'),render:()=>calls.push('render'),openRsvp:()=>calls.push('rsvp')});
  vm.runInContext(code,context);context.enterEvent(event);
  const opens=!host;
  assert.deepEqual(calls,opens?['gathering','render','rsvp']:['gathering','render']);
 }
});

test('first RSVP open applies saved tab order before the guest journey starts',()=>{
 const start=source.indexOf("  document.querySelector('#rsvpDialog').showModal();",source.indexOf('function openRsvp('));
 const code=source.slice(start,source.indexOf('  RsvpFlow.start(',start));
 for(const editing of [false,true]){
  const calls=[];const dialog={open:false,showModal(){this.open=true;calls.push('open');}};
  const c=vm.createContext({SiteEditing:{enabled:editing},document:{querySelector:()=>dialog},render:()=>{assert.equal(dialog.open,true);calls.push('render');}});
  vm.runInContext(code,c);assert.deepEqual(calls,['open','render']);
 }
});
