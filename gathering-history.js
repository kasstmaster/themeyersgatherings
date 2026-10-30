// Shared by the browser, state Worker, and account sync. Snapshots never refer to live accounts.
(() => {
  const names={thanksgiving:'Thanksgiving',christmas:'Christmas',wedding:'Wedding'};
  function today(now=new Date()) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
  }
  function completed(event,now=new Date()) { return /^\d{4}-\d{2}-\d{2}$/.test(event?.eventDate || '') && event.eventDate<today(now); }
  function archiveDue(app,now=new Date()) {
    let changed=cleanup(app,now);
    for(const [id,event] of Object.entries(app.events || {})) {
      if(!completed(event,now) || event.cancelled || record(app,id,event.eventDate) || app.gatheringHistory?.[id]?.[event.eventDate])continue;
      const references=new Set([...(event.rsvps || []).map(r=>r.name),...[...(event.items || []),...(event.drinksItems || [])].flatMap(item=>item.claims || [])]);
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
    for(const [id,dates] of Object.entries(app.gatheringLifecycle || {}))for(const date of Object.keys(dates))if(app.gatheringHistory[id])delete app.gatheringHistory[id][date];
  }
  function startNext(app,id,date,now=new Date()) {
    const previous=app.events[id];
    if(previous?.cancelled || record(app,id,previous?.eventDate))throw new Error('Restore this gathering before starting another occurrence.');
    if(!completed(previous,now))throw new Error('The current gathering has not ended yet.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || date<=today(now))throw new Error('Choose a future date for the next gathering.');
    archiveDue(app,now);
    if(app.gatheringHistory?.[id]?.[date])throw new Error('That date already has a saved history.');
    const next=structuredClone(previous);
    const days=Math.max(0,Math.round((Date.parse(previous.eventDate)-Date.parse(previous.rsvpDate))/86400000));
    next.eventDate=date;next.rsvpDate=previous.rsvpDate===''?'':new Date(Date.parse(date)-(Number.isFinite(days)?days:14)*86400000).toISOString().slice(0,10);
    next.rsvps=[];next.hostNotes='';next.mediaPreviousDates=[];
    for(const key of ['items','drinksItems'])if(Array.isArray(next[key]))next[key]=next[key].map(item=>({...item,claims:[],...(item.claimGroups?{claimGroups:{}}:{})}));
    for(const account of app.accounts || []) {
      account.selectedEvents={...account.selectedEvents,[id]:false};account.invitedEvents={...account.invitedEvents,[id]:false};
      account.plusOnePeople={...account.plusOnePeople,[id]:[]};account.plusOnes={...account.plusOnes,[id]:0};
    }
    app.events[id]=next;return next;
  }

  const record=(app,id,date)=>app.gatheringLifecycle?.[id]?.[date];
  const sameAccount=(a,b)=>Boolean(a&&b&&(a.qrToken&&b.qrToken?a.qrToken===b.qrToken:a.anyListCategoryId&&b.anyListCategoryId?a.anyListCategoryId===b.anyListCategoryId:a.name===b.name));
  function historicalAccount(app,account,snapshot) {
    if(!snapshot || record(app,snapshot.eventId,snapshot.date) || snapshot.event?.cancelled)return null;
    const saved=(snapshot.accounts || []).find(old=>sameAccount(old,account));
    if(!saved)return null;
    const invited=saved.invitedEvents?.[snapshot.eventId]===true || saved.selectedEvents?.[snapshot.eventId]===true;
    const attended=(snapshot.event.rsvps||[]).some(r=>r.name===saved.name&&(r.adults>0||r.children>0||r.people?.some(p=>p.attending===true)));
    return invited||attended?saved:null;
  }
  function snapshots(app,now=new Date()) {
    const year=today(now).slice(0,4);
    return Object.entries(app.gatheringHistory || {}).flatMap(([id,dates])=>Object.entries(dates).filter(([date])=>date.slice(0,4)<year&&!record(app,id,date)).map(([,snapshot])=>snapshot)).sort((a,b)=>b.date.localeCompare(a.date));
  }
  function selection(app,ids,now=new Date()) {
    const day=today(now),year=day.slice(0,4);
    return ids.filter(id=>app.events[id]?.eventDate?.slice(0,4)>=year && !(app.events[id].cancelled&&app.events[id].eventDate<day)).sort((a,b)=>Number(app.events[a].eventDate<day)-Number(app.events[b].eventDate<day));
  }
  function cleanup(app,now=new Date()) {
    let changed=false;
    for(const [id,dates] of Object.entries(app.gatheringLifecycle || {}))for(const [date,entry] of Object.entries(dates)) {
      const expired=entry.status==='cancelled'?date<today(now):entry.status==='deleted'&&Date.parse(entry.deletedAt)+30*86400000<=now.getTime();
      if(!expired)continue;
      if(app.events?.[id]?.eventDate===date)delete app.events[id];
      if(app.gatheringHistory?.[id]){delete app.gatheringHistory[id][date];if(!Object.keys(app.gatheringHistory[id]).length)delete app.gatheringHistory[id];}
      delete dates[date];changed=true;
      if(!Object.keys(dates).length)delete app.gatheringLifecycle[id];
    }
    return changed;
  }
  function manage(app,{action,eventId:id,date,name,confirmation,information},now=new Date()) {
    if(typeof id!=='string'||!id||['__proto__','constructor','prototype'].includes(id)||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw new Error('Choose a valid gathering occurrence.');
    cleanup(app,now);
    const current=app.events?.[id]?.eventDate===date?app.events[id]:null;
    const snapshot=app.gatheringHistory?.[id]?.[date],entry=record(app,id,date);
    const event=current||snapshot?.event;
    if(action==='restore') {
      if(entry?.status!=='deleted')throw new Error('This gathering is not recoverable.');
      if(entry.current&&!app.events[id])app.events[id]=structuredClone(entry.current);
      else if(entry.current){app.gatheringHistory ||= {};app.gatheringHistory[id] ||= {};app.gatheringHistory[id][date]=entry.snapshot || {version:1,eventId:id,date,name:entry.name,event:structuredClone(entry.current),accounts:structuredClone(entry.accounts),archivedAt:now.toISOString()};}
      if(entry.snapshot){app.gatheringHistory ||= {};app.gatheringHistory[id] ||= {};app.gatheringHistory[id][date]=structuredClone(entry.snapshot);}
      if(entry.current?.cancelled)app.gatheringLifecycle[id][date]={status:'cancelled'};else delete app.gatheringLifecycle[id][date];return;
    }
    if(!event || entry?.status==='deleted')throw new Error('This gathering is not available.');
    if(action==='information') {
      if(!information||typeof information!=='object')throw new Error('Enter gathering information.');
      const {eventDate,rsvpDate,eventTime,address}=information;
      if(name!==undefined&&(typeof name!=='string'||!name.trim()||name.trim().length>120))throw new Error('Enter a name of 1–120 characters.');
      const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
      if(!validDate(eventDate)||typeof rsvpDate!=='string'||rsvpDate&&!validDate(rsvpDate))throw new Error('Enter valid gathering and RSVP dates.');
      if([eventTime,address,information.venueTime || '',information.venueAddress || ''].some(value=>typeof value!=='string'||value.length>4000))throw new Error('Enter valid time and address information.');
      if(entry?.status==='cancelled'&&eventDate!==date)throw new Error('A cancelled date cannot be rescheduled.');
      if(eventDate!==date&&(app.gatheringHistory?.[id]?.[eventDate]||record(app,id,eventDate)||!current&&app.events?.[id]?.eventDate===eventDate))throw new Error('That date already has an occurrence.');
      for(const target of new Set([event,snapshot?.event].filter(Boolean))){
        if(name!==undefined)target.gatheringName=name.trim();
        target.eventDate=eventDate;target.rsvpDate=rsvpDate;target.eventTime=eventTime.trim();
        SharedDetails.setDetail({[id]:target},id,'homeAddress',address.trim());
        if(id==='wedding'){
          if(eventDate!==date||!target.churchWeekDay)target.churchWeekDay=globalThis.Invitation.formatEventDate(eventDate).replace(/\s+\d{4}$/,'');
          if(eventDate!==date||!target.churchYear)target.churchYear=eventDate.slice(0,4);
          const lines=address.trim().split(/\r?\n/);target.churchTime=target.eventTime;target.ceremonyTime=target.eventTime;target.churchStreet=lines[0] || '';target.churchCityStateZip=lines.slice(1).join('\n');
          target.venueTime=String(information.venueTime || '').trim();const venue=String(information.venueAddress || '').trim().split(/\r?\n/);target.venueStreet=venue[0] || '';target.venueCityStateZip=venue.slice(1).join('\n');
        }
        if(eventDate!==date)target.mediaPreviousDates=[...new Set([...(target.mediaPreviousDates || []),date])];
      }
      if(snapshot&&name!==undefined)snapshot.name=name.trim();
      if(snapshot&&eventDate!==date){snapshot.date=eventDate;app.gatheringHistory[id][eventDate]=snapshot;delete app.gatheringHistory[id][date];}
      return;
    }
    if(action==='gallery') {
      if(typeof name!=='string'||name.length>4000)throw new Error('Enter a valid gallery link.');
      if(name){let url;try{url=new URL(name);}catch{throw new Error('Enter a full http or https gallery link.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Enter a full http or https gallery link.');}
      if(current)current.mediaGalleryUrl=name;if(snapshot)snapshot.event.mediaGalleryUrl=name;return;
    }
    if(action==='rename') {
      if(typeof name!=='string'||!name.trim()||name.trim().length>120)throw new Error('Enter a name of 1–120 characters.');
      if(current)current.gatheringName=name.trim();
      if(snapshot){snapshot.name=name.trim();snapshot.event.gatheringName=name.trim();}return;
    }
    if(!['cancel','delete'].includes(action))throw new Error('Choose a supported action.');
    if(confirmation!==`${action.toUpperCase()} ${date}`)throw new Error('Enter the exact confirmation phrase.');
    if(action==='cancel'&&(!current||completed(current,now)))throw new Error('Only an upcoming gathering can be cancelled.');
    app.gatheringLifecycle ||= {};app.gatheringLifecycle[id] ||= {};
    if(action==='cancel'){current.cancelled=true;app.gatheringLifecycle[id][date]={status:'cancelled'};if(app.gatheringHistory?.[id])delete app.gatheringHistory[id][date];return;}
    app.gatheringLifecycle[id][date]={status:'deleted',deletedAt:now.toISOString(),name:event.gatheringName || snapshot?.name || names[id] || id,current:current?structuredClone(current):null,snapshot:snapshot?structuredClone(snapshot):null,accounts:structuredClone((app.accounts || []).filter(account=>account.selectedEvents?.[id]||account.invitedEvents?.[id]||(event.rsvps||[]).some(r=>r.name===account.name)))};
    if(current)delete app.events[id];
    if(app.gatheringHistory?.[id])delete app.gatheringHistory[id][date];
  }
  globalThis.GatheringHistory={today,completed,archiveDue,preserve,startNext,record,sameAccount,historicalAccount,snapshots,selection,cleanup,manage};
})();
