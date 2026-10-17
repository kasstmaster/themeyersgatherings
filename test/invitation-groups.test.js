import test from 'node:test';
import assert from 'node:assert/strict';
await import('../guest-planning.js');
await import('../invitation-groups.js');
const names=['John Smith','Jane Smith','Joe Smith','Michael Jones','Sally Jones'];
const account=()=>({name:names.join('/'),invitationQuantities:{wedding:2,christmas:1},invitationPeople:{wedding:{'Michael Jones':2,'Sally Jones':2}}});
test('membership follows the person and gathering, with unassigned people on invitation one',()=>{
 const a=account();assert.deepEqual(InvitationGroups.members(a,'wedding',names,' jane  smith '),names.slice(0,3));
 assert.deepEqual(InvitationGroups.members(a,'wedding',names,'Sally Jones'),names.slice(3));
 assert.deepEqual(InvitationGroups.members(a,'christmas',names,'Sally Jones'),names);
 assert.deepEqual(InvitationGroups.members(a,'wedding',names,''),[]);
 assert.equal(InvitationGroups.assign(a,'wedding','John Smith',2),true);
 assert.equal(InvitationGroups.number(a,'wedding','John Smith'),2);assert.equal(InvitationGroups.number(a,'christmas','John Smith'),1);
 assert.equal(InvitationGroups.assign(a,'wedding','Joe Smith',0),false);
 a.invitationPeople.wedding['Sally Jones']=1;assert.equal(InvitationGroups.number(a,'wedding','Sally Jones'),1);
});
const person=name=>({name,attending:true,guestChoice:'no-guest',guestName:''});
const meal=(name,type='adult',index=0)=>({name,type,index,meal:'Beef',dietaryRestrictions:'No nuts'});
test('saving an invitation preserves every other invitation and combines host totals',()=>{
 const a=account();let rsvp=InvitationGroups.merge(a,'wedding',names,1,undefined,{name:'Household',people:names.slice(0,3).map(person),children:1,menuSelections:[...names.slice(0,3).map(name=>meal(name)),meal('Child 1','child')]});
 rsvp=InvitationGroups.merge(a,'wedding',names,2,rsvp,{name:'Household',people:names.slice(3).map(person),children:2,menuSelections:[...names.slice(3).map(name=>meal(name)),meal('Child 1','child'),meal('Child 2','child',1)]});
 assert.equal(rsvp.adults,5);assert.equal(rsvp.children,3);assert.equal(rsvp.menuSelections.length,8);
 const second=InvitationGroups.response(a,'wedding',names,2,rsvp);assert.equal(second.children,2);assert.deepEqual(second.people.map(p=>p.name),names.slice(3));assert.equal(second.menuSelections.length,4);
 const preserved=structuredClone(second);
 rsvp=InvitationGroups.merge(a,'wedding',names,1,rsvp,{name:'Household',people:names.slice(0,3).map(name=>({...person(name),attending:false})),children:0,menuSelections:[]});
 assert.equal(rsvp.adults,2);assert.equal(rsvp.children,2);
 assert.deepEqual(InvitationGroups.response(a,'wedding',names,2,rsvp).people,preserved.people);
 assert.deepEqual(InvitationGroups.response(a,'wedding',names,2,rsvp).menuSelections,preserved.menuSelections);
});
test('legacy household children stay on invitation one and combining invitation groups preserves child responses',()=>{
 const a=account(),existing={people:names.map(person),adults:5,children:2,menuSelections:[meal('Child 1','child'),meal('Child 2','child',1)]};
 assert.equal(InvitationGroups.response(a,'wedding',names,1,existing).children,2);
 assert.equal(InvitationGroups.response(a,'wedding',names,2,existing).children,0);
 const grouped=InvitationGroups.merge(a,'wedding',names,2,existing,{people:names.slice(3).map(person),children:1,menuSelections:[meal('Child 1','child')]});
 a.invitationPeople.wedding={'Michael Jones':1,'Sally Jones':1};
 const merged=InvitationGroups.response(a,'wedding',names,1,grouped);
 assert.equal(merged.children,3);assert.deepEqual(merged.menuSelections.filter(m=>m.type==='child').map(m=>m.index),[0,1,2]);
});
test('late attendance edits lock only their own invitation and retain other meals and guests',()=>{
 const a=account();const existing={name:'Household',people:[...names.map(person)],children:0,menuSelections:names.map(name=>meal(name))};
 const own=InvitationGroups.response(a,'wedding',names,2,existing);
 const locked=GuestPlanning.lockedRsvp(own,{people:own.people.map(p=>({...p,attending:false,guestName:'Changed'})),children:0});
 const result=InvitationGroups.merge(a,'wedding',names,2,existing,locked);
 assert.equal(result.adults,3);assert.deepEqual(result.menuSelections.map(m=>m.name),names.slice(0,3));
 const returned=GuestPlanning.lockedRsvp(InvitationGroups.response(a,'wedding',names,2,result),{people:own.people,children:0});
 const final=InvitationGroups.merge(a,'wedding',names,2,result,returned);
 assert.equal(final.adults,5);assert.equal(final.menuSelections.length,5);
});
test('renaming meals updates invitation child responses and locked meal archives',()=>{
 const child=()=>({type:'child',index:0,name:'Child 1',meal:'Pasta'});
 const event={weddingMealChoices:[{id:'kids',name:'Pasta',audience:'Children only'}],rsvps:[{menuSelections:[child()],savedMenuSelections:[child()],invitationResponses:{2:{children:1,menuSelections:[child()],savedMenuSelections:[child()]}}}]};
 GuestPlanning.saveWeddingMeals(event,[{id:'kids',name:'Kids pasta',audience:'Children only'}]);
 assert.equal(event.rsvps[0].savedMenuSelections[0].meal,'Kids pasta');
 assert.equal(event.rsvps[0].invitationResponses[2].menuSelections[0].meal,'Kids pasta');
 assert.equal(event.rsvps[0].invitationResponses[2].savedMenuSelections[0].meal,'Kids pasta');
});
test('merging cannot change people or adult meals outside the current invitation',()=>{
 const a=account();const existing={people:names.map(person),menuSelections:names.map(name=>meal(name)),children:0};
 const result=InvitationGroups.merge(a,'wedding',names,1,existing,{people:[...names.slice(0,3).map(person),{...person('Sally Jones'),attending:false}],children:0,menuSelections:[...names.slice(0,3).map(name=>meal(name)),{...meal('Sally Jones'),meal:'Changed'}]});
 assert.equal(result.people.find(p=>p.name==='Sally Jones').attending,true);
 assert.equal(result.menuSelections.find(m=>m.name==='Sally Jones').meal,'Beef');
 assert.equal(result.menuSelections.filter(m=>m.name==='Sally Jones').length,1);
});
