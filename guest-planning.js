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
  function attendanceGroups(rsvps) {
    const attending = rsvps.filter(rsvp => Number(rsvp.adults) + Number(rsvp.children) > 0);
    const notAttending = rsvps.flatMap(rsvp => {
      const declined = (rsvp.people || []).filter(person => !person.attending).map(person => ({ household: rsvp.name, name: person.name }));
      return declined.length ? declined : Number(rsvp.adults) + Number(rsvp.children) === 0 ? [{ household: rsvp.name, name: rsvp.name }] : [];
    });
    return { attending, notAttending };
  }
  function rsvpTotals(rsvps, mealOptions = []) {
    const meals = new Map(mealOptions.filter(Boolean).map(meal => [meal, 0]));
    let adults = 0, children = 0, noMeal = 0, unselected = 0;
    for (const rsvp of rsvps) {
      adults += Number(rsvp.adults) || 0;
      children += Number(rsvp.children) || 0;
      for (const selection of rsvp.menuSelections || []) {
        if (selection.meal === 'none') noMeal += 1;
        else if (!selection.meal) unselected += 1;
        else meals.set(selection.meal, (meals.get(selection.meal) || 0) + 1);
      }
    }
    return { adults, children, meals: [...meals], noMeal, unselected };
  }
  globalThis.GuestPlanning={invitationCount,plusOnePeople,attendees,rsvpTotals,attendanceGroups};
})();
