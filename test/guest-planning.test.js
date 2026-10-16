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
