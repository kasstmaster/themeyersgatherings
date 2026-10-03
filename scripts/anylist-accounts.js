function clean(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function key(value) { return clean(value).toLocaleLowerCase('en-US'); }

// This intentionally enumerates the supported Roman numerals instead of accepting
// arbitrary strings made from Roman-numeral letters (for example, "Liv").
const GENERATIONAL_SUFFIX = /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;

function canonicalSuffix(value) {
  const suffix = clean(value).replace(/\.$/, '');
  return /^(?:jr|sr)$/i.test(suffix) ? suffix.toLocaleLowerCase('en-US') : suffix.toUpperCase();
}

/** Parse a conventional full name without mistaking a generational suffix for its surname. */
export function parsePerson(value) {
  const fullName = clean(value);
  const words = fullName.split(' ').filter(Boolean);
  if (words.length < 2) return null;
  const hasSuffix = words.length > 2 && GENERATIONAL_SUFFIX.test(words.at(-1));
  const suffix = hasSuffix ? canonicalSuffix(words.pop()) : '';
  const surname = words.pop();
  const givenNames = words.join(' ');
  if (!givenNames || !surname) return null;
  return { givenNames, surname, suffix, fullName };
}

export function normalizedPerson(value) {
  const person = parsePerson(value);
  return person ? [key(person.givenNames), key(person.surname), canonicalSuffix(person.suffix)].join('\0') : '';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return [...value.values()];
  return value && typeof value === 'object' ? Object.values(value) : [];
}

function bySortIndex(left, right) {
  const leftSortIndex = left.value?.sortIndex ?? left.value?.manualSortIndex;
  const rightSortIndex = right.value?.sortIndex ?? right.value?.manualSortIndex;
  const leftIndex = Number.isFinite(leftSortIndex) ? leftSortIndex : Number.POSITIVE_INFINITY;
  const rightIndex = Number.isFinite(rightSortIndex) ? rightSortIndex : Number.POSITIVE_INFINITY;
  return leftIndex - rightIndex || left.index - right.index;
}

function sorted(values) {
  return asArray(values).map((value, index) => ({ value, index })).sort(bySortIndex).map(({ value }) => value);
}

function sortedItems(rawList) {
  const items = asArray(rawList?.items);
  if (rawList?.listItemSortOrder === 1) {
    return items.map((value, index) => ({ value, index })).sort((left, right) =>
      clean(left.value?.name).localeCompare(clean(right.value?.name), 'en-US', { sensitivity: 'base' }) || left.index - right.index
    ).map(({ value }) => value);
  }
  return sorted(items);
}

/** Reconstruct category membership from decoded protobuf fields omitted by the public wrappers. */
export function categoriesFromRawUserData(userData, listId) {
  const shoppingLists = userData?.shoppingListsResponse;
  const rawList = [...asArray(shoppingLists?.newLists), ...asArray(shoppingLists?.modifiedLists)]
    .find(list => String(list?.identifier) === String(listId));
  if (!rawList) throw new Error(`Raw AnyList shopping list ${listId} was not found.`);
  const listResponse = asArray(shoppingLists?.listResponses).find(response => String(response?.listId) === String(listId));
  if (!listResponse) throw new Error(`Raw AnyList category response for list ${listId} was not found.`);

  const groups = sorted(listResponse.categoryGroupResponses?.map(response => response?.categoryGroup).filter(Boolean));
  const categories = groups.flatMap(group => sorted(group.categories).map(category => ({
    id: category?.identifier, groupId: category?.categoryGroupId ?? group?.identifier,
    name: clean(category?.name), sortIndex: category?.sortIndex, items: []
  }))).filter(category => category.id != null && category.name);
  const categoryByAssignment = new Map(categories.map(category => [`${category.groupId ?? ''}\0${category.id}`, category]));
  const categoryById = new Map(categories.map(category => [String(category.id), category]));
  let unassigned = 0;
  for (const item of sortedItems(rawList)) {
    let assigned = false;
    for (const assignment of asArray(item?.categoryAssignments)) {
      const compositeKey = `${assignment?.categoryGroupId ?? ''}\0${assignment?.categoryId}`;
      const category = categoryByAssignment.get(compositeKey)
        ?? (assignment?.categoryGroupId == null ? categoryById.get(String(assignment?.categoryId)) : undefined);
      if (!category) continue;
      // In the Address Book, each non-empty note line is the name of a child in
      // this household. Keep it separate from the adult's item name so children
      // are displayed and counted without becoming sign-in identities.
      category.items.push({ name: item?.name, notes: item?.details ?? item?.notes ?? '' });
      assigned = true;
    }
    if (!assigned) unassigned += 1;
  }
  return { rawList, listResponse, groups, categories, unassigned };
}

export function categoryHouseholds(categoryName) {
  return clean(categoryName).split(/\s+-\s+/, 1)[0].split('/').map(clean).filter(Boolean);
}

export function convertCategory(categoryName, items) {
  const householdNames = categoryHouseholds(categoryName);
  const householdOrder = new Map(householdNames.map((lastName, index) => [key(lastName), index]));
  const households = new Map();
  const skipped = [];
  const orderedPeople = [];
  const children = [];
  const childKeys = new Set();
  for (const item of items) {
    const fullName = clean(item?.name);
    const person = parsePerson(fullName);
    if (!person || /[,/]/.test(person.givenNames)) { skipped.push(fullName || '(unnamed item)'); continue; }
    const surnameKey = key(person.surname);
    if (!households.has(surnameKey)) households.set(surnameKey, {
      lastName: person.surname,
      people: [],
      headingIndex: householdOrder.get(surnameKey) ?? Number.POSITIVE_INFINITY,
      discoveredIndex: households.size
    });
    households.get(surnameKey).people.push(person);
    orderedPeople.push(person.fullName);
    String(item?.notes ?? '').split(/\r?\n/).map(clean).filter(Boolean).forEach(child => {
      const childKey = key(child);
      if (childKeys.has(childKey)) return;
      childKeys.add(childKey);
      children.push(child);
    });
  }
  // The heading remains only an ordering hint. Membership and surnames come from
  // the people, so renaming an AnyList category cannot change its identity.
  const populated = [...households.values()].sort((left, right) =>
    left.headingIndex - right.headingIndex || left.discoveredIndex - right.discoveredIndex);
  const account = populated.length ? populated.map(({ lastName, people }) => {
    // Suffix-bearing names use an explicit full-name list; the legacy compact form cannot
    // otherwise say which household member owns the suffix.
    if (people.some(person => person.suffix)) return people.map(person => person.fullName).join(',');
    return `${people.map(person => person.givenNames).join(',')} ${lastName}`;
  }).join('/') : null;
  return { account, anchor: orderedPeople[0] || null, people: orderedPeople, children, skipped };
}

/** Expand both legacy compact households and explicit comma-separated full names. */
export function accountPeople(accountName) {
  return clean(accountName).split('/').flatMap(part => {
    const entries = clean(part).split(',').map(clean).filter(Boolean);
    if (!entries.length) return [];
    // A household may mix compact names and full names, such as
    // "Leonna,Brady Baker,Robert Pulido". A bare given name inherits the
    // surname of the next full name; already-complete names remain unchanged.
    return entries.map((entry, index) => {
      if (parsePerson(entry)) return entry;
      const nextPerson = entries.slice(index + 1).map(parsePerson).find(Boolean);
      return nextPerson ? `${entry} ${nextPerson.surname}` : '';
    }).filter(Boolean);
  });
}

export function normalizedAccountPeople(accountName) {
  return [...new Set(accountPeople(accountName).map(normalizedPerson).filter(Boolean))].sort().join('|');
}

function migrateAccountReferences(state, oldName, newName) {
  if (oldName === newName) return;
  Object.values(state.events || {}).forEach(event => {
    (event.items || []).forEach(item => { item.claims = (item.claims || []).map(name => name === oldName ? newName : name); });
    (event.rsvps || []).forEach(rsvp => { if (rsvp.name === oldName) rsvp.name = newName; });
  });
}

/** Reconcile AnyList categories into accounts, preserving all website-owned account fields. */
export function syncAnyListAccounts(state, categories) {
  const claimedIndexes = new Set();
  const added = [];
  const updated = [];
  const skipped = [];
  for (const category of categories) {
    if (!category.account || !category.anchor || category.id == null) continue;
    const categoryId = String(category.id);
    const linked = state.accounts.map((account, index) => ({ account, index }))
      .filter(({ account }) => account.anyListCategoryId != null && String(account.anyListCategoryId) === categoryId);
    if (linked.length > 1) { skipped.push(categoryId); continue; }
    let index = linked[0]?.index ?? -1;
    if (index < 0) {
      const categoryPeople = new Set(category.people.map(normalizedPerson).filter(Boolean));
      const candidates = state.accounts.map((account, candidateIndex) => {
        const people = new Set(accountPeople(account.name).map(normalizedPerson).filter(Boolean));
        const overlap = [...categoryPeople].filter(person => people.has(person)).length;
        const exact = overlap === categoryPeople.size && overlap === people.size;
        return { candidateIndex, overlap, exact };
      }).filter(candidate => !claimedIndexes.has(candidate.candidateIndex)
        && !state.accounts[candidate.candidateIndex].anyListCategoryId
        && candidate.overlap > 0);
      const exact = candidates.filter(candidate => candidate.exact);
      const bestOverlap = Math.max(0, ...candidates.map(candidate => candidate.overlap));
      const best = exact.length ? exact : candidates.filter(candidate => candidate.overlap === bestOverlap);
      if (best.length > 1) { skipped.push(categoryId); continue; }
      index = best[0]?.candidateIndex ?? -1;
    }
    if (index < 0) {
      state.accounts.push({ name: category.account, children: category.children || [], selected: false, anyListCategoryId: categoryId });
      claimedIndexes.add(state.accounts.length - 1);
      added.push(category.account);
      continue;
    }
    claimedIndexes.add(index);
    const account = state.accounts[index];
    const oldName = account.name;
    account.name = category.account;
    account.children = category.children || [];
    account.anyListCategoryId = categoryId;
    migrateAccountReferences(state, oldName, account.name);
    updated.push(account.name);
  }
  return { added, updated, skipped };
}

// Kept for callers that only have names; new sync code uses syncAnyListAccounts.
export function addMissingAccounts(state, convertedAccounts) {
  const existing = new Set(state.accounts.map(account => normalizedAccountPeople(account.name)));
  const added = [];
  for (const name of convertedAccounts) {
    const normalized = normalizedAccountPeople(name);
    if (!normalized || existing.has(normalized)) continue;
    state.accounts.push({ name, selected: false }); existing.add(normalized); added.push(name);
  }
  return added;
}
