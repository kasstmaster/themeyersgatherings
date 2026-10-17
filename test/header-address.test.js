import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function gatheringHeaderAddress()'),source.indexOf('function weddingDetailsWithoutHeaderAddress('));
function address(state,viewedEventId='wedding') { const context=vm.createContext({state,viewedEventId});vm.runInContext(code,context);return context.gatheringHeaderAddress(); }
test('Wedding header identifies ceremony and reception addresses instead of the home address',()=>{
  assert.equal(address({homeAddress:'Do not show',churchStreet:'123 Church St',churchCityStateZip:'Town CA 12345',venueStreet:'456 Venue Rd',venueCityStateZip:'City CA 67890'}),'123 Church St, Town CA 12345\n456 Venue Rd, City CA 67890');
});
test('Wedding header shows identical or single configured addresses only once',()=>{
  assert.equal(address({churchStreet:'at 123 Main St.',churchCityStateZip:'Town CA 12345',venueStreet:'123 main st',venueCityStateZip:'Town, CA 12345'}),'123 Main St., Town CA 12345');
  assert.equal(address({venueStreet:'456 Venue Rd'}),'456 Venue Rd');
  assert.equal(address({churchStreet:'123 Church St'}),'123 Church St');
  assert.equal(address({homeAddress:'Not a ceremony or reception'}),'');
});
test('other gathering headers retain their own configured home or invitation address',()=>{
  assert.equal(address({homeAddress:'123 Home St',churchStreet:'Not this'},'christmas'),'123 Home St');
  assert.equal(address({addressLine1:'456 Home Rd',addressLine2:'Town CA 12345'},'thanksgiving'),'456 Home Rd, Town CA 12345');
});


test('Wedding Details omits old location headings and the divider before What to Expect, preserving other content',()=>{
  const context=vm.createContext({state:{churchStreet:'123 Church St',venueStreet:'456 Venue Rd'},viewedEventId:'wedding',expandEditableTextVariables:value=>value});
  vm.runInContext(source.slice(source.indexOf('function gatheringHeaderAddress()'),source.indexOf('function render()')),context);
  const original='***Ceremony***\n123 Church St\n\n***Reception***\n456 Venue Rd\n\n---\n\n**WHAT TO EXPECT**\nEnjoy the evening.\n---\nBring dancing shoes.';
  assert.equal(context.weddingDetailsWithoutHeaderAddress(original).trim(),'Enjoy the evening.\n---\nBring dancing shoes.');
});
