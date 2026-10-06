import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const deletionCode = source.slice(source.indexOf('function canDeleteWebsiteAccount('), source.indexOf('function openAccountsAdmin('));
function fixture(hostAuthenticated = true) {
  const website = { name: 'Website Person', source: 'website', qrToken: 'local-token' };
  const imported = { name: 'Imported Person', source: 'website', anyListCategoryId: 'category-id' };
  const legacyImport = { name: 'Old Import', source: 'anylist' };
  const context = vm.createContext({
    hostAuthenticated, appState: { accounts: [website, imported, legacyImport], events: { wedding: {
      rsvps: [{ name: website.name }], items: [{ claims: [website.name] }],
      weddingPartyMembers: [{ name: website.name, responsibilities: 'Keep content' }]
    } } }, qrScopedAccount: website, saves: 0,
    saveState() { context.saves++; }, render() {}, openAccountsAdmin() {}, showToast() {}
  });
  vm.runInContext(deletionCode, context);
  return { context, website, imported, legacyImport };
}
test('website account deletion removes account and QR access without removing gathering history or member content', () => {
  const { context, website } = fixture();
  const before = JSON.stringify(context.appState.events);
  assert.equal(context.deleteWebsiteAccount(website), true);
  assert.equal(context.appState.accounts.includes(website), false);
  assert.equal(context.qrScopedAccount, null);
  assert.equal(JSON.stringify(context.appState.events), before);
  assert.equal(context.saves, 1);
  assert.equal(context.deleteWebsiteAccount(website), false);
});
test('AnyList accounts and non-host deletion attempts are protected', () => {
  const { context, imported, legacyImport } = fixture();
  assert.equal(context.deleteWebsiteAccount(imported), false);
  assert.equal(context.deleteWebsiteAccount(legacyImport), false);
  const guest = fixture(false);
  assert.equal(guest.context.deleteWebsiteAccount(guest.website), false);
  assert.equal(context.appState.accounts.length, 3);
  assert.equal(context.saves, 0);
});
