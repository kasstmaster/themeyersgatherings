import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function applyEntryNavy('),source.indexOf('// The shared gathering chooser')),context);
test('entry palette copies navy once without linking gathering designs or overwriting subsequent home edits',()=>{
 const home={siteText:{title:'Own title'},elementAppearance:{'@group:buttons':{backgroundColor:'#fffaf1',backgroundAlpha:2,fontFamily:'Georgia',textColor:'#ffffff',borderColor:'#0a1d38'},'.event-dock':{backgroundColor:'#081930',toolbarTextColor:'#ffffff'}}};
 context.applyEntryNavy(home);for(const key of ['#eventSelectionPage','@group:buttons','.event-dock']){assert.equal(home.elementAppearance[key].backgroundColor,'#191f37');assert.equal(home.elementAppearance[key].backgroundAlpha,100);}
 assert.equal(home.elementAppearance['@group:buttons'].fontFamily,'Georgia');assert.equal(home.siteText.title,'Own title');home.elementAppearance['@group:buttons'].backgroundColor='#abcdef';context.applyEntryNavy(home);assert.equal(home.elementAppearance['@group:buttons'].backgroundColor,'#abcdef');
});
