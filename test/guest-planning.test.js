import test from 'node:test';
import assert from 'node:assert/strict';
await import('../guest-planning.js');
const {invitationCount,plusOnePeople,attendees}=GuestPlanning;
test('invitation quantities are per gathering, default to one, and support skipping with zero',()=>{
 const account={invitationQuantities:{wedding:3,christmas:0}};
 assert.equal(invitationCount(account,'wedding'),3);assert.equal(invitationCount(account,'christmas'),0);assert.equal(invitationCount(account,'thanksgiving'),1);
 assert.equal(invitationCount({invitationQuantities:{wedding:-1}},'wedding'),1);assert.equal(invitationCount({invitationQuantities:{wedding:1.5}},'wedding'),1);
});
test('guest allowances belong to named adults per gathering and never guess legacy assignments',()=>{
 const account={plusOnes:{wedding:2},plusOnePeople:{christmas:[' jane  smith ','Not In This Account']}};
 assert.deepEqual(plusOnePeople(account,'wedding',['Jane Smith','John Smith']),[]);
 assert.deepEqual(plusOnePeople(account,'christmas',['Jane Smith','John Smith']),['Jane Smith']);
});
test('attendance totals include guests only for attending people who named a guest',()=>{
 assert.deepEqual(attendees([{name:'Jane Smith',attending:true,guestChoice:'guest',guestName:' Alex Guest '},{name:'John Smith',attending:false,guestChoice:'guest',guestName:'Not Attending Guest'},{name:'Julie Smith',attending:true,guestChoice:'no-guest',guestName:'Old Guest'}]),['Jane Smith','Alex Guest','Julie Smith']);
});

test('RSVP totals combine households and meal choices, retaining renamed meals and counting no-meal separately',()=>{
 const totals=GuestPlanning.rsvpTotals([
  {adults:2,children:1,menuSelections:[{meal:'Beef'},{meal:'Chicken'},{meal:'none'}]},
  {adults:1,children:1,menuSelections:[{meal:'Beef'},{meal:'Kids'}]},
  {adults:1,children:0,menuSelections:[{meal:'Old option'}]},
  {adults:1,children:0,menuSelections:[{meal:''}]},
  {adults:0,children:0}
 ],['Beef','Chicken','Vegetarian','Kids','Beef','']);
 assert.deepEqual(totals,{adults:5,children:2,meals:[['Beef',2],['Chicken',1],['Vegetarian',0],['Kids',1],['Old option',1]],noMeal:1,unselected:1});
 assert.deepEqual(GuestPlanning.rsvpTotals([],['Beef']),{adults:0,children:0,meals:[['Beef',0]],noMeal:0,unselected:0});
});

test('attendance sections omit zero-person households and include individually declined members of attending families',()=>{
 const rsvps=[{name:'Host',adults:1,children:1,people:[{name:'Host',attending:true}]},
 {name:'Mixed Family',adults:1,children:0,people:[{name:'Jane Family',attending:true},{name:'John Family',attending:false}]},
 {name:'Declined Family',adults:0,children:0,people:[{name:'Declined Person',attending:false}]},
 {name:'Legacy Decline',adults:0,children:0},{name:'Children Only',adults:0,children:2}];
 const groups=GuestPlanning.attendanceGroups(rsvps);
 assert.deepEqual(groups.attending.map(rsvp=>rsvp.name),['Host','Mixed Family','Children Only']);
 assert.deepEqual(groups.notAttending,[{household:'Mixed Family',name:'John Family'},{household:'Declined Family',name:'Declined Person'},{household:'Legacy Decline',name:'Legacy Decline'}]);
 assert.deepEqual(GuestPlanning.attendanceGroups([]),{attending:[],notAttending:[]});
});
test('wedding meal editing preserves legacy child meals and supports unlimited audience-specific choices',()=>{
 const event={weddingMealOptions:['Beef','Chicken'],weddingChildMealOption:'Kids pasta'};
 assert.deepEqual(GuestPlanning.weddingMealOptions(event,'adult'),['Beef','Chicken']);
 assert.deepEqual(GuestPlanning.weddingMealOptions(event,'child'),['Beef','Chicken','Kids pasta']);
 const meals=GuestPlanning.weddingMeals(event);
 GuestPlanning.saveWeddingMeals(event,[...meals,{id:'fish',name:'Fish',audience:'Adults only'},{id:'kids',name:'Kids nuggets',audience:'Children only'}]);
 assert.deepEqual(GuestPlanning.weddingMealOptions(event,'adult'),['Beef','Chicken','Fish']);
 assert.deepEqual(GuestPlanning.weddingMealOptions(event,'child'),['Beef','Chicken','Kids pasta','Kids nuggets']);
 assert.deepEqual(GuestPlanning.weddingMealOptions(event),['Beef','Chicken','Kids pasta','Fish','Kids nuggets']);
 assert.deepEqual(event.weddingChildMealOptions,['Kids pasta','Kids nuggets']);
 GuestPlanning.saveWeddingMeals(event,[]);
 assert.deepEqual(GuestPlanning.weddingMealOptions(event,'child'),[]);
 assert.equal(event.weddingChildMealOption,'');
});
test('renaming a meal updates saved choices and an open RSVP draft without dropping deleted historical choices',()=>{
 const event={weddingMealOptions:['Beef'],weddingChildMealOption:'Kids pasta',rsvps:[{menuSelections:[{type:'adult',meal:'Beef'},{type:'child',meal:'Kids pasta'}]}]};
 const draft={menuSelections:[{type:'child',meal:'Beef'}]};
 const meals=GuestPlanning.weddingMeals(event).map(meal=>meal.name==='Beef'?{...meal,name:'Roast beef'}:meal);
 GuestPlanning.saveWeddingMeals(event,meals,[draft]);
 assert.equal(event.rsvps[0].menuSelections[0].meal,'Roast beef');assert.equal(draft.menuSelections[0].meal,'Roast beef');
 GuestPlanning.saveWeddingMeals(event,meals.filter(meal=>meal.audience!=='Children only'));
 assert.equal(event.rsvps[0].menuSelections[1].meal,'Kids pasta');assert.deepEqual(GuestPlanning.weddingMealOptions(event,'child'),['Roast beef']);
});
test('plus-one changes replace only the edited gathering and do not share mutable arrays',()=>{
 const original=['Jane Smith'];const account={plusOnePeople:{thanksgiving:original,christmas:['John Smith']},plusOnes:{thanksgiving:1,christmas:1}};
 GuestPlanning.setPlusOnePeople(account,'wedding',['Jane Smith','Jane Smith']);
 assert.deepEqual(account.plusOnePeople,{thanksgiving:['Jane Smith'],christmas:['John Smith'],wedding:['Jane Smith']});
 GuestPlanning.setPlusOnePeople(account,'wedding',[]);
 assert.deepEqual(account.plusOnes,{thanksgiving:1,christmas:1,wedding:0});assert.deepEqual(original,['Jane Smith']);
});
test('shared refresh keeps the viewer in their chosen gathering instead of following the shared default',()=>{
 const events={thanksgiving:{},wedding:{}};
 for(let i=0;i<5;i++)assert.equal(GuestPlanning.retainedEvent('wedding',events,'thanksgiving'),'wedding');
 assert.equal(GuestPlanning.retainedEvent('removed',events,'thanksgiving'),'thanksgiving');
});
