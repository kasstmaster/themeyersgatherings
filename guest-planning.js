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
    const savedMenuSelections = (existing?.savedMenuSelections || existing?.menuSelections || []).map(selection=>selection.type==='child' && incoming.childNames?.[selection.index] ? {...selection,name:childLabel(Number(selection.index),incoming.childNames[selection.index])} : selection);
    return { ...incoming, people, adults: names.length+(Number(incoming.extraGuests)||0), savedMenuSelections,
      menuSelections: savedMenuSelections.filter(selection => selection.type === 'child' ? selection.index < incoming.children : names.includes(selection.name)) };
  }
  const childLabel=(index,name)=>`Child ${index+1}${String(name || '').trim()?` - ${String(name).trim()}`:''}`;
  function childLabels(rsvp) {
    const responses=rsvp.invitationResponses ? Object.values(rsvp.invitationResponses) : [rsvp];
    return responses.flatMap(response=>Array.from({length:Number(response.children)||0},(_,index)=>childLabel(index,response.childNames?.[index])));
  }
  const guestResponses = rsvps => rsvps.filter(rsvp => rsvp.name !== 'The Host');
  function attendanceGroups(rsvps) {
    rsvps=guestResponses(rsvps);
    const attending = rsvps.filter(rsvp => (rsvp.people?.length ? attendees(rsvp.people).length+(Number(rsvp.extraGuests)||0) : Number(rsvp.adults)) + Number(rsvp.children || 0) > 0);
    const notAttending = rsvps.flatMap(rsvp => {
      const declined = (rsvp.people || []).filter(person => person.attending === false).map(person => ({ household: rsvp.name, name: person.name }));
      // Older records can have zero guests without an attendance answer.
      // Zero is a headcount, not evidence that somebody declined.
      return rsvp.people?.length ? declined : rsvp.attending === false ? [{ household: rsvp.name, name: rsvp.name }] : [];
    });
    return { attending, notAttending };
  }
  function rsvpTotals(rsvps, mealOptions = []) {
    const meals = new Map(mealOptions.filter(Boolean).map(meal => [meal, 0]));
    let adults = 0, children = 0, noMeal = 0, unselected = 0;
    for (const rsvp of guestResponses(rsvps)) {
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
  const foodCategories=Object.freeze(['Main Table','Sides','Appetizers','Desserts','Drinks']);
  function menuOrder(items){
    const categories=foodCategories;
    const rank=item=>{const index=categories.indexOf(item.category);return index<0?categories.length-1.5:index;};
    return [...items].sort((a,b)=>rank(a)-rank(b));
  }
  function menuRows(items){const ordered=menuOrder(items);return ordered.map((item,index)=>({item,startsCategory:index>0&&item.category!==ordered[index-1].category}));}
  function copyMenuItems(target,source,targetType,sourceType){
    const key=type=>type==='sit-down'?'sitDownMenu':'items';
    const normalizeName=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
    const existing=target[key(targetType)]||[],names=new Set(existing.map(item=>normalizeName(item.name)));
    const added=[];let skipped=0;
    for(const item of source[key(sourceType)]||[]){
      const name=String(item.name||'').trim();if(!name||names.has(normalizeName(name))){skipped++;continue;}
      names.add(normalizeName(name));
      const copy={id:crypto.randomUUID(),name,category:item.category||'Main Table'};
      if(targetType!=='sit-down'){
        copy.id='host-'+copy.id;copy.needed=Number.isSafeInteger(item.needed)&&item.needed>0?item.needed:1;copy.optional=!!item.optional;copy.claims=[];copy.unit=item.unit||'item';
        const sourceUnit=(source.quantityUnits||[]).find(unit=>unit.id===copy.unit);
        if(sourceUnit){
          const units=target.quantityUnits||[],match=units.find(unit=>normalizeName(unit.label)===normalizeName(sourceUnit.label));
          if(match)copy.unit=match.id;
          else{const unit={id:'unit-'+crypto.randomUUID(),label:sourceUnit.label};target.quantityUnits=[...units,unit];copy.unit=unit.id;}
        }else if(!['item','dozen'].includes(copy.unit))copy.unit='item';
      }
      added.push(copy);
    }
    if(added.length)target[key(targetType)]=[...existing,...added];
    return {added:added.length,skipped};
  }
  const allDeclined=people=>Array.isArray(people)&&people.length>0&&people.every(person=>person.attending===false);
  globalThis.GuestPlanning={allDeclined,foodCategories,menuOrder,menuRows,copyMenuItems,childLabel,childLabels,guestResponses,accountNames,invitationNumbers,rsvpClosed,lockedRsvp,invitationCount,plusOnePeople,setPlusOnePeople,retainedEvent,attendees,rsvpTotals,attendanceGroups,weddingMeals,weddingMealOptions,saveWeddingMeals};
})();
