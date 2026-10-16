(() => {
  const normalize = value => String(value || '').trim().replace(/\s+/g,' ').toLowerCase();
  function invitationCount(account,eventId) {
    const value=account?.invitationQuantities?.[eventId];
    return value===undefined?1:Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):1;
  }
  function plusOnePeople(account,eventId,names) {
    const configured=account?.plusOnePeople?.[eventId];
    return Array.isArray(configured)?names.filter(name=>configured.some(value=>normalize(value)===normalize(name))):[];
  }
  function attendees(people) {
    return people.filter(person=>person.attending===true).flatMap(person=>[person.name,...(person.guestChoice==='guest'&&person.guestName?.trim()?[person.guestName.trim()]:[])]);
  }
  globalThis.GuestPlanning={invitationCount,plusOnePeople,attendees};
})();
