import test from 'node:test';
import assert from 'node:assert/strict';
await import('../shared-details.js');
test('editing a shared home updates matching gatherings, invitation fields, and the home variable source', () => {
  const events={thanksgiving:{homeAddress:'',addressLine1:'123 Main',addressLine2:'Town'},christmas:{homeAddress:'123 Main, Town'},wedding:{homeAddress:'Different home',churchStreet:'Ceremony'}};
  SharedDetails.setDetail(events,'thanksgiving','homeAddress','456 Oak\nNew Town');
  for(const id of ['thanksgiving','christmas']) {
    assert.equal(SharedDetails.homeAddress(events[id]),'456 Oak\nNew Town');
    assert.equal(events[id].addressLine1,'456 Oak');assert.equal(events[id].addressLine2,'New Town');
  }
  assert.equal(events.wedding.homeAddress,'Different home');assert.equal(events.wedding.churchStreet,'Ceremony');
  SharedDetails.setDetail(events,'christmas','addressLine2','Other Town');
  assert.equal(events.thanksgiving.homeAddress,'456 Oak\nOther Town');
});
test('event dates remain specific to their gathering', () => {
 const events={wedding:{eventDate:'2027-01-01'},christmas:{eventDate:'2026-12-25'}};
 SharedDetails.setDetail(events,'wedding','eventDate','2027-09-12');
 assert.equal(events.wedding.eventDate,'2027-09-12');assert.equal(events.christmas.eventDate,'2026-12-25');
});
