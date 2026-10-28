import test from 'node:test';
import assert from 'node:assert/strict';
await import('../wedding-party.js');
const party=globalThis.WeddingParty;
function fixture(){return {wedding:{siteText:{},elementAppearance:{'@group:titles':{fontSize:30},'@group:introductions':{textColor:'#123456'}},weddingPartyMembers:[{id:'one',name:'Casey Example',title:'Groomsman',responsibilities:'Keep one',pages:[{id:'same',title:'Travel One',content:'Keep page one'}]},{id:'two',name:'Jordan Example',title:'Bridesmaid',responsibilities:'Keep two',pages:[{id:'same',title:'Travel Two',content:'Keep page two'}]}],sitePages:[{id:'a',nav:'matronInfoTabs',title:'Custom A',content:'A'},{id:'b',nav:'matronInfoTabs',title:'Custom B',content:'B'}]},thanksgiving:{siteText:{unchanged:'Other gathering'},elementAppearance:{'@group:titles':{fontSize:20}}}};}
const field=(state,tab,page,member,part='title')=>party.headingFields(state,tab,page,member).find(item=>item.part===part);
test('heading words are independently owned by each subpage/member/custom page and survive reload/reorder',()=>{
 const events=fixture(),state=events.wedding,other=structuredClone(events.thanksgiving),original=structuredClone(state),pages=party.visiblePages(state.weddingPartyMembers,true);
 const cases=[['duties',null,null],['experience',null,null],['shared-details',null,null],['shared-timeline',null,null],...state.weddingPartyMembers.map(member=>['duties',null,member]),...pages.map(page=>['custom',page,null]),...state.sitePages.map(page=>['custom',page,null])];
 const keys=cases.map(args=>field(state,...args).path);assert.equal(new Set(keys).size,keys.length);
 cases.forEach((args,index)=>{const entry=field(state,...args);state.siteText[entry.path]='**Own heading '+index+'**';});
 const kicker=field(state,...cases[0],'kicker');state.siteText[kicker.path]='Own introduction';
 let saved=JSON.parse(JSON.stringify(events));saved.wedding.weddingPartyMembers.reverse();saved.wedding.weddingPartyMembers[0].title='Matron of Honor';
 cases.forEach((args,index)=>assert.equal(field(saved.wedding,...args).value,'**Own heading '+index+'**'));
 assert.equal(field(state,...cases[1],'kicker').value,'The people by our side');
 assert.deepEqual(state.elementAppearance,original.elementAppearance);assert.deepEqual(state.weddingPartyMembers,original.weddingPartyMembers);assert.deepEqual(events.thanksgiving,other);
 assert.deepEqual(party.parseHeadingPath(keys[4]),['duties','one','title']);
 assert.deepEqual(party.parseHeadingPath(field(state,'custom',{id:3,title:'Legacy ID'}).path),['site-page','3','title']);
});
test('unambiguous old heading markup stays with its original page; ambiguous records are retained without spreading',()=>{
 const state=fixture().wedding;
 state.textAppearance={'#weddingPartyHeading':{parts:[{source:'Edited Responsibilities',original:'Your Responsibilities',markup:'**Edited Responsibilities**',overrideText:'Edited Responsibilities'}]},'#weddingPartyKicker':{parts:[{source:'Old edited introduction',original:'The people by our side',markup:'Old edited introduction',overrideText:'Old edited introduction'}]}};
 state.siteText['#weddingPartyHeading']='Older ambiguous text';const before=structuredClone(state);
 assert.equal(field(state,'duties').value,'**Edited Responsibilities**');
 for(const tab of ['shared-details','shared-timeline','experience']){assert.notEqual(field(state,tab).value,'**Edited Responsibilities**');assert.equal(field(state,tab,null,null,'kicker').value,'The people by our side');}
 assert.deepEqual(state,before);
 const scoped=field(state,'duties');state.siteText[scoped.path]='New own title';assert.equal(field(state,'duties').value,'New own title');assert.deepEqual(state.textAppearance,before.textAppearance);
});
test('legacy member names and custom-page titles resolve only to unique stable owners',()=>{
 const state=fixture().wedding;
 state.textAppearance={'#weddingPartyHeading':{parts:[{original:'Casey Example',source:'Edited',markup:'Edited'}]}};
 assert.equal(field(state,'duties',null,state.weddingPartyMembers[0]).value,'Edited');assert.equal(field(state,'duties',null,state.weddingPartyMembers[1]).value,'Jordan Example');
 state.weddingPartyMembers[1].name='Casey Example';assert.deepEqual(party.legacyHeadingText(state),{});
 state.textAppearance['#weddingPartyHeading']={parts:[{source:'Timeline',overrideText:'Timeline',markup:'Timeline'}]};assert.deepEqual(party.legacyHeadingText(state),{});
 assert.equal(party.parseHeadingPath('[data-content-key="party-heading:invalid"]'),null);
});
