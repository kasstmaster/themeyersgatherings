import test from 'node:test';
import assert from 'node:assert/strict';
await import('../gathering-history.js');
const fixture=()=>({accounts:[{name:'Jane Smith',address:'Old address',children:['Sam'],invitedEvents:{christmas:true},invitationPeople:{christmas:{'Jane Smith':1}}}],events:{christmas:{eventDate:'2025-12-25',rsvpDate:'2025-12-11',hostNotes:'Notes',homeAddress:'Old venue',gatheringColors:{gold:'#aabbcc'},items:[{id:'ham',name:'Ham',needed:1,claims:['Jane Smith'],claimGroups:{'Jane Smith':{1:1}}},{id:'custom-1',name:'Pie',claims:['Jane Smith']}],rsvps:[{name:'Jane Smith',people:[{name:'Jane Smith',attending:true}],adults:1,children:1,menuSelections:[{name:'Jane Smith',meal:'Beef',dietaryRestrictions:'No nuts'}]}]}}});
test('events archive only after their full Pacific calendar day',()=>{
 const app=fixture();assert.equal(GatheringHistory.archiveDue(app,new Date('2025-12-26T07:59:59Z')),false);
 assert.equal(GatheringHistory.archiveDue(app,new Date('2025-12-26T08:00:00Z')),true);
 assert.equal(GatheringHistory.archiveDue(app,new Date('2025-12-27T08:00:00Z')),false);
 assert.equal(app.gatheringHistory.christmas['2025-12-25'].accounts[0].address,'Old address');
});
test('snapshots survive deletions, renames, locations, notes, meal and claim changes',()=>{
 const app=fixture();GatheringHistory.archiveDue(app,new Date('2026-01-01'));
 const locked=structuredClone(app.gatheringHistory);
 app.accounts[0].name='Changed Name';app.accounts=[];app.events.christmas.rsvps=[];app.events.christmas.items[0].claims=[];app.events.christmas.homeAddress='New venue';
 GatheringHistory.archiveDue(app,new Date('2026-02-01'));assert.deepEqual(app.gatheringHistory,locked);
});
test('starting next year preserves layout but clears responses, claims and invite permissions',()=>{
 const app=fixture();const next=GatheringHistory.startNext(app,'christmas','2026-12-25',new Date('2026-01-01'));
 assert.equal(next.eventDate,'2026-12-25');assert.equal(next.rsvpDate,'2026-12-11');assert.deepEqual(next.rsvps,[]);assert.equal(next.hostNotes,'');
 assert.deepEqual(next.items[0].claimGroups,{});assert.deepEqual(app.gatheringHistory.christmas['2025-12-25'].event.items[0].claimGroups,{'Jane Smith':{1:1}});
 assert.equal(next.items.length,2);assert.equal(next.items[1].id,'custom-1');assert.equal(next.items[1].name,'Pie');assert.deepEqual(next.items[1].claims,[]);assert.deepEqual(next.items[0].claims,[]);assert.equal(next.gatheringColors.gold,'#aabbcc');assert.equal(app.accounts[0].invitedEvents.christmas,false);
 assert.equal(app.gatheringHistory.christmas['2025-12-25'].accounts[0].invitedEvents.christmas,true);
 assert.throws(()=>GatheringHistory.startNext(app,'christmas','2027-12-25',new Date('2026-01-01')),/not ended/);
 GatheringHistory.archiveDue(app,new Date('2027-01-01'));assert.equal(Object.keys(app.gatheringHistory.christmas).length,2);
});
test('stored snapshots override incoming modifications and omitted histories are retained',()=>{
 const stored=fixture();GatheringHistory.archiveDue(stored,new Date('2026-01-01'));
 const incoming=fixture();GatheringHistory.preserve(incoming,stored);
 assert.deepEqual(incoming.gatheringHistory,stored.gatheringHistory);incoming.gatheringHistory.christmas['2025-12-25'].accounts=[];
 GatheringHistory.preserve(incoming,stored);assert.equal(incoming.gatheringHistory.christmas['2025-12-25'].accounts.length,1);
});

test('future dinner plans keep reusable private options without inheriting another year selections',()=>{
 const app=fixture();app.events.christmas.sitDownMenu=[{id:'a',name:'Roast'}];app.events.christmas.dinnerPlans={2025:{type:'sit-down',selectedItems:['a']}};
 const next=GatheringHistory.startNext(app,'christmas','2026-12-25',new Date('2026-01-01'));
 assert.deepEqual(next.sitDownMenu,[{id:'a',name:'Roast'}]);assert.equal(next.dinnerPlans[2026],undefined);assert.deepEqual(app.gatheringHistory.christmas['2025-12-25'].event.dinnerPlans[2025],{type:'sit-down',selectedItems:['a']});
});

test('yearly rollover archives alcoholic drink claims and clears only the next occurrence claims',()=>{
 const app=fixture();app.events.christmas.drinksItems=[{id:'wine',name:'Wine',needed:2,claims:['Jane Smith'],claimGroups:{'Jane Smith':{1:1}}}];app.events.christmas.dinnerPlans={2025:{type:'drinks'}};
 const next=GatheringHistory.startNext(app,'christmas','2026-12-25',new Date('2026-01-01'));assert.equal(next.drinksItems[0].name,'Wine');assert.deepEqual(next.drinksItems[0].claims,[]);assert.deepEqual(next.drinksItems[0].claimGroups,{});assert.equal(next.dinnerPlans[2026],undefined);assert.deepEqual(app.gatheringHistory.christmas['2025-12-25'].event.drinksItems[0].claims,['Jane Smith']);
});
