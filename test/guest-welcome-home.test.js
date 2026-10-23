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
 const context=vm.createContext({viewedEventId:event,GatheringFeatures,isHostView:()=>host,document:{querySelector:selector=>selector==='#rsvpForm'?form:{addEventListener:(type,callback)=>{handler=callback;}}},showEventSelection:()=>destinations.push('welcome'),showSignedInDestination:()=>destinations.push('gathering'),render:()=>destinations.push('render')});
 vm.runInContext(closeCode,context);handler();return {destinations,form};
}
test('all non-Wedding guests return to the welcome home on RSVP cancel or completion',()=>{
 for(const event of ['thanksgiving','christmas','new-gathering'])for(const saved of [false,true])for(const fromEntry of [false,true]){
  const result=close({event,saved,fromEntry});assert.deepEqual(result.destinations,['welcome']);assert.equal(result.form.dataset.fromEntry,'false');
 }
});
test('host and Wedding RSVP close behavior stays unchanged',()=>{
 assert.deepEqual(close({host:true,saved:true}).destinations,[]);
 assert.deepEqual(close({host:true,saved:true,fromEntry:true}).destinations,['gathering','render']);
 assert.deepEqual(close({event:'wedding',saved:true,fromEntry:true}).destinations,['gathering','render']);
 assert.deepEqual(close({event:'wedding',saved:false,fromEntry:true}).destinations,['welcome']);
 assert.deepEqual(close({event:'wedding',saved:true}).destinations,[]);
});
test('non-Wedding sign-in stays at welcome instead of immediately resuming a pending RSVP',()=>{
 const start=source.indexOf('  showEventSelection();\n  const action = pendingAccountAction');
 const code=source.slice(start,source.indexOf('\n});',start));
 for(const event of ['thanksgiving','christmas','new-gathering','wedding']){
  const calls=[];
  const context=vm.createContext({viewedEventId:event,GatheringFeatures,availableEventIds:()=>[event],pendingAccountAction:()=>calls.push('action'),showEventSelection:()=>calls.push('welcome')});
  vm.runInContext(code,context);
  assert.deepEqual(calls,event==='wedding'?['welcome','action']:['welcome']);
  assert.equal(context.pendingAccountAction,null);
 }
});
