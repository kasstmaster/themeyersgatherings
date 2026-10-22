import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const quantity = source.slice(source.indexOf('function formatQuantity('), source.indexOf("document.querySelector('#adminNewAmount').innerHTML"));
const exports = source.slice(source.indexOf('function menuExportIntro('), source.indexOf('async function copyMenu()'));
function menu(items, gatheringName = 'Thanksgiving') {
  const context = vm.createContext({
    EVENT_DETAILS: {test: {name:gatheringName}}, viewedEventId: 'test',
    state: { items, quantityUnits: [{id:'dozen',label:'Dozen'}] }, PageActions: {},
    escapeHtml: value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  });
  vm.runInContext(quantity + exports, context);
  return context.PageActions.menuExport();
}
const item = (name, needed, claims = [], extra = {}) => ({name,needed,claims,category:'Sides',...extra});
test('copy and print use one list with remaining quantities, claimed labels, and no names', () => {
  const page = menu([
    item('Potatoes',3,['PRIVATE PERSON','PRIVATE PERSON']),
    item('Salad',1,['ANOTHER PERSON']),
    item('Rolls',2,[],{unit:'dozen'})
  ]);
  assert.equal(page.text, "Here's the list of items for Thanksgiving. Some dishes have already been claimed but we still need others!\n\n• Potatoes - need 1\n• Salad ✓ CLAIMED\n• Rolls - need 2 dozen");
  assert.equal((page.html.match(/<ul>/g) || []).length,1);
  assert.equal((page.html.match(/<li>/g) || []).length,3);
  assert.match(page.html,/<li>Potatoes - need 1<\/li>/);
  assert.match(page.html,/<li>Salad ✓ CLAIMED<\/li>/);
  for (const output of [page.text,page.html]) assert.doesNotMatch(output,/PRIVATE PERSON|ANOTHER PERSON|is bringing|ITEMS STILL NEEDED/);
});
test('gathering title, empty lists, optional items, overfilled claims, and markup are handled', () => {
  assert.match(menu([],'Christmas').text,/^Here's the list of items for Christmas\.[\s\S]*No items listed\.$/);
  const page = menu([item('<Cake>',1,['PRIVATE','PRIVATE']), item('Extras',0,[],{optional:true}), item('Dessert',2,['PRIVATE'],{optional:true})], '<Party>');
  assert.match(page.text,/<Cake> ✓ CLAIMED/);
  assert.match(page.text,/Extras - need 1 \(optional\)/);
  assert.match(page.text,/Dessert ✓ CLAIMED/);
  assert.doesNotMatch(page.html,/<Cake>|<Party>/);
  assert.match(page.html,/&lt;Cake&gt;/);
  assert.match(page.html,/items for &lt;Party&gt;/);
});
test('menu page actions use the same name-free export for printing and email', async () => {
  const actions = await readFile(new URL('../page-actions.js', import.meta.url), 'utf8');
  const context = vm.createContext({document:{addEventListener(){}}});
  vm.runInContext(actions,context);
  const expected = menu([item('Salad',1,['PRIVATE PERSON'])]);
  context.PageActions.menuExport = () => expected;
  const surface = {id:'gatheringMenuSection',closest(){return null;},getClientRects(){return [1];}};
  assert.equal(context.PageActions.exportPage(surface),expected);
  assert.doesNotMatch(context.PageActions.exportPage(surface).html,/PRIVATE PERSON/);
});
