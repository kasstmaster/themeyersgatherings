// Shared by the browser, state Worker, and account sync. Snapshots never refer to live accounts.
(() => {
  const names={thanksgiving:'Thanksgiving',christmas:'Christmas',wedding:'Wedding'};
  function today(now=new Date()) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
  }
  function completed(event,now=new Date()) { return /^\d{4}-\d{2}-\d{2}$/.test(event?.eventDate || '') && event.eventDate<today(now); }
  function archiveDue(app,now=new Date()) {
    let changed=false;
    for(const [id,event] of Object.entries(app.events || {})) {
      if(!completed(event,now) || app.gatheringHistory?.[id]?.[event.eventDate])continue;
      const references=new Set([...(event.rsvps || []).map(r=>r.name),...(event.items || []).flatMap(item=>item.claims || [])]);
      const accounts=(app.accounts || []).filter(account=>account.invitedEvents?.[id] || references.has(account.name));
      app.gatheringHistory ||= {};app.gatheringHistory[id] ||= {};
      app.gatheringHistory[id][event.eventDate]=structuredClone({version:1,eventId:id,date:event.eventDate,name:event.gatheringName || names[id] || id,archivedAt:now.toISOString(),event,accounts:accounts.map(account=>({...account,invitationCountAtEvent:globalThis.GuestPlanning?.invitationCount(account,id) ?? account.invitationQuantities?.[id] ?? 1})),sharedSite:app.sharedSite || {}});
      changed=true;
    }
    return changed;
  }
  function preserve(app,stored) {
    const merged=structuredClone(app.gatheringHistory || {});
    for(const [id,dates] of Object.entries(stored.gatheringHistory || {}))merged[id]={...(merged[id] || {}),...structuredClone(dates)};
    app.gatheringHistory=merged;
  }
  function startNext(app,id,date,now=new Date()) {
    const previous=app.events[id];
    if(!completed(previous,now))throw new Error('The current gathering has not ended yet.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || date<=today(now))throw new Error('Choose a future date for the next gathering.');
    archiveDue(app,now);
    if(app.gatheringHistory?.[id]?.[date])throw new Error('That date already has a saved history.');
    const next=structuredClone(previous);
    const days=Math.max(0,Math.round((Date.parse(previous.eventDate)-Date.parse(previous.rsvpDate))/86400000));
    next.eventDate=date;next.rsvpDate=previous.rsvpDate===''?'':new Date(Date.parse(date)-(Number.isFinite(days)?days:14)*86400000).toISOString().slice(0,10);
    next.rsvps=[];next.hostNotes='';
    next.items=(next.items || []).filter(item=>!item.id.startsWith('custom-')).map(item=>({...item,claims:[],...(item.claimGroups?{claimGroups:{}}:{})}));
    for(const account of app.accounts || []) {
      account.selectedEvents={...account.selectedEvents,[id]:false};account.invitedEvents={...account.invitedEvents,[id]:false};
      account.plusOnePeople={...account.plusOnePeople,[id]:[]};account.plusOnes={...account.plusOnes,[id]:0};
    }
    app.events[id]=next;return next;
  }
  globalThis.GatheringHistory={today,completed,archiveDue,preserve,startNext};
})();
