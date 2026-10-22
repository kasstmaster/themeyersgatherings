import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const quantity = source.slice(source.indexOf('function formatQuantity('), source.indexOf("document.querySelector('#adminNewAmount').innerHTML"));
const exports = source.slice(source.indexOf('function menuExportGroups('), source.indexOf('async function copyMenu()'));
function menu(items) {
  const context = vm.createContext({
    state: { items, quantityUnits: [{id:'dozen',label:'Dozen'}] }, PageActions: {},
    escapeHtml: value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  });
  vm.runInContext(quantity + exports, context);
  return context.PageActions.menuExport();
}
const item = (name, needed, claims = [], extra = {}) => ({name,needed,claims,category:'Sides',...extra});
test('copy and print separate committed and outstanding quantities without names', () => {
  const page = menu([
    item('Potatoes',3,['PRIVATE PERSON','PRIVATE PERSON']),
    item('Salad',1,['ANOTHER PERSON']),
    item('Rolls',2,[],{unit:'dozen'})
  ]);
  const [needed, bringing] = page.text.split('ITEMS ALREADY CLAIMED AND BEING BROUGHT');
  assert.ok(page.text.startsWith('ITEMS STILL NEEDED'));
  assert.ok(page.html.indexOf('<h2>ITEMS STILL NEEDED</h2>') < page.html.indexOf('<h2>ITEMS ALREADY CLAIMED AND BEING BROUGHT</h2>'));
  assert.match(bringing,/Potatoes — 2/);
  assert.match(bringing,/Salad — 1/);
  assert.doesNotMatch(bringing,/Rolls/);
  assert.match(needed,/Potatoes — 1/);
  assert.match(needed,/Rolls — 2 dozen/);
  assert.doesNotMatch(needed,/Salad/);
  for (const output of [page.text,page.html]) assert.doesNotMatch(output,/PRIVATE PERSON|ANOTHER PERSON|is bringing/);
  assert.match(page.html,/<h2>ITEMS ALREADY CLAIMED AND BEING BROUGHT<\/h2>/);
  assert.match(page.html,/<h2>ITEMS STILL NEEDED<\/h2>/);
});
test('empty groups, optional items, overfilled claims, and markup are handled', () => {
  assert.match(menu([]).text,/ITEMS STILL NEEDED\n\nNone\.\n\nITEMS ALREADY CLAIMED AND BEING BROUGHT\n\nNone\./);
  const page = menu([item('<Cake>',1,['PRIVATE','PRIVATE']), item('Extras',0,[],{optional:true})]);
  assert.match(page.text,/<Cake> — 2/);
  assert.match(page.text,/Extras — Optional/);
  assert.doesNotMatch(page.html,/<Cake>/);
  assert.match(page.html,/&lt;Cake&gt;/);
  assert.doesNotMatch(page.text.split('ITEMS ALREADY CLAIMED AND BEING BROUGHT')[0],/Cake/);
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
