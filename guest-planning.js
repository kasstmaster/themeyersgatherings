(() => {
  const normalize = value => String(value || '').trim().replace(/\s+/g,' ').toLowerCase();
  function accountNames(accountName='') {
    return accountName.split('/').flatMap(household=>{
      const names=household.split(',').map(name=>name.trim()).filter(Boolean);
      return names.map((name,index)=>{
        if(name.split(/\s+/).length>=2)return name;
        const next=names.slice(index+1).find(candidate=>candidate.split(/\s+/).length>=2);
        if(!next)return '';
        const words=next.split(/\s+/);if(words.length>2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1)))words.pop();
        return `${name} ${words.at(-1)}`;
      }).filter(Boolean);
    });
  }
  function invitationNumbers(account,eventId) {
    const assignments=account?.invitationPeople?.[eventId] || {};
    return [...new Set(accountNames(account?.name).map(name=>{
      const value=Number(Object.entries(assignments).find(([person])=>normalize(person)===normalize(name))?.[1]);
      return Number.isSafeInteger(value)&&value>0?value:1;
    }))].sort((a,b)=>a-b);
  }
  function invitationCount(account,eventId) {
    if(account?.name)return invitationNumbers(account,eventId).length || 1;
    const value=account?.invitationQuantities?.[eventId];
    return value===undefined?1:Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):1;
  }
  function plusOnePeople(account,eventId,names) {
    const configured=account?.plusOnePeople?.[eventId];
    return Array.isArray(configured)?names.filter(name=>configured.some(value=>normalize(value)===normalize(name))):[];
  }
  function setPlusOnePeople(account, eventId, people) {
    account.plusOnePeople = { ...(account.plusOnePeople || {}), [eventId]: [...new Set(people)] };
    account.plusOnes = { ...(account.plusOnes || {}), [eventId]: account.plusOnePeople[eventId].length };
  }
  function retainedEvent(currentId, events, fallbackId) {
    return events[currentId] ? currentId : events[fallbackId] ? fallbackId : Object.keys(events)[0];
  }
  function attendees(people) {
    return people.filter(person=>person.attending===true).flatMap(person=>[person.name,...(person.guestChoice==='guest'&&person.guestName?.trim()?[person.guestName.trim()]:[])]);
  }
  function weddingMeals(event) {
    if (Array.isArray(event.weddingMealChoices)) return event.weddingMealChoices.filter(meal => meal && typeof meal.name === 'string' && meal.name.trim() && ['Adults and children','Adults only','Children only'].includes(meal.audience));
    const common = (event.weddingMealOptions || []).filter(Boolean).map((name,index) => ({id:`meal-${index}`,name,audience:'Adults and children'}));
    const children = Array.isArray(event.weddingChildMealOptions) ? event.weddingChildMealOptions : [event.weddingChildMealOption];
    return [...common,...children.filter(Boolean).map((name,index)=>({id:`child-meal-${index}`,name,audience:'Children only'}))];
  }
  function weddingMealOptions(event, type) {
    return [...new Set(weddingMeals(event).filter(meal => !type || meal.audience === 'Adults and children' || meal.audience === (type === 'child' ? 'Children only' : 'Adults only')).map(meal => meal.name))];
  }
  function saveWeddingMeals(event, meals, drafts = []) {
    const previous=weddingMeals(event);
    for (const meal of meals) {
      const old=previous.find(entry=>entry.id===meal.id);
      if (!old || old.name===meal.name) continue;
      for (const rsvp of [...(event.rsvps||[]),...drafts]) {
        const responses=[rsvp,...Object.values(rsvp.invitationResponses || {})];
        for (const selection of responses.flatMap(response=>[...(response.menuSelections || []),...(response.savedMenuSelections || [])])) {
          const audience=selection.type==='child'?'Children only':'Adults only';
          if (selection.meal===old.name && (old.audience==='Adults and children'||old.audience===audience)) selection.meal=meal.name;
        }
      }
    }
    event.weddingMealChoices = meals;
    event.weddingMealOptions = meals.filter(meal=>meal.audience!=='Children only').map(meal=>meal.name);
    event.weddingChildMealOptions = meals.filter(meal=>meal.audience==='Children only').map(meal=>meal.name);
    event.weddingChildMealOption = event.weddingChildMealOptions[0] || '';
  }
  function rsvpClosed(event, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.rsvpDate || '')) return false;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}` > event.rsvpDate;
  }
  function lockedRsvp(existing, incoming) {
    const people = incoming.people.map(person => {
      const saved = existing?.people?.find(saved => normalize(saved.name) === normalize(person.name));
      return { ...person, guestChoice: saved?.guestChoice || 'no-guest', guestName: saved?.guestName || '' };
    });
    const names = attendees(people);
    const savedMenuSelections = existing?.savedMenuSelections || existing?.menuSelections || [];
    return { ...incoming, people, adults: names.length, savedMenuSelections,
      menuSelections: savedMenuSelections.filter(selection => selection.type === 'child' ? selection.index < incoming.children : names.includes(selection.name)) };
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
  globalThis.GuestPlanning={accountNames,invitationNumbers,rsvpClosed,lockedRsvp,invitationCount,plusOnePeople,setPlusOnePeople,retainedEvent,attendees,rsvpTotals,attendanceGroups,weddingMeals,weddingMealOptions,saveWeddingMeals};
})();
