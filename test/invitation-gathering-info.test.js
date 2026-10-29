import test from 'node:test';
import assert from 'node:assert/strict';
import '../shared-details.js';
import '../gathering-history.js';
import '../invitation.js';
import {updateFromChanges} from '../github-state-worker/state-access.js';
const I=globalThis.Invitation;
const background={width:800,height:1200,url:'https://service.test/invitation-backgrounds/art'};
const event=()=>({gatheringName:'Dinner',eventDate:'2026-11-25',eventTime:'2:00 PM',rsvpDate:'2026-11-12',homeAddress:'123 Main\nBakersfield CA',items:[],rsvps:[]});
function template(eventId='one'){const value=I.createTemplate('Dinner invitation',background);value.eventId=eventId;value.fields=I.mandatoryFields(background);return value;}
test('incomplete invitation values and fields are reminders rather than save blockers',()=>{
 const t=template();assert.equal(I.validateTemplate(t,event()),true);assert.deepEqual(I.templateRequirements(t,event()),{missingValues:[],missingFields:[]});
 for(const key of ['eventDate','eventTime','rsvpDate','homeAddress']){const incomplete={...event(),[key]:''};assert.equal(I.validateTemplate(t,incomplete),true);assert.equal(I.templateRequirements(t,incomplete).missingValues.length,1);}
 for(const key of ['eventDate','eventTime','address','rsvpBy']){const incomplete={...t,fields:t.fields.filter(f=>f.key!==key)};assert.equal(I.validateTemplate(incomplete,event()),true);assert.ok(I.templateRequirements(incomplete,event()).missingFields.includes(key));}
 const offCanvas=structuredClone(t);offCanvas.fields[0].x=900;assert.ok(I.templateRequirements(offCanvas,event()).missingFields.includes('eventDate'));
 const split=structuredClone(t);split.fields=split.fields.filter(f=>f.key!=='address');split.fields.push(I.newField('addressLine1',20,20));assert.ok(I.templateRequirements(split,event()).missingFields.includes('address'));split.fields.push(I.newField('addressLine2',20,80));assert.deepEqual(I.templateRequirements(split,event()).missingFields,[]);
});
test('copy preserves independent layout and formatting, replaces artwork and resolves destination information',()=>{
 const source=template(),original=structuredClone(source);source.fields[0].fontFamily='Times New Roman';source.fields[0].color='#123456';
 const copy=I.copyForGathering(source,'two','Christmas invitation',{...background,url:'https://service.test/new-art'}),other={...event(),eventDate:'2026-12-25',eventTime:'5:00 PM',rsvpDate:'2026-12-10',homeAddress:'456 Oak\nOther Town'};
 assert.equal(copy.eventId,'two');assert.equal(copy.background.url,'https://service.test/new-art');assert.notEqual(copy.id,source.id);
 for(let n=0;n<copy.fields.length;n++){const {id:old,...a}=source.fields[n],{id:next,...b}=copy.fields[n];assert.deepEqual(a,b);assert.notEqual(old,next);}
 assert.equal(I.fieldValue(copy.fields.find(f=>f.key==='eventTime'),other),'5:00 PM');assert.equal(I.fieldValue(copy.fields.find(f=>f.key==='address'),other),'456 Oak\nOther Town');
 assert.match(I.fieldValue(copy.fields.find(f=>f.key==='eventDate'),other),/December/);copy.fields[0].x=777;assert.equal(source.fields[0].x,original.fields[0].x);
});
test('Wedding legacy time and ceremony address remain valid without migration',()=>{
 const legacy={eventDate:'2027-08-10',rsvpDate:'2027-07-01',churchTime:'Two o’clock',churchStreet:'Ceremony St',churchCityStateZip:'Town',homeAddress:'Different home'};
 const t=template('wedding');assert.equal(I.validateTemplate(t,legacy),true);assert.equal(I.fieldValue(I.newField('ceremonyTime',0,0),legacy),'Two o’clock');assert.equal(I.fieldValue(I.newField('address',0,0),legacy),'Ceremony St\nTown');
});
test('server permits incomplete template drafts while checking record structure',()=>{
 const legacy={id:'legacy',eventId:'one',background,fields:[]},state={events:{one:event()},accounts:[],invitationTemplates:[legacy]};
 const changed=[{path:['invitationTemplates'],value:[{...legacy,name:'Changed'}]}];
 assert.equal(updateFromChanges(state,{role:'host'},changed).invitationTemplates[0].name,'Changed');
 assert.throws(()=>updateFromChanges(state,{role:'host'},[{path:['invitationTemplates'],value:[{...legacy,fields:null}]}]),error=>error.status===400);
 assert.equal(updateFromChanges(state,{role:'host'},[{path:['events','one','hostNotes'],value:'Note'}]).invitationTemplates[0].id,'legacy');
 const valid=template();assert.equal(updateFromChanges(state,{role:'host'},[{path:['invitationTemplates'],value:[legacy,valid]}]).invitationTemplates.length,2);
});
test('central information edits reschedule only the selected occurrence and preserve saved data and media dates',()=>{
 const state={events:{one:event(),two:{...event(),eventDate:'2026-12-25'}},accounts:[{name:'Casey',invitedEvents:{one:true}}]};state.events.one.rsvps=[{name:'Casey',adults:1}];const other=structuredClone(state.events.two),response=structuredClone(state.events.one.rsvps);
 GatheringHistory.manage(state,{action:'information',eventId:'one',date:'2026-11-25',information:{eventDate:'2026-11-26',eventTime:'3:00 PM',rsvpDate:'2026-11-13',address:'New St\nNew Town'}},new Date('2026-10-28'));
 assert.deepEqual(state.events.two,other);assert.deepEqual(state.events.one.rsvps,response);assert.equal(state.accounts[0].invitedEvents.one,true);assert.deepEqual(state.events.one.mediaPreviousDates,['2026-11-25']);assert.equal(state.events.one.addressLine2,'New Town');
 assert.equal(I.fieldValue(I.newField('eventTime',0,0),state.events.one),'3:00 PM');assert.match(I.fieldValue(I.newField('eventDate',0,0),state.events.one),/26th/);
 assert.throws(()=>GatheringHistory.manage(state,{action:'information',eventId:'one',date:'2026-11-26',information:{eventDate:'2026-02-30',eventTime:'x',rsvpDate:'',address:'x'}},new Date('2026-10-28')),/valid gathering/);
});
test('new year resets media aliases while the previous occurrence retains them',()=>{
 const state={events:{one:{...event(),eventDate:'2025-11-25',mediaPreviousDates:['2025-11-20']}},accounts:[]};GatheringHistory.startNext(state,'one','2026-11-25',new Date('2026-01-01'));assert.deepEqual(state.events.one.mediaPreviousDates,[]);assert.deepEqual(state.gatheringHistory.one['2025-11-25'].event.mediaPreviousDates,['2025-11-20']);
});
