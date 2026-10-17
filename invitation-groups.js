// Invitation membership is per gathering; household RSVP totals remain combined.
(() => {
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const count = (account, eventId) => Math.max(1, GuestPlanning.invitationCount(account, eventId));
  function number(account, eventId, person) {
    const entry = Object.entries(account?.invitationPeople?.[eventId] || {}).find(([name]) => normalize(name) === normalize(person));
    const value = Number(entry?.[1]);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }
  function members(account, eventId, names, person) {
    const canonical = names.find(name => normalize(name) === normalize(person));
    if (!canonical && count(account, eventId) > 1) return [];
    const selected = number(account, eventId, canonical);
    return names.filter(name => number(account, eventId, name) === selected);
  }
  function assign(account, eventId, person, value) {
    const invitation = Number(value);
    if (!Number.isSafeInteger(invitation) || invitation < 1) return false;
    account.invitationPeople = { ...(account.invitationPeople || {}), [eventId]: { ...(account.invitationPeople?.[eventId] || {}), [person]: invitation } };
    return true;
  }
  const childMeals = selections => (selections || []).filter(selection => selection.type === 'child');
  const adultMeals = selections => (selections || []).filter(selection => selection.type !== 'child');
  function childBuckets(account, eventId, existing = {}) {
    const source = existing.invitationResponses || { 1: { children: existing.children || 0, menuSelections: childMeals(existing.menuSelections), savedMenuSelections: childMeals(existing.savedMenuSelections || existing.menuSelections) } };
    const buckets = {};
    for (const [key, response] of Object.entries(source)) {
      // If a numbered group is removed, preserve its child responses on the first remaining group.
      const groups=GuestPlanning.invitationNumbers(account,eventId);
      const target = groups.includes(Number(key)) ? key : String(groups[0] || 1);
      const bucket = buckets[target] ||= { children: 0, menuSelections: [], savedMenuSelections: [] };
      const offset = bucket.children;
      const shift = selections => childMeals(selections).map(selection => ({ ...selection, index: Number(selection.index || 0) + offset, invitationNumber: Number(target) }));
      bucket.menuSelections.push(...shift(response.menuSelections));
      bucket.savedMenuSelections.push(...shift(response.savedMenuSelections || response.menuSelections));
      bucket.children += Math.max(0, Number(response.children) || 0);
    }
    return buckets;
  }
  function response(account, eventId, names, invitation, existing = {}) {
    const ownNames = names.filter(name => number(account, eventId, name) === invitation);
    const people = (existing.people || []).filter(person => ownNames.some(name => normalize(name) === normalize(person.name)));
    const identities = [...ownNames, ...people.map(person => person.guestName).filter(Boolean)].map(normalize);
    const own = selections => adultMeals(selections).filter(selection => identities.includes(normalize(selection.name)));
    const bucket = childBuckets(account, eventId, existing)[invitation] || { children: 0, menuSelections: [], savedMenuSelections: [] };
    const { invitationResponses: _responses, ...household } = existing;
    return { ...household, people, adults: GuestPlanning.attendees(people).length, children: bucket.children,
      menuSelections: [...own(existing.menuSelections), ...bucket.menuSelections],
      savedMenuSelections: [...own(existing.savedMenuSelections || existing.menuSelections), ...bucket.savedMenuSelections] };
  }
  function merge(account, eventId, names, invitation, existing, incoming) {
    existing ||= {};
    const ownNames = names.filter(name => number(account, eventId, name) === invitation);
    const ownsPerson = person => ownNames.some(name => normalize(name) === normalize(person.name));
    const ownPeople = (incoming.people || []).filter(ownsPerson);
    const identities = [...ownNames, ...(existing.people || []).filter(ownsPerson).map(person => person.guestName), ...ownPeople.map(person => person.guestName)].filter(Boolean).map(normalize);
    const others = selections => adultMeals(selections).filter(selection => !identities.includes(normalize(selection.name)));
    const people = [...(existing.people || []).filter(person => !ownsPerson(person)), ...ownPeople];
    const buckets = childBuckets(account, eventId, existing);
    buckets[invitation] = { children: incoming.children, menuSelections: childMeals(incoming.menuSelections), savedMenuSelections: childMeals(incoming.savedMenuSelections || incoming.menuSelections) };
    const childrenFor = key => Object.entries(buckets).flatMap(([id, bucket]) => (bucket[key] || []).map(selection => ({ ...selection, invitationNumber: Number(id) })));
    const attendingNames=GuestPlanning.attendees(ownPeople).map(normalize);
    const adultSelections = adultMeals(incoming.menuSelections).filter(selection=>attendingNames.includes(normalize(selection.name))).map(selection => ({ ...selection, invitationNumber: invitation }));
    const adultArchive = adultMeals(incoming.savedMenuSelections || incoming.menuSelections).filter(selection=>identities.includes(normalize(selection.name))).map(selection => ({ ...selection, invitationNumber: invitation }));
    return { ...existing, ...incoming, people, adults: GuestPlanning.attendees(people).length,
      children: Object.values(buckets).reduce((sum, bucket) => sum + (Number(bucket.children) || 0), 0), invitationResponses: buckets,
      menuSelections: [...others(existing.menuSelections), ...adultSelections, ...childrenFor('menuSelections')],
      savedMenuSelections: [...others(existing.savedMenuSelections || existing.menuSelections), ...adultArchive, ...childrenFor('savedMenuSelections')] };
  }
  function groups(account,eventId,names,rsvp) {
    return GuestPlanning.invitationNumbers(account,eventId).map((invitation,index)=>{
      const ownNames=names.filter(name=>number(account,eventId,name)===invitation);
      // Old household-only responses have no per-invitation attribution.
      // Keep their totals once rather than duplicating them across invitations.
      const projected=rsvp ? rsvp.people?.length || rsvp.invitationResponses
        ? response(account,eventId,names,invitation,rsvp)
        : index===0 ? {...rsvp} : {...rsvp,adults:0,children:0,menuSelections:[],savedMenuSelections:[],attending:null}
        : null;
      return {invitation,names:ownNames,rsvp:projected};
    });
  }
  globalThis.InvitationGroups = { groups, number, members, assign, response, merge };
})();
