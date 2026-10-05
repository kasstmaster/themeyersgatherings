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


test('responsibility editors follow role order without moving member data', () => {
  const roles = ['Officiant', 'Matron of Honor', 'Best Man', 'Bridesmaid', 'Groomsman', 'Flower Girl', 'Ring Bearer', 'Ushers'];
  const members = [
    { id: 'groom', title: 'Groomsman' },
    { id: 'bride2', title: 'Bridesmaid', responsibilities: 'Flowers', pages: [{ id: 'travel' }] },
    { id: 'usher', title: 'Ushers' },
    { id: 'best', title: 'Best Man' },
    { id: 'officiant', title: 'Officiant' },
    { id: 'bride1', title: 'Bridesmaid' },
    { id: 'matron', title: 'Matron of Honor' },
    { id: 'ring', title: 'Ring Bearer' },
    { id: 'flower', title: 'Flower Girl' },
    { id: 'other', title: '' }
  ];
  const original = structuredClone(members);
  const sorted = globalThis.WeddingParty.sortByRole(members, roles);
  assert.deepEqual(sorted.map(member => member.id), ['officiant', 'matron', 'best', 'bride2', 'bride1', 'groom', 'flower', 'ring', 'usher', 'other']);
  assert.deepEqual(members, original);
  assert.equal(sorted[3], members[1]);
  assert.deepEqual(sorted[3].pages, [{ id: 'travel' }]);
});


test('first Bride & Groom page migrates once, retaining custom pages and allowing permanent removal', () => {
  const wedding = { brideGroomContent: 'Original notes', brideGroomPages: [{ id: 'church', title: 'Church/Venue', content: 'Venue notes' }] };
  globalThis.WeddingParty.normalizeBrideGroomPages(wedding);
  assert.deepEqual(wedding.brideGroomPages.map(page => page.title), ['Bride & Groom', 'Church/Venue']);
  assert.equal(wedding.brideGroomPages[0].content, 'Original notes');
  wedding.brideGroomPages[0].title = 'Our plans';
  globalThis.WeddingParty.normalizeBrideGroomPages(wedding);
  assert.equal(wedding.brideGroomPages[0].title, 'Our plans');
  assert.equal(wedding.brideGroomPages.length, 2);
  wedding.brideGroomPages = [];
  globalThis.WeddingParty.normalizeBrideGroomPages(wedding);
  assert.deepEqual(wedding.brideGroomPages, []);
  assert.equal('brideGroomContent' in wedding, false);
});


test('retired member titles are cleared while retaining their content', () => {
  const members = normalizeMembers(['Flower Girl', 'Ring Bearer'].map((title, index) => ({
    id: `member-${index}`, name: `Person ${index}`, title, responsibilities: 'Keep these duties',
    pages: [{ id: 'travel', title: 'Travel', content: 'Keep these details' }]
  })));
  assert.deepEqual(members.map(member => member.title), ['', '']);
  assert.equal(members.length, 2);
  assert.ok(members.every(member => member.responsibilities === 'Keep these duties' && member.pages[0].content === 'Keep these details'));
  assert.deepEqual(normalizeMembers(members), members);
});
