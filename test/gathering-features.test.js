import test from 'node:test';
import assert from 'node:assert/strict';
await import('../gathering-features.js');

test('all non-Wedding gatherings share the same RSVP behavior',()=>{
 const shared=GatheringFeatures.rsvp('thanksgiving');
 assert.strictEqual(GatheringFeatures.rsvp('christmas'),shared);
 assert.strictEqual(GatheringFeatures.rsvp('new-custom-gathering'),shared);
 assert.deepEqual(shared,{childNames:false,guestCounter:true,namedGuests:false,meals:false,contributions:true});
 assert.deepEqual(GatheringFeatures.rsvp('wedding'),{childNames:true,guestCounter:false,namedGuests:true,meals:true,contributions:false});
});

test('child-name collection ignores stale Wedding drafts in every regular gathering',()=>{
 for(const event of ['thanksgiving','christmas','new-custom-gathering'])assert.deepEqual(GatheringFeatures.childNames(event,['Tyson'],2),[]);
 assert.deepEqual(GatheringFeatures.childNames('wedding',[' Tyson '],2),['Tyson','']);
});


test('regular gathering pages use one feature definition and Wedding only overrides its differences',()=>{
 const shared=GatheringFeatures.forGathering('thanksgiving');
 for(const event of ['christmas','new-custom-gathering'])assert.strictEqual(GatheringFeatures.forGathering(event),shared);
 assert.equal(shared.menu,true);assert.equal(shared.notes,true);assert.equal(shared.weddingPages,false);
 const wedding=GatheringFeatures.forGathering('wedding');
 assert.equal(wedding.menu,false);assert.equal(wedding.notes,false);assert.equal(wedding.weddingPages,true);assert.equal(wedding.ceremonyAddresses,true);
});
