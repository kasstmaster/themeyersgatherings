import '../shared-details.js';
import '../invitation.js';
import {actorAccount,eventAllowed} from './permissions.js';
import '../guest-planning.js';
import '../gathering-features.js';
import '../invitation-groups.js';
import '../wedding-party.js';
import '../shared-state-protocol.js';
const clone=value=>structuredClone(value);
const SAME=SharedStateProtocol.same;
const PUBLIC_KEYS=`cancelled gatheringName gatheringTheme eventDate eventTime rsvpDate homeAddress addressLine1 addressLine2 headerText rsvpIntroText rsvpTextBlocks rsvpDetailsText rsvpDetailsTitle siteHeaderImage rsvpHeaderImage siteBannerText rsvpBannerText sitePalette colors gatheringColors quantityUnits registryUrl monetaryGiftUrl churchWeekDay churchYear churchTime churchStreet churchCityStateZip venueTime venueStreet venueCityStateZip attireVideos weddingMealChoices weddingMealOptions weddingChildMealOption weddingChildMealOptions mediaGalleryUrl mediaGalleryLabel siteHiddenTabs siteTabTitles siteTabOrder rsvpToolbarOrder siteElementOrder siteElementPlacements siteGaps siteSpacing`.split(' ');
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,clone(value[key])]));
export function accountForActor(state,actor){
 if(actor.role==='host')return null;
 return actorAccount(state,actor);
}
export function permittedEvents(state,actor){const account=accountForActor(state,actor);return actor.role==='host'?Object.keys(state.events):Object.keys(state.events).filter(id=>eventAllowed(account,id));}
const privateSelector=/(?:sitDownDinner|hostNotes|brideGroom|weddingTimeline|weddingPartyPersonalPage|weddingPartyDetails|partySharedDetails|perfectExperience|weddingPartyHeading|weddingPartyKicker|count-list|admin|guestList|invited|noResponse|notAttending)/i;
function allowedHeadingPath(path,member,allowedPages){
 const identity=WeddingParty.parseHeadingPath(path);if(!member||!identity)return false;
 const [kind,id,pageId]=identity;
 if(kind==='duties')return identity.length===3&&id===member.id;
 if(kind==='member-page')return identity.length===4&&id===member.id&&member.pages.some(page=>page.id===pageId);
 if(kind==='site-page')return identity.length===3&&allowedPages.includes(id);
 return identity.length===2&&['experience','shared-timeline','shared-details','attire'].includes(kind);
}
function textEntries(entries,party,allowedPages=[],member=null){
 return Object.fromEntries(Object.entries(entries||{}).filter(([path])=>{
  if(path.includes('party-heading:'))return allowedHeadingPath(path,member,allowedPages);
  if(path.includes('custom-page-')&&!allowedPages.some(id=>path.includes('custom-page-'+id)))return false;
  if(/weddingParty(?:Heading|Kicker|PersonalPage|Details)|weddingHostTabs|matronInfoTabs.*memberPage/.test(path))return false;
  return !privateSelector.test(path)||(party&&/(partyShared|perfectExperience|weddingTimeline)/.test(path));
 }));
}
export function projectState(state,actor,includeHistory=true,historicalAccount=null){
 if(actor.role==='host')return clone(state);
 const account=historicalAccount||accountForActor(state,actor);if(!account)throw new Error('Session no longer valid');
 const accountView=pick(account,['name','children','selectedEvents','invitedEvents','plusOnes','plusOnePeople','invitationPeople','invitationQuantities','signInAliases']);
 accountView.selectedEvents=Object.fromEntries(Object.keys(state.events).map(id=>[id,eventAllowed(account,id)]));
 const events={};
 for(const id of Object.keys(state.events).filter(id=>eventAllowed(account,id))){
  if(GatheringHistory.record(state,id,state.events[id].eventDate)?.status==='deleted' || state.events[id].cancelled&&GatheringHistory.completed(state.events[id]))continue;
  const original=state.events[id],event=pick(original,PUBLIC_KEYS);
  const plan=GatheringFeatures.dinnerPlan(id,original);
  if(plan){event.dinnerPlans={[plan.year]:{type:plan.type}};if(['potluck','drinks'].includes(plan.type))event.dinnerSummary=GatheringFeatures.dinnerCounts(state.accounts,id,original);}
  const member=WeddingParty.normalizeMembers(original.weddingPartyMembers||[]).find(value=>value.name?.trim().toLowerCase()===actor.person.trim().toLowerCase());
  event.weddingPartyMembers=member?[clone(member)]:[];
  const attire=member?WeddingParty.attireSections(member.title):[];
  if(member)event.weddingPartyAttireIntro=original.weddingPartyAttireIntro||'';
  event.weddingPartyAttireImages=pick(original.weddingPartyAttireImages||{},attire);event.weddingPartyAttireNotes=pick(original.weddingPartyAttireNotes||{},attire);
  event.sitePages=(original.sitePages||[]).filter(page=>['weddingPartyTabs','guestInfoTabs'].includes(page.nav)||page.nav==='matronInfoTabs'&&member).filter(page=>page.audience==='all'||page.audience==='guests'&&!member||page.audience==='party'&&member||!page.audience).map(clone);
  // Details' intentional canonical shared views remain available to their audience.
  event.whatToExpectContent=original.whatToExpectContent||'';
  if(member){for(const key of ['timelineAboveContent','timelineContent','timelineBelowContent','timelineTabTitle','perfectExperienceContent'])if(Object.hasOwn(original,key))event[key]=clone(original[key]);}
  const pageIds=event.sitePages.map(page=>String(page.id));
  event.siteText=textEntries({...WeddingParty.legacyHeadingText(original),...original.siteText},Boolean(member),pageIds,member);event.textAppearance=textEntries(original.textAppearance,Boolean(member),pageIds,member);
  event.siteTabTitles=textEntries(original.siteTabTitles,Boolean(member),pageIds);
  event.elementAppearance=Object.fromEntries(Object.entries(original.elementAppearance||{}).filter(([path])=>(path.startsWith('@group:')||!privateSelector.test(path))&&(!path.includes('party-heading:')||allowedHeadingPath(path,member,pageIds))).map(([key,value])=>[key,clone(value)]));
  for(const key of ['items','drinksItems']){const active=GatheringFeatures.contributionKey(id,original)===key&&(id==='wedding'||GatheringFeatures.rsvp(id,original).contributions);event[key]=(active?original[key]||[]:[]).map(item=>({...clone(item),...(item.claimGroups?{claimGroups:pick(item.claimGroups,[account.name])}:{}),claims:(item.claims||[]).map(name=>name===account.name?name:'__other_claim__')}));}

  event.rsvps=(original.rsvps||[]).filter(response=>response.name===account.name).map(clone);
  events[id]=event;
 }
 const pastGatherings={};
 if(includeHistory)for(const [id,dates] of Object.entries(state.gatheringHistory || {}))for(const [date,snapshot] of Object.entries(dates)){
  const saved=GatheringHistory.historicalAccount(state,account,snapshot);if(!saved)continue;
  // Reuse the ordinary privacy projection with only the historically authorized household.
  const historical={...state,events:{[id]:snapshot.event},accounts:[{...saved,qrToken:account.qrToken,anyListCategoryId:account.anyListCategoryId,selectedEvents:{[id]:true}}],gatheringHistory:{}};
  const view=projectState(historical,actor,false,historical.accounts[0]);
  pastGatherings[id] ||= {};pastGatherings[id][date]={eventId:id,date,name:snapshot.name,event:view.events[id]};
 }
 const ids=Object.keys(events);
 return {events,pastGatherings,accounts:[accountView],activeEventId:ids.includes(state.activeEventId)?state.activeEventId:ids[0],sharedSite:pick(state.sharedSite||{},['footerName']),gatheringHome:pick(state.gatheringHome||{},['entryNavyVersion','elementAppearance','siteText','textAppearance','siteGaps','siteSpacing','siteElementOrder']),savedAt:state.savedAt};
}
function forbidden(){throw Object.assign(new Error('Change is not permitted.'),{status:403});}
function validRsvp(response,account,event,id){
 if(!response||response.name!==account.name||!Array.isArray(response.people))forbidden();
 const names=GuestPlanning.accountNames(account.name);
 if(response.people.some(person=>!names.includes(person.name)||typeof person.attending!=='boolean'))forbidden();
 if(new Set(response.people.map(person=>person.name)).size!==response.people.length)forbidden();
 for(const key of ['adults','children','extraGuests'])if(response[key]!==undefined&&(!Number.isSafeInteger(response[key])||response[key]<0||response[key]>200))forbidden();
 if((response.childNames||[]).some(name=>typeof name!=='string'||name.length>200)||(response.extraGuestNames||[]).some(name=>typeof name!=='string'||name.length>200))forbidden();
 if(response.adults!==GuestPlanning.attendees(response.people).length+(response.extraGuests||0))forbidden();
 const allowed=GuestPlanning.plusOnePeople(account,id,names);
 if(id==='wedding'&&response.people.some(person=>person.guestChoice==='guest'&&(!allowed.includes(person.name)||!person.guestName?.trim())))forbidden();
 const attendeeNames=GuestPlanning.attendees(response.people).concat(response.extraGuestNames||[]);
 if((response.menuSelections||[]).some(selection=>!['adult','child'].includes(selection.type)||selection.type==='adult'&&!attendeeNames.includes(selection.name)||selection.meal==='none'&&selection.type!=='child'))forbidden();
 if((response.menuSelections||[]).some(selection=>selection.meal&&selection.meal!=='none'&&!GuestPlanning.weddingMealOptions(event,selection.type).includes(selection.meal)))forbidden();
}
export function updateFromChanges(state,actor,operations){
 if(actor.role==='host'){
  const next=SharedStateProtocol.apply(state,operations);
  if(!next.events||Array.isArray(next.events)||!Array.isArray(next.accounts))forbidden();
  for(const template of next.invitationTemplates || []){const previous=(state.invitationTemplates || []).find(item=>item.id===template.id);if(SAME(previous,template))continue;try{globalThis.Invitation.validateTemplate(template,next.events[template.eventId]);}catch(error){throw Object.assign(error,{status:400});}}
  return next;
 }
 const account=accountForActor(state,actor),allowed=permittedEvents(state,actor);
 if(!account)forbidden();
 for(const {path} of operations)if(path?.length!==3||path[0]!=='events'||!allowed.includes(path[1])||!['rsvps','items','drinksItems'].includes(path[2]))forbidden();
 const view=projectState(state,actor),desired=SharedStateProtocol.apply(view,operations),next=clone(state);
 for(const id of new Set(operations.map(operation=>operation.path[1]))){
  const source=state.events[id],incoming=desired.events[id];
  if(source.cancelled || GatheringHistory.record(state,id,source.eventDate))forbidden();
  if(!SAME(view.events[id].rsvps,incoming.rsvps)){
   if(!Array.isArray(incoming.rsvps)||incoming.rsvps.length>1)forbidden();
   const response=incoming.rsvps[0];if(!response)forbidden();validRsvp(response,account,source,id);
   const previous=source.rsvps?.find(value=>value.name===account.name);
   const number=InvitationGroups.number(account,id,actor.person),own=InvitationGroups.members(account,id,GuestPlanning.accountNames(account.name),actor.person);
   const otherPeople=value=>(value?.people||[]).filter(person=>!own.includes(person.name));
   if(!SAME(otherPeople(previous),otherPeople(response)))forbidden();
   for(const key of new Set([...Object.keys(previous?.invitationResponses||{}),...Object.keys(response.invitationResponses||{})]))if(Number(key)!==number&&!SAME(previous?.invitationResponses?.[key],response.invitationResponses?.[key]))forbidden();
   const names=GuestPlanning.accountNames(account.name);
   let ownResponse=InvitationGroups.response(account,id,names,number,response);
   if(id==='wedding'&&GuestPlanning.rsvpClosed(source)){
    const existing=InvitationGroups.response(account,id,names,number,previous||{}),locked=GuestPlanning.lockedRsvp(existing,ownResponse);
    for(const person of ownResponse.people){const expected=locked.people.find(value=>value.name===person.name);if((person.guestChoice||'no-guest')!==expected.guestChoice||(person.guestName||'')!==expected.guestName)forbidden();}
    for(const key of ['menuSelections','savedMenuSelections'])if(!SAME(ownResponse[key]||[],locked[key]||[]))forbidden();
    ownResponse=locked;
   }
   const accepted=InvitationGroups.merge(account,id,names,number,previous,pick(ownResponse,['name','people','adults','children','childNames','extraGuests','extraGuestNames','menuSelections','savedMenuSelections']));
   next.events[id].rsvps=[...(source.rsvps||[]).filter(value=>value.name!==account.name),accepted];
  }
  for(const menuKey of ['items','drinksItems'])if(!SAME(view.events[id][menuKey],incoming[menuKey])){
   if(!Array.isArray(incoming[menuKey])||!GatheringFeatures.rsvp(id,source).contributions||GatheringFeatures.contributionKey(id,source)!==menuKey)forbidden();
   const originals=new Map((source[menuKey]||[]).map(item=>[item.id,item]));
   if(new Set(incoming[menuKey].map(item=>item.id)).size!==incoming[menuKey].length)forbidden();
   next.events[id][menuKey]=incoming[menuKey].map(item=>{
    const original=originals.get(item.id);
    if(!original){if(!/^custom-[a-f0-9-]+$/.test(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>200||!Number.isSafeInteger(item.needed)||item.needed<1||item.needed>1000||!['Appetizers','Main Table','Sides','Desserts','Drinks'].includes(item.category)||!Array.isArray(item.claims)||item.claims.some(name=>name!==account.name)||item.claims.length!==item.needed||typeof item.unit!=='string'||item.unit.length>100)forbidden();const safe=pick(item,['id','name','category','needed','unit','claims']);return InvitationGroups.setDishQuantity(safe,account.name,InvitationGroups.number(account,id,actor.person),item.needed);}
    const safe=clone(original),others=(original.claims||[]).filter(name=>name!==account.name);
    if(!Array.isArray(item.claims))forbidden();
    const submittedOther=item.claims.filter(name=>name!==account.name);
    const projected=view.events[id][menuKey].find(value=>value.id===item.id);
    if(!SAME({...item,claims:[],claimGroups:null},{...projected,claims:[],claimGroups:null})||submittedOther.some(name=>name!=='__other_claim__')||submittedOther.length!==others.length)forbidden();
    const invitation=InvitationGroups.number(account,id,actor.person),single=GuestPlanning.invitationCount(account,id)<=1;
    const quantity=InvitationGroups.dishQuantity(item,account.name,invitation,single);
    InvitationGroups.setDishQuantity(safe,account.name,invitation,quantity,single);
    const names=GuestPlanning.accountNames(account.name),response=next.events[id].rsvps?.find(value=>value.name===account.name);
    if(GuestPlanning.allDeclined(InvitationGroups.response(account,id,names,invitation,response||{}).people))InvitationGroups.releaseDishes([safe],account.name,invitation,single,names,response.people);
    const expected=pick(safe.claimGroups,[account.name]);
    if(item.claimGroups&&!SAME(item.claimGroups,expected))forbidden();
    const ownClaims=item.claims.filter(name=>name===account.name);
    if(safe.claims.filter(name=>name===account.name).length!==ownClaims.length||safe.claims.length>Math.max(original.needed,(original.claims||[]).length))forbidden();
    return safe;
   });
   if([...originals.keys()].some(key=>!incoming[menuKey].some(item=>item.id===key)))forbidden();
  }
  const invitation=InvitationGroups.number(account,id,actor.person),names=GuestPlanning.accountNames(account.name);
  const response=InvitationGroups.response(account,id,names,invitation,next.events[id].rsvps?.find(value=>value.name===account.name)||{});
  if(GuestPlanning.allDeclined(response.people)){
   const single=GuestPlanning.invitationCount(account,id)<=1;
   InvitationGroups.releaseDishes([...(next.events[id].items||[]),...(next.events[id].drinksItems||[])],account.name,invitation,single,names,next.events[id].rsvps.find(value=>value.name===account.name).people);
  }
 }
 return next;
}
