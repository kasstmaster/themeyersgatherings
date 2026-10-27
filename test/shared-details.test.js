import test from 'node:test';
import assert from 'node:assert/strict';
await import('../shared-details.js');
test('address edits update this gathering’s header and invitations without changing matching gatherings', () => {
  const events={thanksgiving:{homeAddress:'',addressLine1:'123 Main',addressLine2:'Town'},christmas:{homeAddress:'123 Main, Town'},wedding:{homeAddress:'Different home',churchStreet:'Ceremony'}};
  const others=structuredClone({christmas:events.christmas,wedding:events.wedding});
  SharedDetails.setDetail(events,'thanksgiving','homeAddress','456 Oak\nNew Town');
  assert.equal(SharedDetails.homeAddress(events.thanksgiving),'456 Oak\nNew Town');
  assert.equal(events.thanksgiving.addressLine1,'456 Oak');assert.equal(events.thanksgiving.addressLine2,'New Town');
  assert.deepEqual({christmas:events.christmas,wedding:events.wedding},others);
  SharedDetails.setDetail(events,'thanksgiving','addressLine2','Other Town');
  assert.equal(events.thanksgiving.homeAddress,'456 Oak\nOther Town');
  assert.deepEqual({christmas:events.christmas,wedding:events.wedding},others);
});
test('event dates remain specific to their gathering', () => {
 const events={wedding:{eventDate:'2027-01-01'},christmas:{eventDate:'2026-12-25'}};
 SharedDetails.setDetail(events,'wedding','eventDate','2027-09-12');
 assert.equal(events.wedding.eventDate,'2027-09-12');assert.equal(events.christmas.eventDate,'2026-12-25');
});
