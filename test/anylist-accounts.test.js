import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMissingAccounts, accountPeople, categoriesFromRawUserData, convertCategory,
  normalizedPerson, parsePerson, syncAnyListAccounts
} from '../scripts/anylist-accounts.js';

test('converts three households in category order and collects children from note lines', () => {
  const result = convertCategory('SYSWERDA / HEIL / STEGALL - 2897 Panzl St, Muskegon MI 49444', [
    { name: 'Eric Syswerda' }, { name: 'Vandy Syswerda' }, { name: 'Danielle Syswerda' },
    { name: 'Ian Heil' }, { name: 'Lexi Heil', notes: 'Sheridan\n Avery ' }, { name: 'Vanden Stegall' }
  ]);
  assert.equal(result.account, 'Eric,Vandy,Danielle Syswerda/Ian,Lexi Heil/Vanden Stegall');
  assert.deepEqual(result.children, ['Sheridan', 'Avery']);
});

test('keeps child notes separate from adult account names and ignores the category address', () => {
  const result = convertCategory('SYLVESTRE / BENJAMIN - PO Box 89, 39 Heidt Place, Dillon SK', [
    { name: 'Buddy Sylvestre' }, { name: 'Deandra Benjamin', notes: 'Briette' }
  ]);
  assert.equal(result.account, 'Buddy Sylvestre/Deandra Benjamin');
  assert.deepEqual(result.children, ['Briette']);
  assert.doesNotMatch(result.account, /Briette|PO Box/);
});

test('converts one-person household', () => assert.equal(convertCategory('RAUDMAN', [{ name: 'Buddy Raudman' }]).account, 'Buddy Raudman'));

test('every person in a multi-household account has a sign-in name', () => {
  assert.deepEqual(
    accountPeople('Leonna,Brady Baker/Robert Pulido/Selena Fuller'),
    ['Leonna Baker', 'Brady Baker', 'Robert Pulido', 'Selena Fuller']
  );
});

test('mixed compact and full names do not borrow the final person surname', () => {
  assert.deepEqual(
    accountPeople('Leonna,Brady Baker,Robert Pulido,Selena Fuller'),
    ['Leonna Baker', 'Brady Baker', 'Robert Pulido', 'Selena Fuller']
  );
});

test('normalized people prevent spacing and case duplicates', () => {
  const state = { accounts: [{ name: 'Josh,Julie,Aiden Wickendoll', selected: false }] };
  assert.deepEqual(addMissingAccounts(state, [' josh, Julie, Aiden  WICKENDOLL ']), []);
  assert.equal(state.accounts.length, 1);
});

test('duplicate leaves enabled existing record untouched', () => {
  const original = { name: 'Josh,Julie,Aiden Wickendoll', selected: true, extra: 'preserved' };
  const state = { accounts: [original] };
  assert.deepEqual(addMissingAccounts(state, ['Josh, Julie, Aiden Wickendoll']), []);
  assert.strictEqual(state.accounts[0], original);
  assert.equal(state.accounts[0].selected, true);
});

test('ambiguous items are skipped rather than guessed', () => {
  const result = convertCategory('SMITH / JONES', [{ name: 'Prince' }, { name: 'Alex Smith' }]);
  assert.equal(result.account, 'Alex Smith');
  assert.deepEqual(result.skipped, ['Prince']);
});

test('reconstructs ordered categories and item membership from raw AnyList data', () => {
  const userData = {
    shoppingListsResponse: {
      newLists: [{
        identifier: 'address-book-id',
        name: 'Address Book',
        items: [
          { name: 'Second Smith', details: 'private note', manualSortIndex: 20, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'smith' }] },
          { name: 'Nobody Jones', manualSortIndex: 15, categoryAssignments: [] },
          { name: 'First Smith', packageSizePb: { rawPackageSize: 'One Smith' }, manualSortIndex: 10, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'smith' }] },
          { name: 'Amy Adams', manualSortIndex: 5, categoryAssignments: [{ categoryGroupId: 'people', categoryId: 'adams' }] }
        ]
      }],
      listResponses: [{
        listId: 'address-book-id',
        categoryGroupResponses: [{ categoryGroup: {
          identifier: 'people',
          categories: [
            { identifier: 'smith', categoryGroupId: 'people', name: 'SMITH - Main St', sortIndex: 20 },
            { identifier: 'adams', categoryGroupId: 'people', name: 'ADAMS', sortIndex: 10 }
          ]
        } }]
      }]
    }
  };

  const result = categoriesFromRawUserData(userData, 'address-book-id');
  assert.deepEqual(result.categories.map(category => category.name), ['ADAMS', 'SMITH - Main St']);
  assert.deepEqual(result.categories[1].items, [{ name: 'First Smith', notes: '', packageSize: 'One Smith' }, { name: 'Second Smith', notes: 'private note' }]);
  assert.equal(result.unassigned, 1);
  assert.match(JSON.stringify(result.categories), /private note/);
});

test('matches a category assignment only on the requested raw list', () => {
  const userData = {
    shoppingListsResponse: {
      newLists: [
        { identifier: 'other', items: [{ name: 'Wrong Smith', categoryAssignments: [{ categoryGroupId: 'group', categoryId: 'cat' }] }] },
        { identifier: 'target', items: [{ name: 'Right Smith', categoryAssignments: [{ categoryGroupId: 'group', categoryId: 'cat' }] }] }
      ],
      listResponses: [{ listId: 'target', categoryGroupResponses: [{ categoryGroup: {
        identifier: 'group', categories: [{ identifier: 'cat', name: 'SMITH' }]
      } }] }]
    }
  };

  const result = categoriesFromRawUserData(userData, 'target');
  assert.deepEqual(result.categories[0].items, [{ name: 'Right Smith', notes: '' }]);
});

function category(id, names, heading = 'HALL') {
  const converted = convertCategory(heading, names.map(name => ({ name })));
  return { id, ...converted };
}

test('Ben Hall IV and Sherri Hall group under the Hall surname', () => {
  const converted = category('hall-123', ['Ben Hall IV', 'Sherri Hall']);
  assert.deepEqual(converted.people, ['Ben Hall IV', 'Sherri Hall']);
  assert.deepEqual(accountPeople(converted.account), ['Ben Hall IV', 'Sherri Hall']);
  assert.equal(parsePerson('Ben Hall IV').surname, 'Hall');
  assert.equal(parsePerson('Ben Hall IV').suffix, 'IV');
});

test('Ben Hall IV and Ben Hall V remain distinct people', () => {
  assert.notEqual(normalizedPerson('Ben Hall IV'), normalizedPerson('Ben Hall V'));
});

test('John Smith Jr. groups with another Smith', () => {
  const converted = convertCategory('SMITH', [{ name: 'John Smith Jr.' }, { name: 'Jane Smith' }]);
  assert.deepEqual(accountPeople(converted.account), ['John Smith Jr.', 'Jane Smith']);
});

test('person removed updates the linked record and preserves selected', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123', anyListAnchor: 'Ben Hall IV' }], events: {} };
  const result = syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV'])]);
  assert.deepEqual(result.added, []);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].name, 'Ben Hall IV');
  assert.equal(state.accounts[0].selected, true);
});

test('person added updates the same linked record', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: false, anyListCategoryId: 'hall-123' }], events: {} };
  const updated = category('hall-123', ['Ben Hall IV', 'Sherri Hall', 'Katie Hall']);
  updated.children = ['Jamie', 'Morgan'];
  syncAnyListAccounts(state, [updated]);
  assert.equal(state.accounts.length, 1);
  assert.deepEqual(accountPeople(state.accounts[0].name), ['Ben Hall IV', 'Sherri Hall', 'Katie Hall']);
  assert.deepEqual(state.accounts[0].children, ['Jamie', 'Morgan']);
});

test('Roman numeral suffix is part of legacy anchor identity', () => {
  const state = { accounts: [{ name: 'Ben Hall V', selected: true }, { name: 'Ben Hall IV', selected: false }], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV', 'Sherri Hall'])]);
  assert.equal(state.accounts[0].anyListCategoryId, undefined);
  assert.equal(state.accounts[1].anyListCategoryId, 'hall-123');
  assert.deepEqual(accountPeople(state.accounts[1].name), ['Ben Hall IV', 'Sherri Hall']);
});

test('Jr and Sr suffixes are distinct', () => {
  assert.notEqual(normalizedPerson('Robert Smith Jr.'), normalizedPerson('Robert Smith Sr.'));
});

test('suffix punctuation is insignificant', () => {
  assert.equal(normalizedPerson('Robert Smith Jr'), normalizedPerson('Robert Smith Jr.'));
});

test('renaming during sync migrates every RSVP and claim without losing quantities', () => {
  const state = {
    accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123' }],
    events: {
      thanksgiving: { rsvps: [{ name: 'Ben Hall IV,Sherri Hall', adults: 2, children: 1 }], items: [{ claims: ['Ben Hall IV,Sherri Hall', 'Ben Hall IV,Sherri Hall', 'Other'] }] },
      christmas: { rsvps: [{ name: 'Ben Hall IV,Sherri Hall', adults: 1, children: 0 }], items: [{ claims: ['Ben Hall IV,Sherri Hall'] }] }
    }
  };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV'])]);
  assert.deepEqual(state.events.thanksgiving.rsvps, [{ name: 'Ben Hall IV', adults: 2, children: 1 }]);
  assert.deepEqual(state.events.thanksgiving.items[0].claims, ['Ben Hall IV', 'Ben Hall IV', 'Other']);
  assert.equal(state.events.christmas.rsvps[0].name, 'Ben Hall IV');
  assert.deepEqual(state.events.christmas.items[0].claims, ['Ben Hall IV']);
});

test('category ID wins when the prior anchor was removed', () => {
  const state = { accounts: [{ name: 'Ben Hall IV,Sherri Hall', selected: true, anyListCategoryId: 'hall-123', anyListAnchor: 'Ben Hall IV' }], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Sherri Hall'])]);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].name, 'Sherri Hall');
  assert.equal(state.accounts[0].selected, true);
});

test('category ID remains the same account when its visible category name changes', () => {
  const account = { name: 'Ben Hall IV,Sherri Hall', selected: true, theme: 'autumn', anyListCategoryId: 'hall-123' };
  const state = { accounts: [account], events: {} };
  syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV', 'Sherri Hall'], 'RENAMED CATEGORY')]);
  assert.equal(state.accounts.length, 1);
  assert.strictEqual(state.accounts[0], account);
  assert.equal(account.theme, 'autumn');
});

test('an ambiguous legacy match is skipped instead of changing either account', () => {
  const state = { accounts: [
    { name: 'Ben Hall IV', selected: true },
    { name: 'Ben Hall IV,Sherri Hall', selected: false }
  ], events: {} };
  const result = syncAnyListAccounts(state, [category('hall-123', ['Ben Hall IV', 'Katie Hall'])]);
  assert.deepEqual(result.skipped, ['hall-123']);
  assert.equal(state.accounts.length, 2);
  assert.ok(state.accounts.every(account => account.anyListCategoryId == null));
});


test('package-size names sync as alternate identities without adding household members', () => {
  const converted = convertCategory('HALL', [
    { name: 'Benjamin Hall IV', packageSizePb: { rawPackageSize: 'Ben Hall IV' } },
    { name: 'Sherri Hall', packageSize: '' }
  ]);
  assert.deepEqual(converted.signInAliases, [{ name: 'Benjamin Hall IV', alias: 'Ben Hall IV' }]);
  assert.deepEqual(converted.people, ['Benjamin Hall IV', 'Sherri Hall']);
  const state = { accounts: [], events: {} };
  syncAnyListAccounts(state, [{ ...converted, id: 'hall' }]);
  assert.deepEqual(state.accounts[0].signInAliases, converted.signInAliases);
  state.accounts[0].qrToken = 'keep-token';
  syncAnyListAccounts(state, [{ ...convertCategory('HALL', [{ name: 'Benjamin Hall IV', packageSize: 'Benny Hall IV' }, { name: 'Sherri Hall' }]), id: 'hall' }]);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].qrToken, 'keep-token');
  assert.deepEqual(state.accounts[0].signInAliases, [{ name: 'Benjamin Hall IV', alias: 'Benny Hall IV' }]);
  syncAnyListAccounts(state, [{ ...convertCategory('HALL', [{ name: 'Benjamin Hall IV' }, { name: 'Sherri Hall' }]), id: 'hall' }]);
  assert.deepEqual(state.accounts[0].signInAliases, []);
});


test('category addresses sync above account identity without changing access or QR tokens', () => {
  const state = { accounts: [], events: {} };
  const category = (heading) => ({ ...convertCategory(heading, [{ name: 'Steven Meyer' }]), id: 'host' });
  syncAnyListAccounts(state, [category('HOST - 221 W China Grade Loop Bldg A, Bakersfield CA')]);
  assert.equal(state.accounts[0].address, '221 W China Grade Loop Bldg A, Bakersfield CA');
  state.accounts[0].qrToken = 'keep-token';
  state.accounts[0].selectedEvents = { wedding: true };
  syncAnyListAccounts(state, [category('HOST - 10 Main St - Unit A')]);
  assert.equal(state.accounts[0].address, '10 Main St - Unit A');
  assert.equal(state.accounts[0].name, 'Steven Meyer');
  assert.equal(state.accounts[0].qrToken, 'keep-token');
  assert.equal(state.accounts[0].selectedEvents.wedding, true);
  syncAnyListAccounts(state, [category('HOST')]);
  assert.equal(state.accounts[0].address, '');
});
