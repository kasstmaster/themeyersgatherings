import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('../guest-planning.js');
await import('../invitation-groups.js');
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function gatheringRsvpStatus('),source.indexOf('function showEventSelection()'));
function fixture(){
 const account={name:'Jane Smith/John Smith',invitationPeople:{wedding:{'John Smith':2}}};
 const events=Object.fromEntries(['wedding','thanksgiving','christmas','new-gathering'].map(id=>[id,{eventDate:'2026-12-01',rsvps:[]}]));
 const choices={},empty={};
 const c=vm.createContext({appState:{events},guestName:account.name,signedInPersonName:'Jane Smith',rsvpAccount:()=>account,GuestPlanning,InvitationGroups,accountSignInNames:()=>GuestPlanning.accountNames(account.name),availableEventIds:()=>Object.keys(events),EVENT_DETAILS:Object.fromEntries(Object.keys(events).map(id=>[id,{name:id}])),escapeHtml:s=>s,document:{querySelector:s=>s==='#eventSelectionChoices'?choices:empty}});
 vm.runInContext(source.slice(source.indexOf('function normalizeAccountName('),source.indexOf('function householdDisplayName('))+code,c);return {c,account,events,choices};
}
test('home status follows each person and gathering, including new gatherings',()=>{
 const {c,events}=fixture();
 for(const id of Object.keys(events)){
  assert.equal(c.gatheringRsvpStatus(id),'');
  events[id].rsvps=[{name:c.guestName,people:[{name:'Jane Smith',attending:true},{name:'John Smith',attending:false}]}];
  assert.equal(c.gatheringRsvpStatus(id),'attending');c.signedInPersonName='John Smith';
  assert.equal(c.gatheringRsvpStatus(id),'declined');c.signedInPersonName='Jane Smith';
  events[id].rsvps[0].people[0].attending=null;assert.equal(c.gatheringRsvpStatus(id),'');
 }
});
test('another invitation or account does not supply a response badge',()=>{
 const {c,events}=fixture();events.wedding.rsvps=[{name:c.guestName,people:[{name:'John Smith',attending:true}]}];
 assert.equal(c.gatheringRsvpStatus('wedding'),'');
 events.christmas.rsvps=[{name:'Other household',adults:2}];assert.equal(c.gatheringRsvpStatus('christmas'),'');
});
test('legacy count responses apply only to the first invitation',()=>{
 const {c,events}=fixture();events.wedding.rsvps=[{name:c.guestName,adults:2,children:0}];
 assert.equal(c.gatheringRsvpStatus('wedding'),'attending');events.wedding.rsvps[0].adults=0;
 assert.equal(c.gatheringRsvpStatus('wedding'),'declined');c.signedInPersonName='John Smith';assert.equal(c.gatheringRsvpStatus('wedding'),'');
});
test('home buttons show accessible check and X badges and refresh when responses change',()=>{
 const {c,events,choices}=fixture();events.wedding.rsvps=[{name:c.guestName,people:[{name:'Jane Smith',attending:true}]}];events.christmas.rsvps=[{name:c.guestName,people:[{name:'Jane Smith',attending:false}]}];
 c.renderEventSelection();assert.match(choices.innerHTML,/aria-label="RSVP: Attending">✓/);assert.match(choices.innerHTML,/aria-label="RSVP: Declined">✕/);
 const pending=choices.innerHTML.match(/<button[^>]*data-enter-event="thanksgiving"[\s\S]*?<\/button>/)[0];assert.doesNotMatch(pending,/event-selection-status/);
 events.wedding.rsvps[0].people[0].attending=false;c.renderEventSelection();assert.doesNotMatch(choices.innerHTML,/RSVP: Attending/);
});
