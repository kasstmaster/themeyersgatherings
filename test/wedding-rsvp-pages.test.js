import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('../gathering-features.js');
await import('../wedding-party.js');
const [source,html]=await Promise.all(['app.js','index.html'].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
const prefix=source.slice(source.indexOf('function renderWeddingGathering('),source.indexOf("  const hostTabs=document.querySelector('#weddingHostTabs');"));
function visibility(host,party,tab,event='wedding',subtab='experience'){
 const nodes={};const node=id=>nodes[id]??={hidden:false,close(){}};
 const c=vm.createContext({viewedEventId:event,GatheringFeatures,selectedBrideGroomPage:'main',selectedWeddingTab:tab,selectedGuestTab:'attire',selectedMatronTab:subtab,signedInPersonName:'Person',state:{weddingPartyMembers:party?[{name:'Person'}]:[]},weddingPartyPersonMatches:(a,b)=>a===b,document:{querySelector:node,querySelectorAll:()=>[],getElementById:node}});
 vm.runInContext(prefix+'return {showingBrideGroomPage,showingTimelinePage,showingWeddingPartyPage,showingGuestPage,showingAttirePage,showingWhatToExpectPage,showingRegistryPage};}',c);
 return {result:c.renderWeddingGathering(host),nodes};
}
test('private Wedding pages remain restricted after public pages move into RSVP',()=>{
 for(const tab of ['couple','timeline','guest','party','registry'])for(const party of [false,true]){
  const {result}=visibility(false,party,tab);assert.equal(result.showingBrideGroomPage,false);assert.equal(result.showingTimelinePage,false);
  if(!party)assert.equal(result.showingWeddingPartyPage,false);
 }
 assert.equal(visibility(true,false,'couple').result.showingBrideGroomPage,true);
 assert.equal(visibility(true,false,'timeline').result.showingTimelinePage,true);
 assert.equal(visibility(true,false,'guest').result.showingBrideGroomPage,false);
 assert.equal(visibility(false,true,'party').result.showingWeddingPartyPage,true);
 assert.equal(visibility(false,true,'party','wedding','shared-timeline').result.showingTimelinePage,true);
 assert.equal(visibility(false,false,'party','wedding','shared-timeline').result.showingTimelinePage,false);
});
test('Wedding pages share the RSVP shell while private pages remain host-only',()=>{
 const rsvp=html.slice(html.indexOf('<section id="rsvpEventConfirmation"'),html.indexOf('<section id="rsvpAttire"'));
 for(const id of ['weddingPartyTabs','guestInfoTabs','registryAttireSection','whatToExpectSection','registrySection','weddingPartySection'])assert.ok(rsvp.includes(`id="${id}"`),id);
 const start=html.indexOf('<main',html.indexOf('id="eventPage"'));
 const main=html.slice(start,html.indexOf('</main>',start));
 for(const id of ['weddingHostTabs','brideGroomSection','weddingTimelineSection']){assert.ok(!main.includes(`id="${id}"`));assert.ok(rsvp.includes(`id="${id}"`));}
 assert.ok(rsvp.indexOf('id="uploadPhotosButton"')>rsvp.indexOf('id="rsvpConfirmEvent"'));
 assert.ok(rsvp.indexOf('id="weddingRsvpUploadToolbar"')<rsvp.indexOf('id="rsvpWeddingPages"'));
 assert.match(rsvp,/<div id="weddingRsvpUploadToolbar"[^>]*role="toolbar"[^>]*hidden>[\s\S]*id="uploadPhotosButton"/);
 assert.equal(visibility(false,false,'guest','christmas').nodes['#rsvpWeddingPages'].hidden,true);
});

test('Wedding main pages are toolbar options without a Details option',()=>{
 const nav=html.slice(html.indexOf('<nav id="weddingPartyTabs"'),html.indexOf('</nav>',html.indexOf('<nav id="weddingPartyTabs"')));
 assert.deepEqual([...nav.matchAll(/data-wedding-tab="([^"]+)"/g)].map(m=>m[1]),['party','attire','registry','media']);
 assert.match(nav,/class="toolbar-page-navigation"/);assert.match(nav,/role="toolbar"/);
 assert.ok(html.indexOf('id="weddingPartyTabs"')>html.indexOf('id="weddingRsvpUploadToolbar"'));
 assert.match(html,/<nav id="guestInfoTabs" hidden/);
 assert.equal(visibility(false,false,'attire').result.showingAttirePage,true);
 assert.equal(visibility(false,false,'details').result.showingWhatToExpectPage,true);
 assert.equal(visibility(false,false,'registry').result.showingRegistryPage,true);
});

test('Attire places its kicker and title before the shared content container',()=>{
 const start=html.indexOf('<section id="registryAttireSection"');
 const attire=html.slice(start,html.indexOf('<section id="registryAttireVideosSection"',start));
 assert.ok(attire.indexOf('id="registryAttireKicker"')<attire.indexOf('id="registryAffordableAttire"'));
 assert.ok(attire.indexOf('id="registryAttireHeading"')<attire.indexOf('id="registryAffordableAttire"'));
 assert.match(attire,/<div id="registryAffordableAttire" class="attire-content-group/);
 assert.equal([...attire.matchAll(/<article class="wedding-tab-content" data-attire-group=/g)].length,2);
});
test('moving Attire headings preserves saved edits and migration is repeatable',()=>{
 const saved={siteText:{'#registryAffordableAttire>p:nth-of-type(1)':'Edited kicker','#registryAffordableAttire>p:nth-of-type(2)':'Edited introduction','#registryAffordableAttire>p:nth-of-type(5)':'Edited closing'}};
 const start=source.indexOf('function renderInlineEditing(');
 const c=vm.createContext({state:saved,viewedEventId:'wedding',gatheringBuilderContext:()=>({})});
 vm.runInContext(source.slice(start,source.indexOf('  SiteEditing.render(',start))+'}',c);
 c.renderInlineEditing();c.renderInlineEditing();
 assert.equal(saved.siteText['#registryAttireKicker'],'Edited kicker');
 assert.equal(saved.siteText['#registryAttireLead'],'Edited introduction');
 assert.equal(saved.siteText['#registryAttireClosing'],'Edited closing');
 assert.ok(!Object.hasOwn(saved.siteText,'#registryAffordableAttire>p:nth-of-type(1)'));
});

test('Wedding Party page headings follow attire, duties, experience, and custom titles',()=>{
 const start=source.indexOf('function renderWeddingPartyPageHeading('),end=source.indexOf('function renderWeddingGathering(',start);
 const nodes={'#weddingPartyKicker':{dataset:{}},'#weddingPartyHeading':{dataset:{}}};
 const c=vm.createContext({WeddingParty,state:{},formatEditableText:value=>value,document:{querySelector:selector=>nodes[selector]}});vm.runInContext(source.slice(start,end),c);
 for(const [tab,page,kicker,title] of [
  ['attire',null,'Dress for the occasion','FORMAL ATTIRE REQUIRED'],
  ['duties',null,'The people by our side','Your Responsibilities'],
  ['experience',null,'The people by our side','The Perfect Experience'],
  ['custom',{title:'Travel Plans'},'The people by our side','Travel Plans'],
  ['member-page',{title:'Personal Schedule'},'The people by our side','Personal Schedule']
 ]){c.renderWeddingPartyPageHeading(tab,page);assert.equal(nodes['#weddingPartyKicker'].innerHTML,kicker);assert.equal(nodes['#weddingPartyHeading'].innerHTML,title);}
});

test('party attire has one editable intro without a third container before the dress-code panels',()=>{
 const start=html.indexOf('id="registryAffordableAttire"');
 const intro=html.indexOf('id="weddingPartyAttireIntro"',start),groups=html.indexOf('id="weddingAttireGuidance"',start);
 assert.ok(intro>start&&intro<groups);
 assert.match(html.slice(intro,groups),/class="party-attire-intro"[\s\S]*id="weddingPartyAttireIntroText"/);
 const attire=html.slice(start,html.indexOf('id="registryAttireVideosSection"',start));
 assert.doesNotMatch(attire,/Formal attire does not have to mean an expensive outfit|We want everyone to dress up|We've gathered a few/);
 assert.match(source,/field\('#weddingPartyAttireIntroText','text',\[\['weddingPartyAttireIntro'/);
});

test('Responsibilities uses the signed-in member role and name in its header',()=>{
 const start=source.indexOf('function renderWeddingPartyPageHeading('),end=source.indexOf('function renderWeddingGathering(',start);
 const nodes={'#weddingPartyKicker':{dataset:{}},'#weddingPartyHeading':{dataset:{}}};
 const c=vm.createContext({WeddingParty,state:{},formatEditableText:value=>value,document:{querySelector:selector=>nodes[selector]}});vm.runInContext(source.slice(start,end),c);
 for(const member of [{name:'Casey Example',title:'Groomsman'},{name:'Jordan Example',title:'Matron of Honor'}]){
  c.renderWeddingPartyPageHeading('duties',null,member);assert.equal(nodes['#weddingPartyKicker'].innerHTML,member.title);assert.equal(nodes['#weddingPartyHeading'].innerHTML,member.name);
 }
 const sub=html.match(/<nav id="matronInfoTabs"[\s\S]*?<\/nav>/)[0];assert.doesNotMatch(sub,/data-matron-tab="attire"/);assert.match(sub,/data-matron-tab="duties"[^>]*aria-selected="true">Responsibilities/);
 assert.match(html,/<article class="wedding-tab-content" data-attire-group="ladies">/);assert.match(html,/<article class="wedding-tab-content" data-attire-group="gentlemen">/);
});

test('shared Details reads and edits the public canonical page without exposing host-only pages',()=>{
 const state={whatToExpectContent:'Legacy',sitePages:[{id:'private',weddingDefault:'details',audience:'host',content:'Private host notes'},{id:'public',weddingDefault:'details',audience:'guests',content:'Public details'}]};
 const c=vm.createContext({state,weddingDetailsWithoutHeaderAddress:value=>value});
 vm.runInContext(source.slice(source.indexOf('function sharedWeddingDetails()'),source.indexOf('function renderWeddingPartyPageHeading(')),c);
 assert.equal(c.sharedWeddingDetailsText(),'Public details');c.saveSharedWeddingDetails('Edited public details');
 assert.equal(state.sitePages[1].content,'Edited public details');assert.equal(state.sitePages[0].content,'Private host notes');assert.equal(state.whatToExpectContent,'Legacy');
});
