import '../guest-planning.js';
import '../gathering-history.js';
import AnyListModule from 'anylist';
import { categoriesFromRawUserData, convertCategory, syncAnyListAccounts } from './anylist-accounts.js';
import { ensureAccountQrAccess } from './qr-access.js';

const required = name => { if (!process.env[name]) throw new Error(`${name} is not configured.`); return process.env[name]; };
const ownerRepo = required('STATE_REPOSITORY').split('/');
if (ownerRepo.length !== 2) throw new Error('STATE_REPOSITORY must be owner/repository.');
const [owner, repo] = ownerRepo;
const branch = process.env.STATE_BRANCH || 'main';
const statePath = process.env.STATE_PATH || 'data/app-state.json';
const syncId = required('SYNC_ID');
const token = required('STATE_REPOSITORY_TOKEN');
const apiHeaders = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'thanksgiving-anylist-sync', 'X-GitHub-Api-Version': '2022-11-28' };

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, { ...options, headers: { ...apiHeaders, ...options.headers } });
  if (!response.ok) throw new Error(`GitHub ${options.method || 'GET'} failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}
const contentUrl = path => `/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
async function getFile(path) {
  const file = await github(`${contentUrl(path)}?ref=${encodeURIComponent(branch)}`);
  return { sha: file.sha, value: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) };
}
async function putFile(path, value, message, sha) {
  return github(contentUrl(path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString('base64'), branch, ...(sha ? { sha } : {}) }) });
}
async function writeStatus(status) {
  const path = `.anylist-sync/${syncId}.json`;
  let sha;
  try { sha = (await getFile(path)).sha; } catch (error) { if (!error.message.includes('(404)')) throw error; }
  await putFile(path, status, `Record AnyList sync ${syncId}`, sha);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return [...value.values()];
  return value && typeof value === 'object' ? Object.values(value) : [];
}
function structuredLists(client, loginResult) {
  const candidates = [loginResult?.lists, client.lists, loginResult];
  return asArray(candidates.find(value => asArray(value).length));
}
async function run() {
  console.log('AnyList sync started.');
  const email = required('ANYLIST_EMAIL');
  const password = required('ANYLIST_PASSWORD');
  const listName = process.env.ANYLIST_LIST_NAME || 'Address Book';
  const AnyList = AnyListModule.AnyList || AnyListModule.default || AnyListModule;
  const client = AnyList.length >= 2 ? new AnyList(email, password) : new AnyList({ email, password });
  let loginResult;
  try { loginResult = await client.login(false); console.log('AnyList authentication succeeded.'); }
  catch (error) { console.error('AnyList authentication failed.'); throw error; }
  const loadedLists = await client.getLists();
  const lists = asArray(loadedLists).length ? asArray(loadedLists) : structuredLists(client, loginResult);
  const list = lists.find(candidate => String(candidate.name).trim().toLocaleLowerCase() === listName.toLocaleLowerCase());
  if (!list) throw new Error(`AnyList list “${listName}” was not found.`);
  const listId = list.identifier;
  console.log(`Address Book list ID: ${listId}`);
  const raw = categoriesFromRawUserData(client._userData, listId);
  console.log(`Raw items: ${asArray(raw.rawList.items).length}`);
  console.log(`Category groups: ${raw.groups.length}`);
  console.log(`Categories discovered (${raw.categories.length}): ${raw.categories.map(category => category.name).join(', ') || '(none)'}`);
  for (const category of raw.categories) console.log(`Category “${category.name}”: ${category.items.length} assigned item(s)`);
  console.log(`Unassigned items: ${raw.unassigned}`);
  const accounts = [];
  let skipped = 0;
  for (const category of raw.categories) {
    const converted = convertCategory(category.name, category.items);
    skipped += converted.skipped.length;
    if (converted.account) accounts.push({ ...converted, id: category.id }); else skipped += 1;
    console.log(`Category “${category.name}” account: ${converted.account ?? '(none)'}`);
  }
  console.log(`${accounts.length} accounts converted; ${skipped} ambiguous/empty entries skipped.`);
  let outcome = { added: [], updated: [], skipped: [] };
  let qrAccessCreated = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getFile(statePath);
    const state = current.value;
    if (!Array.isArray(state.accounts)) throw new Error('Current state has no accounts array.');
    GatheringHistory.archiveDue(state);
    outcome = syncAnyListAccounts(state, accounts);
    console.log(`${outcome.updated.length} account(s) updated; ${outcome.added.length} added; ${outcome.skipped.length} ambiguous account(s) skipped.`);
    qrAccessCreated = ensureAccountQrAccess(state.accounts);
    console.log(qrAccessCreated
      ? `Created QR access for ${qrAccessCreated} account(s).`
      : 'All accounts already have QR access.');
    try { await putFile(statePath, state, `Sync ${accounts.length} account(s) from AnyList`, current.sha); console.log('Account state saved successfully.'); break; }
    catch (error) { if (!error.message.includes('(409)') || attempt === 2) throw error; console.log('State changed concurrently; retrying against the latest SHA.'); }
  }
  await writeStatus({ state: 'complete', added: outcome.added.length, updated: outcome.updated.length, skipped: skipped + outcome.skipped.length, qrAccessCreated, finishedAt: new Date().toISOString() });
}

run().catch(async error => {
  console.error(`AnyList sync failed: ${error.message}`);
  try { await writeStatus({ state: 'failed', finishedAt: new Date().toISOString() }); } catch (statusError) { console.error(`Could not save failure status: ${statusError.message}`); }
  process.exitCode = 1;
});
