import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const bannerCode=source.slice(source.indexOf('function bannerTextKey('),source.indexOf('function updateHeaderImage('));
const headerCode=source.slice(source.indexOf('function compactRsvpDeadlineText('),source.indexOf("document.querySelector('#rsvpConfirmEvent').addEventListener"));
const editorCode=source.slice(source.indexOf('function renderRsvpInlineEditing('),source.indexOf('function renderEventDock()'));
function fixture(editing,eventId='thanksgiving'){
 const fields=[],section={hidden:true},confirm={dataset:{},setAttribute(key,value){this[key]=value;},querySelector(){return {setAttribute:(key,value)=>{this.icon=value;}};}},wrong={},image={src:'main.png',hidden:false,closest(selector){return !selector||selector==='.header-art'?clone:null;},removeAttribute(){this.src='';},addEventListener(){}};
 const clone={dataset:{},removeAttribute(){},querySelector:()=>image,querySelectorAll:selector=>selector==='img[src]'&&image.src?[image]:[]};
 const container={replaceChildren(node){this.child=node;}};
 const nodes={'#rsvpEventConfirmation':section,'#rsvpConfirmEvent':confirm,'#rsvpWrongEvent':wrong,'#eventPage .header-art':{cloneNode:()=>clone},'#rsvpEventHeader':container,'#rsvpEventHeader .header-art':clone,'#rsvpFirstPageImage':image,'#rsvpFirstPageDate':{},'#eventDate':{textContent:'October 23 2026'},'#rsvpFirstPageText':{},'#rsvpFirstPageDetails':{}};
 const state={rsvpHeaderImage:'rsvp.png'};
 const context=vm.createContext({state,isHostView:()=>true,gatheringRsvpStatus:()=>'',gatheringHeaderAddress:()=> 'Address',formatEditableText:value=>value,expandEditableTextVariables:value=>value,viewedEventId:eventId,EVENT_DETAILS:{[eventId]:{header:'main.png'}},GatheringFeatures:{rsvp:()=>({meals:false})},SiteEditing:{enabled:editing,applyStaticText(){},field:(target,title,specs,commit,options)=>{if(target)fields.push({target,title,specs,commit,options});}},document:{querySelector:selector=>nodes[selector]}});
 vm.runInContext(bannerCode+headerCode+editorCode,context);
 return {context,fields,section,confirm,wrong,image};
}
test('first RSVP page is visible and banner is editable in every regular gathering',()=>{
 for(const eventId of ['wedding','thanksgiving','christmas','new-gathering']){
  const f=fixture(true,eventId);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
  assert.equal(f.section.hidden,false);assert.equal(f.image.src,'rsvp.png');
  assert.equal(f.confirm.disabled,false);
  assert.equal(f.fields[0].options.key,'rsvp-first-page-banner');
  assert.equal(f.fields[0].specs.length,0);assert.equal(f.fields[0].commit,null);f.context.state.rsvpHeaderImage='new-rsvp.png';f.context.renderRsvpEventHeader();assert.equal(f.image.src,'new-rsvp.png');
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
 assert.deepEqual(ids,['rsvpEventConfirmation','rsvpEventHeader','rsvpFirstPageImage','rsvpBannerText','rsvpFirstPageDate','rsvpFirstPageText','rsvpFirstPageDetails','rsvpExtraTextBlocks','rsvpConfirmEvent','hostFirstPageActions','weddingRsvpUploadToolbar','weddingPartyTabs','uploadPhotosButton','hostRsvpCounters','guestListButton','guestCount','notAttendingButton','notAttendingCount','noResponseButton','noResponseCount','invitedListButton','invitedCount']);
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

test('empty RSVP banners keep their editable slot only in host edit mode',()=>{
 for(const editing of [false,true]){const f=fixture(editing,'new-gathering');f.context.state.rsvpHeaderImage='';f.context.renderRsvpEventHeader();assert.equal(f.image.hidden,true);const slot=f.image.closest();assert.equal(slot.dataset.emptyBanner,'true');assert.equal(slot.dataset.bannerEditing,String(editing));}
});

test('first RSVP information shortens only Kindly RSVP by dates without changing saved text',()=>{
 const f=fixture(false);const original='**Kindly RSVP by November 7, 2026**\nEvent on November 21, 2026';f.context.state.rsvpDetailsText=original;
 assert.equal(f.context.compactRsvpDeadlineText(original),'**Kindly RSVP by Nov. 7**\nEvent on November 21, 2026');
 assert.equal(f.context.compactRsvpDeadlineText('Kindly RSVP by November 7'),'Kindly RSVP by Nov. 7');assert.equal(f.context.compactRsvpDeadlineText('Kindly RSVP by **December 1st 2027**'),'Kindly RSVP by **Dec. 1**');assert.equal(f.context.compactRsvpDeadlineText('Kindly RSVP by May 5, 2026'),'Kindly RSVP by May 5');assert.equal(f.context.compactRsvpDeadlineText('Kindly RSVP by Nov. 7'),'Kindly RSVP by Nov. 7');
 assert.equal(f.context.state.rsvpDetailsText,original);
});

test('banner text stays in its gathering and slot, supports fallback and remains optional',()=>{
 const f=fixture(true),overlay={innerHTML:'',hidden:true},wrapper={querySelector:()=>overlay},image={id:'rsvpFirstPageImage',closest:selector=>selector==='.gathering-banner'?wrapper:null};
 f.context.state.siteBannerText='Main caption';assert.equal(f.context.bannerTextValue(image),'Main caption');f.context.renderBannerText(image);assert.equal(overlay.innerHTML,'Main caption');assert.equal(overlay.hidden,false);
 f.context.SiteEditing.editorFor=()=>null;f.context.setBannerText(image,'RSVP caption');assert.equal(f.context.state.siteBannerText,'Main caption');assert.equal(f.context.state.rsvpBannerText,'RSVP caption');assert.equal(overlay.innerHTML,'RSVP caption');
 f.context.setBannerText(image,'');assert.equal(overlay.hidden,true);assert.equal(f.context.bannerTextValue(image),'');
 const other=fixture(true,'another-gathering');assert.equal(other.context.bannerTextValue(image),'');
});

test('delayed banner text commits remain attached to the original gathering',()=>{
 const f=fixture(true),owner=f.context.state,overlay={innerHTML:'New page'},image={id:'rsvpFirstPageImage',closest:()=>({querySelector:()=>overlay})};f.context.state={rsvpBannerText:'Other gathering'};f.context.setBannerText(image,'Original gathering edit',owner);assert.equal(owner.rsvpBannerText,'Original gathering edit');assert.equal(f.context.state.rsvpBannerText,'Other gathering');assert.equal(overlay.innerHTML,'New page');
});

 test('banner autosaves preserve the live editing DOM until the editor releases ownership',()=>{
 const f=fixture(true),overlay={innerHTML:'Live text and caret',hidden:false},image={id:'rsvpFirstPageImage',closest:()=>({querySelector:()=>overlay})};let owned=true;f.context.ElementEditor={ownsText:part=>owned&&part===overlay};f.context.SiteEditing.editorFor=()=>null;
 f.context.setBannerText(image,'Saved draft');assert.equal(f.context.state.rsvpBannerText,'Saved draft');assert.equal(overlay.innerHTML,'Live text and caret');
 f.context.setBannerText(image,'');assert.equal(overlay.hidden,false);
 owned=false;f.context.renderBannerText(image);assert.equal(overlay.hidden,true);assert.equal(overlay.innerHTML,'');
 overlay.isContentEditable=true;f.context.setBannerText(image,'Typing again');assert.equal(overlay.innerHTML,'');overlay.isContentEditable=false;f.context.renderBannerText(image);assert.equal(overlay.innerHTML,'Typing again');assert.equal(overlay.hidden,false);
 });

test('extra RSVP text definitions keep valid stable IDs and gathering content independent',()=>{
 const f=fixture(false),one={rsvpTextBlocks:[{id:'box-one',content:'Own note'},{content:'Missing ID'},{id:'bad\" onclick=evil',content:'Unsafe ID'},{id:42,content:'Number ID'}]},two={rsvpTextBlocks:[{id:'box-two',content:'Other note'}]};
 assert.equal(f.context.rsvpTextBlocks(one).length,1);assert.equal(f.context.rsvpTextBlocks(one)[0].content,'Own note');assert.equal(f.context.rsvpTextBlocks(two)[0].content,'Other note');assert.equal(one.rsvpTextBlocks.length,4);assert.equal(f.context.rsvpTextBlocks({}).length,0);
});
