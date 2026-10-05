import test from 'node:test';
import assert from 'node:assert/strict';
await import('../wedding-party.js');
const { normalizeMembers, visiblePages } = globalThis.WeddingParty;

test('legacy party members start blank and never inherit role descriptions', () => {
  const members = normalizeMembers(['Jane Doe', { name: 'Jill Doe', title: 'Bridesmaid', description: 'Old duties' }]);
  assert.deepEqual(members.map(member => member.responsibilities), ['', '']);
  assert.ok(members.every(member => member.pages.length === 0 && !('description' in member)));
  assert.equal(new Set(members.map(member => member.id)).size, 2);
});

test('individual responsibilities and pages survive saves, role changes and reorder', () => {
  const members = normalizeMembers([
    { id: 'jane', name: 'Jane Doe', title: 'Bridesmaid', responsibilities: 'Bring flowers', pages: [{ id: 'travel', title: 'Travel', content: 'Arrive Friday' }] },
    { id: 'jill', name: 'Jill Doe', title: 'Bridesmaid', responsibilities: 'Carry rings', pages: [{ id: 'travel', title: 'Travel', content: 'Arrive Saturday' }] }
  ]);
  members[0].title = 'Matron of Honor';
  const reloaded = normalizeMembers(JSON.parse(JSON.stringify(members.toReversed())));
  assert.equal(reloaded.find(member => member.id === 'jane').responsibilities, 'Bring flowers');
  assert.equal(reloaded.find(member => member.id === 'jill').pages[0].content, 'Arrive Saturday');
  assert.equal(visiblePages(reloaded, false, 'jane')[0].content, 'Arrive Friday');
  assert.equal(visiblePages(reloaded, false, 'jill')[0].content, 'Arrive Saturday');
  assert.equal(visiblePages(reloaded, false, undefined).length, 0);
  assert.equal(visiblePages(reloaded, true).length, 2);
  assert.equal(new Set(visiblePages(reloaded, true).map(page => page.key)).size, 2);
});

test('normalization is repeatable and tolerates malformed or duplicate member pages', () => {
  const members = normalizeMembers([null, { name: 'Jane', pages: [null, { id: 'same' }, { id: 'same', content: 42 }] }, { name: 'Jill', id: 'party-member-2' }]);
  assert.deepEqual(normalizeMembers(members), members);
  assert.equal(new Set(members.map(member => member.id)).size, members.length);
  assert.equal(new Set(members[0].pages.map(page => page.id)).size, 2);
});
