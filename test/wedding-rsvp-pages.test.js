import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('../gathering-features.js');
const [source,html]=await Promise.all(['app.js','index.html'].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
const prefix=source.slice(source.indexOf('function renderWeddingGathering('),source.indexOf("  document.querySelector('#weddingMediaSection').hidden = false;"));
function visibility(host,party,tab,event='wedding'){
 const nodes={};const node=id=>nodes[id]??={hidden:false,close(){}};
 const c=vm.createContext({viewedEventId:event,GatheringFeatures,selectedWeddingTab:tab,selectedGuestTab:'attire',selectedMatronTab:'experience',signedInPersonName:'Person',state:{weddingPartyMembers:party?[{name:'Person'}]:[]},weddingPartyPersonMatches:(a,b)=>a===b,document:{querySelector:node,querySelectorAll:()=>[],getElementById:node}});
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
 assert.equal(visibility(true,false,'guest').result.showingBrideGroomPage,true);
 assert.equal(visibility(false,true,'party').result.showingWeddingPartyPage,true);
});
test('public Wedding content and Upload Photos follow RSVP buttons; private pages stay in main',()=>{
 const rsvp=html.slice(html.indexOf('<section id="rsvpEventConfirmation"'),html.indexOf('<section id="rsvpAttire"'));
 for(const id of ['weddingPartyTabs','guestInfoTabs','registryAttireSection','whatToExpectSection','registrySection','weddingPartySection'])assert.ok(rsvp.includes(`id="${id}"`),id);
 const start=html.indexOf('<main',html.indexOf('id="eventPage"'));
 const main=html.slice(start,html.indexOf('</main>',start));
 for(const id of ['weddingHostTabs','brideGroomSection','weddingTimelineSection']){assert.ok(main.includes(`id="${id}"`));assert.ok(!rsvp.includes(`id="${id}"`));}
 assert.ok(rsvp.indexOf('id="uploadPhotosButton"')>rsvp.indexOf('id="rsvpWrongEvent"'));
 assert.ok(rsvp.indexOf('id="uploadPhotosButton"')<rsvp.indexOf('id="rsvpWeddingPages"'));
 assert.equal(visibility(false,false,'guest','christmas').nodes['#rsvpWeddingPages'].hidden,true);
});

test('Wedding public pages use one flat tab bar without an extra Guest layer',()=>{
 const nav=html.slice(html.indexOf('<nav id="weddingPartyTabs"'),html.indexOf('</nav>',html.indexOf('<nav id="weddingPartyTabs"')));
 assert.deepEqual([...nav.matchAll(/data-wedding-tab="([^"]+)"/g)].map(m=>m[1]),['party','attire','registry','details']);
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
 assert.equal([...attire.matchAll(/<article class="wedding-tab-content">/g)].length,2);
});
test('moving Attire headings preserves saved edits and migration is repeatable',()=>{
 const saved={siteText:{'#registryAffordableAttire>p:nth-of-type(1)':'Edited kicker','#registryAffordableAttire>p:nth-of-type(2)':'Edited introduction','#registryAffordableAttire>p:nth-of-type(5)':'Edited closing'}};
 const start=source.indexOf('function renderInlineEditing()');
 const c=vm.createContext({state:saved,viewedEventId:'wedding'});
 vm.runInContext(source.slice(start,source.indexOf('  SiteEditing.render(',start))+'}',c);
 c.renderInlineEditing();c.renderInlineEditing();
 assert.equal(saved.siteText['#registryAttireKicker'],'Edited kicker');
 assert.equal(saved.siteText['#registryAttireLead'],'Edited introduction');
 assert.equal(saved.siteText['#registryAttireClosing'],'Edited closing');
 assert.ok(!Object.hasOwn(saved.siteText,'#registryAffordableAttire>p:nth-of-type(1)'));
});
