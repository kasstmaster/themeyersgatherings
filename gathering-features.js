// Behavior belongs to gathering types, not individual holidays or themes.
(() => {
  const standard = Object.freeze({
    menu: true,
    notes: true,
    weddingPages: false,
    ceremonyAddresses: false,
    rsvp: Object.freeze({ childNames: true, guestCounter: true, namedGuests: false, meals: false, contributions: true })
  });
  const wedding = Object.freeze({
    menu: false,
    notes: false,
    weddingPages: true,
    ceremonyAddresses: true,
    rsvp: Object.freeze({ childNames: true, guestCounter: false, namedGuests: true, meals: true, contributions: false })
  });
  const forGathering = eventId => eventId === 'wedding' ? wedding : standard;
  const noContributionsRsvp=Object.freeze({...standard.rsvp,contributions:false});
  const dinnerYear=event=>/^\d{4}/.exec(event?.eventDate||'')?.[0]||'current';
  function dinnerPlan(eventId,event){
    if(eventId==='wedding')return null;
    const saved=event?.dinnerPlans?.[dinnerYear(event)];
    return {year:dinnerYear(event),type:['sit-down','none','drinks'].includes(saved?.type)?saved.type:'potluck',selectedItems:Array.isArray(saved?.selectedItems)?saved.selectedItems:[]};
  }
  const rsvp = (eventId,event) => eventId!=='wedding' && ['sit-down','none'].includes(dinnerPlan(eventId,event).type)?noContributionsRsvp:forGathering(eventId).rsvp;
  const contributionKey=(eventId,event)=>dinnerPlan(eventId,event)?.type==='drinks'?'drinksItems':'items';
  const contributionItems=(eventId,event)=>event?.[contributionKey(eventId,event)]||[];
  function dinnerCounts(accounts,eventId,event){
    const responses=GuestPlanning.guestResponses(event.rsvps||[]),totals=GuestPlanning.rsvpTotals(responses);
    const invited=(accounts||[]).filter(account=>account.invitedEvents?.[eventId]===true).reduce((sum,account)=>{
      const names=GuestPlanning.accountNames(account.name);
      const guests=Array.isArray(account.plusOnePeople?.[eventId])?GuestPlanning.plusOnePeople(account,eventId,names).length:Math.min(names.length,Math.max(0,Math.floor(Number(account.plusOnes?.[eventId])||0)));
      return {adults:sum.adults+names.length+guests,children:sum.children+(account.children||[]).length};
    },{adults:0,children:0});
    return {invited,attending:{adults:totals.adults,children:totals.children}};
  }
  function childNames(eventId, draft, count) {
    return rsvp(eventId).childNames
      ? Array.from({ length: count }, (_, index) => String(draft[index] || '').trim()) : [];
  }
  globalThis.GatheringFeatures = { forGathering, rsvp, childNames, dinnerYear, dinnerPlan, contributionKey, contributionItems, dinnerCounts };
})();
