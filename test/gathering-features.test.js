import test from 'node:test';
import assert from 'node:assert/strict';
await import('../gathering-features.js');

test('all non-Wedding gatherings share the same RSVP behavior',()=>{
 const shared=GatheringFeatures.rsvp('thanksgiving');
 assert.strictEqual(GatheringFeatures.rsvp('christmas'),shared);
 assert.strictEqual(GatheringFeatures.rsvp('new-custom-gathering'),shared);
 assert.deepEqual(shared,{childNames:true,guestCounter:true,namedGuests:false,meals:false,contributions:true});
 assert.deepEqual(GatheringFeatures.rsvp('wedding'),{childNames:true,guestCounter:false,namedGuests:true,meals:true,contributions:false});
});

test('child names are collected in every regular gathering and Wedding',()=>{
 for(const event of ['thanksgiving','christmas','new-custom-gathering'])assert.deepEqual(GatheringFeatures.childNames(event,['Tyson'],2),['Tyson','']);
 assert.deepEqual(GatheringFeatures.childNames('wedding',[' Tyson '],2),['Tyson','']);
});


test('regular gathering pages use one feature definition and Wedding only overrides its differences',()=>{
 const shared=GatheringFeatures.forGathering('thanksgiving');
 for(const event of ['christmas','new-custom-gathering'])assert.strictEqual(GatheringFeatures.forGathering(event),shared);
 assert.equal(shared.menu,true);assert.equal(shared.notes,true);assert.equal(shared.weddingPages,false);
 const wedding=GatheringFeatures.forGathering('wedding');
 assert.equal(wedding.menu,false);assert.equal(wedding.notes,false);assert.equal(wedding.weddingPages,true);assert.equal(wedding.ceremonyAddresses,true);
});

test('yearly dinner plans are independent and Wedding keeps its existing RSVP behavior',()=>{
 const event={eventDate:'2026-12-19',dinnerPlans:{2026:{type:'sit-down',selectedItems:['a']},2027:{type:'potluck',selectedItems:['b']}}};
 assert.equal(GatheringFeatures.rsvp('christmas',event).contributions,false);
 assert.deepEqual(GatheringFeatures.dinnerPlan('christmas',event),{year:'2026',type:'sit-down',selectedItems:['a']});
 assert.equal(GatheringFeatures.rsvp('christmas',{...event,eventDate:'2027-12-19'}).contributions,true);
 assert.equal(GatheringFeatures.dinnerPlan('wedding',event),null);assert.equal(GatheringFeatures.rsvp('wedding',event).meals,true);
 assert.equal(GatheringFeatures.rsvp('new-gathering',{}).contributions,true);
});

test('None disables food questions in every regular gathering without removing menus or yearly selections',()=>{
 const event={eventDate:'2026-12-19',items:[{id:'a',claims:['Existing Household']}],sitDownMenu:[{id:'b'}],dinnerPlans:{2026:{type:'none',selectedItems:['b']},2027:{type:'sit-down',selectedItems:['b']}}};const before=structuredClone(event);
 for(const id of ['thanksgiving','christmas','new-gathering']){assert.equal(GatheringFeatures.dinnerPlan(id,event).type,'none');assert.equal(GatheringFeatures.rsvp(id,event).contributions,false);assert.equal(GatheringFeatures.rsvp(id,event).childNames,true);assert.equal(GatheringFeatures.rsvp(id,event).guestCounter,true);}
 const saved=JSON.parse(JSON.stringify(event));assert.equal(GatheringFeatures.dinnerPlan('christmas',saved).type,'none');assert.equal(GatheringFeatures.dinnerPlan('christmas',{...saved,eventDate:'2027-12-19'}).type,'sit-down');assert.equal(GatheringFeatures.dinnerPlan('christmas',{...saved,eventDate:'2028-12-19'}).type,'potluck');assert.equal(GatheringFeatures.rsvp('wedding',saved).meals,true);assert.deepEqual(event,before);
});

test('Drinks reuses potluck RSVP behavior with an independent contribution menu',()=>{
 const event={eventDate:'2026-08-01',items:[{id:'food',claims:['Food Guest']}],drinksItems:[{id:'drink',claims:['Drink Guest']}],dinnerPlans:{2026:{type:'drinks'}}};
 for(const id of ['thanksgiving','christmas','new-gathering']){assert.equal(GatheringFeatures.dinnerPlan(id,event).type,'drinks');assert.equal(GatheringFeatures.rsvp(id,event).contributions,true);assert.strictEqual(GatheringFeatures.contributionItems(id,event),event.drinksItems);}
 event.dinnerPlans[2026].type='potluck';assert.strictEqual(GatheringFeatures.contributionItems('new-gathering',event),event.items);assert.equal(event.drinksItems[0].claims[0],'Drink Guest');assert.equal(GatheringFeatures.rsvp('wedding',event).meals,true);
});
