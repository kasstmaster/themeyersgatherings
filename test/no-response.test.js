import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function noResponseAccounts()'),source.indexOf("document.querySelector('#noResponseButton').addEventListener"));
function fixture(host=true) {
  const accounts=['Awaiting','Attending','Declined','Legacy','Unanswered draft','Other event','The Host'].map(name=>({name,invitedEvents:{thanksgiving:name!=='Other event'}}));
  const state={rsvps:[{name:'Attending',people:[{attending:true}]},{name:'Declined',people:[{attending:false}]},{name:'Legacy',adults:0,children:0},{name:'Unanswered draft',people:[{attending:null}]}]};
  const list={innerHTML:'private'};
  const context=vm.createContext({state,appState:{accounts},viewedEventId:'thanksgiving',HOST_DISPLAY_NAME:'The Host',accountIsInvited:(account,id)=>account.invitedEvents[id]===true,renderPeopleSection:(id,total,totals,html)=>{list.innerHTML=html;},peopleTotalsLabel:()=>'totals',accountPeopleTotals:()=>({adults:0,children:0}),invitedInvitationGroups:account=>[account],invitationEntryHtml:account=>account.name,isHostView:()=>host,escapeHtml:value=>value,document:{querySelector:()=>list}});
  vm.runInContext(helpers,context);
  return {context,state,list};
}
test('only invited accounts without a response appear, including unanswered drafts',()=>{
  const {context,state}=fixture();
  assert.deepEqual(Array.from(context.noResponseAccounts(),account=>account.name),['Awaiting','Unanswered draft']);
  state.rsvps.push({name:'Awaiting',people:[{attending:false}]});
  assert.deepEqual(Array.from(context.noResponseAccounts(),account=>account.name),['Unanswered draft']);
});
test('No Response lists refresh after replies and stay host-only',()=>{
  const {context,state,list}=fixture();
  context.renderNoResponseAccounts();
  assert.match(list.innerHTML,/Awaiting/);
  assert.doesNotMatch(list.innerHTML,/Declined|Attending|Other event|The Host/);
  state.rsvps.push({name:'Awaiting',people:[{attending:true}]});
  state.rsvps.find(rsvp=>rsvp.name==='Unanswered draft').people[0].attending=false;
  context.renderNoResponseAccounts();
  assert.match(list.innerHTML,/All invited accounts have responded/);
  const guest=fixture(false);guest.context.renderNoResponseAccounts();assert.equal(guest.list.innerHTML,'private');
});
