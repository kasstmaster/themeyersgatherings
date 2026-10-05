const STORAGE_KEY = 'meyers-thanksgiving-v2';
const BACKUP_STORAGE_KEY = `${STORAGE_KEY}-backup`;
const SHARED_SAVE_PENDING_KEY = `${STORAGE_KEY}-shared-save-pending`;
const LEGACY_STORAGE_KEYS = ['meyers-thanksgiving-v1'];
const SHARED_STATE_URL = document.querySelector('meta[name="shared-state-url"]')?.content.trim() || '';
const REPOSITORY_STATE_URL = document.querySelector('meta[name="repository-state-url"]')?.content.trim() || 'data/app-state.json';
const HOST_PASSWORD = '0810'; // Change this before publishing your site.
const HOST_DISPLAY_NAME = 'The Host';
const DEFAULT_EVENT_DATE = '2026-11-28';
const DEFAULT_CHRISTMAS_DATE = '2026-12-25';
const DEFAULT_WEDDING_DATE = '2027-08-10';
const DEFAULT_REGISTRY_URL = 'https://www.amazon.com/wedding/share/kassandraandsteven';
const DEFAULT_WEDDING_TIMELINE = `**11:00 AM**\tGetting ready begins\tHair, makeup, food, drinks, music. Deliberately generous amount of time.
**1:30 PM**\tSteven begins getting ready\tGroom/groomsmen do not need to start nearly as early.
**2:30 PM**\tChurch/setup complete\tFlorals, candles, programs, reception setup, cameras, audio, etc. should be DONE.
**3:00 PM**\tSteven completely ready\tHe can relax with his groomsmen.
**3:00 PM**\tKassandra gets dressed\tMom/MOH/etc. help. No rushing.
**3:15 PM**\tWedding party ready\tEveryone is now officially “on deck.”
**3:30 PM**\tDoors open / guests arrive\tPrelude music. Ushers seat guests. Unplugged-ceremony reminder displayed.
**3:45 PM**\tWedding party disappears\tNobody wandering around where guests can see them. Steven takes his place.
**3:55 PM**\tDoors close / final lineup\tWedding party lines up. Kassandra and Dad have a few private minutes together.
**4:00 PM**\t**CEREMONY**\tTraditional processional, vows, rings, prayer, pronouncement.
**4:25–4:30 PM**\tRecessional\tYou are married.
**4:30 PM**\tCocktail hour begins\tGuests immediately transition into drinks, music and conversation.
**4:30–4:45 PM**\tFormal portraits\t**Hard 15-minute limit.** Predetermined shot list only.
**4:45–5:05 PM**\t**Kassandra + Steven disappear**\tPrivate room. Drinks waiting. No photographers. No wedding party. No questions.
**5:05 PM**\tJoin the reception\tNo grand entrance. You simply walk in together.
**5:15 PM**\t**First dance**\tYour first real reception moment. Short, intimate, natural.
**5:20–5:30 PM**\tEveryone settles for dinner\tDrinks refreshed, guests find seats, dinner service begins.
**5:30–7:15 PM**\t**DINNER**\tThis gets a huge block because you actually want to experience it.
**During dinner**\tToasts & speeches\tSpaced naturally between courses rather than one giant speech block.
**~7:15 PM**\tCake/dessert begins\tNo elaborate cake-cutting production required unless you want one.
**~7:30 PM**\t**Daddy-daughter dance**\tDad comes to get Kassandra as dinner winds down.
**~7:35 PM onward**\t**THE BALL**\tMusic gradually transitions. Couples naturally join the floor.
**7:35–10:30 PM-ish**\tDancing / drinks / dessert / conversation\tNothing else is scheduled. This is the wedding.
**~10:30 PM onward**\tDeparture window opens\tTransportation is available, but there is no countdown.
**Whenever it feels right**\t**Kassandra + Steven leave**\tNo mandatory staged exit. You're done when you're ready.`;
const WEDDING_PARTY_TITLES = [
  { value: 'Officiant', multiple: false },
  { value: 'Matron of Honor', multiple: false },
  { value: 'Best Man', multiple: false },
  { value: 'Bridesmaid', multiple: true },
  { value: 'Groomsman', multiple: true },
  { value: 'Flower Girl', multiple: true },
  { value: 'Ring Bearer', multiple: true },
  { value: 'Ushers', multiple: true }
];
const CHRISTMAS_MENU_VERSION = 2;
const ACCOUNT_RESET_VERSION = 1;
const SIGNUP_RESET_VERSION = 1;
const NETWORK_TIMEOUT_MS = 10000;
const SHARED_SAVE_RETRY_DELAYS = [1000, 3000, 10000, 30000];
const DEFAULT_QUANTITY_UNITS = [
  { id: 'item', label: 'Item', locked: true },
  { id: 'dozen', label: 'Dozen' }
];

const defaultItems = [
  { id: 'ham', name: 'Ham', category: 'Main Table', needed: 1, claims: [] },
  { id: 'turkey', name: 'Turkey', category: 'Main Table', needed: 1, claims: [] },
  { id: 'turkey-gravy', name: 'Turkey Gravy', category: 'Sides', needed: 1, claims: [] },
  { id: 'mashed-potatoes', name: 'Mashed Potatoes', category: 'Sides', needed: 1, claims: [] },
  { id: 'stuffing', name: 'Stuffing', category: 'Sides', needed: 1, claims: [] },
  { id: 'green-bean-casserole', name: 'Green Bean Casserole', category: 'Sides', needed: 1, claims: [] },
  { id: 'mac-n-cheese', name: 'Mac n Cheese', category: 'Sides', needed: 1, claims: [] },
  { id: 'candied-yams', name: 'Candied Yams', category: 'Sides', needed: 1, claims: [] },
  { id: 'cranberry-sauce', name: 'Cranberry Sauce', category: 'Sides', needed: 1, claims: [] },
  { id: 'dinner-rolls', name: 'Dinner Rolls', category: 'Sides', needed: 1, claims: [] },
  { id: 'deviled-eggs', name: 'Deviled Eggs', category: 'Appetizers', needed: 1, claims: [] },
  { id: 'chips', name: 'Chips', category: 'Appetizers', needed: 1, claims: [] },
  { id: 'veggie-tray', name: 'Veggie Tray', category: 'Appetizers', needed: 1, claims: [] },
  { id: 'dips', name: 'Dips', category: 'Appetizers', needed: 1, claims: [] },
  { id: 'pumpkin-pie', name: 'Pumpkin Pie', category: 'Desserts', needed: 1, claims: [] },
  { id: 'cherry-pie', name: 'Cherry Pie', category: 'Desserts', needed: 1, claims: [] },
  { id: 'apple-pie', name: 'Apple Pie', category: 'Desserts', needed: 1, claims: [] },
  { id: 'water', name: 'Water', category: 'Drinks', needed: 1, claims: [] },
  { id: 'soda', name: 'Soda', category: 'Drinks', needed: 1, claims: [] },
  { id: 'beer', name: 'Beer', category: 'Drinks', needed: 1, claims: [] },
  { id: 'whiskey', name: 'Whiskey', category: 'Drinks', needed: 1, claims: [] },
  { id: 'wine', name: 'Wine', category: 'Drinks', needed: 1, claims: [] }
];
// Add one entry per invited household. The account name is also their sign-in name.
const GUEST_ACCOUNTS = [];

const EVENT_DETAILS = {
  thanksgiving: { name: 'Thanksgiving', theme: 'thanksgiving', header: 'https://i.postimg.cc/JnFX8pPS/Website-Header-Thanksgiving.png' },
  christmas: { name: 'Christmas', theme: 'christmas', header: 'https://i.postimg.cc/rmMy7x1t/Website-Header-Christmas.png' },
  wedding: { name: 'Wedding', theme: 'wedding', header: 'https://i.ibb.co/KjtXKDRn/Wedding-Header-Website-No-Border.png', registryOnly: true, hasMenu: false }
};

function christmasItems() {
  return [
    { id: 'cocktail-meatballs', name: 'Cocktail Meatballs', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'jalapeno-poppers', name: 'Jalapeño Poppers', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'charcuterie-board', name: 'Charcuterie Board', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'crudite-platter', name: 'Fresh Vegetable Crudité Platter', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'shrimp-cocktail-platter', name: 'Shrimp Cocktail Platter', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'dips', name: 'Dips', category: 'Appetizers', needed: 1, claims: [] },
    { id: 'potato-dish', name: 'Potato Dish — mashed, roasted, etc.', category: 'Sides', needed: 1, claims: [] },
    { id: 'broccoli-salad', name: 'Broccoli Salad', category: 'Sides', needed: 1, claims: [] },
    { id: 'black-forest-cheesecake', name: 'Black Forest Cheesecake', category: 'Desserts', needed: 1, claims: [] },
    { id: 'cookies', name: 'Cookies', category: 'Desserts', needed: 1, claims: [] },
    { id: 'pie', name: 'Pie', category: 'Desserts', needed: 1, claims: [] },
    { id: 'banana-bread', name: 'Banana Bread', category: 'Desserts', needed: 1, claims: [] },
    { id: 'water', name: 'Water', category: 'Drinks', needed: 1, claims: [] },
    { id: 'soda', name: 'Soda', category: 'Drinks', needed: 1, claims: [] },
    { id: 'beer', name: 'Beer', category: 'Drinks', needed: 1, claims: [] },
    { id: 'whiskey', name: 'Whiskey', category: 'Drinks', needed: 1, claims: [] },
    { id: 'wine', name: 'Wine', category: 'Drinks', needed: 1, claims: [] },
    { id: 'mulled-wine', name: 'Mulled Wine', category: 'Drinks', needed: 1, claims: [] }
  ];
}
function defaultInvitationSettings(eventDate) {
  const event = new Date(`${eventDate}T12:00:00Z`);
  event.setUTCDate(event.getUTCDate() - 14);
  return { rsvpDate: event.toISOString().slice(0, 10), addressLine1: '221 W China Grade Loop', addressLine2: 'Bakersfield CA 93308' };
}
function makeEvent(items, eventDate, menuVersion) { return { items, rsvps: [], eventDate, homeAddress: '', ...defaultInvitationSettings(eventDate), accountSelectionResetFor: '', menuVersion, quantityUnits: structuredClone(DEFAULT_QUANTITY_UNITS) }; }
function initialAppState() {
  return {
    activeEventId: 'thanksgiving',
    accountResetVersion: ACCOUNT_RESET_VERSION,
    signupResetVersion: SIGNUP_RESET_VERSION,
    accounts: structuredClone(GUEST_ACCOUNTS),
    invitationTemplates: [],
    events: {
      thanksgiving: makeEvent(structuredClone(defaultItems), DEFAULT_EVENT_DATE),
      christmas: makeEvent(christmasItems(), DEFAULT_CHRISTMAS_DATE, CHRISTMAS_MENU_VERSION),
      wedding: { ...makeEvent([], DEFAULT_WEDDING_DATE), weddingMealOptions: ['', '', ''], weddingChildMealOption: '', churchWeekDay: '', churchYear: '', churchTime: '', churchStreet: '', churchCityStateZip: '', venueTime: '', venueStreet: '', venueCityStateZip: '', registryUrl: DEFAULT_REGISTRY_URL, monetaryGiftUrl: '', brideGroomContent: '', brideGroomPages: [], perfectExperienceContent: '', timelineAboveContent: '', timelineContent: DEFAULT_WEDDING_TIMELINE, timelineBelowContent: '', whatToExpectContent: '', attireVideos: [], weddingPartyMembers: [], weddingPartyAttireImages: { ladies: [], gentlemen: [] }, weddingPartyAttireNotes: { ladies: '', gentlemen: '' } }
    }
  };
}

function accountCanSignIn(account, eventId) {
  return account.selectedEvents?.[eventId] === true;
}

function accountIsInvited(account, eventId) {
  return account.invitedEvents?.[eventId] === true;
}

function plusOneCount(account, eventId) {
  const adults = accountSignInNames(account.name).length;
  return Math.min(adults, Math.max(0, Math.floor(Number(account.plusOnes?.[eventId]) || 0)));
}

function availableEventIds(accountName = guestName) {
  const ids = Object.keys(EVENT_DETAILS).filter(id => appState.events?.[id]);
  if (isViewingAsGuest()) {
    if (hostWeddingPartyViewName === GENERAL_GUEST_PREVIEW) return ids.filter(id => id === viewedEventId);
    const previewAccount = findAccount(hostWeddingPartyViewName);
    return previewAccount ? ids.filter(id => accountCanSignIn(previewAccount, id)) : ids.filter(id => id === viewedEventId);
  }
  if (hostAuthenticated || accountName === HOST_DISPLAY_NAME) return ids;
  const account = findAccount(accountName);
  return account ? ids.filter(id => accountCanSignIn(account, id)) : [];
}

let appState = loadState();
let viewedEventId = appState.activeEventId;
let state = appState.events[viewedEventId];
let guestName = '';
let signedInPersonName = '';
let selectedWeddingTab = 'guest';
let selectedGuestTab = 'attire';
let selectedMatronTab = 'experience';
let selectedBrideGroomPage = 'main';
let hostWeddingPartyViewName = '';
const GENERAL_GUEST_PREVIEW = '__general_guest__';
let pendingAccountAction = null;
let pendingClaimItemId = null;
let hostAuthenticated = false;
let hostCredential = '';
let qrScopedAccount = null;
let qrAdminAccount = null;
let invitationPreviewAccount = null;
let localStateRevision = 0;
const singleColumnMenu = window.matchMedia('(max-width: 800px)');

function normalizeState(saved) {
  try {
    if (!saved) return initialAppState();
    if (saved.events) {
      const fresh = initialAppState();
      const loaded = {
        ...fresh,
        ...saved,
        activeEventId: saved.events[saved.activeEventId] ? saved.activeEventId : 'thanksgiving',
        accounts: (Array.isArray(saved.accounts) ? saved.accounts : fresh.accounts).filter(account => account && typeof account.name === 'string').map(account => {
          const legacySelection = account.alwaysInvite === true || account.selected !== false;
          return {
            ...account,
            alwaysInvite: account.alwaysInvite === true,
            plusOnes: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [
              eventId,
              Math.max(0, Math.floor(Number(account.plusOnes?.[eventId] ?? (eventId === 'wedding' ? account.weddingPlusOnes : 0)) || 0))
            ])),
            selectedEvents: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [
              eventId,
              typeof account.selectedEvents?.[eventId] === 'boolean'
                ? account.selectedEvents[eventId]
                : legacySelection
            ])),
            invitedEvents: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [
              eventId,
              typeof account.invitedEvents?.[eventId] === 'boolean'
                ? account.invitedEvents[eventId]
                : typeof account.selectedEvents?.[eventId] === 'boolean'
                  ? account.selectedEvents[eventId]
                  : legacySelection
            ]))
          };
        }),
        events: { ...fresh.events, ...saved.events },
        invitationTemplates: Array.isArray(saved.invitationTemplates) ? saved.invitationTemplates : []
      };
      delete loaded.activeEventIds;
      if (loaded.events.christmas.menuVersion !== CHRISTMAS_MENU_VERSION) {
        const previousClaims = new Map(loaded.events.christmas.items.map(item => [item.id, item.claims]));
        loaded.events.christmas.items = christmasItems().map(item => ({ ...item, claims: previousClaims.get(item.id) || [] }));
        loaded.events.christmas.menuVersion = CHRISTMAS_MENU_VERSION;
      }
      // Version markers describe the current schema; they must never be used
      // to erase real guest data from an older browser copy. Previous builds
      // cleared accounts, RSVPs, and claims when either marker was absent.
      loaded.accountResetVersion = ACCOUNT_RESET_VERSION;
      loaded.signupResetVersion = SIGNUP_RESET_VERSION;
      Object.entries(loaded.events).forEach(([eventId, eventState]) => {
        const fallback = fresh.events[eventId] || makeEvent([], DEFAULT_EVENT_DATE);
        if (!eventState || typeof eventState !== 'object') {
          loaded.events[eventId] = structuredClone(fallback);
          return;
        }
        eventState.items = Array.isArray(eventState.items) ? eventState.items : structuredClone(fallback.items);
        eventState.items = eventState.items.map((item, index) => ({
          ...item,
          id: String(item?.id || `recovered-${eventId}-${index}`),
          name: String(item?.name || 'Untitled item'),
          category: String(item?.category || 'Sides'),
          needed: Number.isFinite(Number(item?.needed)) && Number(item.needed) > 0 ? Number(item.needed) : 1,
          claims: Array.isArray(item?.claims) ? item.claims.filter(name => typeof name === 'string') : []
        }));
        eventState.rsvps = Array.isArray(eventState.rsvps) ? eventState.rsvps
          .filter(rsvp => rsvp && typeof rsvp.name === 'string')
          .map(rsvp => ({
            ...rsvp,
            adults: Math.max(0, Number(rsvp.adults) || 0),
            children: Math.max(0, Number(rsvp.children) || 0),
            menuSelections: Array.isArray(rsvp.menuSelections) ? rsvp.menuSelections.filter(selection => selection && typeof selection === 'object').map(selection => ({
              type: selection.type === 'child' ? 'child' : 'adult',
              index: Math.max(0, Math.floor(Number(selection.index) || 0)),
              name: typeof selection.name === 'string' ? selection.name : '',
              customName: typeof selection.customName === 'string' ? selection.customName : '',
              meal: typeof selection.meal === 'string' ? selection.meal : '',
              dietaryRestrictions: typeof selection.dietaryRestrictions === 'string' ? selection.dietaryRestrictions : ''
            })) : []
          })) : [];
        eventState.eventDate = typeof eventState.eventDate === 'string' ? eventState.eventDate : fallback.eventDate;
        eventState.homeAddress = typeof eventState.homeAddress === 'string' ? eventState.homeAddress : '';
        const invitationFallback = defaultInvitationSettings(eventState.eventDate);
        eventState.rsvpDate = typeof eventState.rsvpDate === 'string' ? eventState.rsvpDate : invitationFallback.rsvpDate;
        eventState.addressLine1 = typeof eventState.addressLine1 === 'string' ? eventState.addressLine1 : invitationFallback.addressLine1;
        eventState.addressLine2 = typeof eventState.addressLine2 === 'string' ? eventState.addressLine2 : invitationFallback.addressLine2;
        eventState.invitationTemplateId = typeof eventState.invitationTemplateId === 'string' ? eventState.invitationTemplateId : '';
        eventState.quantityUnits = Array.isArray(eventState.quantityUnits) && eventState.quantityUnits.length
          ? eventState.quantityUnits.filter(unit => unit && typeof unit.id === 'string' && typeof unit.label === 'string')
          : structuredClone(DEFAULT_QUANTITY_UNITS);
        if (!eventState.quantityUnits.length) eventState.quantityUnits = structuredClone(DEFAULT_QUANTITY_UNITS);
      });
      // Invitation templates used to be global. Preserve existing artwork by
      // attaching legacy records to the gathering that selected them (or the
      // active gathering when they were never selected).
      loaded.invitationTemplates = loaded.invitationTemplates.map(template => {
        if (loaded.events[template.eventId]) return template;
        const assignedEventId = Object.keys(loaded.events).find(eventId => loaded.events[eventId].invitationTemplateId === template.id);
        return { ...template, eventId: assignedEventId || loaded.activeEventId };
      });
      loaded.events.wedding.registryUrl = loaded.events.wedding.registryUrl || DEFAULT_REGISTRY_URL;
      const wedding = loaded.events.wedding;
      wedding.weddingMealOptions = Array.from({ length: 3 }, (_, index) => typeof wedding.weddingMealOptions?.[index] === 'string' ? wedding.weddingMealOptions[index] : '');
      wedding.weddingChildMealOption = typeof wedding.weddingChildMealOption === 'string' ? wedding.weddingChildMealOption : '';
      const locationFields = ['churchWeekDay', 'churchYear', 'churchTime', 'churchStreet', 'churchCityStateZip', 'venueTime', 'venueStreet', 'venueCityStateZip'];
      locationFields.forEach(key => { wedding[key] = typeof wedding[key] === 'string' ? wedding[key] : ''; });
      // Preserve addresses entered before church and venue details were split into reusable lines.
      if (!wedding.churchStreet && typeof wedding.churchAddress === 'string') wedding.churchStreet = wedding.churchAddress;
      if (!wedding.venueStreet && typeof wedding.venueAddress === 'string') wedding.venueStreet = wedding.venueAddress;
      loaded.events.wedding.monetaryGiftUrl = typeof loaded.events.wedding.monetaryGiftUrl === 'string'
        ? loaded.events.wedding.monetaryGiftUrl
        : '';
      loaded.events.wedding.brideGroomContent = typeof loaded.events.wedding.brideGroomContent === 'string'
        ? loaded.events.wedding.brideGroomContent
        : '';
      loaded.events.wedding.brideGroomPages = Array.isArray(loaded.events.wedding.brideGroomPages)
        ? loaded.events.wedding.brideGroomPages.filter(page => page && typeof page === 'object').map((page, index) => ({
          id: String(page.id || `bride-groom-page-${index + 2}`),
          title: String(page.title || `Page ${index + 2}`),
          content: typeof page.content === 'string' ? page.content : ''
        }))
        : [];
      loaded.events.wedding.perfectExperienceContent = typeof loaded.events.wedding.perfectExperienceContent === 'string'
        ? loaded.events.wedding.perfectExperienceContent
        : '';
      delete loaded.events.wedding.bacheloretteContent;
      loaded.events.wedding.timelineContent = typeof loaded.events.wedding.timelineContent === 'string'
        ? loaded.events.wedding.timelineContent
        : DEFAULT_WEDDING_TIMELINE;
      loaded.events.wedding.timelineAboveContent = typeof loaded.events.wedding.timelineAboveContent === 'string'
        ? loaded.events.wedding.timelineAboveContent
        : '';
      loaded.events.wedding.timelineBelowContent = typeof loaded.events.wedding.timelineBelowContent === 'string'
        ? loaded.events.wedding.timelineBelowContent
        : '';
      loaded.events.wedding.whatToExpectContent = typeof loaded.events.wedding.whatToExpectContent === 'string'
        ? loaded.events.wedding.whatToExpectContent
        : '';
      loaded.events.wedding.attireVideos = Array.isArray(loaded.events.wedding.attireVideos)
        ? loaded.events.wedding.attireVideos.filter(url => typeof url === 'string')
        : [];
      loaded.events.wedding.weddingPartyMembers = WeddingParty.normalizeMembers(loaded.events.wedding.weddingPartyMembers);
      delete loaded.events.wedding.weddingPartyDescriptions;
      const savedAttireImages = loaded.events.wedding.weddingPartyAttireImages;
      loaded.events.wedding.weddingPartyAttireImages = Object.fromEntries(['ladies', 'gentlemen'].map(section => [section,
        Array.isArray(savedAttireImages?.[section]) ? savedAttireImages[section].filter(image => image && typeof image.url === 'string').map(image => ({
          id: String(image.id || ''), url: image.url, caption: typeof image.caption === 'string' ? image.caption : '',
          contentType: typeof image.contentType === 'string' ? image.contentType : '', width: Number(image.width) || 0, height: Number(image.height) || 0
        })) : []
      ]));
      const savedAttireNotes = loaded.events.wedding.weddingPartyAttireNotes;
      loaded.events.wedding.weddingPartyAttireNotes = Object.fromEntries(['ladies', 'gentlemen'].map(section => [
        section, typeof savedAttireNotes?.[section] === 'string' ? savedAttireNotes[section] : ''
      ]));
      return loaded;
    }
    // Upgrade the original single-Thanksgiving data. Keep its sign-ups so an
    // older browser copy can be used to recover information after a bad sync.
    const upgraded = initialAppState();
    upgraded.events.thanksgiving = {
      items: saved.items || structuredClone(defaultItems),
      rsvps: saved.rsvps || [],
      eventDate: saved.eventDate || DEFAULT_EVENT_DATE, accountSelectionResetFor: saved.accountSelectionResetFor || '',
      quantityUnits: structuredClone(DEFAULT_QUANTITY_UNITS)
    };
    const recoveredNames = new Set([
      ...upgraded.events.thanksgiving.rsvps.map(rsvp => rsvp.name),
      ...upgraded.events.thanksgiving.items.flatMap(item => item.claims || [])
    ].filter(name => name && name !== HOST_DISPLAY_NAME));
    upgraded.accounts = [...recoveredNames].map(name => ({
      name,
      selected: true,
      selectedEvents: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [eventId, true])),
      invitedEvents: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [eventId, true]))
    }));
    return upgraded;
  } catch { return initialAppState(); }
}
function loadState() {
  const candidates = [STORAGE_KEY, BACKUP_STORAGE_KEY, ...LEGACY_STORAGE_KEYS].flatMap(key => {
    try {
      const value = localStorage.getItem(key);
      return value ? [normalizeState(JSON.parse(value))] : [];
    } catch { return []; }
  });
  if (!candidates.length) return initialAppState();
  const recovered = candidates.reduce((best, candidate) => stateRecoveryScore(candidate) > stateRecoveryScore(best) ? candidate : best);
  storeLocalState(recovered);
  return recovered;
}
function stateRecoveryScore(candidate) {
  const events = Object.values(candidate.events || {});
  const accounts = candidate.accounts?.length || 0;
  const rsvps = events.reduce((total, event) => total + (event.rsvps?.length || 0), 0);
  const claims = events.reduce((total, event) => total + (event.items || []).reduce((sum, item) => sum + (item.claims?.length || 0), 0), 0);
  const templates = candidate.invitationTemplates?.length || 0;
  return accounts * 10000 + templates * 1000 + rsvps * 100 + claims;
}
function storeLocalState(nextState) {
  try {
    const serialized = JSON.stringify(nextState);
    const current = localStorage.getItem(STORAGE_KEY);
    if (current && current !== serialized) localStorage.setItem(BACKUP_STORAGE_KEY, current);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error('Could not save a local state backup.', error);
    return false;
  }
}
function saveState() {
  appState.events[viewedEventId] = state;
  const storedLocally = storeLocalState(appState);
  localStateRevision += 1;
  render();
  queueSharedStateSave();
  if (!storedLocally) showToast('This change could not be backed up on this device.');
}

let sharedSaveTimer;
let sharedSavePending = (() => {
  try { return Boolean(SHARED_STATE_URL && localStorage.getItem(SHARED_SAVE_PENDING_KEY)); }
  catch { return false; }
})();
let sharedSaveInProgress = false;
let sharedSaveError = false;
let sharedSaveRetryCount = 0;
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
function renderSyncStatus() {
  const status = document.querySelector('#syncStatus');
  if (!status) return;
  if (!SHARED_STATE_URL) {
    status.hidden = false;
    status.className = 'sync-status local-only';
    status.innerHTML = '<strong>Saved on this device only</strong>Menu items appear everywhere because the defaults are published with the site. Accounts, claims, and RSVPs will not reach other devices until the shared-state Worker URL is configured.';
    return;
  }
  status.hidden = !sharedSaveError;
  status.className = `sync-status${sharedSaveError ? ' error' : ''}`;
  status.innerHTML = sharedSaveError
    ? '<strong>Cross-device sync needs attention</strong>The latest change is safe on this device and will be retried after the connection is restored.'
    : '';
}
function queueSharedStateSave() {
  if (!SHARED_STATE_URL) return;
  sharedSavePending = true;
  try { localStorage.setItem(SHARED_SAVE_PENDING_KEY, 'true'); } catch { /* The state backup already reports storage failures. */ }
  sharedSaveError = false;
  sharedSaveRetryCount = 0;
  renderSyncStatus();
  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = setTimeout(saveSharedState, 250);
}
async function saveSharedState() {
  // Timers can fire while a slower request is still running. Keeping PUTs
  // strictly sequential prevents an older request from finishing last and
  // replacing a newer edit on the shared copy.
  if (!sharedSavePending || sharedSaveInProgress) return;
  sharedSavePending = false;
  sharedSaveInProgress = true;
  let saveFailed = false;
  try {
    const response = await fetchWithTimeout(SHARED_STATE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState)
    });
    if (!response.ok) throw new Error(`Shared state save failed (${response.status})`);
    sharedSaveError = false;
    sharedSaveRetryCount = 0;
    if (!sharedSavePending) {
      try { localStorage.removeItem(SHARED_SAVE_PENDING_KEY); } catch { /* Retry marker cleanup is best effort. */ }
    }
  } catch (error) {
    console.error(error);
    saveFailed = true;
    sharedSaveError = true;
    sharedSavePending = true;
    showToast('This change is saved on this device, but could not sync to other devices.');
  } finally {
    sharedSaveInProgress = false;
    renderSyncStatus();
    // A change may have been made while the request was running. Failed saves
    // retry with a bounded backoff so a temporary outage cannot strand edits.
    if (sharedSavePending) {
      clearTimeout(sharedSaveTimer);
      const delay = saveFailed
        ? SHARED_SAVE_RETRY_DELAYS[Math.min(sharedSaveRetryCount++, SHARED_SAVE_RETRY_DELAYS.length - 1)]
        : 250;
      sharedSaveTimer = setTimeout(saveSharedState, delay);
    }
  }
}
async function loadSharedState() {
  const stateUrl = SHARED_STATE_URL || REPOSITORY_STATE_URL;
  if (!stateUrl) return;
  // Never replace a local edit with a stale response while that edit is
  // waiting to be uploaded.
  if (sharedSavePending || sharedSaveInProgress) return;
  const revisionBeforeLoad = localStateRevision;
  try {
    const response = await fetchWithTimeout(stateUrl, { cache: 'no-store' });
    if (response.status === 404 || response.status === 204) {
      if (SHARED_STATE_URL) queueSharedStateSave();
      return;
    }
    if (!response.ok) throw new Error(`Shared state load failed (${response.status})`);
    const saved = normalizeState(await response.json());
    if (localStateRevision !== revisionBeforeLoad || sharedSavePending || sharedSaveInProgress) return;
    // The checked-in repository file is read-only when no Worker is set up.
    // Use it to seed a browser, but do not let an older/emptier copy erase a
    // richer local state (most visibly, newly added accounts) on refresh or
    // when the window regains focus.
    if (!SHARED_STATE_URL && stateRecoveryScore(appState) > stateRecoveryScore(saved)) return;
    appState = saved;
    viewedEventId = hostAuthenticated && appState.events[viewedEventId] ? viewedEventId : appState.activeEventId;
    state = appState.events[viewedEventId];
    storeLocalState(appState);
    render();
  } catch (error) {
    console.error(error);
    showToast('Could not refresh sign-ups. Showing the last data saved on this device.');
  }
}
function escapeHtml(value) { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }
function escapeAttribute(value) { return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function safeEditableLink(value) {
  const href = String(value || '').trim();
  return /^(?:https?:|mailto:|tel:|\/(?!\/)|\.{1,2}\/|#)/i.test(href) ? href : '';
}
function formatWeddingPartyDescription(value) {
  value = expandEditableTextVariables(value);
  const formatMarkdown = text => escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>');
  const formatInline = line => {
    const parts = [];
    let cursor = 0;
    for (const match of line.matchAll(/\[([^\]\r\n]+)\]\(([^)\r\n]+)\)|<([^<>\r\n]+)>/g)) {
      parts.push(formatMarkdown(line.slice(cursor, match.index)));
      if (match[1] !== undefined) {
        const href = safeEditableLink(match[2]);
        parts.push(href
          ? `<a href="${escapeAttribute(href)}">${formatMarkdown(match[1])}</a>`
          : formatMarkdown(match[0]));
      } else {
        const address = match[3].trim();
        if (address) parts.push(`<a class="map-link" href="geo:0,0?q=${encodeURIComponent(address)}" title="Open ${escapeAttribute(address)} in your maps app">${escapeHtml(address)}</a>`);
        else parts.push(formatMarkdown(match[0]));
      }
      cursor = match.index + match[0].length;
    }
    parts.push(formatMarkdown(line.slice(cursor)));
    return parts.join('');
  };
  const output = [];
  let openList = '';
  const closeList = () => {
    if (!openList) return;
    output.push(`</${openList}>`);
    openList = '';
  };
  String(value || '').split(/\r?\n/).forEach(line => {
    if (/^\s*---\s*$/.test(line)) {
      closeList();
      output.push('<hr>');
      return;
    }
    const bullet = line.match(/^\s*[-+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const listType = bullet ? 'ul' : numbered ? 'ol' : '';
    if (listType) {
      if (openList !== listType) { closeList(); openList = listType; output.push(`<${listType}>`); }
      output.push(`<li>${formatInline((bullet || numbered)[1])}</li>`);
      return;
    }
    closeList();
    if (line.trim()) output.push(`<p>${formatInline(line)}</p>`);
  });
  closeList();
  return output.join('');
}
function editableTextVariables() {
  const eventDate = new Date(`${state.eventDate}T12:00:00`);
  const locationLines = keys => keys.map(key => state[key] || '').join('\n');
  return {
    date: Number.isNaN(eventDate.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate).replaceAll(',', ''),
    home: state.homeAddress || '',
    church: locationLines(['churchWeekDay', 'churchYear', 'churchTime', 'churchStreet', 'churchCityStateZip']),
    venue: locationLines(['venueTime', 'venueStreet', 'venueCityStateZip']),
    registry: state.registryUrl || '',
    monetary: state.monetaryGiftUrl || ''
  };
}
function expandEditableTextVariables(value) {
  const variables = editableTextVariables();
  return String(value || '').replace(/\{(date|home|church|venue|registry|monetary)\}/g, (_placeholder, name) => variables[name]);
}
function formatEditableText(value) { return formatWeddingPartyDescription(value); }
function renderWeddingTimeline(value) {
  const rows = String(value || '').split(/\r?\n/).map(line => line.split('\t')).filter(columns => columns.some(column => column.trim()));
  return rows.map(columns => {
    const [time = '', event = '', notes = ''] = columns;
    return `<tr><td>${formatEditableText(time)}</td><td>${formatEditableText(event)}</td><td>${formatEditableText(notes)}</td></tr>`;
  }).join('');
}
function amountOptions(item = {}) {
  return `<option value="optional" ${item.optional ? 'selected' : ''}>Optional</option>${Array.from({ length: 50 }, (_, index) => {
    const amount = index + 1;
    return `<option value="${amount}" ${!item.optional && item.needed === amount ? 'selected' : ''}>${amount}</option>`;
  }).join('')}`;
}
function unitOptions(item = {}) {
  const selectedUnit = state.quantityUnits.some(unit => unit.id === item.unit) ? item.unit : 'item';
  return state.quantityUnits.map(unit => `<option value="${escapeAttribute(unit.id)}" ${unit.id === selectedUnit ? 'selected' : ''}>${escapeHtml(unit.label)}${unit.id === 'item' ? '(s)' : ''}</option>`).join('');
}
function formatQuantity(quantity, item = {}) {
  if (!item.unit || item.unit === 'item') return String(quantity);
  const unit = state.quantityUnits.find(entry => entry.id === item.unit);
  if (!unit) return String(quantity);
  const label = unit.label.toLocaleLowerCase();
  let plural = label;
  if (quantity !== 1 && label !== 'dozen') {
    if (/[^aeiou]y$/i.test(label)) plural = `${label.slice(0, -1)}ies`;
    else if (/(s|x|z|ch|sh)$/i.test(label)) plural = `${label}es`;
    else plural = `${label}s`;
  }
  return `${quantity} ${plural}`;
}
document.querySelector('#adminNewAmount').innerHTML = amountOptions({ needed: 1 });
function normalizeAccountName(value) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\s/g, '');
}
function householdDisplayName(value) {
  const name = value.trim();
  if (!name || name === HOST_DISPLAY_NAME) return name;
  if (/^the\s+/i.test(name)) return name.replace(/^the\s+/i, 'The ');
  const lastName = firstAccountLastName(name);
  if (/['’]$/.test(lastName)) return `The ${lastName}`;
  return `The ${lastName}${/s$/i.test(lastName) ? "'" : 's'}`;
}
function contributionDisplayName(value) {
  return value.trim() === HOST_DISPLAY_NAME ? 'Host' : householdDisplayName(value);
}
function invitedAccountDisplayName(value) {
  return value.split('/').map(household => householdDisplayName(household)).join(' / ');
}
function hostFirstRsvps(rsvps) {
  return [...rsvps].sort((a, b) => Number(b.name === HOST_DISPLAY_NAME) - Number(a.name === HOST_DISPLAY_NAME));
}
function removeItemClaims(item, claimant, quantity) {
  let remaining = quantity;
  item.claims = item.claims.filter(name => {
    if (name !== claimant || remaining < 1) return true;
    remaining -= 1;
    return false;
  });
  return quantity - remaining;
}
function accountSignInNames(accountName) {
  return accountName.split('/').flatMap(household => {
    const names = household.split(',').map(name => name.trim()).filter(Boolean);
    return names.map((name, index) => {
      if (name.split(/\s+/).length >= 2) return name;
      const nextFullName = names.slice(index + 1).find(candidate => candidate.split(/\s+/).length >= 2);
      if (!nextFullName) return '';
      const words = nextFullName.split(/\s+/);
      if (words.length > 2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1))) words.pop();
      return `${name} ${words.at(-1)}`;
    }).filter(Boolean);
  });
}
function accountContactGroups(accountName) {
  const groups = [];
  accountSignInNames(accountName).forEach(fullName => {
    const words = fullName.trim().split(/\s+/);
    const suffix = words.length > 2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1)) ? words.pop() : '';
    const surname = words.pop() || '';
    const givenName = [...words, suffix].filter(Boolean).join(' ');
    if (!surname || !givenName) return;
    const existingGroup = groups.find(group => group.surname.toLocaleLowerCase() === surname.toLocaleLowerCase());
    if (existingGroup) existingGroup.givenNames.push(givenName);
    else groups.push({ surname, givenNames: [givenName] });
  });
  return groups;
}
function accountContactsHtml(account) {
  const adults = accountContactGroups(account.name).map(group => `<div><strong>${escapeHtml(group.surname)}:</strong> ${group.givenNames.map(escapeHtml).join(', ')}</div>`).join('');
  const children = (account.children || []).length
    ? `<div class="account-children"><strong>Children:</strong> ${account.children.map(escapeHtml).join(', ')}</div>`
    : '';
  return adults + children;
}
function firstAccountLastName(accountName) {
  const firstPerson = accountSignInNames(accountName)[0] || accountName;
  const words = firstPerson.trim().split(/\s+/);
  if (words.length > 2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1))) words.pop();
  return words.at(-1) || '';
}
function accountNameMatches(enteredName, accountName) {
  const normalizedEntry = normalizeAccountName(enteredName);
  return accountSignInNames(accountName).some(name => normalizeAccountName(name) === normalizedEntry);
}
function findAccount(name) {
  const normalizedName = normalizeAccountName(name);
  // Once signed in, guestName contains the complete stored household account
  // (which can include commas or slashes), not one person's sign-in name.
  return appState.accounts.find(account => normalizeAccountName(account.name) === normalizedName)
    || appState.accounts.find(account => accountNameMatches(name, account.name));
}
function accountQrTokenFromLocation() {
  const match = window.location.hash.match(/^#\/signin\/account\/([A-Za-z0-9_-]+)$/);
  return match?.[1] || null;
}
function isAccountQrRoute() { return window.location.hash.startsWith('#/signin/account/'); }
function accountForSignIn(name) {
  return qrScopedAccount
    ? (accountNameMatches(name, qrScopedAccount.name) ? qrScopedAccount : null)
    : findAccount(name);
}
function accountQrUrl(account) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/signin/account/${account.qrToken}`;
}
function safeQrFilename(name) {
  const filename = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${filename || 'account'}-qr`;
}
function makeQrCode(url) {
  const code = new window.QRCode(0, 1);
  code.addData(url);
  code.make();
  return code;
}
function qrSvg(code) {
  const quietZone = 4;
  const count = code.getModuleCount();
  const size = count + quietZone * 2;
  const modules = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (code.isDark(row, column)) modules.push(`<rect x="${column + quietZone}" y="${row + quietZone}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Account sign-in QR code"><g fill="#111">${modules.join('')}</g></svg>`;
}
function downloadBlob(blob, filename) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}
function downloadQrSvg(account) {
  const svg = qrSvg(makeQrCode(accountQrUrl(account)));
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeQrFilename(account.name)}.svg`);
}
function downloadQrPng(account) {
  const code = makeQrCode(accountQrUrl(account));
  const quietZone = 4;
  const moduleSize = 12;
  const count = code.getModuleCount();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = (count + quietZone * 2) * moduleSize;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111111';
  for (let row = 0; row < count; row += 1) for (let column = 0; column < count; column += 1) {
    if (code.isDark(row, column)) context.fillRect((column + quietZone) * moduleSize, (row + quietZone) * moduleSize, moduleSize, moduleSize);
  }
  canvas.toBlob(blob => { if (blob) downloadBlob(blob, `${safeQrFilename(account.name)}.png`); }, 'image/png');
}

function invitationAccounts() {
  return window.Invitation.eligibleAccounts(appState.accounts, viewedEventId);
}
function invitationTemplatesForEvent(eventId = viewedEventId) {
  return appState.invitationTemplates.filter(template => template.eventId === eventId);
}
function invitationQrUrl(account) {
  return account?.qrToken ? accountQrUrl(account) : `${window.location.origin}${window.location.pathname}#/signin/sample-preview`;
}
function canvasBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
async function renderInvitation(canvas, account) {
  const template = invitationTemplatesForEvent().find(item => item.id === state.invitationTemplateId);
  const model = window.Invitation.invitationModel(template, state, invitationQrUrl(account));
  await window.Invitation.render(canvas, model, makeQrCode(model.qrUrl));
  return model;
}
async function openInvitationPreview(account = invitationAccounts()[0] || null) {
  const dialog = document.querySelector('#invitationPreviewDialog');
  const status = document.querySelector('#invitationPreviewStatus');
  const canvasWrap = document.querySelector('#invitationCanvasWrap');
  const downloadButton = document.querySelector('#downloadInvitationPng');
  invitationPreviewAccount = account;
  document.querySelector('#invitationPreviewHeading').textContent = `${EVENT_DETAILS[viewedEventId].name} invitation`;
  document.querySelector('#invitationPreviewAccount').textContent = account ? `Previewing the QR for ${account.name}. The account name is not printed.` : 'Previewing an explicit sample QR. No account name is printed.';
  status.classList.remove('form-error');
  status.textContent = 'Loading invitation preview…';
  canvasWrap.hidden = true;
  downloadButton.disabled = true;
  document.querySelector('#configureInvitationTemplate').hidden = true;
  if (!dialog.open) dialog.showModal();
  const gatheringTemplates = invitationTemplatesForEvent();
  let assignedTemplate = gatheringTemplates.find(template => template.id === state.invitationTemplateId);
  if (!assignedTemplate && gatheringTemplates.length === 1) {
    assignedTemplate = gatheringTemplates[0];
    state.invitationTemplateId = assignedTemplate.id;
    saveState();
  }
  if (!assignedTemplate) {
    invitationPreviewAccount = null;
    status.classList.add('form-error');
    status.textContent = gatheringTemplates.length
      ? `You have ${gatheringTemplates.length} saved invitation templates for ${EVENT_DETAILS[viewedEventId].name}, but none is selected. Choose which template to use.`
      : `Create an invitation template for ${EVENT_DETAILS[viewedEventId].name} before previewing it.`;
    const configureButton = document.querySelector('#configureInvitationTemplate');
    configureButton.textContent = gatheringTemplates.length ? 'Choose invitation template' : 'Create invitation template';
    configureButton.hidden = false;
    return;
  }
  try {
    const canvas = document.querySelector('#invitationCanvas');
    const model = await renderInvitation(canvas, account);
    const warnings = window.Invitation.overflowWarnings(canvas, model);
    document.querySelector('#invitationOverflowWarning').textContent = warnings.length ? `These values exceed their locked safe width: ${warnings.join(', ')}. Shorten them before downloading.` : '';
    status.textContent = '';
    canvasWrap.hidden = false;
    downloadButton.disabled = !account?.qrToken;
  } catch (caught) {
    invitationPreviewAccount = null;
    status.classList.add('form-error');
    status.textContent = `Unable to preview the invitation. ${caught.message}`;
  }
}
async function downloadInvitation(account) {
  if (!account?.qrToken) return;
  const canvas = document.createElement('canvas');
  await renderInvitation(canvas, account);
  const blob = await canvasBlob(canvas);
  if (blob) downloadBlob(blob, window.Invitation.filenameFor(account.name, EVENT_DETAILS[viewedEventId].name));
}
async function invitationFile(account) {
  const canvas = document.createElement('canvas');
  await renderInvitation(canvas, account);
  const blob = await canvasBlob(canvas);
  if (!blob) throw new Error(`Could not create the invitation for ${account.name}.`);
  return new File([blob], window.Invitation.filenameFor(account.name, EVENT_DETAILS[viewedEventId].name), { type: 'image/png' });
}
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function menuItemSummary(item) {
  const claimCounts = item.claims.reduce((counts, name) => counts.set(name, (counts.get(name) || 0) + 1), new Map());
  const bringing = [...claimCounts].map(([name, quantity]) => {
    const amount = quantity > 1 ? ` ${formatQuantity(quantity, item)}` : '';
    return `${contributionDisplayName(name)} is bringing${amount}`;
  });
  const remaining = Math.max(0, item.needed - item.claims.length);
  const needed = item.optional
    ? (item.claims.length ? '' : 'Optional')
    : (remaining ? `${remaining} of ${formatQuantity(item.needed, item)} still needed` : '');
  return [needed, ...bringing].filter(Boolean).join('; ');
}
function menuCopyText() {
  const categories = [...new Set(state.items.map(item => item.category))];
  return categories.map(category => {
    const items = state.items
      .filter(item => item.category === category)
      .map(item => `${item.name} - ${menuItemSummary(item)}`);
    return [`${category.toLocaleUpperCase()}:`, ...items].join('\n');
  }).join('\n\n');
}
async function copyMenu() {
  const text = menuCopyText();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) {
      showToast('The menu could not be copied. Please try again.');
      return;
    }
  }
  showToast('Menu copied! It is ready to paste into a message.');
}
function updateHeaderImage(event) {
  const headerImage = document.querySelector('#eventHeaderImage');
  const nextSource = event.header || '';
  headerImage.alt = `${event.name} celebration header`;
  if (headerImage.getAttribute('src') === nextSource) return;

  // Hide the previous event's decoded image while the next one downloads.
  // Browsers otherwise keep painting the old bitmap after `src` changes,
  // which briefly showed the Thanksgiving artwork on the Wedding event.
  headerImage.hidden = true;
  headerImage.removeAttribute('src');
  if (!nextSource) return;
  headerImage.addEventListener('load', () => { headerImage.hidden = false; }, { once: true });
  headerImage.addEventListener('error', () => { headerImage.hidden = true; }, { once: true });
  headerImage.src = nextSource;
}
function isViewingAsGuest() { return hostAuthenticated && Boolean(hostWeddingPartyViewName); }
function isHostView() { return hostAuthenticated && !isViewingAsGuest(); }
function updateHostToolsPanel() {
  const viewingAsGuest = isViewingAsGuest();
  document.querySelector('#hostToolsPanel').hidden = !hostAuthenticated || viewingAsGuest;
  document.querySelector('#cancelViewAsButton').hidden = !viewingAsGuest;
}
function setHostPasswordMode(enabled) {
  const guestFields = document.querySelector('#guestSignInFields');
  const hostFields = document.querySelector('#hostSignInFields');
  guestFields.hidden = enabled;
  hostFields.hidden = !enabled;
  guestFields.querySelectorAll('input').forEach(input => { input.disabled = enabled; });
  document.querySelector('#hostPassword').disabled = !enabled;
  document.querySelector('#signInHeading').textContent = enabled ? 'Enter host password' : "What's your name?";
  document.querySelector('#signInSubmit').textContent = enabled ? 'Sign in as host' : "Let's get started";
  document.querySelector('#hostPasswordToggle').textContent = enabled ? 'OR SIGN IN WITH YOUR NAME' : 'HOST SIGN IN';
  document.querySelector('#accountPasswordError').textContent = '';
  (enabled ? document.querySelector('#hostPassword') : document.querySelector('#accountFirstName')).focus();
}
function showSignInPage() {
  document.querySelector('#signInPage').hidden = false;
  document.querySelector('#eventSelectionPage').hidden = true;
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = true;
}
function renderEventSelection() {
  const ids = availableEventIds();
  document.querySelector('#eventSelectionChoices').innerHTML = ids.map(id => {
    const event = EVENT_DETAILS[id];
    const eventState = appState.events[id];
    const date = new Date(`${eventState.eventDate}T12:00:00`);
    const formatted = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date).replaceAll(',', '');
    return `<button type="button" data-enter-event="${id}"><span>${escapeHtml(event.name)}</span><small>${formatted}</small></button>`;
  }).join('');
  document.querySelector('#eventSelectionEmpty').hidden = ids.length > 0;
}
function showEventSelection() {
  renderEventSelection();
  document.querySelector('#signInPage').hidden = true;
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = true;
  document.querySelector('#eventSelectionPage').hidden = false;
  document.body.className = 'theme-wedding';
}
function videoEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname) && parsed.searchParams.get('v')) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.searchParams.get('v'))}`;
    if (parsed.hostname === 'youtu.be' && parsed.pathname.slice(1)) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.pathname.slice(1))}`;
    if (['vimeo.com', 'www.vimeo.com'].includes(parsed.hostname) && /^\/\d+/.test(parsed.pathname)) return `https://player.vimeo.com/video/${parsed.pathname.split('/')[1]}`;
  } catch { return ''; }
  return '';
}
function renderAttireVideoCollection(sectionSelector, containerSelector) {
  const videos = (state.attireVideos || []).map(videoEmbedUrl).filter(Boolean);
  document.querySelector(sectionSelector).hidden = videos.length === 0;
  document.querySelector(containerSelector).innerHTML = videos.map((url, index) => `<iframe src="${escapeAttribute(url)}" title="Formal attire tip ${index + 1}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`).join('');
}
function showSignedInDestination() {
  document.querySelector('#signInPage').hidden = true;
  document.querySelector('#eventSelectionPage').hidden = true;
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = false;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
function enterEvent(eventId, { preserveWeddingView = false } = {}) {
  const nextState = appState.events[eventId];
  if (!nextState || !EVENT_DETAILS[eventId]) {
    showToast('That gathering is no longer available. Please choose another gathering.');
    renderEventSelection();
    return;
  }
  viewedEventId = eventId;
  state = nextState;
  if (eventId === 'wedding' && !preserveWeddingView) {
    const partyMember = state.weddingPartyMembers?.some(member => normalizeAccountName(member.name) === normalizeAccountName(signedInPersonName));
    selectedWeddingTab = hostAuthenticated ? 'couple' : partyMember ? 'party' : 'guest';
    selectedMatronTab = 'experience';
    if (hostAuthenticated) hostWeddingPartyViewName = '';
  }
  // Close the chooser before doing the more involved event render. The
  // chooser only contains gatherings already authorized for this account;
  // re-checking the asynchronously refreshed account list here could reject
  // the exact option the guest just selected and leave this page stuck open.
  showSignedInDestination();
  render();
}
function ensureAccount(callback) {
  if (guestName) return callback();
  if (hostAuthenticated) {
    guestName = HOST_DISPLAY_NAME;
    render();
    return callback();
  }
  pendingAccountAction = callback;
  showSignInPage();
}

function renderWeddingPartyAttireImages(canView) {
  const images = state.weddingPartyAttireImages || {};
  const notes = state.weddingPartyAttireNotes || {};
  [['ladies', '#weddingPartyLadiesAttire'], ['gentlemen', '#weddingPartyGentlemenAttire']].forEach(([section, selector]) => {
    const gallery = document.querySelector(selector);
    const entries = canView && Array.isArray(images[section]) ? images[section] : [];
    const note = canView && typeof notes[section] === 'string' ? notes[section] : '';
    gallery.hidden = entries.length === 0 && !note;
    gallery.innerHTML = entries.map(image => `<figure><img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.caption || `${section === 'ladies' ? 'Ladies’' : 'Gentlemen’s'} wedding party attire inspiration`)}" loading="lazy" decoding="async">${image.caption ? `<figcaption>${formatEditableText(image.caption)}</figcaption>` : ''}</figure>`).join('') + (note ? `<div class="wedding-party-attire-note">${formatEditableText(note)}</div>` : '');
  });
}

function render() {
  const event = EVENT_DETAILS[viewedEventId];
  const isWedding = event.registryOnly === true;
  const hostView = isHostView();
  const viewingAsGuest = isViewingAsGuest();
  const signedInAccount = document.querySelector('#signedInAccount');
  const previewAccount = viewingAsGuest && hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW
    ? findAccount(hostWeddingPartyViewName)
    : null;
  signedInAccount.hidden = viewingAsGuest ? !previewAccount : !guestName;
  document.querySelector('#signedInAccountName').textContent = previewAccount
    ? invitedAccountDisplayName(previewAccount.name)
    : guestName === HOST_DISPLAY_NAME
      ? HOST_DISPLAY_NAME
      : invitedAccountDisplayName(guestName);
  document.body.className = `theme-${event.theme}`;
  document.title = `The Meyers ${event.name}`;
  document.querySelector('meta[name="description"]').content = `The Meyers ${event.name} potluck and RSVP page.`;
  renderSyncStatus();
  updateHostToolsPanel();
  document.querySelector('#editItemsButton').textContent = isWedding ? 'Wedding Details' : 'Menu';
  document.querySelector('#clearClaimButton').hidden = isWedding;
  document.querySelector('#previewWeddingPartyButton').hidden = !isWedding;
  renderEventDock();
  updateHeaderImage(event);
  const eventDate = new Date(`${state.eventDate}T12:00:00`);
  const dateElement = document.querySelector('#eventDate');
  dateElement.dateTime = state.eventDate;
  dateElement.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate).replaceAll(',', '');
  document.querySelector('#welcomeKicker').hidden = isWedding;
  document.querySelector('#welcome-title').textContent = isWedding ? 'TOGETHER WITH THEIR PARENTS' : "WE'D LOVE FOR YOU TO BRING A DISH TO SHARE";
  document.querySelector('#welcomeNote').innerHTML = isWedding
    ? '<em>Kassandra Lynne Raudman and Steven Michael Meyer request the honor of your presence at their marriage</em>'
    : '<em>Choose something delicious to bring. If bringing something isn\'t practical, simply come and enjoy the evening with us.</em>';
  document.querySelector('#remainingSummary').hidden = isWedding;
  document.querySelector('.summary-strip').classList.toggle('wedding-summary', isWedding);
  // Menus belong to every gathering except the Wedding, which intentionally
  // has registry details instead of claimable dishes.
  document.querySelector('.menu-section').hidden = event.hasMenu === false;
  document.querySelector('#copyMenuButton').hidden = state.items.length === 0;
  const registrySection = document.querySelector('#registrySection');
  const signedInWeddingPartyMember = state.weddingPartyMembers?.find(member => normalizeAccountName(member.name) === normalizeAccountName(signedInPersonName));
  const isWeddingPartyMember = isWedding && ((viewingAsGuest && hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW) || (!hostAuthenticated && Boolean(signedInWeddingPartyMember)));
  document.querySelectorAll('#registryAttireSection .guest-attire-requirements').forEach(requirements => {
    requirements.hidden = isWeddingPartyMember;
  });
  if (!hostView && selectedWeddingTab === 'timeline') selectedWeddingTab = 'guest';
  if ((!hostView && !isWeddingPartyMember && selectedWeddingTab === 'party') || (!hostView && selectedWeddingTab === 'couple')) selectedWeddingTab = 'guest';
  const showingBrideGroomPage = isWedding && hostView && selectedWeddingTab === 'couple';
  const showingWeddingPartyPage = isWedding && (hostView || isWeddingPartyMember) && selectedWeddingTab === 'party';
  const showingTimelinePage = isWedding && hostView && selectedWeddingTab === 'timeline';
  const showingGuestPage = isWedding && !isWeddingPartyMember && selectedWeddingTab === 'guest';
  const showingPartyAttirePage = showingWeddingPartyPage && selectedMatronTab === 'attire';
  const showingAttirePage = (showingGuestPage && selectedGuestTab === 'attire') || showingPartyAttirePage;
  const showingWhatToExpectPage = showingGuestPage && selectedGuestTab === 'details';
  const showingRegistryPage = isWedding && selectedWeddingTab === 'registry';
  const weddingPartyTabs = document.querySelector('#weddingPartyTabs');
  weddingPartyTabs.hidden = !isWedding;
  weddingPartyTabs.querySelectorAll('[data-wedding-tab]').forEach(button => {
    const hostCanViewTab = true;
    const partyMemberCanViewTab = ['party', 'registry'].includes(button.dataset.weddingTab);
    const guestCanViewTab = ['guest', 'registry'].includes(button.dataset.weddingTab);
    button.hidden = !(hostView ? hostCanViewTab : isWeddingPartyMember ? partyMemberCanViewTab : guestCanViewTab);
    const isSelected = button.dataset.weddingTab === selectedWeddingTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  const guestSection = document.querySelector('#guestSection');
  guestSection.hidden = !showingGuestPage;
  guestSection.querySelectorAll('[data-guest-tab]').forEach(button => {
    const isSelected = button.dataset.guestTab === selectedGuestTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  document.querySelector('#brideGroomSection').hidden = !showingBrideGroomPage;
  if (showingBrideGroomPage) {
    const brideGroomPages = [{ id: 'main', title: 'Bride & Groom', content: state.brideGroomContent || '' }, ...(state.brideGroomPages || [])];
    if (!brideGroomPages.some(page => page.id === selectedBrideGroomPage)) selectedBrideGroomPage = 'main';
    const brideGroomTabs = document.querySelector('#brideGroomTabs');
    brideGroomTabs.hidden = brideGroomPages.length < 2;
    brideGroomTabs.innerHTML = brideGroomPages.map(page => `<button type="button" role="tab" data-bride-groom-page="${escapeAttribute(page.id)}" aria-selected="${page.id === selectedBrideGroomPage}" tabindex="${page.id === selectedBrideGroomPage ? '0' : '-1'}">${escapeHtml(page.title)}</button>`).join('');
    const activeBrideGroomPage = brideGroomPages.find(page => page.id === selectedBrideGroomPage) || brideGroomPages[0];
    const brideGroomContent = document.querySelector('#brideGroomContent');
    brideGroomContent.innerHTML = formatEditableText(state.brideGroomContent);
    if (activeBrideGroomPage.id !== 'main') brideGroomContent.innerHTML = formatEditableText(activeBrideGroomPage.content);
    if (!brideGroomContent.innerHTML) brideGroomContent.innerHTML = '<p class="guest-empty">No Bride & Groom details have been added yet.</p>';
  }
  document.querySelector('#weddingTimelineSection').hidden = !showingTimelinePage;
  if (showingTimelinePage) {
    document.querySelector('#weddingTimelineAboveContent').innerHTML = formatEditableText(expandEditableTextVariables(state.timelineAboveContent));
    document.querySelector('#weddingTimelineBody').innerHTML = renderWeddingTimeline(state.timelineContent);
    document.querySelector('#weddingTimelineBelowContent').innerHTML = formatEditableText(expandEditableTextVariables(state.timelineBelowContent));
  }
  document.querySelector('#whatToExpectSection').hidden = !showingWhatToExpectPage;
  if (showingWhatToExpectPage) {
    document.querySelector('#whatToExpectContent').innerHTML = formatEditableText(state.whatToExpectContent)
      || '<p class="guest-empty">No What to Expect details have been added yet.</p>';
  }
  document.querySelector('#weddingPartySection').hidden = !showingWeddingPartyPage;
  const weddingPartyMembers = state.weddingPartyMembers || [];
  const viewedWeddingPartyMember = viewingAsGuest
    ? weddingPartyMembers.find(member => member.name === hostWeddingPartyViewName)
    : signedInWeddingPartyMember;
  const visibleWeddingPartyMembers = hostView ? weddingPartyMembers : [viewedWeddingPartyMember].filter(Boolean);
  const personalPages = WeddingParty.visiblePages(weddingPartyMembers, hostView, viewedWeddingPartyMember?.id);
  const matronInfoTabs = document.querySelector('#matronInfoTabs');
  matronInfoTabs.querySelectorAll('[data-member-page]').forEach(button => button.remove());
  personalPages.forEach(page => {
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('role', 'tab');
    button.dataset.matronTab = page.key; button.dataset.memberPage = page.key;
    button.setAttribute('aria-controls', 'weddingPartyPersonalPage');
    button.textContent = hostView ? `${page.memberName} — ${page.title}` : page.title;
    matronInfoTabs.append(button);
  });
  if (!['experience', 'duties', 'attire', ...personalPages.map(page => page.key)].includes(selectedMatronTab)) selectedMatronTab = 'experience';
  matronInfoTabs.hidden = !showingWeddingPartyPage;
  matronInfoTabs.querySelectorAll('[data-matron-tab]').forEach(button => {
    const isSelected = button.dataset.matronTab === selectedMatronTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  const personalPage = personalPages.find(page => page.key === selectedMatronTab);
  const personalPanel = document.querySelector('#weddingPartyPersonalPage');
  personalPanel.hidden = !showingWeddingPartyPage || !personalPage;
  personalPanel.innerHTML = personalPage ? `<h3>${escapeHtml(personalPage.title)}</h3>${formatEditableText(personalPage.content) || '<p class="guest-empty">No details have been added yet.</p>'}` : '';
  document.querySelector('#weddingPartyDetails').hidden = !showingWeddingPartyPage || selectedMatronTab !== 'duties';
  document.querySelector('#perfectExperiencePanel').hidden = !showingWeddingPartyPage || selectedMatronTab !== 'experience';
  if (showingWeddingPartyPage && selectedMatronTab === 'experience') {
    document.querySelector('#perfectExperienceContent').innerHTML = formatEditableText(state.perfectExperienceContent)
      || '<p class="guest-empty">No Perfect Experience details have been added yet.</p>';
  }
  const weddingPartyIntro = document.querySelector('#weddingPartyIntro');
  weddingPartyIntro.hidden = hostView || selectedMatronTab !== 'duties';
  weddingPartyIntro.textContent = 'Your personal wedding responsibilities are below.';
  document.querySelector('#weddingPartyDetails').innerHTML = visibleWeddingPartyMembers.length
    ? visibleWeddingPartyMembers.map(member => {
      const description = member.responsibilities || '';
      return `<article class="wedding-party-card"><p class="wedding-party-role">${escapeHtml(member.title || 'Wedding Party')}</p><h3>${escapeHtml(member.name)}</h3>${description ? `<div class="wedding-party-description">${formatWeddingPartyDescription(description)}</div>` : '<p class="guest-empty">No responsibilities have been assigned yet.</p>'}</article>`;
    }).join('')
    : '<p class="guest-empty">No wedding party details have been added yet.</p>';
  registrySection.hidden = !showingRegistryPage;
  const registryAttireSection = document.querySelector('#registryAttireSection');
  const weddingPartyAttirePanel = document.querySelector('#weddingPartyAttirePanel');
  const guestAttireAnchor = document.querySelector('#guestAttireAnchor');
  if (showingPartyAttirePage && registryAttireSection.parentElement !== weddingPartyAttirePanel) {
    weddingPartyAttirePanel.append(registryAttireSection);
  } else if (!showingPartyAttirePage && registryAttireSection.previousElementSibling !== guestAttireAnchor) {
    guestAttireAnchor.after(registryAttireSection);
  }
  registryAttireSection.classList.toggle('wedding-party-attire-section', showingPartyAttirePage);
  registryAttireSection.hidden = !showingAttirePage;
  renderWeddingPartyAttireImages(showingPartyAttirePage);
  if (isWedding) renderAttireVideoCollection('#registryAttireVideosSection', '#registryAttireVideos');
  const registryButton = document.querySelector('#registryButton');
  registryButton.href = state.registryUrl || '#';
  registryButton.classList.toggle('disabled', !state.registryUrl);
  registryButton.setAttribute('aria-disabled', String(!state.registryUrl));
  registryButton.textContent = state.registryUrl ? 'View our registry' : (hostView ? 'Add registry link in host tools' : 'Registry coming soon');
  const monetaryGiftButton = document.querySelector('#monetaryGiftButton');
  monetaryGiftButton.href = state.monetaryGiftUrl || '#';
  monetaryGiftButton.classList.toggle('disabled', !state.monetaryGiftUrl);
  monetaryGiftButton.setAttribute('aria-disabled', String(!state.monetaryGiftUrl));
  monetaryGiftButton.textContent = state.monetaryGiftUrl ? 'Give a monetary gift' : (hostView ? 'Add monetary gift link in host tools' : 'Monetary gifts coming soon');
  const categories = [...new Set(state.items.map(item => item.category))];
  const categoryCard = category => `
    <article class="category-card">
      <div class="category-title"><h3>${escapeHtml(category)}</h3></div>
      ${state.items.filter(item => item.category === category).map(renderDish).join('')}
      <button class="category-other" type="button" data-custom-category="${escapeHtml(category)}">I'll bring something else</button>
    </article>`;
  const menuColumns = Array.from({ length: singleColumnMenu.matches ? 1 : 2 }, () => []);
  categories.forEach((category, index) => menuColumns[index % menuColumns.length].push(categoryCard(category)));
  document.querySelector('#menuGrid').innerHTML = menuColumns
    .filter(column => column.length)
    .map(column => `<div class="menu-column">${column.join('')}</div>`)
    .join('');
  const needed = state.items.reduce((sum, item) => sum + (item.optional ? 0 : Math.max(0, item.needed - item.claims.length)), 0);
  const guests = state.rsvps.reduce((sum, rsvp) => sum + rsvp.adults + rsvp.children, 0);
  const invitedAccounts = appState.accounts.filter(account => accountIsInvited(account, viewedEventId));
  document.querySelector('#guestCount').textContent = guests;
  document.querySelector('#invitedCount').textContent = invitedAccounts.length;
  document.querySelector('#remainingCount').textContent = needed;
  const guestListButton = document.querySelector('#guestListButton');
  guestListButton.disabled = !hostView;
  guestListButton.title = hostView ? 'View guest names and RSVP details' : 'Guest details are private to the host';
  guestListButton.setAttribute('aria-label', hostView ? `${guests} guests attending; view private guest list` : `${guests} guests attending; details visible only to the host`);
  const invitedListButton = document.querySelector('#invitedListButton');
  invitedListButton.disabled = !hostView;
  invitedListButton.title = hostView ? 'View invited families' : 'Invited family details are private to the host';
  invitedListButton.setAttribute('aria-label', hostView ? `${invitedAccounts.length} families invited; view private invitation list` : `${invitedAccounts.length} families invited; details visible only to the host`);
}

function renderEventDock() {
  const dock = document.querySelector('#eventDock');
  const switchButtons = document.querySelector('#eventSwitchButtons');
  const ids = availableEventIds();
  dock.hidden = !guestName || ids.length === 0;
  switchButtons.innerHTML = ids.map(id => {
    const name = EVENT_DETAILS[id].name;
    const accessibleLabel = `${name}${id === viewedEventId ? ', current event' : ''}`;
    return `<button type="button" data-switch-event="${id}" aria-label="${escapeHtml(accessibleLabel)}" ${id === viewedEventId ? 'aria-current="page"' : ''}><span>${escapeHtml(name)}</span></button>`;
  }).join('');
}
function renderDish(item) {
  const mine = guestName && item.claims.includes(guestName);
  const remaining = Math.max(0, item.needed - item.claims.length);
  const claimants = isHostView()
    ? `<span class="dish-claimants">${[...new Set(item.claims)].map(name => escapeHtml(contributionDisplayName(name))).join(', ')}</span>`
    : '';
  const status = item.optional ? 'Optional' : (remaining ? `${remaining} of ${formatQuantity(item.needed, item)} still needed` : '');
  const details = [status, claimants].filter(Boolean).join(' · ');
  const unavailable = remaining === 0 && !mine;
  return `<div class="dish"><h4>${escapeHtml(item.name)}</h4>${details ? `<div class="dish-meta">${details}</div>` : ''}<button data-claim="${item.id}" ${unavailable ? 'disabled' : ''} class="${mine ? 'claimed' : ''}">${mine ? '✓ Bringing it' : (unavailable ? 'Claimed' : "I'll bring this")}</button></div>`;
}
function claimItem(id) {
  ensureAccount(() => {
    const item = state.items.find(entry => entry.id === id); if (!item) return;
    if (item.claims.includes(guestName)) {
      item.claims = item.claims.filter(name => name !== guestName);
      showToast(`Removed ${item.name} from your list.`);
      saveState();
      return;
    }
    const remaining = item.needed - item.claims.length;
    if (remaining < 1) return;
    if (item.needed > 1) {
      pendingClaimItemId = item.id;
      document.querySelector('#claimQuantityDescription').textContent = `${remaining} of ${formatQuantity(item.needed, item)} ${item.name} still needed.`;
      document.querySelector('#claimQuantity').innerHTML = Array.from({ length: remaining }, (_, index) => {
        const quantity = index + 1;
        return `<option value="${quantity}">${formatQuantity(quantity, item)}</option>`;
      }).join('');
      document.querySelector('#claimQuantityDialog').showModal();
      return;
    }
    item.claims.push(guestName);
    saveState();
    showToast(`Thanks, ${householdDisplayName(guestName)}! You're bringing ${item.unit === 'dozen' ? `a dozen of ${item.name}` : item.name}.`);
  });
}
function openCustomItem(category) {
  ensureAccount(() => {
    document.querySelector('#customItemCategory').value = category;
    document.querySelector('#customItemUnit').innerHTML = unitOptions();
    document.querySelector('#customItemDialog').showModal();
  });
}

document.querySelector('#passwordForm').addEventListener('submit', event => {
  event.preventDefault();
  const hostPasswordInput = document.querySelector('#hostPassword');
  if (!hostPasswordInput.disabled) {
    const password = hostPasswordInput.value.trim();
    if (password !== HOST_PASSWORD) {
      document.querySelector('#accountPasswordError').textContent = 'That host password is incorrect.';
      hostPasswordInput.focus();
      return;
    }
    hostAuthenticated = true;
    hostCredential = password;
    guestName = HOST_DISPLAY_NAME;
    signedInPersonName = '';
    if (viewedEventId === 'wedding') {
      selectedWeddingTab = 'couple';
      selectedMatronTab = 'experience';
      hostWeddingPartyViewName = '';
    }
    updateHostToolsPanel();
    const action = pendingAccountAction;
    pendingAccountAction = null;
    showSignedInDestination();
    document.querySelector('#accountPasswordError').textContent = '';
    hostPasswordInput.value = '';
    render();
    if (action) action();
    else showToast('Host sign-in complete. You can RSVP and bring items as The Host.');
    return;
  }
  const firstName = document.querySelector('#accountFirstName').value.trim();
  const lastName = document.querySelector('#accountLastName').value.trim();
  const suffix = document.querySelector('#accountSuffix').value.trim();
  const accountName = [firstName, lastName, suffix].filter(Boolean).join(' ');
  if (!firstName || !lastName) { document.querySelector('#accountPasswordError').textContent = 'Enter your first and last name, plus your suffix if you have one.'; return; }
  const account = accountForSignIn(accountName);
  if (!account) { document.querySelector('#accountPasswordError').textContent = 'That name and suffix are not recognized.'; return; }
  if (!availableEventIds(account.name).length) { document.querySelector('#accountPasswordError').textContent = 'Sign-in access has not been enabled for your account yet.'; return; }
  guestName = account.name;
  signedInPersonName = accountName;
  selectedWeddingTab = 'guest';
  document.querySelector('#accountPasswordError').textContent = '';
  showEventSelection();
  const action = pendingAccountAction; pendingAccountAction = null; action?.();
});
document.querySelector('#eventSelectionChoices').addEventListener('click', event => {
  const button = event.target.closest('[data-enter-event]');
  if (!button) return;
  enterEvent(button.dataset.enterEvent);
});
document.querySelector('#eventDock').addEventListener('click', event => {
  const button = event.target.closest('[data-switch-event]');
  if (!button || button.dataset.switchEvent === viewedEventId) return;
  enterEvent(button.dataset.switchEvent);
});
document.querySelector('#weddingPartyTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-wedding-tab]');
  if (!button) return;
  selectedWeddingTab = button.dataset.weddingTab;
  render();
});
document.querySelector('#weddingPartyTabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('#weddingPartyTabs [data-wedding-tab]:not([hidden])')];
  const currentIndex = tabs.findIndex(button => button.dataset.weddingTab === selectedWeddingTab);
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  selectedWeddingTab = tabs[(currentIndex + direction + tabs.length) % tabs.length].dataset.weddingTab;
  render();
  document.querySelector(`[data-wedding-tab="${selectedWeddingTab}"]`).focus();
});
document.querySelector('#guestInfoTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-guest-tab]');
  if (!button) return;
  selectedGuestTab = button.dataset.guestTab;
  render();
});
document.querySelector('#guestInfoTabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('#guestInfoTabs [data-guest-tab]')];
  const currentIndex = tabs.findIndex(button => button.dataset.guestTab === selectedGuestTab);
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  selectedGuestTab = tabs[(currentIndex + direction + tabs.length) % tabs.length].dataset.guestTab;
  render();
  document.querySelector(`[data-guest-tab="${selectedGuestTab}"]`).focus();
});
document.querySelector('#adminBrideGroomContent').addEventListener('change', event => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  state.brideGroomContent = event.target.value;
  saveState();
  showToast('Bride & Groom page updated.');
});
document.querySelector('#adminAddBrideGroomPage').addEventListener('click', () => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  state.brideGroomPages ||= [];
  const pageNumber = state.brideGroomPages.length + 2;
  const page = { id: `bride-groom-${Date.now()}`, title: `Page ${pageNumber}`, content: '' };
  state.brideGroomPages.push(page);
  selectedBrideGroomPage = page.id;
  saveState();
  renderBrideGroomPageAdmin();
  document.querySelector(`[data-bride-groom-admin-page="${CSS.escape(page.id)}"] input`).focus();
  showToast(`Bride & Groom Page ${pageNumber} added.`);
});
document.querySelector('#brideGroomTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-bride-groom-page]');
  if (!button) return;
  selectedBrideGroomPage = button.dataset.brideGroomPage;
  render();
});
document.querySelector('#brideGroomTabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('#brideGroomTabs [data-bride-groom-page]')];
  const currentIndex = tabs.findIndex(button => button.dataset.brideGroomPage === selectedBrideGroomPage);
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  selectedBrideGroomPage = tabs[(currentIndex + direction + tabs.length) % tabs.length].dataset.brideGroomPage;
  render();
  document.querySelector(`[data-bride-groom-page="${CSS.escape(selectedBrideGroomPage)}"]`).focus();
});
document.querySelector('#adminPerfectExperienceContent').addEventListener('change', event => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  state.perfectExperienceContent = event.target.value;
  saveState();
  showToast('The Perfect Experience page updated.');
});
document.querySelector('#adminTimelineContent').addEventListener('change', event => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  state.timelineContent = event.target.value;
  saveState();
  showToast('Wedding timeline updated.');
});
['Above', 'Below'].forEach(position => {
  document.querySelector(`#adminTimeline${position}Content`).addEventListener('change', event => {
    if (!hostAuthenticated || viewedEventId !== 'wedding') return;
    state[`timeline${position}Content`] = event.target.value;
    saveState();
    showToast(`Text ${position.toLowerCase()} the wedding timeline updated.`);
  });
});
document.querySelector('#adminWhatToExpectContent').addEventListener('change', event => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  state.whatToExpectContent = event.target.value;
  saveState();
  showToast('What to Expect page updated.');
});
document.querySelector('#hostWeddingPartyView').addEventListener('change', event => {
  if (!hostAuthenticated) return;
  hostWeddingPartyViewName = event.target.value;
  render();
});
document.querySelector('#hostPasswordToggle').addEventListener('click', () => {
  setHostPasswordMode(document.querySelector('#hostPassword').disabled);
});
document.querySelector('#customItemForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#customItemName').value.trim();
  const quantity = Number(document.querySelector('#customItemQuantity').value);
  const unit = document.querySelector('#customItemUnit').value;
  const category = document.querySelector('#customItemCategory').value;
  if (!name || !category || quantity < 1) return;
  state.items.push({ id: `custom-${Date.now()}`, name, category, needed: quantity, unit, claims: Array(quantity).fill(guestName) });
  event.target.reset(); document.querySelector('#customItemQuantity').value = 1;
  document.querySelector('#customItemDialog').close(); saveState(); showToast(`${name} was added to ${category}!`);
});
document.querySelector('#copyMenuButton').addEventListener('click', copyMenu);
document.querySelector('#matronInfoTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-matron-tab]');
  if (!button) return;
  selectedMatronTab = button.dataset.matronTab;
  render();
});
document.querySelector('#matronInfoTabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('#matronInfoTabs [data-matron-tab]:not([hidden])')];
  const currentIndex = tabs.findIndex(button => button.dataset.matronTab === selectedMatronTab);
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  selectedMatronTab = tabs[(currentIndex + direction + tabs.length) % tabs.length].dataset.matronTab;
  render();
  document.querySelector(`[data-matron-tab="${CSS.escape(selectedMatronTab)}"]`).focus();
});
document.querySelector('#menuGrid').addEventListener('click', event => {
  const claimButton = event.target.closest('[data-claim]');
  if (claimButton) {
    claimItem(claimButton.dataset.claim);
    return;
  }
  const customButton = event.target.closest('[data-custom-category]');
  if (customButton) openCustomItem(customButton.dataset.customCategory);
});
document.querySelector('#claimQuantityForm').addEventListener('submit', event => {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    document.querySelector('#claimQuantityDialog').close();
    return;
  }
  const item = state.items.find(entry => entry.id === pendingClaimItemId);
  const requestedQuantity = Number(document.querySelector('#claimQuantity').value);
  if (!item || item.claims.includes(guestName) || requestedQuantity < 1) return;
  const quantity = Math.min(requestedQuantity, Math.max(0, item.needed - item.claims.length));
  if (!quantity) return;
  item.claims.push(...Array(quantity).fill(guestName));
  pendingClaimItemId = null;
  document.querySelector('#claimQuantityDialog').close();
  saveState();
  showToast(`Thanks, ${householdDisplayName(guestName)}! You're bringing ${formatQuantity(quantity, item)} of ${item.name}.`);
});
document.querySelector('#claimQuantityDialog').addEventListener('close', () => { pendingClaimItemId = null; });
document.querySelector('#rsvpButton').addEventListener('click', () => ensureAccount(() => {
  const existing = state.rsvps.find(r => r.name === guestName);
  document.querySelector('#adults').value = existing?.adults ?? 1;
  document.querySelector('#children').value = existing?.children ?? 0;
  renderWeddingRsvpMenu(existing?.menuSelections || []);
  document.querySelector('#rsvpDialog').showModal();
}));
document.querySelectorAll('.stepper button').forEach(button => button.addEventListener('click', () => {
  const output = document.querySelector(`#${button.dataset.target}`);
  output.value = Math.max(0, Math.min(20, Number(output.value) + Number(button.dataset.step)));
  if (viewedEventId === 'wedding') renderWeddingRsvpMenu(readWeddingMenuSelections());
}));
function weddingRsvpNameOptions() {
  const account = findAccount(guestName);
  return [...new Set([...(account ? accountSignInNames(account.name) : []), ...(account?.children || [])])];
}
function readWeddingMenuSelections() {
  return [...document.querySelectorAll('.wedding-rsvp-guest')].map(card => ({
    type: card.dataset.guestType,
    index: Number(card.dataset.guestIndex),
    name: card.querySelector('[data-rsvp-guest-name]').value,
    customName: card.querySelector('[data-rsvp-custom-name]').value.trim(),
    meal: card.querySelector('[data-rsvp-meal]:checked')?.value || '',
    dietaryRestrictions: card.querySelector('[data-rsvp-dietary]').value.trim()
  }));
}
function renderWeddingRsvpMenu(selections = []) {
  const section = document.querySelector('#weddingRsvpMenu');
  const isWedding = viewedEventId === 'wedding';
  section.hidden = !isWedding;
  if (!isWedding) return;
  const names = weddingRsvpNameOptions();
  const counts = { adult: Number(document.querySelector('#adults').value), child: Number(document.querySelector('#children').value) };
  const meals = (state.weddingMealOptions || []).filter(Boolean);
  const childMeal = state.weddingChildMealOption || '';
  const cards = ['adult', 'child'].flatMap(type => Array.from({ length: counts[type] }, (_, index) => {
    const saved = selections.find(selection => selection.type === type && Number(selection.index) === index) || {};
    const personOptions = names.map(name => `<option value="${escapeAttribute(name)}" ${saved.name === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
    const mealOptions = [...meals, ...(type === 'child' && childMeal ? [childMeal] : [])];
    const radioName = `wedding-meal-${type}-${index}`;
    const radios = mealOptions.map(meal => `<label class="wedding-meal-choice"><input type="radio" data-rsvp-meal name="${radioName}" value="${escapeAttribute(meal)}" ${saved.meal === meal ? 'checked' : ''} required><span>${escapeHtml(meal)}</span></label>`).join('');
    const none = type === 'child' ? `<label class="wedding-meal-choice"><input type="radio" data-rsvp-meal name="${radioName}" value="none" ${saved.meal === 'none' ? 'checked' : ''} required><span>My child is too young</span></label>` : '';
    return `<fieldset class="wedding-rsvp-guest" data-guest-type="${type}" data-guest-index="${index}"><legend>${type === 'adult' ? 'Adult' : 'Child'} ${index + 1}</legend><label><span>Who is this meal for?</span><select data-rsvp-guest-name required><option value="">Choose a person</option>${personOptions}<option value="someone-else" ${saved.name === 'someone-else' ? 'selected' : ''}>Someone else</option></select></label><label data-rsvp-custom-wrapper ${saved.name === 'someone-else' ? '' : 'hidden'}><span>Name</span><input data-rsvp-custom-name maxlength="100" value="${escapeAttribute(saved.customName || '')}" placeholder="Guest name" ${saved.name === 'someone-else' ? 'required' : ''}></label><div class="wedding-meal-options">${radios}${none || (!mealOptions.length ? '<p class="form-error">Meal options have not been added yet.</p>' : '')}</div><label><span>Please note any dietary restrictions or food allergies.</span><textarea data-rsvp-dietary maxlength="500" placeholder="Optional">${escapeHtml(saved.dietaryRestrictions || '')}</textarea></label></fieldset>`;
  }));
  document.querySelector('#weddingRsvpGuests').innerHTML = cards.join('');
}
document.querySelector('#weddingRsvpGuests').addEventListener('change', event => {
  if (!event.target.matches('[data-rsvp-guest-name]')) return;
  const wrapper = event.target.closest('.wedding-rsvp-guest').querySelector('[data-rsvp-custom-wrapper]');
  wrapper.hidden = event.target.value !== 'someone-else';
  wrapper.querySelector('input').required = event.target.value === 'someone-else';
});
document.querySelector('#rsvpForm').addEventListener('submit', event => {
  const menuSelections = viewedEventId === 'wedding' ? readWeddingMenuSelections() : [];
  if (viewedEventId === 'wedding' && menuSelections.some(selection => selection.name === 'someone-else' && !selection.customName)) {
    event.preventDefault();
    showToast('Enter a name for each “Someone else” guest.');
    return;
  }
  const rsvp = { name: guestName, adults: Number(document.querySelector('#adults').value), children: Number(document.querySelector('#children').value), ...(viewedEventId === 'wedding' ? { menuSelections } : {}) };
  const index = state.rsvps.findIndex(entry => entry.name === guestName);
  if (index >= 0) state.rsvps[index] = rsvp; else state.rsvps.push(rsvp);
  saveState(); showToast(`RSVP saved — we can't wait to see you!`);
});
const editorInputSaveTimers = new WeakMap();
function commitPendingEditorControl(control) {
  clearTimeout(editorInputSaveTimers.get(control));
  editorInputSaveTimers.delete(control);
  if (!control.hasAttribute('data-editor-dirty')) return;
  control.removeAttribute('data-editor-dirty');
  control.dispatchEvent(new Event('change', { bubbles: true }));
}
function commitPendingEditorInputs(form) {
  // Extra Bride & Groom pages are rendered dynamically. Capture the complete
  // title/content pair before committing individual controls because saving a
  // title rebuilds the page editors and can otherwise replace an unsaved
  // textarea before Done finishes processing the form.
  if (form.closest('#adminDialog')) { commitWeddingPartyEditors(); commitBrideGroomPageEditors(); }
  const dirtyControls = [...form.querySelectorAll('[data-editor-dirty]')];
  dirtyControls.forEach(control => {
    commitPendingEditorControl(control);
  });
}
function commitAllPendingEditorInputs() {
  document.querySelectorAll('.editor-dialog form').forEach(commitPendingEditorInputs);
}
document.querySelectorAll('.editor-dialog form').forEach(form => {
  form.addEventListener('input', event => {
    if (!event.target.matches('input:not([type="file"]), select, textarea')) return;
    event.target.dataset.editorDirty = 'true';
    clearTimeout(editorInputSaveTimers.get(event.target));
    editorInputSaveTimers.set(event.target, setTimeout(() => commitPendingEditorControl(event.target), 300));
  });
  form.addEventListener('change', event => {
    clearTimeout(editorInputSaveTimers.get(event.target));
    editorInputSaveTimers.delete(event.target);
    delete event.target.dataset.editorDirty;
  });
  // Closing with Done, the X button, or Escape all means the host is finished
  // editing. Always flush the current value; the old cancel branch silently
  // discarded keystrokes made within the debounce window.
  form.addEventListener('submit', () => commitPendingEditorInputs(form));
  form.closest('dialog').addEventListener('cancel', () => commitPendingEditorInputs(form));
  form.closest('dialog').addEventListener('close', () => commitPendingEditorInputs(form));
});
document.querySelector('#guestListButton').addEventListener('click', () => {
  if (!hostAuthenticated) return;
  const list = document.querySelector('#guestList');
  list.innerHTML = state.rsvps.length ? hostFirstRsvps(state.rsvps).map(rsvp => {
    const menu = viewedEventId === 'wedding' && rsvp.menuSelections?.length ? `<div class="guest-menu-summary">${rsvp.menuSelections.map(selection => `<div><strong>${escapeHtml(selection.name === 'someone-else' ? selection.customName : selection.name || `${selection.type} ${selection.index + 1}`)}</strong>: ${escapeHtml(selection.meal === 'none' ? 'No meal' : selection.meal || 'No meal selected')}${selection.dietaryRestrictions ? `<small>Dietary restrictions / allergies: ${escapeHtml(selection.dietaryRestrictions)}</small>` : ''}</div>`).join('')}</div>` : '';
    return `<div class="guest-entry"><strong>${escapeHtml(contributionDisplayName(rsvp.name))}</strong><span>${rsvp.adults} adult${rsvp.adults === 1 ? '' : 's'} · ${rsvp.children} child${rsvp.children === 1 ? '' : 'ren'}</span>${menu}</div>`;
  }).join('') : '<p class="guest-empty">No guests have RSVP’d yet.</p>';
  document.querySelector('#guestListDialog').showModal();
});
document.querySelector('#invitedListButton').addEventListener('click', () => {
  if (!hostAuthenticated) return;
  const invitedAccounts = appState.accounts
    .filter(account => accountIsInvited(account, viewedEventId))
    .sort((left, right) => left.name.localeCompare(right.name));
  const totals = invitedAccounts.reduce((sum, account) => ({
    adults: sum.adults + accountSignInNames(account.name).length + plusOneCount(account, viewedEventId),
    children: sum.children + (account.children || []).length
  }), { adults: 0, children: 0 });
  document.querySelector('#invitedPeopleTotal').textContent = `${totals.adults} adult${totals.adults === 1 ? '' : 's'} · ${totals.children} child${totals.children === 1 ? '' : 'ren'} total`;
  document.querySelector('#invitedList').innerHTML = invitedAccounts.length
    ? invitedAccounts.map(account => {
      const plusOnes = plusOneCount(account, viewedEventId);
      const adults = accountSignInNames(account.name).length + plusOnes;
      const children = (account.children || []).length;
      return `<div class="guest-entry"><strong>${escapeHtml(invitedAccountDisplayName(account.name))}</strong><span>${adults} adult${adults === 1 ? '' : 's'}${plusOnes ? ` (${plusOnes} plus one${plusOnes === 1 ? '' : 's'})` : ''} · ${children} child${children === 1 ? '' : 'ren'}</span></div>`;
    }).join('')
    : '<p class="guest-empty">No families are currently invited.</p>';
  document.querySelector('#invitedListDialog').showModal();
});
function openAdmin() {
  const isWedding = EVENT_DETAILS[viewedEventId].registryOnly === true;
  document.querySelector('#adminEventDate').value = state.eventDate;
  document.querySelector('#adminHomeAddress').value = state.homeAddress || '';
  document.querySelector('#adminHeading').textContent = isWedding ? 'Edit wedding details' : 'Edit the menu';
  document.querySelector('#adminWeddingLocations').hidden = !isWedding;
  document.querySelector('#adminWeddingVariableHelp').classList.toggle('wedding-variables-visible', isWedding);
  document.querySelector('#adminWeddingVariableHeading').hidden = !isWedding;
  document.querySelector('#adminWeddingVariableDescription').hidden = !isWedding;
  const weddingLocationInputs = {
    adminChurchWeekDay: 'churchWeekDay', adminChurchYear: 'churchYear', adminChurchTime: 'churchTime',
    adminChurchStreet: 'churchStreet', adminChurchCityStateZip: 'churchCityStateZip', adminVenueTime: 'venueTime',
    adminVenueStreet: 'venueStreet', adminVenueCityStateZip: 'venueCityStateZip'
  };
  Object.entries(weddingLocationInputs).forEach(([id, key]) => { document.querySelector(`#${id}`).value = isWedding ? state[key] || '' : ''; });
  document.querySelector('#adminRegistryFields').hidden = !isWedding;
  document.querySelector('#adminAttireFields').hidden = !isWedding;
  document.querySelector('#adminRegistryUrl').value = state.registryUrl || '';
  document.querySelector('#adminMonetaryGiftUrl').value = state.monetaryGiftUrl || '';
  if (isWedding) {
    [...document.querySelectorAll('[id^="adminWeddingMealOption"]')].forEach((input, index) => { input.value = state.weddingMealOptions?.[index] || ''; });
    document.querySelector('#adminWeddingChildMealOption').value = state.weddingChildMealOption || '';
    renderWeddingPartyAdmin();
    document.querySelector('#adminBrideGroomContent').value = state.brideGroomContent || '';
    renderBrideGroomPageAdmin();
    document.querySelector('#adminPerfectExperienceContent').value = state.perfectExperienceContent || '';
    document.querySelector('#adminTimelineAboveContent').value = state.timelineAboveContent || '';
    document.querySelector('#adminTimelineContent').value = state.timelineContent || '';
    document.querySelector('#adminTimelineBelowContent').value = state.timelineBelowContent || '';
    document.querySelector('#adminWhatToExpectContent').value = state.whatToExpectContent || '';
    renderWeddingPartyDescriptionAdmin();
    renderWeddingPartyAttireAdmin();
    renderAdminAttireVideos();
  }
  document.querySelector('#menuAdminFields').hidden = isWedding;
  document.querySelector('#adminNewUnit').innerHTML = unitOptions();
  renderQuantityUnits();
  document.querySelector('#adminItems').innerHTML = state.items.map((item, index) => {
    const previousInCategory = state.items.slice(0, index).some(entry => entry.category === item.category);
    const nextInCategory = state.items.slice(index + 1).some(entry => entry.category === item.category);
    return `<div class="admin-row" data-admin-id="${escapeAttribute(item.id)}"><input value="${escapeAttribute(item.name)}" aria-label="Dish name"><select aria-label="Category">${['Appetizers','Main Table','Sides','Desserts','Drinks'].map(c => `<option ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}</select><select aria-label="Amount needed">${amountOptions(item)}</select><select aria-label="Quantity type">${unitOptions(item)}</select><div class="admin-row-actions"><button type="button" data-move="up" aria-label="Move ${escapeAttribute(item.name)} up" title="Move up" ${previousInCategory ? '' : 'disabled'}>↑</button><button type="button" data-move="down" aria-label="Move ${escapeAttribute(item.name)} down" title="Move down" ${nextInCategory ? '' : 'disabled'}>↓</button><button type="button" class="admin-delete" aria-label="Delete ${escapeAttribute(item.name)}" title="Delete">×</button></div></div>`;
  }).join('');
  document.querySelectorAll('.admin-row').forEach(row => {
    const [name, category, amount, unit, actions] = row.children;
    [name, category, amount, unit].forEach(input => input.addEventListener('change', () => { const item = state.items.find(i => i.id === row.dataset.adminId); item.name = name.value.trim() || item.name; item.category = category.value; item.optional = amount.value === 'optional'; item.unit = unit.value; if (!item.optional) item.needed = Number(amount.value); saveState(); }));
    actions.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => moveAdminItem(row.dataset.adminId, button.dataset.move)));
    const remove = actions.querySelector('.admin-delete');
    remove.addEventListener('click', () => { state.items = state.items.filter(i => i.id !== row.dataset.adminId); saveState(); openAdmin(); });
  });
  const dialog = document.querySelector('#adminDialog'); if (!dialog.open) dialog.showModal();
}
function renderBrideGroomPageAdmin() {
  const pages = state.brideGroomPages || [];
  const container = document.querySelector('#adminBrideGroomPages');
  container.innerHTML = pages.map((page, index) => `<div class="wedding-party-description-editor wedding-page-editor bride-groom-extra-page" data-bride-groom-admin-page="${escapeAttribute(page.id)}"><div class="wedding-page-editor-heading"><input type="text" value="${escapeAttribute(page.title)}" aria-label="Bride & Groom page ${index + 2} tab name" maxlength="60"><button type="button" class="admin-delete" aria-label="Delete ${escapeAttribute(page.title)} page" title="Delete page">×</button></div><textarea class="wedding-copy-editor" aria-label="${escapeAttribute(page.title)} page content" placeholder="Add your notes here…">${escapeHtml(page.content)}</textarea></div>`).join('');
  container.querySelectorAll('[data-bride-groom-admin-page]').forEach(editor => {
    const page = pages.find(item => item.id === editor.dataset.brideGroomAdminPage);
    const [heading, content] = [editor.querySelector('input'), editor.querySelector('textarea')];
    heading.addEventListener('change', () => {
      page.title = heading.value.trim() || 'Untitled page';
      saveState(); renderBrideGroomPageAdmin(); showToast('Bride & Groom page name updated.');
    });
    content.addEventListener('change', () => {
      page.content = content.value; saveState(); showToast(`${page.title} page updated.`);
    });
    editor.querySelector('.admin-delete').addEventListener('click', () => {
      state.brideGroomPages = pages.filter(item => item.id !== page.id);
      if (selectedBrideGroomPage === page.id) selectedBrideGroomPage = 'main';
      saveState(); renderBrideGroomPageAdmin(); showToast(`${page.title} page removed.`);
    });
  });
}
function commitBrideGroomPageEditors() {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  let changed = false;
  document.querySelectorAll('#adminBrideGroomPages [data-bride-groom-admin-page]').forEach(editor => {
    const page = state.brideGroomPages?.find(item => item.id === editor.dataset.brideGroomAdminPage);
    if (!page) return;
    const heading = editor.querySelector('input');
    const content = editor.querySelector('textarea');
    const title = heading.value.trim() || 'Untitled page';
    if (page.title !== title || page.content !== content.value) {
      page.title = title;
      page.content = content.value;
      changed = true;
    }
    [heading, content].forEach(control => {
      clearTimeout(editorInputSaveTimers.get(control));
      editorInputSaveTimers.delete(control);
      control.removeAttribute('data-editor-dirty');
    });
  });
  if (changed) {
    saveState();
    showToast('Bride & Groom page updated.');
  }
}
function renderAdminAttireVideos() {
  const videos = state.attireVideos || [];
  document.querySelector('#adminAttireVideos').innerHTML = videos.length
    ? videos.map((url, index) => `<div class="admin-video-row"><a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">Video ${index + 1}</a><button type="button" data-remove-attire-video="${index}" aria-label="Remove video ${index + 1}">Remove</button></div>`).join('')
    : '<p class="guest-empty">No attire videos have been added.</p>';
}
function renderWeddingPartyDescriptionAdmin() {
  const container = document.querySelector('#adminWeddingPartyDescriptions');
  container.innerHTML = (state.weddingPartyMembers || []).map(member => `<section class="wedding-party-description-editor" data-member-editor="${escapeAttribute(member.id)}"><h4>${escapeHtml(member.name)} <small>${escapeHtml(member.title)}</small></h4><label><span>Responsibilities</span><textarea class="wedding-copy-editor" data-member-responsibilities aria-label="Responsibilities for ${escapeAttribute(member.name)}" placeholder="Assign responsibilities to this person…">${escapeHtml(member.responsibilities || '')}</textarea></label><div class="wedding-page-editor-heading"><span>Personal pages</span><button type="button" data-add-member-page aria-label="Add page for ${escapeAttribute(member.name)}">+</button></div><div>${(member.pages || []).map(page => `<div class="wedding-page-editor" data-member-page-editor="${escapeAttribute(page.id)}"><div class="wedding-page-editor-heading"><input data-page-title value="${escapeAttribute(page.title)}" maxlength="60" aria-label="Page name for ${escapeAttribute(member.name)}"><button type="button" class="admin-delete" data-delete-member-page aria-label="Delete ${escapeAttribute(page.title)}">×</button></div><textarea class="wedding-copy-editor" data-page-content aria-label="${escapeAttribute(page.title)} content for ${escapeAttribute(member.name)}">${escapeHtml(page.content)}</textarea></div>`).join('')}</div></section>`).join('') || '<p class="guest-empty">Add wedding party members above to assign responsibilities and create personal pages.</p>';
  container.querySelectorAll('[data-member-editor]').forEach(editor => {
    const member = state.weddingPartyMembers.find(item => item.id === editor.dataset.memberEditor);
    editor.querySelectorAll('input, textarea').forEach(control => control.addEventListener('change', () => {
      commitWeddingPartyEditors();
    }));
    editor.querySelector('[data-add-member-page]').addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      commitWeddingPartyEditors();
      member.pages ||= [];
      const page = { id: crypto.randomUUID(), title: `Page ${member.pages.length + 1}`, content: '' };
      member.pages.push(page); saveState(); renderWeddingPartyDescriptionAdmin();
      container.querySelector(`[data-member-page-editor="${CSS.escape(page.id)}"] input`).focus();
    });
    editor.querySelectorAll('[data-delete-member-page]').forEach(button => button.addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      commitWeddingPartyEditors();
      const id = button.closest('[data-member-page-editor]').dataset.memberPageEditor;
      member.pages = member.pages.filter(page => page.id !== id);
      saveState(); renderWeddingPartyDescriptionAdmin();
    }));
  });
}
function commitWeddingPartyEditors() {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  let changed = false;
  document.querySelectorAll('#adminWeddingPartyDescriptions [data-member-editor]').forEach(editor => {
    const member = state.weddingPartyMembers.find(item => item.id === editor.dataset.memberEditor);
    if (!member) return;
    const responsibilities = editor.querySelector('[data-member-responsibilities]').value;
    if (member.responsibilities !== responsibilities) { member.responsibilities = responsibilities; changed = true; }
    editor.querySelectorAll('[data-member-page-editor]').forEach(pageEditor => {
      const page = member.pages.find(item => item.id === pageEditor.dataset.memberPageEditor);
      if (!page) return;
      const title = pageEditor.querySelector('[data-page-title]').value.trim() || 'Untitled page';
      const content = pageEditor.querySelector('[data-page-content]').value;
      if (page.title !== title || page.content !== content) { page.title = title; page.content = content; changed = true; }
    });
    editor.querySelectorAll('input, textarea').forEach(control => {
      clearTimeout(editorInputSaveTimers.get(control)); editorInputSaveTimers.delete(control);
      control.removeAttribute('data-editor-dirty');
    });
  });
  if (changed) saveState();
}
function moveAdminItem(itemId, direction) {
  const itemIndex = state.items.findIndex(item => item.id === itemId);
  if (itemIndex < 0) return;
  const item = state.items[itemIndex];
  const step = direction === 'up' ? -1 : 1;
  let swapIndex = itemIndex + step;
  while (state.items[swapIndex] && state.items[swapIndex].category !== item.category) swapIndex += step;
  if (!state.items[swapIndex]) return;
  [state.items[itemIndex], state.items[swapIndex]] = [state.items[swapIndex], state.items[itemIndex]];
  saveState();
  openAdmin();
  document.querySelector(`[data-admin-id="${CSS.escape(itemId)}"] [data-move="${direction}"]`)?.focus();
}
function renderQuantityUnits() {
  document.querySelector('#adminUnitError').textContent = '';
  document.querySelector('#adminUnits').innerHTML = state.quantityUnits.map(unit => `<div class="admin-unit-row" data-unit-id="${escapeAttribute(unit.id)}"><input value="${escapeAttribute(unit.label)}" maxlength="30" aria-label="Quantity type name" ${unit.locked ? 'disabled' : ''}><button type="button" ${unit.locked ? 'disabled' : ''} aria-label="Remove ${escapeAttribute(unit.label)} quantity type">Remove</button></div>`).join('');
  document.querySelectorAll('.admin-unit-row').forEach(row => {
    const [name, remove] = row.children;
    name.addEventListener('change', () => {
      const unit = state.quantityUnits.find(entry => entry.id === row.dataset.unitId);
      const label = name.value.trim();
      const duplicate = state.quantityUnits.some(entry => entry.id !== unit.id && entry.label.toLocaleLowerCase() === label.toLocaleLowerCase());
      if (!label || duplicate) {
        name.value = unit.label;
        document.querySelector('#adminUnitError').textContent = duplicate ? 'That quantity type already exists.' : 'Quantity type names cannot be empty.';
        return;
      }
      unit.label = label;
      saveState(); openAdmin();
    });
    remove.addEventListener('click', () => {
      if (state.quantityUnits.find(unit => unit.id === row.dataset.unitId)?.locked) return;
      state.quantityUnits = state.quantityUnits.filter(unit => unit.id !== row.dataset.unitId);
      state.items.forEach(item => { if (item.unit === row.dataset.unitId) item.unit = 'item'; });
      saveState(); openAdmin();
    });
  });
}
function renderInvitationSettings() {
  document.querySelector('#invitationAdminHeading').textContent = `${EVENT_DETAILS[viewedEventId].name} invitation values`;
  document.querySelector('#invitationEventDate').value = state.eventDate;
  const invitationFallback = defaultInvitationSettings(state.eventDate);
  document.querySelector('#invitationRsvpDate').value = state.rsvpDate || invitationFallback.rsvpDate;
  document.querySelector('#invitationAddress1').value = state.addressLine1 || invitationFallback.addressLine1;
  document.querySelector('#invitationAddress2').value = state.addressLine2 || invitationFallback.addressLine2;
  document.querySelector('#invitationTemplateAssignment').innerHTML = '<option value="">No template assigned</option>' + invitationTemplatesForEvent().map(template => `<option value="${escapeAttribute(template.id)}" ${template.id === state.invitationTemplateId ? 'selected' : ''}>${escapeHtml(template.name)}</option>`).join('');
}
function openAccountsAdmin() {
  const sortedAccounts = appState.accounts.map((account, index) => ({ account, index })).sort((left, right) =>
    firstAccountLastName(left.account.name).localeCompare(firstAccountLastName(right.account.name), 'en-US', { sensitivity: 'base' })
    || left.account.name.localeCompare(right.account.name, 'en-US', { sensitivity: 'base' }));
  document.querySelector('#adminAccounts').innerHTML = sortedAccounts.length ? sortedAccounts.map(({ account, index }) => {
    const adultCount = accountSignInNames(account.name).length;
    const plusOnes = plusOneCount(account, viewedEventId);
    const plusOneControl = `<label class="account-plus-ones"><span>Plus ones</span><select aria-label="Plus ones for ${escapeAttribute(account.name)} at ${escapeAttribute(EVENT_DETAILS[viewedEventId].name)}">${Array.from({ length: adultCount + 1 }, (_, count) => `<option value="${count}" ${count === plusOnes ? 'selected' : ''}>${count}</option>`).join('')}</select></label>`;
    return `<div class="account-row account-row-with-plus-ones" data-account-index="${index}"><div class="account-access"><label class="account-selection"><input class="account-selected" type="checkbox" ${accountCanSignIn(account, viewedEventId) ? 'checked' : ''}><span>Give Access</span></label><label class="account-selection"><input class="account-invited" type="checkbox" ${accountIsInvited(account, viewedEventId) ? 'checked' : ''}><span>Invite</span></label></div><div class="account-people">${accountContactsHtml(account)}</div>${plusOneControl}<div class="account-preview-actions"><button class="account-qr-button" type="button" aria-label="View QR code for ${escapeAttribute(account.name)}">QR</button><button class="account-invitation-button" type="button" aria-label="View invitation for ${escapeAttribute(account.name)}" ${account.qrToken ? '' : 'disabled title="QR access is required"'}>Inv</button></div></div>`;
  }).join('') : '<p class="guest-empty">No guest accounts yet.</p>';
  document.querySelectorAll('.account-row').forEach(row => {
    const access = row.querySelector('.account-access');
    const previewActions = row.querySelector('.account-preview-actions');
    const viewQr = previewActions.querySelector('.account-qr-button');
    const viewInvitation = previewActions.querySelector('.account-invitation-button');
    access.querySelector('.account-selected').addEventListener('change', event => {
      const account = appState.accounts[Number(row.dataset.accountIndex)];
      account.selectedEvents ??= {};
      account.selectedEvents[viewedEventId] = event.target.checked;
      if (!event.target.checked && guestName === account.name) guestName = '';
      saveState();
    });
    row.querySelector('.account-plus-ones select')?.addEventListener('change', event => {
      const account = appState.accounts[Number(row.dataset.accountIndex)];
      account.plusOnes ??= {};
      account.plusOnes[viewedEventId] = Number(event.target.value);
      saveState();
    });
    access.querySelector('.account-invited').addEventListener('change', event => {
      const account = appState.accounts[Number(row.dataset.accountIndex)];
      account.invitedEvents ??= {};
      account.invitedEvents[viewedEventId] = event.target.checked;
      saveState();
    });
    viewQr.addEventListener('click', () => openQrCode(appState.accounts[Number(row.dataset.accountIndex)]));
    viewInvitation.addEventListener('click', () => openInvitationPreview(appState.accounts[Number(row.dataset.accountIndex)]));
  });
  const dialog = document.querySelector('#accountsDialog'); if (!dialog.open) dialog.showModal();
}

function renderWeddingPartyAdmin() {
  commitWeddingPartyEditors();
  renderWeddingPartyDescriptionAdmin();
  state.weddingPartyMembers ??= [];
  document.querySelector('#adminWeddingPartyMembers').innerHTML = state.weddingPartyMembers.length
    ? renderWeddingPartyMemberList(state.weddingPartyMembers)
    : '<p class="guest-empty">No wedding party members yet.</p>';
  document.querySelectorAll('[data-wedding-party-index]').forEach(row => {
    const member = state.weddingPartyMembers[Number(row.dataset.weddingPartyIndex)];
    row.querySelector('.wedding-party-title').addEventListener('change', event => {
      const selectedTitle = WEDDING_PARTY_TITLES.find(title => title.value === event.target.value);
      if (!selectedTitle || (!selectedTitle.multiple && state.weddingPartyMembers.some(other => other !== member && other.title === selectedTitle.value))) {
        document.querySelector('#adminWeddingPartyError').textContent = selectedTitle ? `${selectedTitle.value} has already been assigned.` : 'Select a valid wedding party title.';
        event.target.value = member.title;
        return;
      }
      member.title = selectedTitle.value;
      document.querySelector('#adminWeddingPartyError').textContent = '';
      saveState(); renderWeddingPartyAdmin(); showToast(`${member.name}'s title updated.`);
    });
  });
  const titleSelect = document.querySelector('#adminWeddingPartyTitle');
  const usedTitles = new Set(state.weddingPartyMembers.map(member => member.title));
  titleSelect.innerHTML = '<option value="">Select title</option>' + WEDDING_PARTY_TITLES.map(title => `<option value="${escapeAttribute(title.value)}" ${!title.multiple && usedTitles.has(title.value) ? 'disabled' : ''}>${escapeHtml(title.value)}${!title.multiple && usedTitles.has(title.value) ? ' (assigned)' : ''}</option>`).join('');
  document.querySelectorAll('[data-remove-wedding-party]').forEach(button => button.addEventListener('click', () => {
    state.weddingPartyMembers.splice(Number(button.dataset.removeWeddingParty), 1);
    saveState(); renderWeddingPartyAdmin(); showToast('Wedding party member removed.');
  }));
  document.querySelectorAll('[data-move-wedding-party]').forEach(button => button.addEventListener('click', () => {
    const memberIndex = Number(button.dataset.weddingPartyMoveIndex);
    const member = state.weddingPartyMembers[memberIndex];
    const roleIndexes = state.weddingPartyMembers.map((partyMember, index) => ({ partyMember, index }))
      .filter(({ partyMember }) => partyMember.title === member.title)
      .map(({ index }) => index);
    const rolePosition = roleIndexes.indexOf(memberIndex);
    const targetIndex = roleIndexes[rolePosition + (button.dataset.moveWeddingParty === 'up' ? -1 : 1)];
    if (targetIndex === undefined) return;
    [state.weddingPartyMembers[memberIndex], state.weddingPartyMembers[targetIndex]] = [state.weddingPartyMembers[targetIndex], state.weddingPartyMembers[memberIndex]];
    saveState(); renderWeddingPartyAdmin(); showToast(`${member.name} moved ${button.dataset.moveWeddingParty}.`);
  }));
}

function renderWeddingPartyMemberList(members) {
  const memberCard = (member, index, rolePosition, roleCount) => `<div class="wedding-party-member" data-wedding-party-index="${index}"><strong>${escapeHtml(member.name)}</strong><select class="wedding-party-title" aria-label="Title for ${escapeAttribute(member.name)}"><option value="">Select title</option>${WEDDING_PARTY_TITLES.map(title => `<option value="${escapeAttribute(title.value)}" ${member.title === title.value ? 'selected' : ''}>${escapeHtml(title.value)}</option>`).join('')}</select><span class="wedding-party-order-controls"><button type="button" data-move-wedding-party="up" data-wedding-party-move-index="${index}" aria-label="Move ${escapeAttribute(member.name)} up within ${escapeAttribute(member.title)}" ${rolePosition === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move-wedding-party="down" data-wedding-party-move-index="${index}" aria-label="Move ${escapeAttribute(member.name)} down within ${escapeAttribute(member.title)}" ${rolePosition === roleCount - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-remove-wedding-party="${index}" aria-label="Remove ${escapeAttribute(member.name)} from wedding party">×</button></div>`;
  const cardsFor = title => {
    const roleMembers = members.map((member, index) => ({ member, index })).filter(({ member }) => member.title === title);
    return roleMembers.map(({ member, index }, rolePosition) => memberCard(member, index, rolePosition, roleMembers.length)).join('');
  };
  const fullWidthGroup = (title, position) => `<div class="wedding-party-role-group wedding-party-role-group-${position}" aria-label="${escapeAttribute(title)}">${cardsFor(title)}</div>`;
  const pairedGroup = (leftTitle, rightTitle) => `<div class="wedding-party-pair"><div class="wedding-party-role-column" aria-label="${escapeAttribute(leftTitle)}">${cardsFor(leftTitle)}</div><div class="wedding-party-role-column" aria-label="${escapeAttribute(rightTitle)}">${cardsFor(rightTitle)}</div></div>`;

  return fullWidthGroup('Officiant', 'top')
    + pairedGroup('Matron of Honor', 'Best Man')
    + pairedGroup('Bridesmaid', 'Groomsman')
    + pairedGroup('Flower Girl', 'Ring Bearer')
    + fullWidthGroup('Ushers', 'bottom');
}
function renderWeddingPartyAttireAdmin() {
  state.weddingPartyAttireImages ??= { ladies: [], gentlemen: [] };
  state.weddingPartyAttireNotes ??= { ladies: '', gentlemen: '' };
  document.querySelector('#adminWeddingPartyLadiesAttireNote').value = state.weddingPartyAttireNotes.ladies || '';
  document.querySelector('#adminWeddingPartyGentlemenAttireNote').value = state.weddingPartyAttireNotes.gentlemen || '';
  const list = document.querySelector('#adminWeddingPartyAttireImages');
  const entries = ['ladies', 'gentlemen'].flatMap(section => (state.weddingPartyAttireImages[section] || []).map((image, index) => ({ section, image, index })));
  list.innerHTML = entries.length ? entries.map(({ section, image, index }) => `<article><img src="${escapeAttribute(image.url)}" alt=""><label><strong>For the ${section === 'ladies' ? 'Ladies' : 'Gentlemen'}</strong><textarea data-party-attire-caption="${section}:${index}" aria-label="Caption for ${section === 'ladies' ? 'ladies’' : 'gentlemen’s'} attire image" placeholder="Caption (optional)">${escapeHtml(image.caption || '')}</textarea></label><button type="button" data-remove-party-attire="${section}:${index}">Remove</button></article>`).join('') : '<p class="guest-empty">No private attire images yet.</p>';
}
function openQrCode(account) {
  qrAdminAccount = account;
  document.querySelector('#qrAccountName').textContent = account.name;
  const preview = document.querySelector('#qrCodePreview');
  const unavailable = document.querySelector('#qrCodeUnavailable');
  const linkWrapper = document.querySelector('#qrSignInLinkWrapper');
  const signInLink = document.querySelector('#qrSignInLink');
  const buttons = [document.querySelector('#downloadQrPng'), document.querySelector('#downloadQrSvg')];
  preview.innerHTML = account.qrToken ? qrSvg(makeQrCode(accountQrUrl(account))) : '';
  unavailable.hidden = Boolean(account.qrToken);
  linkWrapper.hidden = !account.qrToken;
  signInLink.href = account.qrToken ? accountQrUrl(account) : '';
  signInLink.textContent = account.qrToken ? accountQrUrl(account) : '';
  buttons.forEach(button => { button.disabled = !account.qrToken; });
  document.querySelector('#qrCodeDialog').showModal();
}
document.querySelector('#downloadQrPng').addEventListener('click', () => { if (qrAdminAccount?.qrToken) downloadQrPng(qrAdminAccount); });
document.querySelector('#downloadQrSvg').addEventListener('click', () => { if (qrAdminAccount?.qrToken) downloadQrSvg(qrAdminAccount); });
[['invitationEventDate', 'eventDate'], ['invitationRsvpDate', 'rsvpDate'], ['invitationAddress1', 'addressLine1'], ['invitationAddress2', 'addressLine2']].forEach(([id, key]) => {
  document.querySelector(`#${id}`).addEventListener('change', event => {
    const value = event.target.value.trim(); if (!value) return;
    state[key] = value; saveState(); renderInvitationSettings(); showToast('Invitation setting updated.');
  });
});
document.querySelector('#invitationTemplateAssignment').addEventListener('change', event => {
  state.invitationTemplateId = event.target.value; saveState(); showToast('Invitation template assignment updated.');
});
document.querySelector('#downloadInvitationPng').addEventListener('click', async () => {
  if (invitationPreviewAccount) await downloadInvitation(invitationPreviewAccount);
  else showToast('Choose an invited account to download its invitation.');
});
document.querySelector('#configureInvitationTemplate').addEventListener('click', () => {
  document.querySelector('#invitationPreviewDialog').close();
  document.querySelector('#accountsDialog').close();
  renderTemplateManager();
  document.querySelector('#invitationTemplatesDialog').showModal();
});
document.querySelector('#downloadAllInvitations').addEventListener('click', async () => {
  if (!state.invitationTemplateId) { showToast('Assign an invitation template first.'); return; }
  for (const account of invitationAccounts()) { await downloadInvitation(account); await new Promise(resolve => setTimeout(resolve, 150)); }
});
document.querySelector('#emailAllInvitations').addEventListener('click', async event => {
  if (!state.invitationTemplateId) { showToast('Assign an invitation template first.'); return; }
  const accounts = invitationAccounts();
  if (!accounts.length) { showToast('There are no invited families with QR access.'); return; }
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Preparing Invitations…';
  try {
    const files = [];
    for (const account of accounts) files.push(await invitationFile(account));
    const share = { files, title: `${EVENT_DETAILS[viewedEventId].name} invitations`, text: 'Invitations are attached.' };
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files }))) throw new Error('This browser cannot attach files to a new email. Try this button in Safari, Chrome, or Edge on a device with an email app installed.');
    await navigator.share(share);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(error);
      showToast(error.message || 'Could not open an email with the invitations attached.');
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Email All Invitations';
  }
});

let templateDraft = null;
let selectedTemplateFieldId = '';
let pendingTemplateFieldKey = '';
let newTemplateBackgroundFile = null;
let templatePreviewObjectUrl = '';
let templatePreviewLoadId = 0;
let templateEditorResizeObserver = null;
function templateAssetUrl(id) { return `${SHARED_STATE_URL.replace(/\/$/, '')}/invitation-backgrounds/${encodeURIComponent(id)}`; }
function weddingPartyAttireAssetUrl(id) { return templateAssetUrl(`wedding-attire-${id}`); }
async function backgroundMetadata(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file?.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  const bitmap = await createImageBitmap(file);
  const result = { width: bitmap.width, height: bitmap.height, contentType: file.type };
  bitmap.close();
  if (!result.width || !result.height) throw new Error('The image dimensions could not be read.');
  return result;
}
async function uploadTemplateBackground(templateId, file) {
  if (!SHARED_STATE_URL) throw new Error('Configure the shared-state Worker before uploading invitation artwork.');
  const metadata = await backgroundMetadata(file);
  const response = await fetchWithTimeout(templateAssetUrl(templateId), { method: 'PUT', headers: { 'Content-Type': file.type, 'X-Host-Password': hostCredential }, body: file });
  if (!response.ok) {
    const details = await response.text();
    if (response.status === 401) throw new Error('The Worker host password does not match this website. Update the HOST_PASSWORD Worker secret.');
    if (response.status === 404 || response.status === 405 || details === 'Unable to access shared state.') {
      throw new Error('The invitation upload endpoint is not deployed. Create the R2 bucket, then deploy the latest shared-state Worker.');
    }
    if (response.status === 503) throw new Error(details || 'Invitation background storage is unavailable. Verify the Worker R2 bucket binding.');
    throw new Error(details || `Background upload failed (${response.status}).`);
  }
  return { ...metadata, url: templateAssetUrl(templateId), updatedAt: new Date().toISOString() };
}
async function uploadWeddingPartyAttireImage(id, file) {
  if (!SHARED_STATE_URL) throw new Error('Configure the shared-state Worker before uploading attire images.');
  const metadata = await backgroundMetadata(file);
  const response = await fetchWithTimeout(weddingPartyAttireAssetUrl(id), { method: 'PUT', headers: { 'Content-Type': file.type, 'X-Host-Password': hostCredential }, body: file });
  if (!response.ok) {
    const details = await response.text();
    if (response.status === 401) throw new Error('The Worker host password does not match this website.');
    if (response.status === 503) throw new Error(details || 'Image storage is unavailable. Verify the Worker R2 bucket binding.');
    throw new Error(details || `Attire image upload failed (${response.status}).`);
  }
  return { id, ...metadata, url: weddingPartyAttireAssetUrl(id) };
}
function renderTemplateManager() {
  document.querySelector('#invitationTemplatesHeading').textContent = `${EVENT_DETAILS[viewedEventId].name} invitation templates`;
  renderInvitationSettings();
  const list = document.querySelector('#invitationTemplateList');
  const gatheringTemplates = invitationTemplatesForEvent();
  list.innerHTML = gatheringTemplates.length ? gatheringTemplates.map(template => `<article><div><strong>${escapeHtml(template.name)}</strong><span>${template.background.width} × ${template.background.height}px</span></div><div><button type="button" data-template-edit="${escapeAttribute(template.id)}">Edit</button><button type="button" data-template-duplicate="${escapeAttribute(template.id)}">Duplicate</button><button type="button" data-template-delete="${escapeAttribute(template.id)}">Delete</button></div></article>`).join('') : `<p>No invitation templates for ${escapeHtml(EVENT_DETAILS[viewedEventId].name)} yet.</p>`;
  list.querySelectorAll('[data-template-edit]').forEach(button => button.addEventListener('click', () => openTemplateEditor(button.dataset.templateEdit)));
  list.querySelectorAll('[data-template-duplicate]').forEach(button => button.addEventListener('click', () => {
    const source = gatheringTemplates.find(template => template.id === button.dataset.templateDuplicate);
    appState.invitationTemplates.push({ ...window.Invitation.duplicateTemplate(source), eventId: viewedEventId }); saveState(); renderTemplateManager();
  }));
  list.querySelectorAll('[data-template-delete]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.templateDelete;
    if (!confirm('Delete this template? Gathering data and accounts will not be deleted.')) return;
    const deleted = appState.invitationTemplates.find(template => template.id === id);
    appState.invitationTemplates = appState.invitationTemplates.filter(template => template.id !== id);
    Object.values(appState.events).forEach(event => { if (event.invitationTemplateId === id) event.invitationTemplateId = ''; });
    const backgroundStillUsed = appState.invitationTemplates.some(template => template.background.url === deleted?.background.url);
    if (SHARED_STATE_URL && deleted && !backgroundStillUsed) fetch(deleted.background.url, { method: 'DELETE', headers: { 'X-Host-Password': hostCredential } }).catch(console.error);
    saveState(); renderTemplateManager();
  }));
}
function openTemplateManager() { renderTemplateManager(); document.querySelector('#invitationTemplatesDialog').showModal(); }
document.querySelector('#invitationTemplatesButton').addEventListener('click', openTemplateManager);
document.querySelector('#createTemplateButton').addEventListener('click', async () => {
  const error = document.querySelector('#templateManagerError'), name = document.querySelector('#newTemplateName').value.trim(), file = newTemplateBackgroundFile;
  error.textContent = '';
  try {
    if (!name) throw new Error('Enter a template name.'); if (!file) throw new Error('Choose a background image.');
    const template = window.Invitation.createTemplate(name, { width: 1, height: 1, contentType: file.type, url: '' });
    template.eventId = viewedEventId;
    template.background = await uploadTemplateBackground(template.id, file);
    appState.invitationTemplates.push(template);
    if (!invitationTemplatesForEvent().some(item => item.id === state.invitationTemplateId)) state.invitationTemplateId = template.id;
    saveState(); renderTemplateManager();
    document.querySelector('#newTemplateName').value = ''; document.querySelector('#newTemplateBackground').value = ''; newTemplateBackgroundFile = null; updateDropzone(document.querySelector('#newTemplateDropzone'), null);
    openTemplateEditor(template.id, file);
  } catch (caught) { error.textContent = caught.message; }
});
function editorScale() {
  const stage = document.querySelector('#templateCanvasStage');
  return stage.getBoundingClientRect().width / templateDraft.background.width;
}
function previewValue(field) {
  if (field.type === 'qr') return '';
  return window.Invitation.fieldValue(field, state) || field.label;
}
function templateEditorQrSvg() {
  const selectedToken = document.querySelector('#templatePreviewAccount').value;
  const account = appState.accounts.find(item => item.qrToken === selectedToken) || null;
  return qrSvg(makeQrCode(invitationQrUrl(account)));
}
function renderEditorFields() {
  const layer = document.querySelector('#templateFieldLayer');
  layer.innerHTML = templateDraft.fields.map(field => `<div class="editor-field ${field.type} ${field.id === selectedTemplateFieldId ? 'selected' : ''}" data-field-id="${field.id}" style="left:${field.x}px;top:${field.y}px;width:${field.width}px;height:${field.height}px;${field.type === 'text' ? `font-family:${escapeAttribute(field.fontFamily)};font-size:${field.fontSize}px;font-weight:${field.fontWeight};font-style:${field.italic ? 'italic' : 'normal'};color:${field.color};text-align:${field.textAlign};letter-spacing:${field.letterSpacing}px;line-height:${field.lineHeight};word-spacing:${field.wordSpacing || 0}px` : ''}">${field.type === 'qr' ? templateEditorQrSvg() : escapeHtml(previewValue(field))}<button class="resize-handle" type="button" aria-label="Resize field"></button></div>`).join('');
  layer.querySelectorAll('.editor-field').forEach(element => {
    element.addEventListener('pointerdown', event => beginFieldPointer(event, element));
    element.addEventListener('click', event => { event.stopPropagation(); selectedTemplateFieldId = element.dataset.fieldId; renderEditorFields(); renderFieldInspector(); });
  });
  const overflowModel = window.Invitation.invitationModel(templateDraft, state, invitationQrUrl(null));
  const overflowing = window.Invitation.overflowWarnings(document.createElement('canvas'), overflowModel);
  document.querySelector('#templateOverflowWarning').textContent = overflowing.length ? `Text exceeds its field width: ${overflowing.join(', ')}.` : '';
}
function beginFieldPointer(event, element) {
  event.stopPropagation(); event.preventDefault(); selectedTemplateFieldId = element.dataset.fieldId;
  const field = templateDraft.fields.find(item => item.id === selectedTemplateFieldId), resizing = event.target.classList.contains('resize-handle');
  const start = { x: event.clientX, y: event.clientY, fieldX: field.x, fieldY: field.y, width: field.width, height: field.height }, scale = editorScale();
  element.setPointerCapture(event.pointerId);
  element.onpointermove = move => {
    const dx = (move.clientX - start.x) / scale, dy = (move.clientY - start.y) / scale;
    if (resizing) { const size = field.type === 'qr' ? Math.max(64, start.width + Math.max(dx, dy)) : null; field.width = Math.round(size || Math.max(40, start.width + dx)); field.height = Math.round(size || Math.max(24, start.height + dy)); }
    else { field.x = Math.round(Math.max(0, Math.min(templateDraft.background.width - field.width, start.fieldX + dx))); field.y = Math.round(Math.max(0, Math.min(templateDraft.background.height - field.height, start.fieldY + dy))); }
    element.style.left = `${field.x}px`; element.style.top = `${field.y}px`; element.style.width = `${field.width}px`; element.style.height = `${field.height}px`; renderFieldInspector();
  };
  element.onpointerup = () => { element.onpointermove = null; element.onpointerup = null; renderEditorFields(); };
  renderFieldInspector();
}
function renderFieldInspector() {
  const inspector = document.querySelector('#fieldInspector'), field = templateDraft.fields.find(item => item.id === selectedTemplateFieldId);
  if (!field) { inspector.innerHTML = '<h3>Field settings</h3><p>Select a placed field.</p>'; return; }
  const numeric = (key, label, step = 1) => `<label>${label}<input data-field-setting="${key}" type="number" step="${step}" value="${field[key]}"></label>`;
  inspector.innerHTML = `<h3>${escapeHtml(field.label)}</h3><div class="inspector-grid">${numeric('x', 'X')}${numeric('y', 'Y')}${numeric('width', 'Width')}${numeric('height', 'Height')}${field.type === 'text' ? `<label>Font<select data-field-setting="fontFamily">${window.Invitation.FONT_FAMILIES.map(font => `<option ${font === field.fontFamily ? 'selected' : ''}>${font}</option>`).join('')}</select></label>${numeric('fontSize', 'Font size')}${numeric('letterSpacing', 'Letter spacing', .1)}${numeric('lineHeight', 'Line height', .1)}<label>Weight<select data-field-setting="fontWeight"><option value="400">Regular</option><option value="600" ${field.fontWeight === '600' ? 'selected' : ''}>Semibold</option><option value="700" ${field.fontWeight === '700' ? 'selected' : ''}>Bold</option></select></label><label>Alignment<select data-field-setting="textAlign"><option>left</option><option ${field.textAlign === 'center' ? 'selected' : ''}>center</option><option ${field.textAlign === 'right' ? 'selected' : ''}>right</option></select></label><label>Color<input data-field-setting="color" type="color" value="${field.color}"></label><label class="check"><input data-field-setting="italic" type="checkbox" ${field.italic ? 'checked' : ''}> Italic</label>${field.key === 'eventDate' ? `<label>Format<select data-field-setting="formatter">${window.Invitation.EVENT_DATE_FORMATTERS.map(([value, label]) => `<option value="${value}" ${value === field.formatter ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}${field.key === 'rsvpBy' ? `<label>Format<select data-field-setting="formatter">${window.Invitation.RSVP_FORMATTERS.map(([value, label]) => `<option value="${value}" ${value === field.formatter ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}${field.key === 'customText' ? `<label>Text<input data-field-setting="customText" value="${escapeAttribute(field.customText)}"></label>` : ''}` : '<p>QR resizing always preserves a square aspect ratio and a four-module quiet zone.</p>'}</div><button id="deleteTemplateField" type="button">Delete Field</button>`;
  inspector.querySelectorAll('[data-field-setting]').forEach(input => input.addEventListener('input', () => {
    const key = input.dataset.fieldSetting; field[key] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
    if (field.type === 'qr' && (key === 'width' || key === 'height')) field.width = field.height = Number(input.value);
    if (key === 'formatter') field.wordSpacing = input.value.endsWith('-spaced') ? 14 : 0;
    renderEditorFields();
  }));
  document.querySelector('#deleteTemplateField').addEventListener('click', () => { templateDraft.fields = templateDraft.fields.filter(item => item.id !== field.id); selectedTemplateFieldId = ''; renderEditorFields(); renderFieldInspector(); });
}
function sizeEditorStage() {
  const viewport = document.querySelector('#templateCanvasViewport'), stage = document.querySelector('#templateCanvasStage');
  if (!templateDraft || !viewport.parentElement.clientWidth) return;
  const width = Number(templateDraft.background.width), height = Number(templateDraft.background.height);
  if (!width || !height) return;
  const scale = Math.min(1, viewport.parentElement.clientWidth / width, 680 / height);
  const displayedWidth = Math.max(1, Math.round(width * scale)), displayedHeight = Math.max(1, Math.round(height * scale));
  viewport.style.width = `${displayedWidth}px`; viewport.style.height = `${displayedHeight}px`;
  stage.style.width = `${width}px`; stage.style.height = `${height}px`; stage.style.transform = `scale(${scale})`;
}
async function loadTemplateBackgroundPreview(background, localFile = null) {
  const image = document.querySelector('#templateBackgroundPreview'), error = document.querySelector('#templateEditorError'), status = document.querySelector('#templateBackgroundStatus');
  const loadId = ++templatePreviewLoadId;
  error.textContent = '';
  image.removeAttribute('src');
  image.classList.add('loading');
  status.hidden = false;
  status.textContent = 'Loading background…';
  try {
    let objectUrl;
    if (localFile) objectUrl = URL.createObjectURL(localFile);
    else {
      const separator = background.url.includes('?') ? '&' : '?';
      const response = await fetch(`${background.url}${separator}v=${encodeURIComponent(background.updatedAt || Date.now())}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Background request failed (${response.status}).`);
      objectUrl = URL.createObjectURL(await response.blob());
    }
    if (loadId !== templatePreviewLoadId) { URL.revokeObjectURL(objectUrl); return; }
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The uploaded image could not be displayed.'));
      image.src = objectUrl;
    });
    if (templatePreviewObjectUrl) URL.revokeObjectURL(templatePreviewObjectUrl);
    templatePreviewObjectUrl = objectUrl;
    image.classList.remove('loading');
    status.hidden = true;
    sizeEditorStage();
  } catch (caught) {
    if (loadId !== templatePreviewLoadId) return;
    image.classList.remove('loading');
    status.textContent = 'Background preview unavailable';
    error.textContent = `Unable to load the template background. ${caught.message}`;
  }
}
function openTemplateEditor(id, localFile = null) {
  const template = invitationTemplatesForEvent().find(item => item.id === id); if (!template) return;
  templateDraft = structuredClone(template); selectedTemplateFieldId = ''; pendingTemplateFieldKey = '';
  document.querySelector('#replaceTemplateBackground').value = ''; updateDropzone(document.querySelector('#replaceTemplateDropzone'), null);
  document.querySelector('#templateEditorHeading').textContent = templateDraft.name;
  document.querySelector('#templateEditorName').value = templateDraft.name;
  document.querySelector('#templateFieldToolbox').innerHTML = Object.entries(window.Invitation.FIELD_DEFINITIONS).map(([key, definition]) => `<button type="button" data-field-key="${key}">${definition.label}</button>`).join('');
  document.querySelectorAll('[data-field-key]').forEach(button => button.addEventListener('click', () => { pendingTemplateFieldKey = button.dataset.fieldKey; document.querySelector('#placementHelp').textContent = `Click the invitation to place ${button.textContent}.`; }));
  document.querySelector('#templatePreviewAccount').innerHTML = '<option value="">Sample QR</option>' + invitationAccounts().map(account => `<option value="${escapeAttribute(account.qrToken)}">${escapeHtml(account.name)}</option>`).join('');
  document.querySelector('#invitationTemplatesDialog').close(); document.querySelector('#invitationEditorDialog').showModal();
  if (templateEditorResizeObserver) templateEditorResizeObserver.disconnect();
  templateEditorResizeObserver = new ResizeObserver(sizeEditorStage);
  templateEditorResizeObserver.observe(document.querySelector('.template-canvas-column'));
  requestAnimationFrame(() => requestAnimationFrame(() => { sizeEditorStage(); renderEditorFields(); renderFieldInspector(); loadTemplateBackgroundPreview(templateDraft.background, localFile); }));
}
document.querySelector('#templateCanvasStage').addEventListener('click', event => {
  if (!pendingTemplateFieldKey) return;
  const rect = event.currentTarget.getBoundingClientRect(), scale = editorScale();
  const field = window.Invitation.newField(pendingTemplateFieldKey, (event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale);
  field.width = Math.min(field.width, templateDraft.background.width - field.x); field.height = Math.min(field.height, templateDraft.background.height - field.y);
  templateDraft.fields.push(field); selectedTemplateFieldId = field.id; pendingTemplateFieldKey = ''; document.querySelector('#placementHelp').textContent = 'Choose another field or edit the selected field.'; renderEditorFields(); renderFieldInspector();
});
async function replaceTemplateBackground(file) {
  const error = document.querySelector('#templateEditorError'); error.textContent = '';
  try {
    if (!file) return; const metadata = await backgroundMetadata(file);
    if ((metadata.width !== templateDraft.background.width || metadata.height !== templateDraft.background.height) && !confirm(`The new image is ${metadata.width} × ${metadata.height}, not ${templateDraft.background.width} × ${templateDraft.background.height}. Existing coordinates will be preserved, not stretched. Continue?`)) return;
    const background = await uploadTemplateBackground(templateDraft.id, file); templateDraft = window.Invitation.replaceBackground(templateDraft, background).template;
    await loadTemplateBackgroundPreview(background, file); renderEditorFields();
    const index = appState.invitationTemplates.findIndex(template => template.id === templateDraft.id); appState.invitationTemplates[index] = structuredClone(templateDraft); saveState(); showToast('Background replaced and template saved.');
  } catch (caught) { error.textContent = caught.message; }
}
function updateDropzone(dropzone, file) {
  dropzone.classList.toggle('has-file', Boolean(file));
  const emptyLabel = dropzone.dataset.emptyLabel || 'Drop artwork here';
  dropzone.querySelector('span').innerHTML = file ? `<strong>${escapeHtml(file.name)}</strong>` : `<strong>${escapeHtml(emptyLabel)}</strong> or choose a file`;
}
function configureDropzone(dropzone, input, onFile) {
  input.addEventListener('change', () => onFile(input.files[0] || null));
  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; dropzone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('drag-over'); }));
  dropzone.addEventListener('drop', event => onFile([...event.dataTransfer.files].find(file => file.type.startsWith('image/')) || event.dataTransfer.files[0] || null));
}
configureDropzone(document.querySelector('#newTemplateDropzone'), document.querySelector('#newTemplateBackground'), file => { newTemplateBackgroundFile = file; updateDropzone(document.querySelector('#newTemplateDropzone'), file); });
configureDropzone(document.querySelector('#replaceTemplateDropzone'), document.querySelector('#replaceTemplateBackground'), file => { updateDropzone(document.querySelector('#replaceTemplateDropzone'), file); replaceTemplateBackground(file); });
let weddingPartyAttireFile = null;
const weddingPartyAttireDropzone = document.querySelector('#adminWeddingPartyAttireDropzone');
const weddingPartyAttireFileInput = document.querySelector('#adminWeddingPartyAttireFile');
configureDropzone(weddingPartyAttireDropzone, weddingPartyAttireFileInput, file => {
  weddingPartyAttireFile = file;
  updateDropzone(weddingPartyAttireDropzone, file);
  if (file) document.querySelector('#adminWeddingPartyAttireError').textContent = '';
});
document.querySelector('#saveTemplateButton').addEventListener('click', () => {
  templateDraft.name = document.querySelector('#templateEditorName').value.trim() || templateDraft.name; templateDraft.updatedAt = new Date().toISOString(); const index = appState.invitationTemplates.findIndex(template => template.id === templateDraft.id); appState.invitationTemplates[index] = structuredClone(templateDraft); document.querySelector('#templateEditorHeading').textContent = templateDraft.name; saveState(); showToast('Invitation template saved.');
});
document.querySelector('#templatePreviewAccount').addEventListener('change', renderEditorFields);
document.querySelector('#previewEditedTemplateButton').addEventListener('click', async () => {
  const selectedToken = document.querySelector('#templatePreviewAccount').value;
  const account = appState.accounts.find(item => item.qrToken === selectedToken) || null, canvas = document.querySelector('#invitationCanvas');
  invitationPreviewAccount = account; const model = window.Invitation.invitationModel(templateDraft, state, invitationQrUrl(account));
  await window.Invitation.render(canvas, model, makeQrCode(model.qrUrl)); document.querySelector('#invitationPreviewHeading').textContent = templateDraft.name; document.querySelector('#invitationPreviewAccount').textContent = account ? `Previewing ${account.name}'s existing account QR. The name is not printed.` : 'Previewing a sample QR.'; document.querySelector('#invitationPreviewStatus').textContent = ''; document.querySelector('#invitationPreviewStatus').classList.remove('form-error'); document.querySelector('#invitationCanvasWrap').hidden = false; document.querySelector('#configureInvitationTemplate').hidden = true; document.querySelector('#downloadInvitationPng').disabled = !account?.qrToken; document.querySelector('#invitationPreviewDialog').showModal();
});
function openEventsAdmin() {
  document.querySelector('#eventChoices').innerHTML = Object.entries(EVENT_DETAILS).map(([id, event]) => {
    const date = new Date(`${appState.events[id].eventDate}T12:00:00`);
    const formatted = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date).replaceAll(',', '');
    const previewing = id === viewedEventId;
    return `<div class="event-choice"><div><strong>${event.name}</strong><span>${formatted}</span></div><div class="event-choice-actions"><button class="preview-event" type="button" data-preview-event="${id}" ${previewing ? 'disabled' : ''}>${previewing ? 'Previewing' : 'Preview'}</button></div></div>`;
  }).join('');
  document.querySelectorAll('[data-preview-event]').forEach(button => button.addEventListener('click', () => {
    const eventId = button.dataset.previewEvent;
    document.querySelector('#eventsDialog').close();
    enterEvent(eventId);
    showToast(`Previewing ${EVENT_DETAILS[eventId].name}.`);
  }));
  const dialog = document.querySelector('#eventsDialog');
  if (!dialog.open) dialog.showModal();
}
function updateClearClaimFamilies() {
  const item = state.items.find(entry => entry.id === document.querySelector('#clearClaimItem').value);
  const familySelect = document.querySelector('#clearClaimFamily');
  const families = item ? [...new Set(item.claims)] : [];
  familySelect.innerHTML = families.map(name => `<option value="${escapeAttribute(name)}">${escapeHtml(contributionDisplayName(name))}</option>`).join('');
  updateClearClaimQuantities();
}
function updateClearClaimQuantities() {
  const item = state.items.find(entry => entry.id === document.querySelector('#clearClaimItem').value);
  const family = document.querySelector('#clearClaimFamily').value;
  const claimed = item ? item.claims.filter(name => name === family).length : 0;
  document.querySelector('#clearClaimQuantity').innerHTML = Array.from({ length: claimed }, (_, index) => {
    const quantity = index + 1;
    return `<option value="${quantity}">${escapeHtml(formatQuantity(quantity, item))}</option>`;
  }).join('');
}
function openClearClaimDialog() {
  const claimedItems = state.items.filter(item => item.claims.length);
  const itemSelect = document.querySelector('#clearClaimItem');
  itemSelect.innerHTML = claimedItems.map(item => `<option value="${escapeAttribute(item.id)}">${escapeHtml(item.name)} (${escapeHtml(formatQuantity(item.claims.length, item))} claimed)</option>`).join('');
  const hasClaims = claimedItems.length > 0;
  document.querySelector('#clearClaimError').textContent = hasClaims ? '' : 'There are no claimed dishes to clear.';
  document.querySelector('#clearClaimSubmit').disabled = !hasClaims;
  updateClearClaimFamilies();
  document.querySelector('#clearClaimDialog').showModal();
}
document.querySelector('#editItemsButton').addEventListener('click', openAdmin);
document.querySelector('#clearClaimButton').addEventListener('click', openClearClaimDialog);
document.querySelector('#editAccountsButton').addEventListener('click', openAccountsAdmin);
document.querySelector('#previewWeddingPartyButton').addEventListener('click', () => {
  const members = appState.events.wedding.weddingPartyMembers || [];
  const select = document.querySelector('#hostWeddingPartyView');
  if (hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW && !members.some(member => member.name === hostWeddingPartyViewName)) hostWeddingPartyViewName = GENERAL_GUEST_PREVIEW;
  select.innerHTML = `<option value="${GENERAL_GUEST_PREVIEW}" ${hostWeddingPartyViewName === GENERAL_GUEST_PREVIEW ? 'selected' : ''}>General guest</option>`
    + members.map(member => `<option value="${escapeAttribute(member.name)}" ${member.name === hostWeddingPartyViewName ? 'selected' : ''}>${escapeHtml(member.name)} — ${escapeHtml(member.title || 'Wedding Party')}</option>`).join('');
  document.querySelector('#hostWeddingPartyViewError').textContent = '';
  document.querySelector('#openWeddingPartyPreview').disabled = false;
  document.querySelector('#weddingPartyPreviewDialog').showModal();
});
document.querySelector('#openWeddingPartyPreview').addEventListener('click', () => {
  hostWeddingPartyViewName = document.querySelector('#hostWeddingPartyView').value;
  if (!hostWeddingPartyViewName) return;
  document.querySelector('#weddingPartyPreviewDialog').close();
  selectedWeddingTab = hostWeddingPartyViewName === GENERAL_GUEST_PREVIEW ? 'guest' : 'party';
  enterEvent('wedding', { preserveWeddingView: true });
});
document.querySelector('#cancelViewAsButton').addEventListener('click', () => {
  hostWeddingPartyViewName = '';
  selectedWeddingTab = 'couple';
  selectedMatronTab = 'experience';
  render();
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
});
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function anyListSyncErrorMessage(status, errorCode) {
  if (status === 401 || errorCode === 'host_authentication_failed') return 'Unable to sync: the Worker host password secret does not match the website host password.';
  if (status === 403) return 'Unable to sync: this website origin is not allowed by the Cloudflare Worker.';
  if (status === 404 || status === 405) return 'Unable to sync: the updated Cloudflare Worker has not been deployed yet.';
  if (errorCode === 'workflow_dispatch_failed') return 'Unable to sync: GitHub could not start the workflow. Check the Worker GitHub token and workflow branch.';
  if (errorCode === 'status_read_failed') return 'Unable to sync: the Worker could not read the result from the shared data repository.';
  if (status >= 500) return 'Unable to sync: the Cloudflare Worker configuration could not start the AnyList job.';
  return 'Unable to sync AnyList Address Book. Existing accounts were not changed.';
}
document.querySelector('#syncAnyListButton').addEventListener('click', async event => {
  if (!hostAuthenticated || !SHARED_STATE_URL) return;
  const button = event.currentTarget;
  const result = document.querySelector('#anyListSyncResult');
  button.disabled = true;
  button.textContent = 'Syncing…';
  result.textContent = 'Syncing…';
  try {
    const headers = { 'X-Host-Password': hostCredential };
    const started = await fetch(`${SHARED_STATE_URL.replace(/\/$/, '')}/anylist-sync`, { method: 'POST', headers });
    if (!started.ok) {
      const details = await started.json().catch(() => ({}));
      const error = new Error(`Sync start failed (${started.status})`);
      error.displayMessage = anyListSyncErrorMessage(started.status, details.error);
      throw error;
    }
    const { syncId } = await started.json();
    let outcome;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await wait(5000);
      const status = await fetch(`${SHARED_STATE_URL.replace(/\/$/, '')}/anylist-sync/status?id=${encodeURIComponent(syncId)}`, { headers, cache: 'no-store' });
      if (!status.ok) {
        const details = await status.json().catch(() => ({}));
        const error = new Error(`Sync status failed (${status.status})`);
        error.displayMessage = anyListSyncErrorMessage(status.status, details.error);
        throw error;
      }
      outcome = await status.json();
      if (outcome.state !== 'running') break;
    }
    if (!outcome || outcome.state !== 'complete') {
      const error = new Error('AnyList sync failed or timed out.');
      error.displayMessage = outcome?.state === 'failed'
        ? 'Unable to sync: the GitHub Actions job failed. Open the latest “Sync AnyList Address Book” run for details.'
        : 'Unable to sync: the GitHub Actions job did not finish within 10 minutes.';
      throw error;
    }
    await loadSharedState();
    if (document.querySelector('#accountsDialog').open) openAccountsAdmin();
    const added = outcome.added ? `${outcome.added} new account${outcome.added === 1 ? '' : 's'} added` : 'no new accounts found';
    const skipped = outcome.skipped ? `, ${outcome.skipped} entr${outcome.skipped === 1 ? 'y' : 'ies'} skipped` : '';
    const qrResult = outcome.qrAccessCreated
      ? ` Created QR access for ${outcome.qrAccessCreated} account${outcome.qrAccessCreated === 1 ? '' : 's'}.`
      : ' All accounts already have QR access.';
    result.textContent = `Sync complete — ${added}${skipped}.${qrResult}`;
  } catch (error) {
    console.error(error);
    result.textContent = error.displayMessage || (error instanceof TypeError
      ? 'Unable to contact the AnyList sync service. Deploy the latest Cloudflare Worker and check its allowed origin.'
      : 'Unable to sync AnyList Address Book. Existing accounts were not changed.');
  } finally {
    button.disabled = false;
    button.textContent = 'Sync AnyList Address Book';
  }
});
document.querySelector('#clearClaimItem').addEventListener('change', updateClearClaimFamilies);
document.querySelector('#clearClaimFamily').addEventListener('change', updateClearClaimQuantities);
document.querySelector('#clearClaimForm').addEventListener('submit', event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const item = state.items.find(entry => entry.id === document.querySelector('#clearClaimItem').value);
  const family = document.querySelector('#clearClaimFamily').value;
  const quantity = Number(document.querySelector('#clearClaimQuantity').value);
  if (!item || !family || quantity < 1) return;
  const removed = removeItemClaims(item, family, quantity);
  if (!removed) return;
  document.querySelector('#clearClaimDialog').close();
  saveState();
  showToast(`${formatQuantity(removed, item)} of ${item.name} removed from ${contributionDisplayName(family)}.`);
});
document.querySelector('#adminAddWeddingPartyMember').addEventListener('click', () => {
  const firstInput = document.querySelector('#adminWeddingPartyFirstName');
  const lastInput = document.querySelector('#adminWeddingPartyLastName');
  const titleInput = document.querySelector('#adminWeddingPartyTitle');
  const error = document.querySelector('#adminWeddingPartyError');
  const name = `${firstInput.value.trim()} ${lastInput.value.trim()}`.trim();
  if (!firstInput.value.trim() || !lastInput.value.trim()) { error.textContent = 'Enter a first and last name.'; return; }
  if (!titleInput.value) { error.textContent = 'Select a wedding party title.'; return; }
  state.weddingPartyMembers ??= [];
  if (state.weddingPartyMembers.some(member => normalizeAccountName(member.name) === normalizeAccountName(name))) { error.textContent = 'That person is already in the wedding party.'; return; }
  const selectedTitle = WEDDING_PARTY_TITLES.find(title => title.value === titleInput.value);
  if (!selectedTitle) { error.textContent = 'Select a valid wedding party title.'; return; }
  if (!selectedTitle.multiple && state.weddingPartyMembers.some(member => member.title === selectedTitle.value)) { error.textContent = `${selectedTitle.value} has already been assigned.`; return; }
  let account = appState.accounts.find(item => accountNameMatches(name, item.name));
  const accountCreated = !account;
  if (accountCreated) {
    account = { name, selected: false, selectedEvents: { wedding: true }, invitedEvents: { wedding: true } };
    appState.accounts.push(account);
  } else if (!accountCanSignIn(account, 'wedding')) {
    error.textContent = 'That person belongs to an existing account without wedding sign-in access.';
    return;
  }
  state.weddingPartyMembers.push({ id: crypto.randomUUID(), name, title: selectedTitle.value, responsibilities: '', pages: [] });
  firstInput.value = ''; lastInput.value = ''; titleInput.value = ''; error.textContent = '';
  saveState(); renderWeddingPartyAdmin(); showToast(`${name} added to the wedding party${accountCreated ? ' with a new account' : ''}.`);
});
document.querySelector('#adminAddWeddingPartyAttireImage').addEventListener('click', async event => {
  const button = event.currentTarget;
  const fileInput = document.querySelector('#adminWeddingPartyAttireFile');
  const captionInput = document.querySelector('#adminWeddingPartyAttireCaption');
  const section = document.querySelector('#adminWeddingPartyAttireSection').value;
  const error = document.querySelector('#adminWeddingPartyAttireError');
  if (!weddingPartyAttireFile) {
    error.textContent = 'Choose an image to upload.';
    fileInput.click();
    return;
  }
  button.disabled = true; button.textContent = 'Uploading…'; error.textContent = '';
  try {
    const uploaded = await uploadWeddingPartyAttireImage(crypto.randomUUID(), weddingPartyAttireFile);
    state.weddingPartyAttireImages ??= { ladies: [], gentlemen: [] };
    state.weddingPartyAttireImages[section].push({ ...uploaded, caption: captionInput.value.trim() });
    fileInput.value = ''; captionInput.value = ''; weddingPartyAttireFile = null; updateDropzone(weddingPartyAttireDropzone, null);
    saveState(); renderWeddingPartyAttireAdmin(); showToast('Private wedding party attire image added.');
  } catch (uploadError) { console.error(uploadError); error.textContent = uploadError.message || 'Could not upload the image.'; }
  finally { button.disabled = false; button.textContent = 'Upload image'; }
});
document.querySelector('#adminWeddingPartyAttireImages').addEventListener('click', async event => {
  const button = event.target.closest('[data-remove-party-attire]');
  if (!button) return;
  const [section, rawIndex] = button.dataset.removePartyAttire.split(':');
  const index = Number(rawIndex), image = state.weddingPartyAttireImages?.[section]?.[index];
  if (!image) return;
  button.disabled = true;
  try {
    const response = await fetchWithTimeout(weddingPartyAttireAssetUrl(image.id), { method: 'DELETE', headers: { 'X-Host-Password': hostCredential } });
    if (!response.ok && response.status !== 404) throw new Error(`Image removal failed (${response.status}).`);
    state.weddingPartyAttireImages[section].splice(index, 1);
    saveState(); renderWeddingPartyAttireAdmin(); showToast('Private attire image removed.');
  } catch (removeError) { console.error(removeError); document.querySelector('#adminWeddingPartyAttireError').textContent = 'Could not remove the image. Please try again.'; button.disabled = false; }
});
document.querySelector('#adminWeddingPartyAttireImages').addEventListener('change', event => {
  const input = event.target.closest('[data-party-attire-caption]');
  if (!input) return;
  const [section, rawIndex] = input.dataset.partyAttireCaption.split(':');
  const image = state.weddingPartyAttireImages?.[section]?.[Number(rawIndex)];
  if (!image) return;
  image.caption = input.value.trim();
  saveState(); showToast('Image caption updated.');
});
[['#adminWeddingPartyLadiesAttireNote', 'ladies'], ['#adminWeddingPartyGentlemenAttireNote', 'gentlemen']].forEach(([selector, section]) => {
  document.querySelector(selector).addEventListener('change', event => {
    state.weddingPartyAttireNotes ??= { ladies: '', gentlemen: '' };
    state.weddingPartyAttireNotes[section] = event.target.value.trim();
    saveState(); showToast(`Note for the ${section} updated.`);
  });
});
document.querySelector('#adminEventDate').addEventListener('change', event => { if (!event.target.value) return; state.eventDate = event.target.value; state.accountSelectionResetFor = ''; saveState(); showToast('Event date updated.'); });
document.querySelector('#adminHomeAddress').addEventListener('change', event => {
  state.homeAddress = event.target.value.trim();
  saveState(); showToast('Home address updated.');
});
[
  ['#adminChurchWeekDay', 'churchWeekDay', 'Church'], ['#adminChurchYear', 'churchYear', 'Church'],
  ['#adminChurchTime', 'churchTime', 'Church'], ['#adminChurchStreet', 'churchStreet', 'Church'],
  ['#adminChurchCityStateZip', 'churchCityStateZip', 'Church'], ['#adminVenueTime', 'venueTime', 'Venue'],
  ['#adminVenueStreet', 'venueStreet', 'Venue'], ['#adminVenueCityStateZip', 'venueCityStateZip', 'Venue']
].forEach(([selector, key, label]) => {
  document.querySelector(selector).addEventListener('change', event => {
    if (viewedEventId !== 'wedding') return;
    state[key] = event.target.value.trim();
    saveState(); showToast(`${label} address updated.`);
  });
});
document.querySelector('#adminRegistryUrl').addEventListener('change', event => {
  if (EVENT_DETAILS[viewedEventId].registryOnly !== true) return;
  state.registryUrl = event.target.value.trim();
  saveState();
  showToast('Registry link updated.');
});
document.querySelector('#adminMonetaryGiftUrl').addEventListener('change', event => {
  if (EVENT_DETAILS[viewedEventId].registryOnly !== true) return;
  state.monetaryGiftUrl = event.target.value.trim();
  saveState();
  showToast('Monetary gift link updated.');
});
['#adminWeddingMealOption1', '#adminWeddingMealOption2', '#adminWeddingMealOption3'].forEach((selector, index) => {
  document.querySelector(selector).addEventListener('change', event => {
    if (viewedEventId !== 'wedding') return;
    state.weddingMealOptions ??= ['', '', ''];
    state.weddingMealOptions[index] = event.target.value.trim();
    saveState(); showToast('Wedding menu updated.');
  });
});
document.querySelector('#adminWeddingChildMealOption').addEventListener('change', event => {
  if (viewedEventId !== 'wedding') return;
  state.weddingChildMealOption = event.target.value.trim();
  saveState(); showToast('Child meal option updated.');
});
document.querySelector('#adminAddAttireVideo').addEventListener('click', () => {
  const input = document.querySelector('#adminNewAttireVideo');
  const url = input.value.trim();
  if (!videoEmbedUrl(url)) {
    document.querySelector('#adminAttireVideoError').textContent = 'Enter a valid YouTube or Vimeo video link.';
    return;
  }
  state.attireVideos ??= [];
  state.attireVideos.push(url);
  input.value = '';
  document.querySelector('#adminAttireVideoError').textContent = '';
  saveState();
  renderAdminAttireVideos();
});
document.querySelector('#adminAttireVideos').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-attire-video]');
  if (!button) return;
  state.attireVideos.splice(Number(button.dataset.removeAttireVideo), 1);
  saveState();
  renderAdminAttireVideos();
});
document.querySelector('#adminAddUnitButton').addEventListener('click', () => {
  const input = document.querySelector('#adminNewUnitName');
  const label = input.value.trim();
  if (!label) { document.querySelector('#adminUnitError').textContent = 'Enter a quantity type name.'; return; }
  if (state.quantityUnits.some(unit => unit.label.toLocaleLowerCase() === label.toLocaleLowerCase())) { document.querySelector('#adminUnitError').textContent = 'That quantity type already exists.'; return; }
  state.quantityUnits.push({ id: `unit-${Date.now()}`, label });
  input.value = ''; saveState(); openAdmin();
});
document.querySelector('#adminAddButton').addEventListener('click', () => {
  const name = document.querySelector('#adminNewItem').value.trim(); if (!name) return;
  const amount = document.querySelector('#adminNewAmount').value;
  const unit = document.querySelector('#adminNewUnit').value;
  state.items.push({ id: `host-${Date.now()}`, name, category: document.querySelector('#adminNewCategory').value, needed: amount === 'optional' ? 1 : Number(amount), optional: amount === 'optional', unit, claims: [] });
  document.querySelector('#adminNewItem').value = ''; saveState(); openAdmin();
});

async function startApp() {
  // Wait for a configured shared copy before allowing sign-in. Without one,
  // retain the richest recoverable browser copy instead of replacing it.
  await loadSharedState();
  const qrToken = accountQrTokenFromLocation();
  if (isAccountQrRoute()) {
    qrScopedAccount = appState.accounts.find(account => account.qrToken === qrToken) || null;
    document.querySelector('#hostPasswordToggle').hidden = true;
    if (!qrScopedAccount) {
      document.querySelector('#accountLinkError').hidden = false;
      document.querySelector('#guestSignInFields').hidden = true;
      document.querySelector('#guestSignInFields').querySelectorAll('input').forEach(input => { input.disabled = true; });
      document.querySelector('#signInSubmit').hidden = true;
      document.querySelector('.sign-in-intro').hidden = true;
    } else {
      document.querySelector('.sign-in-intro').textContent = 'Enter your name to continue. This link only accepts members of its assigned account.';
    }
  }
  render();
  showSignInPage();
}

document.querySelector('#acknowledgeAttireButton').addEventListener('click', () => {
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = false;
  // Enter the gathering at its beginning and let guests open the RSVP form
  // themselves when they are ready.
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
});

document.querySelectorAll('.affordable-attire-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const details = document.querySelector(`#${button.getAttribute('aria-controls')}`);
    const isOpening = details.hidden;
    details.hidden = !isOpening;
    button.setAttribute('aria-expanded', String(isOpening));
    button.textContent = isOpening ? 'Hide Affordable Attire' : 'Find Affordable Attire';
    if (isOpening) {
      details.querySelector('h2, h3')?.focus?.({ preventScroll: true });
      // Move the newly revealed guidance comfortably into view without
      // jumping past its heading or taking the guest far down the page.
      window.scrollBy({ top: 160, left: 0, behavior: 'smooth' });
    }
  });
});

render();
if (sharedSavePending) queueSharedStateSave();
startApp();
singleColumnMenu.addEventListener('change', render);
window.addEventListener('focus', loadSharedState);
window.addEventListener('online', () => {
  if (sharedSavePending && !sharedSaveInProgress) {
    clearTimeout(sharedSaveTimer);
    saveSharedState();
  } else {
    loadSharedState();
  }
});
window.addEventListener('pagehide', commitAllPendingEditorInputs);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') commitAllPendingEditorInputs();
  else loadSharedState();
});
if (SHARED_STATE_URL) setInterval(loadSharedState, 30000);

// Keep a field of independently moving sparkles alive across the wedding header.
const sparkleField = document.querySelector('.wedding-sparkles');
for (let index = 0; index < 40; index += 1) {
  const sparkle = document.createElement('span');
  const randomOffset = () => `${Math.round(Math.random() * 44 - 22)}px`;
  sparkle.className = 'wedding-sparkle';
  sparkle.style.setProperty('--sparkle-left', `${Math.random() * 100}%`);
  sparkle.style.setProperty('--sparkle-top', `${Math.random() * 100}%`);
  sparkle.style.setProperty('--sparkle-size', `${2 + Math.random() * 3}px`);
  sparkle.style.setProperty('--sparkle-x', randomOffset());
  sparkle.style.setProperty('--sparkle-y', randomOffset());
  sparkle.style.setProperty('--sparkle-rotation', `${Math.round(Math.random() * 180 - 90)}deg`);
  sparkle.style.setProperty('--sparkle-duration', `${1.4 + Math.random() * 2.8}s`);
  sparkle.style.setProperty('--sparkle-delay', `${Math.random() * -4}s`);
  sparkleField.append(sparkle);
}
