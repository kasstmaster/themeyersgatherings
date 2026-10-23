import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
await import('../guest-planning.js');
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function peopleTotalsLabel('),source.indexOf("document.querySelector('#noResponseButton').addEventListener"));
function fixture(eventId='thanksgiving'){
 const accounts=[
  {name:'Pat Hall,Sam Hall',children:['Child Hall'],invited:true},
  {name:'Lee Smith',children:['Child Smith','Second Smith'],invited:true},
  {name:'Ava Jones',children:['Child Jones'],invited:true},
  {name:'Uninvited Person',children:['Not Invited'],invited:false}
 ];
 const state={rsvps:[
  {name:accounts[0].name,people:[{name:'Pat Hall',attending:true},{name:'Sam Hall',attending:false}],adults:1,children:1},
  {name:accounts[1].name,people:[{name:'Lee Smith',attending:false}],adults:0,children:0}
 ]};
 const context=vm.createContext({appState:{accounts},state,GuestPlanning,viewedEventId:eventId,HOST_DISPLAY_NAME:'The Host',
  invitationGroupTitle:group=>group.names.join(' / '),accountIsInvited:account=>account.invited,invitedAdultCount:account=>account.name.split(',').length,accountSignInNames:name=>name.split(','),escapeHtml:value=>value,adultCountLabel:count=>`${count} adult${count===1?'':'s'}`
 });vm.runInContext(source.slice(source.indexOf('function invitationHeadingHtml('),source.indexOf('function accountContactsHtml('))+helpers,context);return context;
}
test('summary reports adults and children separately for each status',()=>{
 const context=fixture();
 assert.deepEqual(JSON.parse(JSON.stringify(context.attendanceSummaryCounts())),{
  attending:{adults:1,children:1},notAttending:{adults:2,children:2},noResponse:{adults:1,children:1},invited:{adults:4,children:4}
 });
 assert.equal(context.peopleTotalsLabel({adults:13,children:2}),'13 adults · 2 children total');
});
test('attendance family entries use the invited layout with plain member rows',()=>{
 const context=fixture();
 const html=context.attendanceEntryHtml('Hall',2,1,'<div>Pat Hall</div><div>Sam Hall</div>');
 assert.match(html,/class="guest-entry invited-entry /);
 assert.match(html,/<strong>Hall<\/strong><span>2 adults · 1 child<\/span>/);
 assert.match(html,/class="invited-entry-names"><div>Pat Hall<\/div><div>Sam Hall<\/div>/);
});

test('shared family formatting applies to existing and newly created gatherings',()=>{
 for(const eventId of ['thanksgiving','christmas','new-custom-gathering']){
  const context=fixture(eventId);
  assert.equal(context.attendanceSummaryCounts().invited.children,4);
  assert.match(context.attendanceEntryHtml('Hall',1,0,'<div>Pat Hall</div>'),/invited-entry-heading/);
 }
});
