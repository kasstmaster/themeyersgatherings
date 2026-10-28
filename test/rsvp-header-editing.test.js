import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const headerCode=source.slice(source.indexOf('function rsvpFirstPageTextFields()'),source.indexOf("document.querySelector('#rsvpConfirmEvent').addEventListener"));
const editorCode=source.slice(source.indexOf('function renderRsvpInlineEditing('),source.indexOf('function renderEventDock()'));
function fixture(editing,eventId='thanksgiving'){
 const fields=[],section={hidden:true},confirm={dataset:{},setAttribute(key,value){this[key]=value;},querySelector(){return {setAttribute:(key,value)=>{this.icon=value;}};}},wrong={},image={src:'main.png',hidden:false,removeAttribute(){this.src='';},addEventListener(){}};
 const clone={removeAttribute(){},querySelector:()=>image,querySelectorAll:selector=>selector==='img[src]'&&image.src?[image]:[]};
 const container={replaceChildren(node){this.child=node;}};
 const nodes={'#rsvpEventConfirmation':section,'#rsvpConfirmEvent':confirm,'#rsvpWrongEvent':wrong,'#eventPage .header-art':{cloneNode:()=>clone},'#rsvpEventHeader':container,'#rsvpEventHeader .header-art':clone,'#rsvpFirstPageImage':image,'#rsvpFirstPageDate':{},'#eventDate':{textContent:'October 23 2026'},'#rsvpFirstPageText':{},'#rsvpFirstPageDetails':{}};
 const state={rsvpHeaderImage:'rsvp.png'};
 const context=vm.createContext({state,gatheringRsvpStatus:()=>'',gatheringHeaderAddress:()=> 'Address',formatEditableText:value=>value,expandEditableTextVariables:value=>value,viewedEventId:eventId,EVENT_DETAILS:{[eventId]:{header:'main.png'}},GatheringFeatures:{rsvp:()=>({meals:false})},SiteEditing:{enabled:editing,applyStaticText(){},field:(target,title,specs,commit,options)=>fields.push({target,title,specs,commit,options})},document:{querySelector:selector=>nodes[selector]}});
 vm.runInContext(headerCode+editorCode,context);
 return {context,fields,section,confirm,wrong,image};
}
test('first RSVP page is visible and banner is editable in every regular gathering',()=>{
 for(const eventId of ['wedding','thanksgiving','christmas','new-gathering']){
  const f=fixture(true,eventId);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
  assert.equal(f.section.hidden,false);assert.equal(f.image.src,'rsvp.png');
  assert.equal(f.confirm.disabled,false);
  assert.equal(f.fields[0].options.key,'rsvp-first-page-banner');
  f.fields[0].commit(['new-rsvp.png']);f.context.renderRsvpEventHeader();assert.equal(f.image.src,'new-rsvp.png');
 }
});
test('guest confirmation stays visible and interactive without editing controls',()=>{
 const f=fixture(false);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
 assert.equal(f.section.hidden,false);assert.equal(f.confirm.disabled,false);assert.equal(f.fields.length,0);
});

test('all first pages have one fixed image, date, two text slots and shared first-page actions',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const section=html.slice(html.indexOf('<section id="rsvpEventConfirmation"'),html.indexOf('<div id="rsvpWeddingPages"'));
 const ids=[...section.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(ids,['rsvpEventConfirmation','rsvpEventHeader','rsvpFirstPageImage','rsvpFirstPageDate','rsvpFirstPageText','rsvpFirstPageDetails','rsvpConfirmEvent','hostFirstPageActions','weddingRsvpUploadToolbar','weddingPartyTabs','uploadPhotosButton','hostRsvpCounters','guestListButton','guestCount','notAttendingButton','notAttendingCount','noResponseButton','noResponseCount','invitedListButton','invitedCount']);
 assert.doesNotMatch(headerCode,/cloneNode/);
 for(const id of ['wedding','thanksgiving','christmas','new-gathering']){
  const f=fixture(true,id);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
  assert.equal(f.fields.length,4);
  f.fields[2].commit(['First text']);f.fields[3].commit(['Second text']);
  assert.equal(f.context.rsvpFirstPageTextFields()[0][1],'First text');
  assert.equal(f.context.rsvpFirstPageTextFields()[1][1],'Second text');
 }
});

test('previous first-page text edits carry into the shared text slots',()=>{
 const f=fixture(false);f.context.state.siteText={
  '#rsvpEventHeader>div:nth-of-type(1)>div:nth-of-type(1)>p:nth-of-type(1)':'Saved intro',
  '#rsvpEventHeader>div:nth-of-type(1)>p:nth-of-type(1)':'Saved details'
 };
 assert.equal(f.context.rsvpFirstPageTextFields()[0][1],'Saved intro');
 assert.equal(f.context.rsvpFirstPageTextFields()[1][1],'Saved details');
});

test('first-page RSVP icon follows the shared gathering response status',()=>{
 const f=fixture(false);const paths=new Set();
 for(const status of ['', 'attending', 'declined']){f.context.gatheringRsvpStatus=()=>status;f.context.renderRsvpEventHeader();assert.equal(f.confirm.dataset.rsvpStatus,status || 'pending');paths.add(f.confirm.icon);assert.ok(f.confirm['aria-description']);}
 assert.equal(paths.size,3);
});

test('pending RSVP text commits stay bound to their original gathering',()=>{
 const f=fixture(true);const original=f.context.state;f.context.renderRsvpInlineEditing();
 f.context.state={};f.fields[2].commit(['Original gathering only']);
 assert.equal(original.rsvpIntroText,'Original gathering only');assert.equal(f.context.state.rsvpIntroText,undefined);
});
