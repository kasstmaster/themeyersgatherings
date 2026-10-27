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
  wedding: { name: 'Wedding', theme: 'wedding', header: 'https://i.ibb.co/KjtXKDRn/Wedding-Header-Website-No-Border.png' }
};

function syncGatheringDefinitions(events) {
  for (const id of Object.keys(EVENT_DETAILS)) if (!['thanksgiving','christmas','wedding'].includes(id)) delete EVENT_DETAILS[id];
  for (const [id,event] of Object.entries(events || {})) {
    if (['thanksgiving','christmas','wedding'].includes(id) || !event?.gatheringName) continue;
    EVENT_DETAILS[id] = { name: String(event.gatheringName), theme:event.gatheringTheme==='neutral'?'neutral':'thanksgiving', header:'' };
  }
}
const GATHERING_COLORS = [
  ['accent','Buttons and selected tabs','--orange'], ['gold','Text and accents','--gold'],
  ['secondary','Toolbar and footer','--navy-2'], ['background','Background and headings','--navy'],
  ['header','Header','--ivory'], ['page','Page containers','--gathering-card-background'],
  ['inner','Inner containers','--gathering-inner-background'], ['text','Page text','--ink'], ['border','Borders','--border']
];
function applyGatheringColors(paletteState = state) {
  GatheringPalette.apply(paletteState.gatheringColors?.details || {});
  for (const [, ,variable] of GATHERING_COLORS) document.body.style.removeProperty(variable);
  document.body.style.removeProperty('--orange-dark');
  document.body.style.removeProperty('--muted');
  document.body.style.removeProperty('--page-border');
  document.body.style.removeProperty('--gold-rule');
  for (const [key,,variable] of GATHERING_COLORS) {
    const color=paletteState.gatheringColors?.[key];
    if (/^#[0-9a-f]{6}$/i.test(color || '')) document.body.style.setProperty(variable,color);
  }
  const gold=paletteState.gatheringColors?.gold;
  const customGold=/^#[0-9a-f]{6}$/i.test(gold || '');
  document.body.classList.toggle('custom-gathering-gold',customGold);
  if(customGold){document.body.style.setProperty('--page-border',gold);document.body.style.setProperty('--gold-rule',gold);}
  if(/^#[0-9a-f]{6}$/i.test(paletteState.gatheringColors?.border || ''))document.body.style.setProperty('--page-border',paletteState.gatheringColors.border);
  if (/^#[0-9a-f]{6}$/i.test(paletteState.gatheringColors?.text || '')) document.body.style.setProperty('--muted',paletteState.gatheringColors.text);
  document.body.classList.toggle('custom-gathering-borders',/^#[0-9a-f]{6}$/i.test(paletteState.gatheringColors?.border || ''));
  document.body.classList.toggle('custom-gathering-header',/^#[0-9a-f]{6}$/i.test(paletteState.gatheringColors?.header || ''));
  if (paletteState.gatheringColors?.accent) {
    const color=paletteState.gatheringColors.accent;
    if (/^#[0-9a-f]{6}$/i.test(color)) document.body.style.setProperty('--orange-dark',`#${[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*.65).toString(16).padStart(2,'0')).join('')}`);
  }
  document.body.classList.toggle('custom-gathering-colors',GATHERING_COLORS.some(([key])=>/^#[0-9a-f]{6}$/i.test(paletteState.gatheringColors?.[key] || '')));
}

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
function makeEvent(items, eventDate, menuVersion) { return { items, rsvps: [], eventDate, homeAddress: '', hostNotes: '', ...defaultInvitationSettings(eventDate), accountSelectionResetFor: '', menuVersion, quantityUnits: structuredClone(DEFAULT_QUANTITY_UNITS) }; }
function initialAppState() {
  return {
    activeEventId: 'thanksgiving',
    accountResetVersion: ACCOUNT_RESET_VERSION,
    signupResetVersion: SIGNUP_RESET_VERSION,
    accounts: structuredClone(GUEST_ACCOUNTS),
    invitationTemplates: [],
    gatheringHome: {},
    events: {
      thanksgiving: makeEvent(structuredClone(defaultItems), DEFAULT_EVENT_DATE),
      christmas: makeEvent(christmasItems(), DEFAULT_CHRISTMAS_DATE, CHRISTMAS_MENU_VERSION),
      wedding: { ...makeEvent([], DEFAULT_WEDDING_DATE), weddingMealOptions: ['', '', ''], weddingChildMealOption: '', churchWeekDay: '', churchYear: '', churchTime: '', churchStreet: '', churchCityStateZip: '', venueTime: '', venueStreet: '', venueCityStateZip: '', registryUrl: DEFAULT_REGISTRY_URL, monetaryGiftUrl: '', brideGroomPagesVersion: 1, brideGroomPages: [{ id: 'main', title: 'Bride & Groom', content: '' }], perfectExperienceContent: '', timelineAboveContent: '', timelineContent: DEFAULT_WEDDING_TIMELINE, timelineBelowContent: '', whatToExpectContent: '', attireVideos: [], weddingPartyMembers: [], weddingPartyAttireImages: { ladies: [], gentlemen: [] }, weddingPartyAttireNotes: { ladies: '', gentlemen: '' } }
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
  const names = accountSignInNames(account.name);
  if (Array.isArray(account.plusOnePeople?.[eventId])) return GuestPlanning.plusOnePeople(account,eventId,names).length;
  const adults = names.length;
  return Math.min(adults, Math.max(0, Math.floor(Number(account.plusOnes?.[eventId]) || 0)));
}

function availableEventIds(accountName = guestName) {
  syncGatheringDefinitions(appState.events);
  const ids = Object.keys(EVENT_DETAILS).filter(id => appState.events?.[id]);
  if (isViewingAsGuest()) {
    const previewAccount = findAccount(guestName);
    return previewAccount ? ids.filter(id => accountCanSignIn(previewAccount, id)) : [];
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
let selectedGatheringTab = null;
let selectedWeddingTab = 'guest';
let selectedGuestTab = 'details';
let selectedMatronTab = 'duties';
let selectedBrideGroomPage = 'main';
let hostWeddingPartyViewName = '';
let hostReturnSession = null;
let pendingAccountAction = null;
let pendingClaimItemId = null;
let hostAuthenticated = false;
let hostCredential = '';
let qrScopedAccount = null;
let qrAdminAccount = null;
let invitationPreviewAccount = null;
let localStateRevision = 0;

function normalizeState(saved) {
  try {
    if (!saved) return initialAppState();
    if (saved.events) {
      syncGatheringDefinitions(saved.events);
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
                : ['thanksgiving','christmas','wedding'].includes(eventId) && legacySelection
            ])),
            invitedEvents: Object.fromEntries(Object.keys(EVENT_DETAILS).map(eventId => [
              eventId,
              typeof account.invitedEvents?.[eventId] === 'boolean'
                ? account.invitedEvents[eventId]
                : typeof account.selectedEvents?.[eventId] === 'boolean'
                  ? account.selectedEvents[eventId]
                  : ['thanksgiving','christmas','wedding'].includes(eventId) && legacySelection
            ]))
          };
        }),
        gatheringHome: saved.gatheringHome && typeof saved.gatheringHome==='object' && !Array.isArray(saved.gatheringHome) ? saved.gatheringHome : {},
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
            extraGuests: Math.max(0,Math.floor(Number(rsvp.extraGuests)||0)),
            extraGuestNames: Array.isArray(rsvp.extraGuestNames)?rsvp.extraGuestNames.map(name=>typeof name==='string'?name.trim():''):[],
            childNames: Array.isArray(rsvp.childNames) ? rsvp.childNames.map(name=>typeof name==='string'?name.trim():'') : [],
            menuSelections: Array.isArray(rsvp.menuSelections) ? rsvp.menuSelections.filter(selection => selection && typeof selection === 'object').map(selection => ({
              ...(Number.isSafeInteger(selection.invitationNumber) ? {invitationNumber:selection.invitationNumber} : {}),
              type: selection.type === 'child' ? 'child' : 'adult',
              index: Math.max(0, Math.floor(Number(selection.index) || 0)),
              name: typeof selection.name === 'string' ? selection.name : '',
              customName: typeof selection.customName === 'string' ? selection.customName : '',
              meal: typeof selection.meal === 'string' ? selection.meal : '',
              dietaryRestrictions: typeof selection.dietaryRestrictions === 'string' ? selection.dietaryRestrictions : ''
            })) : []
          })) : [];
        eventState.eventDate = typeof eventState.eventDate === 'string' ? eventState.eventDate : fallback.eventDate;
        eventState.headerText = typeof eventState.headerText === 'string' ? eventState.headerText : '';
        eventState.hostNotes = typeof eventState.hostNotes === 'string' ? eventState.hostNotes : '';
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
      loaded.events.wedding.registryUrl = typeof loaded.events.wedding.registryUrl === 'string' ? loaded.events.wedding.registryUrl : DEFAULT_REGISTRY_URL;
      const wedding = loaded.events.wedding;
      wedding.weddingMealOptions = Array.isArray(wedding.weddingMealOptions) ? wedding.weddingMealOptions.filter(meal => typeof meal === 'string') : ['', '', ''];
      wedding.weddingChildMealOption = typeof wedding.weddingChildMealOption === 'string' ? wedding.weddingChildMealOption : '';
      const locationFields = ['churchWeekDay', 'churchYear', 'churchTime', 'churchStreet', 'churchCityStateZip', 'venueTime', 'venueStreet', 'venueCityStateZip'];
      locationFields.forEach(key => { wedding[key] = typeof wedding[key] === 'string' ? wedding[key] : ''; });
      // Preserve addresses entered before church and venue details were split into reusable lines.
      if (!wedding.churchStreet && typeof wedding.churchAddress === 'string') wedding.churchStreet = wedding.churchAddress;
      if (!wedding.venueStreet && typeof wedding.venueAddress === 'string') wedding.venueStreet = wedding.venueAddress;
      loaded.events.wedding.monetaryGiftUrl = typeof loaded.events.wedding.monetaryGiftUrl === 'string'
        ? loaded.events.wedding.monetaryGiftUrl
        : '';
      WeddingParty.normalizeBrideGroomPages(loaded.events.wedding);
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
      loaded.events.wedding.attireVideos = AttireVideos.normalize(loaded.events.wedding.attireVideos);
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
  // New saves are deliberate, including deletions and starting a fresh year.
  // A richer backup must not resurrect the old guest list or the prior occurrence.
  try {
    const current=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(current?.savedAt && !Number.isNaN(Date.parse(current.savedAt)) && current.events && Array.isArray(current.accounts))return normalizeState(current);
  } catch { /* Recover from backups when the primary copy is unreadable. */ }
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
function captureGatheringHistory() {
  const before=JSON.stringify(appState.gatheringHistory || {});
  try {
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(stored?.events){GatheringHistory.archiveDue(stored);GatheringHistory.preserve(appState,stored);}
  } catch { /* The live state still supplies a snapshot if there is no local backup. */ }
  GatheringHistory.archiveDue(appState);
  return before!==JSON.stringify(appState.gatheringHistory || {});
}
function setGatheringDetail(key,value) {
  if(key==='eventDate' && value!==state.eventDate && GatheringHistory.completed(state)) {
    captureGatheringHistory();state=GatheringHistory.startNext(appState,viewedEventId,value);
  } else SharedDetails.setDetail(appState.events,viewedEventId,key,value);
}
function saveState({ refresh = !SiteEditing.portalOpen && !SiteEditing.flushing } = {}) {
  SiteEditing.recordUndo();
  captureGatheringHistory();
  appState.events[viewedEventId] = state;
  appState.savedAt=new Date().toISOString();
  const storedLocally = storeLocalState(appState);
  localStateRevision += 1;
  if (refresh) render();
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
let sharedSaveErrorDetail = '';
let sharedSaveRetryCount = 0;
function fetchWithTimeout(url, { timeoutMs = NETWORK_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
    ? '<strong>Cross-device sync needs attention</strong>Your latest change is waiting to sync. Automatic retries are running.'
    : '';
  if(sharedSaveError){
    const detail=document.createElement('p');detail.textContent=sharedSaveErrorDetail;status.append(detail);
    const retry=document.createElement('button');retry.type='button';retry.textContent='Retry now';
    retry.disabled=sharedSaveInProgress;retry.addEventListener('click',()=>{clearTimeout(sharedSaveTimer);saveSharedState();});status.append(retry);
  }
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
      timeoutMs: 30000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState)
    });
    if (!response.ok) {
      const detail=(await response.text()).trim();
      const safeDetail=detail.length<=200 && !/[<>]/.test(detail)?detail:'';
      throw new Error(`Shared save failed (HTTP ${response.status}).${safeDetail?' '+safeDetail:''}`);
    }
    sharedSaveError = false;
    sharedSaveRetryCount = 0;
    if (!sharedSavePending) {
      try { localStorage.removeItem(SHARED_SAVE_PENDING_KEY); } catch { /* Retry marker cleanup is best effort. */ }
    }
  } catch (error) {
    console.error(error);
    saveFailed = true;
    sharedSaveErrorDetail=error.name==='AbortError'?'The shared service took too long to respond.':error instanceof TypeError?'The shared service could not be reached. Check your connection and try again.':error.message;
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
function stateContentSignature(value) {
  return JSON.stringify(value, (_key, item) => item && typeof item==='object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
}
let sharedLoadNumber = 0;
function hasActiveEditor() {
  return SiteEditing.enabled || Boolean(document.querySelector('dialog[open]')) || Boolean(document.activeElement?.closest('#eventPage input,#eventPage textarea,#eventPage select,.inline-editor'));
}
async function loadSharedState({ allowActiveEditor = false } = {}) {
  const stateUrl = SHARED_STATE_URL || REPOSITORY_STATE_URL;
  if (!stateUrl || (!SHARED_STATE_URL && (localStateRevision > 0 || appState.savedAt))) return;
  // Never replace a local edit with a stale response while that edit is
  // waiting to be uploaded.
  if (sharedSavePending || sharedSaveInProgress || (!allowActiveEditor && hasActiveEditor())) return;
  const attempt=++sharedLoadNumber;
  const revisionBeforeLoad = localStateRevision;
  try {
    const response = await fetchWithTimeout(stateUrl, { cache: 'no-store' });
    if (response.status === 404 || response.status === 204) {
      if (SHARED_STATE_URL) queueSharedStateSave();
      return;
    }
    if (!response.ok) throw new Error(`Shared state load failed (${response.status})`);
    const saved = normalizeState(await response.json());
    if (attempt!==sharedLoadNumber || localStateRevision !== revisionBeforeLoad || sharedSavePending || sharedSaveInProgress || (!allowActiveEditor && hasActiveEditor())) return;
    if (stateContentSignature(saved) === stateContentSignature(normalizeState(structuredClone(appState)))) return true;
    // The checked-in repository file is read-only when no Worker is set up.
    // Use it to seed a browser, but do not let an older/emptier copy erase a
    // richer local state (most visibly, newly added accounts) on refresh or
    // when the window regains focus.
    if (!SHARED_STATE_URL && stateRecoveryScore(appState) > stateRecoveryScore(saved)) return;
    appState = saved;
    viewedEventId = GuestPlanning.retainedEvent(viewedEventId, appState.events, appState.activeEventId);
    state = appState.events[viewedEventId];
    storeLocalState(appState);
    render();
    return true;
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
function formatEditableText(value, {inline=false} = {}) {
  value = expandEditableTextVariables(value);
  if(!String(value || '').trim())return '';
  // Emphasis can span lines anywhere in a text box, not only the whole field.
  value=String(value).replace(/(?<![*_])(\*{1,3}|_{1,3})(?![*_])([\s\S]*?)\1(?![*_])/g,(original,marker,content)=>
    content.includes('\n')
      ? content.split('\n').map(line=>line.trim()?`${marker}${line}${marker}`:line).join('\n')
      : original);
  const formatEmphasis = text => escapeHtml(text)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>');
  const formatMarkdown = text => text.split(/(`[^`]+`)/g).map(part=>part.length>1 && part.startsWith('`') && part.endsWith('`')
    ? `<code>${escapeHtml(part.slice(1,-1))}</code>` : formatEmphasis(part)).join('');
  const formatPlainInline = (line,{plain=value=>value}={}) => {
    const parts = [];
    let cursor = 0;
    for (const match of line.matchAll(/\[([^\]\r\n]+)\]\(([^)\r\n]+)\)|<([^<>\r\n]+)>|`([^`\r\n]+)`/g)) {
      parts.push(formatMarkdown(line.slice(cursor, match.index)));
      if (match[4] !== undefined) {
        parts.push(`<code>${escapeHtml(match[4])}</code>`);
      } else if (match[1] !== undefined) {
        const href = safeEditableLink(match[2]);
        parts.push(href
          ? `<a href="${escapeAttribute(href)}">${formatMarkdown(match[1])}</a>`
          : formatMarkdown(match[0]));
      } else {
        const address = match[3].trim();
        const plainAddress=plain(address);
        if (address) parts.push(`<a class="map-link" href="geo:0,0?q=${encodeURIComponent(plainAddress)}" title="Open ${escapeAttribute(plainAddress)} in your maps app">${formatMarkdown(address)}</a>`);
        else parts.push(formatMarkdown(match[0]));
      }
      cursor = match.index + match[0].length;
    }
    parts.push(formatMarkdown(line.slice(cursor)));
    return parts.join('');
  };
  const formatInline = line => TextStyles.render(line,formatPlainInline);
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
    else output.push('<br>');
  });
  closeList();
  const html=output.join('');
  return inline ? html.replace(/<p>([\s\S]*?)<\/p>/g,'$1<br>').replace(/<br>$/,'') : html;
}
function editableTextVariables() {
  const eventDate = new Date(`${state.eventDate}T12:00:00`);
  const locationLines = keys => keys.map(key => state[key] || '').join('\n');
  return {
    date: Number.isNaN(eventDate.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate).replaceAll(',', ''),
    home: SharedDetails.homeAddress(state),
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
function accountSignInNames(accountName) { return GuestPlanning.accountNames(accountName); }
function accountContactGroups(accountName) {
  const groups = [];
  accountSignInNames(accountName).forEach(fullName => {
    const words = fullName.trim().split(/\s+/);
    const suffix = words.length > 2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1)) ? words.pop() : '';
    const surname = words.pop() || '';
    const givenName = [...words, suffix].filter(Boolean).join(' ');
    if (!surname || !givenName) return;
    const existingGroup = groups.find(group => group.surname.toLocaleLowerCase() === surname.toLocaleLowerCase());
    if (existingGroup) existingGroup.people.push({ givenName, fullName });
    else groups.push({ surname, people: [{ givenName, fullName }] });
  });
  return groups;
}
function invitationAssignmentHtml(account, person, eventId = viewedEventId) {
  return `<input class="account-person-invitation" data-person-invitation="${escapeAttribute(person)}" type="number" min="1" step="1" value="${InvitationGroups.number(account,eventId,person)}" aria-label="Invitation for ${escapeAttribute(person)}">`;
}
// The account manager and invitation list use the same grouping, counts,
// and heading component. Their only difference is the editable member controls.
function invitedInvitationGroups(account,eventId=viewedEventId) {
  const names=accountSignInNames(account.name);
  const granted=GuestPlanning.plusOnePeople(account,eventId,names);
  const legacy=Math.max(0,plusOneCount(account,eventId)-granted.length);
  return InvitationGroups.groups(account,eventId,names).map((group,index)=>{
    const guestPeople=group.names.filter(name=>granted.includes(name));
    const plusOnes=guestPeople.length+(index===0?legacy:0);
    return {...group,guestPeople,plusOnes,adults:group.names.length+plusOnes};
  });
}
function invitedAdultCount(account){return invitedInvitationGroups(account).reduce((total,group)=>total+group.adults,0);}
function adultCountLabel(adults,plusOnes=0){return `${adults} adult${adults===1?'':'s'}${plusOnes?` (${plusOnes} plus one${plusOnes===1?'':'s'})`:''}`;}
function invitationHeadingHtml(group,showCount=true){return `<div class="invited-entry-heading"><strong>${escapeHtml(group.title || invitationGroupTitle(group))}</strong>${showCount?`<span>${adultCountLabel(group.adults,group.plusOnes)}${group.children?` · ${group.children} child${group.children===1?'':'ren'}`:''}</span>`:''}</div>`;}
function invitationEntryHtml(group, {className='', headings='', showCount=true, renderName=name=>escapeHtml(name)}={}) {
  return `<div class="guest-entry invited-entry ${className}">${invitationHeadingHtml(group,showCount)}<div class="invited-entry-names">${headings}${group.names.map(name=>`<div class="invitation-member-row">${renderName(name)}</div>`).join('')}</div></div>`;
}
function accountContactsHtml(account) {
  const adults=invitedInvitationGroups(account).map(group=>{
    return invitationEntryHtml(group, {
      className:'account-invitation-group',showCount:false,
      headings:'<div class="account-person-headings"><span></span><span>Inv #</span><span>+1</span></div>',
      renderName:name=>`<div class="account-person-line"><span class="account-person-name">${escapeHtml(name)}<button type="button" class="account-sign-in" data-host-account-person="${escapeAttribute(name)}" aria-label="Sign in as ${escapeAttribute(name)}" title="Sign in as ${escapeAttribute(name)}" ${Object.keys(EVENT_DETAILS).some(id=>accountCanSignIn(account,id))?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM3 22v-3a9 7 0 0 1 18 0v3H3Z"/></svg></button></span>${invitationAssignmentHtml(account,name)}<label class="account-guest-permission"><input type="checkbox" data-plus-one-person="${escapeAttribute(name)}" aria-label="Allow a guest for ${escapeAttribute(name)}" ${group.guestPeople.includes(name)?'checked':''}></label></div>`
    });
  }).join('');
  const children = (account.children || []).length
    ? `<div class="account-children"><strong>Children:</strong> ${account.children.map(escapeHtml).join(', ')}</div>`
    : '';
  const address = account.address ? `<div class="account-address">${escapeHtml(account.address)}</div>` : '';
  return address + adults + children;
}
function firstAccountLastName(accountName) {
  const firstPerson = accountSignInNames(accountName)[0] || accountName;
  const words = firstPerson.trim().split(/\s+/);
  if (words.length > 2 && /^(?:jr\.?|sr\.?|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(words.at(-1))) words.pop();
  return words.at(-1) || '';
}
function accountPersonName(enteredName, account) {
  const normalizedEntry = normalizeAccountName(enteredName);
  const canonical = accountSignInNames(account.name).find(name => normalizeAccountName(name) === normalizedEntry);
  if (canonical) return canonical;
  const alias = (account.signInAliases || []).find(entry => entry && normalizeAccountName(entry.alias) === normalizedEntry
    && accountSignInNames(account.name).some(name => normalizeAccountName(name) === normalizeAccountName(entry.name)));
  return alias?.name || '';
}
function accountNameMatches(enteredName, accountName) {
  const account = typeof accountName === 'object' ? accountName : appState.accounts.find(account => account.name === accountName) || { name: accountName };
  return !!accountPersonName(enteredName, account);
}
function weddingPartyPersonMatches(memberName, enteredName) {
  const account = findAccount(enteredName);
  return normalizeAccountName(accountPersonName(memberName, account || { name: memberName }) || memberName)
    === normalizeAccountName(accountPersonName(enteredName, account || { name: enteredName }) || enteredName);
}
function isSignedInWeddingPartyMember() {
  return viewedEventId === 'wedding' && Boolean(state.weddingPartyMembers?.some(member => weddingPartyPersonMatches(member.name, signedInPersonName)));
}
function findAccount(name) {
  const normalizedName = normalizeAccountName(name);
  // Once signed in, guestName contains the complete stored household account
  // (which can include commas or slashes), not one person's sign-in name.
  return appState.accounts.find(account => normalizeAccountName(account.name) === normalizedName)
    || appState.accounts.find(account => accountNameMatches(name, account));
}
function accountQrTokenFromLocation() {
  const match = window.location.hash.match(/^#\/signin\/account\/([A-Za-z0-9_-]+)$/);
  return match?.[1] || null;
}
function isAccountQrRoute() { return window.location.hash.startsWith('#/signin/account/'); }
function accountForSignIn(name) {
  return qrScopedAccount
    ? (accountNameMatches(name, qrScopedAccount) ? qrScopedAccount : null)
    : findAccount(name);
}
function generalLoginUrl() {
  const productionOrigins = ['https://themeyers.ilymmd.com', 'https://ilymmd.com', 'https://www.ilymmd.com', 'https://kasstmaster.github.io'];
  if (productionOrigins.includes(window.location.origin)) return 'https://themeyers.ilymmd.com/';
  return `${window.location.origin}${window.location.pathname}`;
}
function accountQrUrl(account) {
  if (account?.generalLogin) return generalLoginUrl();
  return `${generalLoginUrl()}#/signin/account/${account.qrToken}`;
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

function invitationAccounts(mode = state.invitationQrMode) {
  return mode === 'general'
    ? appState.accounts.filter(account => account.invitedEvents?.[viewedEventId] === true).sort((a, b) => a.name.localeCompare(b.name))
    : window.Invitation.eligibleAccounts(appState.accounts, viewedEventId);
}
function invitationTemplatesForEvent(eventId = viewedEventId) {
  return appState.invitationTemplates.filter(template => template.eventId === eventId);
}
function invitationQrUrl(account, mode = state.invitationQrMode) {
  return mode !== 'general' && account?.qrToken ? accountQrUrl(account) : generalLoginUrl();
}
function canvasBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
async function renderInvitation(canvas, account, mode = state.invitationQrMode) {
  const template = invitationTemplatesForEvent().find(item => item.id === state.invitationTemplateId);
  const model = window.Invitation.invitationModel(template, state, invitationQrUrl(account, mode));
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
  document.querySelector('#invitationPreviewAccount').textContent = invitationQrUrl(account) === generalLoginUrl() ? 'Previewing the general login QR.' : `Previewing the QR for ${account.name}. The account name is not printed.`;
  status.classList.remove('form-error');
  status.textContent = 'Loading invitation preview…';
  canvasWrap.hidden = true;
  downloadButton.disabled = true;
  document.querySelector('#configureInvitationTemplate').hidden = true;
  if (!dialog.open) showSiteDialog(dialog);
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
    downloadButton.disabled = false;
  } catch (caught) {
    invitationPreviewAccount = null;
    status.classList.add('form-error');
    status.textContent = `Unable to preview the invitation. ${caught.message}`;
  }
}
async function invitationFile(account, mode = state.invitationQrMode) {
  const canvas = document.createElement('canvas');
  await renderInvitation(canvas, account, mode);
  const blob = await canvasBlob(canvas);
  if (!blob) throw new Error(`Could not create the invitation for ${account?.name || 'general login'}.`);
  return new File([blob], window.Invitation.filenameFor(account?.name || 'General Login', EVENT_DETAILS[viewedEventId].name), { type: 'image/png' });
}
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function menuExportIntro() {
  return `Here's the list of items for ${EVENT_DETAILS[viewedEventId].name}. Some dishes have already been claimed but we still need others!`;
}
function menuExportItems() {
  return state.items.map(item => {
    const remaining = Math.max(0, item.needed - item.claims.length);
    const claimed = item.optional ? item.claims.length > 0 : remaining === 0;
    const status = claimed ? '✓ CLAIMED' : `- need ${formatQuantity(Math.max(1, remaining), item)}${item.optional ? ' (optional)' : ''}`;
    return `${item.name} ${status}`;
  });
}
function menuCopyText() {
  const items = menuExportItems();
  return `${menuExportIntro()}\n\n${items.length ? items.map(item => `• ${item}`).join('\n') : 'No items listed.'}`;
}
function menuExportPage() {
  const items = menuExportItems();
  const list = items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No items listed.</p>';
  return { title: 'Menu', text: menuCopyText(), html: `<p>${escapeHtml(menuExportIntro())}</p>${list}` };
}
PageActions.menuExport = menuExportPage;
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
  const nextSource = state.siteHeaderImage ?? event.header ?? '';
  const heading=document.querySelector('#customGatheringHeading'); heading.hidden=!state.gatheringName; heading.textContent=state.gatheringName || '';
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
const hostDialogStack=[];
const persistentHostControls=['hostToolsPanel','editItemsButton','cancelViewAsButton','hostQuickActions'].map(id=>document.getElementById(id));
function activeHostDialog(){return hostDialogStack.filter(dialog=>dialog.open).at(-1) || [...document.querySelectorAll('dialog[open]')].at(-1);}
function syncHostToolbar(records=[]) {
  for(const record of records)if(record.target.matches('dialog')){
    const index=hostDialogStack.indexOf(record.target);if(index>=0)hostDialogStack.splice(index,1);
    if(record.target.open)hostDialogStack.push(record.target);
  }
  persistentHostControls[0].hidden=!hostAuthenticated;
  document.querySelector('#hostQuickActions').hidden=!hostAuthenticated;
  const owner=activeHostDialog() || document.body;
  for(const control of persistentHostControls)if(control.parentElement!==owner)owner.append(control);
  document.querySelector('#newGatheringButton').hidden=!isHostView() || document.querySelector('#eventSelectionPage').hidden || Boolean(activeHostDialog());
  document.querySelector('#cancelViewAsButton').hidden=!isViewingAsGuest();
  document.body.style.setProperty('--host-shortcuts-width',document.querySelector('#hostQuickActions').getBoundingClientRect().width+'px');
  const edit=document.querySelector('#editItemsButton');edit.hidden=!hostAuthenticated || SiteEditing.enabled;edit.textContent='Edit';edit.setAttribute('aria-pressed',String(SiteEditing.enabled));
  document.querySelector('#cancelViewAsButton').style.right=(edit.hidden?0:edit.getBoundingClientRect().width)+'px';
  document.body.classList.toggle('has-host-toolbar',hostAuthenticated);
  document.querySelector('#rsvpPageToolbar').classList.toggle('host-toolbar-replaced',hostAuthenticated);
  document.querySelector('#eventDock').hidden=hostAuthenticated || !guestName;
  const guestBar=document.querySelector('#rsvpPageToolbar');
  const guestBarOwner=document.querySelector(document.querySelector('#rsvpDialog').open?'#rsvpDialog':'#rsvpEventConfirmation');
  if(guestBar.parentElement!==guestBarOwner)guestBarOwner.append(guestBar);
  const guestPrint=guestBar.querySelector('[data-page-export]');if(guestPrint)guestPrint.hidden=document.querySelector('#rsvpEventConfirmation').hasAttribute('data-rsvp-flow-hidden');
  const guestHome=document.querySelector('#guestHomeButton');
  const guestHomeOwner=document.querySelector(document.querySelector('#rsvpDialog').open?'#rsvpPageToolbar':'#eventDock');
  if(guestHome.parentElement!==guestHomeOwner)guestHomeOwner.prepend(guestHome);
  guestHome.hidden=hostAuthenticated || !guestName;
  const print=document.querySelector('#hostToolsPanel [data-page-export]');if(print)print.hidden=Boolean(document.querySelector('#rsvpDialog').open && document.querySelector('#rsvpEventConfirmation').hasAttribute('data-rsvp-flow-hidden'));
  const navigation=document.querySelector('#rsvpPageNavigation');if(navigation)navigation.hidden=(!GatheringFeatures.forGathering(viewedEventId).weddingPages && !isHostView()) || !document.querySelector('#rsvpDialog').open || document.querySelector('#rsvpEventConfirmation').hasAttribute('data-rsvp-flow-hidden');
  if(SiteEditing.enabled)ElementEditor.refresh();
}
document.addEventListener('close',()=>syncHostToolbar(),true);
new MutationObserver(records=>syncHostToolbar(records)).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
function showSiteDialog(dialog){if(dialog.id!=='rsvpDialog' && dialog.parentElement.closest('[hidden]'))document.body.append(dialog);dialog.showModal();}
async function closeHostDialogs(){await Promise.all([...document.querySelectorAll('dialog[open]')].map(dialog=>new Promise(resolve=>{dialog.addEventListener('close',resolve,{once:true});dialog.close();})));}
async function showGatheringsHome(){
  if(!guestName && !hostAuthenticated)return;commitAllPendingEditorInputs();if(SiteEditing.enabled)SiteEditing.toggle(render);
  await closeHostDialogs();if(isViewingAsGuest())restoreHostSession();showEventSelection();updateHostToolsPanel();
}
for(const id of ['hostHomeButton','guestHomeButton'])document.getElementById(id).addEventListener('click',showGatheringsHome);
function updateHostToolsPanel() {
  const viewingAsGuest = isViewingAsGuest();
  document.querySelector('#hostToolsPanel').hidden = !hostAuthenticated;
  document.querySelector('#editItemsButton').hidden = !hostAuthenticated || SiteEditing.enabled;
  syncHostToolbar();
  document.querySelector('#cancelViewAsButton').hidden = !viewingAsGuest;
}
let signInStep = 0;
function setSignInStep(step) {
  signInStep = step;
  document.querySelectorAll('[data-sign-in-step]').forEach(label => {
    const active = Number(label.dataset.signInStep) === step;
    label.hidden = !active;
    const input = label.querySelector('input');
    input.disabled = !active;
    input.required = active && step < 2;
  });
  document.querySelector('#signInSubmit').textContent = step === 2 ? 'Get Started' : 'Next';
  document.querySelector('#signInBack').hidden = step === 0;
  document.querySelector('#accountPasswordError').textContent = '';
  document.querySelector(`[data-sign-in-step="${step}"] input`).focus({ preventScroll: true });
}
document.querySelector('#signInBack').addEventListener('click', () => setSignInStep(Math.max(0, signInStep - 1)));
function updateSignedInAccountBanner() {
  const signedInAccount = document.querySelector('#signedInAccount');
  signedInAccount.hidden = !guestName || !document.querySelector('#signInPage').hidden;
  document.querySelector('#signedInAccountName').textContent = guestName === HOST_DISPLAY_NAME ? 'Host' : accountContactGroups(signedInPersonName || guestName)[0]?.surname || invitedAccountDisplayName(guestName);
  if (!document.querySelector('#eventSelectionPage').hidden) document.querySelector('#eventSelectionPage').before(signedInAccount);
  else document.querySelector('#eventPage .site-header').after(signedInAccount);
}
function showSignInPage() {
  document.querySelector('#signInPage').hidden = false;
  document.querySelector('#eventSelectionPage').hidden = true;
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = true;
  updateSignedInAccountBanner();
  if (!document.querySelector('#guestSignInFields').hidden) setSignInStep(0);
}
function gatheringRsvpStatus(eventId) {
  const saved=appState.events[eventId]?.rsvps?.find(rsvp=>rsvp.name===guestName);
  if(!saved)return '';
  const account=rsvpAccount();
  const invitation=InvitationGroups.number(account,eventId,signedInPersonName);
  if(!saved.people?.length) {
    if(account && invitation!==(GuestPlanning.invitationNumbers(account,eventId)[0] || 1))return '';
    return Number(saved.adults)>0 || Number(saved.children)>0 ? 'attending' : 'declined';
  }
  const response=account ? InvitationGroups.response(account,eventId,accountSignInNames(account.name),invitation,saved) : saved;
  const person=response.people.find(person=>normalizeAccountName(person.name)===normalizeAccountName(signedInPersonName));
  if(person)return person.attending===true?'attending':person.attending===false?'declined':'';
  if(response.people.some(person=>person.attending===true))return 'attending';
  return response.people.length && response.people.every(person=>person.attending===false)?'declined':'';
}
function renderEventSelection() {
  const ids = availableEventIds();
  document.querySelector('#eventSelectionChoices').innerHTML = ids.map(id => {
    const event = EVENT_DETAILS[id];
    const eventState = appState.events[id];
    const date = new Date(`${eventState.eventDate}T12:00:00`);
    const formatted = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date).replaceAll(',', '');
    const status=gatheringRsvpStatus(id);
    const badge=status?`<span class="event-selection-status ${status}" role="img" aria-label="${status==='attending'?'RSVP: Attending':'RSVP: Declined'}">${status==='attending'?'✓':'✕'}</span>`:'';
    return `<button type="button" data-enter-event="${id}"${status?' class="has-rsvp-status"':''}>${badge}<span class="event-selection-label"><span>${escapeHtml(event.name)}</span><small>${formatted}</small></span></button>`;
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
  updateSignedInAccountBanner();
  updateHostToolsPanel();
  render();
  window.scrollTo({top:0,left:0,behavior:'auto'});
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
  const videos = (state.attireVideos || []).map(video => {
    const uploaded = typeof video === 'object';
    const url = uploaded ? AttireVideos.assetUrl(SHARED_STATE_URL, video.id) : videoEmbedUrl(video);
    return url ? { video, url, uploaded } : null;
  }).filter(Boolean);
  document.querySelector(sectionSelector).hidden = videos.length === 0;
  document.querySelector(containerSelector).innerHTML = videos.map(({ video, url, uploaded }, index) => uploaded
    ? `<video controls playsinline preload="metadata" aria-label="${escapeAttribute(video.name)}"><source src="${escapeAttribute(url)}" type="${escapeAttribute(video.contentType)}">Your browser does not support this video. <a href="${escapeAttribute(url)}">Download video</a></video>`
    : `<iframe src="${escapeAttribute(url)}" title="Formal attire tip ${index + 1}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`).join('');
}
function showSignedInDestination() {
  document.querySelector('#signInPage').hidden = true;
  document.querySelector('#eventSelectionPage').hidden = true;
  document.querySelector('#attirePage').hidden = true;
  document.querySelector('#eventPage').hidden = false;
  updateSignedInAccountBanner();
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
function enterEvent(eventId, { preserveWeddingView = false } = {}) {
  const nextState = appState.events[eventId];
  if (!nextState || !EVENT_DETAILS[eventId]) {
    showToast('That gathering is no longer available. Please choose another gathering.');
    renderEventSelection();
    return;
  }
  selectedGatheringTab = null;
  selectedWeddingTab = null;
  viewedEventId = eventId;
  state = nextState;
  if (eventId === 'wedding' && !preserveWeddingView) {
    const partyMember = isSignedInWeddingPartyMember();
    selectedWeddingTab = isHostView() ? 'couple' : partyMember ? 'party' : 'guest';
    selectedMatronTab = 'duties';
    SiteEditing.resetTabSelection('matronInfoTabs',eventId);
  }
  // Close the chooser before doing the more involved event render. The
  // chooser only contains gatherings already authorized for this account;
  // re-checking the asynchronously refreshed account list here could reject
  // the exact option the guest just selected and leave this page stuck open.
  showSignedInDestination();
  render();
  openRsvp({fromEntry:true});
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

function gatheringHeaderAddress() {
  if (!GatheringFeatures.forGathering(viewedEventId).ceremonyAddresses) return state.homeAddress || [state.addressLine1, state.addressLine2].filter(Boolean).join(', ');
  const address = fields => fields.map(value => (value || '').trim().replace(/^at\s+/i, '')).filter(Boolean).join(', ');
  const ceremony = address([state.churchStreet, state.churchCityStateZip]);
  const reception = address([state.venueStreet, state.venueCityStateZip]);
  const normalize = value => value.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  if (!ceremony || !reception || normalize(ceremony) === normalize(reception)) return ceremony || reception;
  return `${ceremony}\n${reception}`;
}
function weddingDetailsWithoutHeaderAddress(value) {
  const normalize = text => text.trim().replace(/^[-*]\s+/, '').replace(/^<|>$/g, '').replace(/[*`]/g, '').replace(/,/g, '').replace(/\s+/g, ' ').toLowerCase();
  const addressLines = [...gatheringHeaderAddress().split(/\r?\n/).map(line => line.replace(/^(Ceremony|Reception):\s*/, '')), ...(state.homeAddress || '').split(/\r?\n/), state.addressLine1, state.addressLine2, state.churchStreet, state.churchCityStateZip, state.venueStreet, state.venueCityStateZip].filter(Boolean).map(normalize);
  // Relocate standalone address lines in the displayed page; retain the host's saved copy.
  const lines = expandEditableTextVariables(value || '').split(/\r?\n/);
  const heading = line => normalize(line).replace(/^#{1,6}\s*/, '').replace(/:$/, '');
  return lines.filter((line, index) => {
    if (addressLines.includes(normalize(line)) || ['ceremony', 'reception', 'what to expect'].includes(heading(line))) return false;
    if (line.trim() === '---' && heading(lines.slice(index + 1).find(next => next.trim()) || '') === 'what to expect') return false;
    return true;
  }).join('\n');
}
function sharedWeddingDetails(){
  return state.sitePages?.find(page=>!['host','party'].includes(page.audience) && (page.weddingDefault==='details' || page.nav==='weddingPartyTabs' && /^(?:what to expect|details)$/i.test(String(page.title || '').trim())));
}
function sharedWeddingDetailsText(){return sharedWeddingDetails()?.content ?? weddingDetailsWithoutHeaderAddress(state.whatToExpectContent || '');}
function saveSharedWeddingDetails(value){const page=sharedWeddingDetails();if(page)page.content=value;else state.whatToExpectContent=value;}
function weddingPartyPageHeading(tab,page,member) {
  if(page)return {kicker:'The people by our side',title:page.title};
  if(tab==='duties' && member)return {kicker:member.title || 'Wedding Party',title:member.name};
  if(tab==='shared-timeline' || tab==='shared-details')return {kicker:'The people by our side',title:tab==='shared-timeline'?'Timeline':'Details'};
  if(tab==='attire')return {kicker:'Dress for the occasion',title:'FORMAL ATTIRE REQUIRED'};
  return {kicker:'The people by our side',title:tab==='duties'?'Your Responsibilities':'The Perfect Experience'};
}
function renderWeddingPartyPageHeading(tab,page,member) {
  const heading=weddingPartyPageHeading(tab,page,member);
  document.querySelector('#weddingPartyKicker').textContent=heading.kicker;
  document.querySelector('#weddingPartyHeading').textContent=heading.title;
}
function renderWeddingGathering(hostView) {
  const isWedding=GatheringFeatures.forGathering(viewedEventId).weddingPages;
  if(hostView && selectedWeddingTab==='timeline'){selectedWeddingTab='couple';selectedBrideGroomPage='__wedding-timeline';}
  document.querySelector('#rsvpWeddingPages').hidden=!isWedding && !hostView;
  if(!isWedding){
    for(const id of ['weddingHostTabs','weddingPartyTabs','brideGroomSection','weddingPartySection','weddingTimelineSection','guestSection','weddingMediaSection','registrySection','registryAttireSection','whatToExpectSection'])document.getElementById(id).hidden=true;
    return;
  }
  for(const page of state.sitePages || [])if(page.nav==='guestInfoTabs'){page.nav='weddingPartyTabs';if(!page.audience||page.audience==='all')page.audience='guests';}
  for(const page of state.sitePages || [])if(page.nav==='weddingPartyTabs' && /^(?:what to expect|details)$/i.test(String(page.title || '').trim()))page.weddingDefault='details';
  const registrySection = document.querySelector('#registrySection');
  const signedInWeddingPartyMember = state.weddingPartyMembers?.find(member => weddingPartyPersonMatches(member.name, signedInPersonName));
  const isWeddingPartyMember = isWedding && !hostView && Boolean(signedInWeddingPartyMember);
  document.querySelectorAll('#registryAttireSection .guest-attire-requirements').forEach(requirements => {
    requirements.hidden = isWeddingPartyMember;
  });
  if (!hostView && selectedWeddingTab === 'timeline') selectedWeddingTab = 'guest';
  if ((!hostView && !isWeddingPartyMember && selectedWeddingTab === 'party') || (!hostView && selectedWeddingTab === 'couple')) selectedWeddingTab = 'guest';
  if(isWedding && hostView && selectedWeddingTab==='couple' && selectedBrideGroomPage!=='__wedding-timeline' && !(state.brideGroomPages || []).some(page=>page.id===selectedBrideGroomPage))selectedBrideGroomPage=state.brideGroomPages?.[0]?.id || '__wedding-timeline';
  const showingBrideGroomPage = isWedding && hostView && selectedWeddingTab === 'couple';
  const showingWeddingPartyPage = isWedding && (hostView || isWeddingPartyMember) && selectedWeddingTab === 'party';
  const showingTimelinePage = showingBrideGroomPage && selectedBrideGroomPage === '__wedding-timeline' || showingWeddingPartyPage && selectedMatronTab==='shared-timeline';
  const publicWeddingTab = hostView && ['couple','timeline'].includes(selectedWeddingTab)?selectedWeddingTab:['couple','timeline','guest'].includes(selectedWeddingTab) ? selectedGuestTab : selectedWeddingTab;
  const showingGuestPage = isWedding && ['attire','details'].includes(publicWeddingTab);
  const showingPartyAttirePage = (hostView || isWeddingPartyMember) && publicWeddingTab === 'attire';
  const showingAttirePage = (showingGuestPage && publicWeddingTab === 'attire') || showingPartyAttirePage;
  const showingWhatToExpectPage = showingGuestPage && publicWeddingTab === 'details';
  const showingRegistryPage = isWedding && selectedWeddingTab === 'registry';
  const hostTabs=document.querySelector('#weddingHostTabs');
  hostTabs.hidden=!hostView;
  hostTabs.querySelectorAll('[data-wedding-tab]').forEach(button=>{
    const selected=button.dataset.weddingTab===selectedWeddingTab;
    button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  });
  const weddingPartyTabs = document.querySelector('#weddingPartyTabs');
  weddingPartyTabs.hidden = !isWedding;
  weddingPartyTabs.querySelectorAll('[data-wedding-tab]').forEach(button => {
    const hostCanViewTab = true;
    const partyMemberCanViewTab = ['party', 'attire', 'registry', 'media'].includes(button.dataset.weddingTab);
    const guestCanViewTab = ['attire', 'registry', 'details', 'media'].includes(button.dataset.weddingTab);
    button.hidden = !(hostView ? hostCanViewTab : isWeddingPartyMember ? partyMemberCanViewTab : guestCanViewTab);
    const isSelected = button.dataset.weddingTab === publicWeddingTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex=0;button.setAttribute('aria-pressed',String(isSelected));
  });
  const guestSection = document.querySelector('#guestSection');
  guestSection.hidden = true;
  guestSection.querySelectorAll('[data-guest-tab]').forEach(button => {
    const isSelected = button.dataset.guestTab === selectedGuestTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  document.querySelector('#brideGroomSection').hidden = !showingBrideGroomPage;
  if (showingBrideGroomPage) {
    const brideGroomPages = state.brideGroomPages || [];
    if (selectedBrideGroomPage!=='__wedding-timeline' && !brideGroomPages.some(page => page.id === selectedBrideGroomPage)) selectedBrideGroomPage = brideGroomPages[0]?.id || '';
    const brideGroomTabs = document.querySelector('#brideGroomTabs');
    brideGroomTabs.hidden = false;
    const subpages=[...brideGroomPages,{id:'__wedding-timeline',title:state.timelineTabTitle || state.siteTabTitles?.['weddingHostTabs:weddingTab=timeline'] || 'Timeline'}];
    brideGroomTabs.innerHTML = subpages.map(page => `<button type="button" role="tab" data-bride-groom-page="${escapeAttribute(page.id)}" aria-controls="${page.id==='__wedding-timeline'?'weddingTimelineSection':'brideGroomContent'}" aria-selected="${page.id === selectedBrideGroomPage}" tabindex="${page.id === selectedBrideGroomPage ? '0' : '-1'}">${escapeHtml(page.title)}</button>`).join('');
    const activeBrideGroomPage = brideGroomPages.find(page => page.id === selectedBrideGroomPage) || brideGroomPages[0];
    const brideGroomContent = document.querySelector('#brideGroomContent');
    brideGroomContent.hidden=showingTimelinePage;
    brideGroomContent.innerHTML = formatEditableText(activeBrideGroomPage?.content || '');
    if (!brideGroomContent.innerHTML) brideGroomContent.innerHTML = '<p class="guest-empty">No Bride & Groom details have been added yet.</p>';
  }
  const timeline=document.querySelector('#weddingTimelineSection'),timelineOwner=document.querySelector(showingWeddingPartyPage && selectedMatronTab==='shared-timeline'?'#weddingPartySection':'#brideGroomSection');
  if(timeline.parentElement!==timelineOwner)timelineOwner.append(timeline);
  timeline.hidden = !showingTimelinePage;
  if (showingTimelinePage) {
    document.querySelector('#weddingTimelineAboveContent').innerHTML = formatEditableText(expandEditableTextVariables(state.timelineAboveContent));
    document.querySelector('#weddingTimelineBody').innerHTML = renderWeddingTimeline(state.timelineContent);
    document.querySelector('#weddingTimelineBelowContent').innerHTML = formatEditableText(expandEditableTextVariables(state.timelineBelowContent));
  }
  document.querySelector('#whatToExpectSection').hidden = !showingWhatToExpectPage;
  if (showingWhatToExpectPage) {
    document.querySelector('#whatToExpectContent').innerHTML = formatEditableText(sharedWeddingDetailsText())
      || '<p class="guest-empty">No What to Expect details have been added yet.</p>';
  }
  document.querySelector('#weddingPartySection').hidden = !showingWeddingPartyPage;
  const weddingPartyMembers = state.weddingPartyMembers || [];
  const viewedWeddingPartyMember = signedInWeddingPartyMember;
  const visibleWeddingPartyMembers = hostView
    ? WeddingParty.sortByRole(weddingPartyMembers, WEDDING_PARTY_TITLES.map(role => role.value))
    : [viewedWeddingPartyMember].filter(Boolean);
  const personalPages = WeddingParty.visiblePages(weddingPartyMembers, hostView, viewedWeddingPartyMember?.id);
  const matronInfoTabs = document.querySelector('#matronInfoTabs');
  const previousOrder=state.siteTabOrder?.matronInfoTabs;
  if(previousOrder && !previousOrder.includes('matronInfoTabs:matronTab=shared-timeline'))state.siteTabOrder.matronInfoTabs=['matronInfoTabs:matronTab=duties','matronInfoTabs:matronTab=shared-timeline','matronInfoTabs:matronTab=shared-details',...previousOrder.filter(key=>key!=='matronInfoTabs:matronTab=duties')];
  matronInfoTabs.querySelectorAll('[data-member-page]').forEach(button => button.remove());
  personalPages.forEach(page => {
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('role', 'tab');
    button.dataset.matronTab = page.key; button.dataset.memberPage = page.key;
    button.setAttribute('aria-controls', 'weddingPartyPersonalPage');
    button.textContent = hostView ? `${page.memberName} — ${page.title}` : page.title;
    matronInfoTabs.append(button);
  });
  if (!['experience', 'duties','shared-timeline','shared-details', ...personalPages.map(page => page.key)].includes(selectedMatronTab)) selectedMatronTab = 'duties';
  matronInfoTabs.hidden = !showingWeddingPartyPage;
  matronInfoTabs.querySelectorAll('[data-matron-tab]').forEach(button => {
    const isSelected = button.dataset.matronTab === selectedMatronTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  const personalPage = personalPages.find(page => page.key === selectedMatronTab);
  const sharedPage=selectedMatronTab==='shared-timeline'?{title:state.timelineTabTitle || 'Timeline'}:selectedMatronTab==='shared-details'?{title:sharedWeddingDetails()?.title || 'Details'}:null;
  renderWeddingPartyPageHeading(selectedMatronTab,personalPage || sharedPage,hostView?null:signedInWeddingPartyMember);
  document.querySelector('#partySharedDetails').hidden=!showingWeddingPartyPage || selectedMatronTab!=='shared-details';
  document.querySelector('#partySharedDetailsContent').innerHTML=formatEditableText(sharedWeddingDetailsText());
  const personalPanel = document.querySelector('#weddingPartyPersonalPage');
  personalPanel.hidden = !showingWeddingPartyPage || !personalPage;
  personalPanel.innerHTML = personalPage ? `${formatEditableText(personalPage.content) || '<p class="guest-empty">No details have been added yet.</p>'}` : '';
  document.querySelector('#weddingPartyDetails').hidden = !showingWeddingPartyPage || selectedMatronTab !== 'duties';
  document.querySelector('#perfectExperiencePanel').hidden = !showingWeddingPartyPage || selectedMatronTab !== 'experience';
  if (showingWeddingPartyPage && selectedMatronTab === 'experience') {
    document.querySelector('#perfectExperienceContent').innerHTML = formatEditableText(state.perfectExperienceContent)
      || '<p class="guest-empty">No Perfect Experience details have been added yet.</p>';
  }
  document.querySelector('#weddingPartyDetails').classList.toggle('host-responsibilities', hostView);
  document.querySelector('#weddingPartyDetails').innerHTML = visibleWeddingPartyMembers.length
    ? visibleWeddingPartyMembers.map(member => {
      const description = member.responsibilities || '';
      if (hostView) {
        const content = description ? `<div class="wedding-party-description">${formatEditableText(description)}</div>` : '<p class="guest-empty">No responsibilities have been assigned yet.</p>';
        return `<details class="wedding-party-card" data-responsibilities-member="${escapeAttribute(member.id)}"><summary><span class="wedding-party-role">${escapeHtml(member.title || 'Wedding Party')}</span><span class="wedding-party-member-name">${escapeHtml(member.name)}</span></summary>${content}</details>`;
      }
      return `<article class="wedding-party-card">${description ? `<div class="wedding-party-description">${formatEditableText(description)}</div>` : '<p class="guest-empty">No responsibilities have been assigned yet.</p>'}</article>`;
    }).join('')
    : '<p class="guest-empty">No wedding party details have been added yet.</p>';
  registrySection.hidden = !showingRegistryPage;
  const registryAttireSection = document.querySelector('#registryAttireSection');
  const guestAttireAnchor = document.querySelector('#guestAttireAnchor');
  if(registryAttireSection.previousElementSibling!==guestAttireAnchor)guestAttireAnchor.after(registryAttireSection);
  registryAttireSection.classList.toggle('wedding-party-attire-section', showingPartyAttirePage);
  registryAttireSection.classList.toggle('guest-dress-code-only',!showingPartyAttirePage);
  const attireGroups=WeddingParty.attireSections(isWeddingPartyMember?signedInWeddingPartyMember.title:'');
  registryAttireSection.querySelectorAll('[data-attire-group]').forEach(panel=>{panel.hidden=!attireGroups.includes(panel.dataset.attireGroup);});
  document.querySelector('#weddingPartyAttireIntro').hidden=!showingPartyAttirePage || (!SiteEditing.enabled && !state.weddingPartyAttireIntro?.trim());
  document.querySelector('#weddingPartyAttireIntroText').innerHTML=formatEditableText(state.weddingPartyAttireIntro || '');
  registryAttireSection.hidden = !showingAttirePage;
  renderWeddingPartyAttireImages(showingPartyAttirePage);
  if (isWedding) renderAttireVideoCollection('#registryAttireVideosSection', '#registryAttireVideos');
  const registryButton = document.querySelector('#registryButton');
  if(state.registryUrl)registryButton.href=state.registryUrl;else registryButton.removeAttribute('href');
  registryButton.setAttribute('tabindex',state.registryUrl?'0':'-1');
  registryButton.classList.toggle('disabled', !state.registryUrl);
  registryButton.setAttribute('aria-disabled', String(!state.registryUrl));
  registryButton.textContent = state.registryUrl ? 'View our registry' : (hostView ? 'Add registry link in host tools' : 'Registry coming soon');
  const monetaryGiftButton = document.querySelector('#monetaryGiftButton');
  if(state.monetaryGiftUrl)monetaryGiftButton.href=state.monetaryGiftUrl;else monetaryGiftButton.removeAttribute('href');
  monetaryGiftButton.setAttribute('tabindex',state.monetaryGiftUrl?'0':'-1');
  monetaryGiftButton.classList.toggle('disabled', !state.monetaryGiftUrl);
  monetaryGiftButton.setAttribute('aria-disabled', String(!state.monetaryGiftUrl));
  monetaryGiftButton.textContent = state.monetaryGiftUrl ? 'Give a monetary gift' : (hostView ? 'Add monetary gift link in host tools' : 'Monetary gifts coming soon');
}

// Standard gatherings share one page renderer; Wedding opts out of Notes/Menu.
function gatheringGalleryUrl(value) {
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol) && !url.username && !url.password?url.href:'';}catch{return '';}
}
// Every gathering uses this single media surface and the same upload service.
function renderGatheringMedia(hostView) {
  for(const labels of [state.siteText,state.siteTabTitles])for(const key of Object.keys(labels || {}))if(labels[key]==='Upload Photos & Videos')labels[key]='Photos & Videos';
  const wedding=GatheringFeatures.forGathering(viewedEventId).weddingPages;
  const showing=(wedding?selectedWeddingTab:selectedGatheringTab || (hostView?'notes':'media'))==='media';
  document.querySelector('#weddingMediaSection').hidden=!showing;
  document.querySelector('#rsvpWeddingPages').hidden=!wedding && !hostView && !showing;
  if(!wedding){
    document.querySelector('#weddingPartyTabs').hidden=false;
    document.querySelector('#weddingRsvpUploadToolbar').hidden=false;
    document.querySelectorAll('#weddingPartyTabs>[data-wedding-tab]').forEach(button=>{
      button.hidden=button.dataset.weddingTab!=='media';
      button.setAttribute('aria-selected',String(showing && !button.hidden));
    });
  }
  const galleryLink=document.querySelector('#sharedGalleryLink'),galleryUrl=gatheringGalleryUrl(state.mediaGalleryUrl);
  galleryLink.textContent=state.mediaGalleryLabel || 'View & Download Photos & Videos';
  if(galleryUrl)galleryLink.href=galleryUrl;else galleryLink.removeAttribute('href');
  galleryLink.setAttribute('aria-disabled',String(!galleryUrl));
  document.querySelector('#sharedGalleryPending').hidden=Boolean(galleryUrl);
  document.querySelector('#weddingMediaIntro').textContent=wedding?'Share your wedding photos and videos directly with us':'Share your gathering photos and videos directly with us';
  if(showing)WeddingMedia.show({base:SHARED_STATE_URL,eventId:viewedEventId,host:hostView,password:hostView?hostCredential:'',name:signedInPersonName || guestName,account:guestName,preview:false});
}
function renderGatheringPages(features,hostView) {
  if(['details','menu'].includes(selectedGatheringTab))selectedGatheringTab=null;
  if(!hostView && selectedGatheringTab==='notes')selectedGatheringTab='menu';
  const tab=selectedGatheringTab || (hostView?'notes':'media');
  document.querySelector('#gatheringTabs').hidden=!hostView || (!features.menu && !features.notes);
  document.querySelectorAll('[data-gathering-tab]').forEach(button=>{
    button.hidden=!hostView || (button.dataset.gatheringTab==='notes' && !features.notes);
    const selected=button.dataset.gatheringTab===tab;
    button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  });
  document.querySelector('#hostNotesSection').hidden=!features.notes || !hostView || tab!=='notes';
  document.querySelector('#hostNotesContent').innerHTML=features.notes && hostView
    ? formatEditableText(state.hostNotes || '') || '<p>Edit Website to add your notes.</p>' : '';
  document.querySelector('.menu-section').hidden=!features.menu || !hostView;
  document.querySelector('#copyMenuButton').hidden=state.items.length===0;
}
// The shared gathering chooser has site-wide editing state, independent of every event.
function renderGatheringHome() {
  const home=appState.gatheringHome??={};
  const host=isHostView();
  document.body.className='theme-wedding';
  applyGatheringColors({});
  document.title='The Meyers';
  renderEventSelection();
  updateSignedInAccountBanner();
  updateHostToolsPanel();
  const format=(value,options)=>formatEditableText(value,options);
  const save=()=>saveState({refresh:!SiteEditing.flushing});
  SiteEditing.render({host,eventId:'gathering-home',state:home,save,refresh:render,format,escape:escapeHtml});
  SiteEditing.staticText(document.querySelector('#eventSelectionPage'));
  GapLayout.render({state:home,eventId:'gathering-home',host,editing:SiteEditing.enabled,save:()=>saveState({refresh:false})});
  PageActions.sync();
  syncHostToolbar();
  ElementAppearance.render({state:home,eventId:'gathering-home',scope:'#eventSelectionPage',host,enabled:SiteEditing.enabled,
    save:()=>saveState({refresh:false}),format,upload:async file=>(await uploadTemplateBackground(`home-appearance-${crypto.randomUUID()}`,file)).url});
}
function render() {
  ElementAppearance.restore();
  if(captureGatheringHistory()){storeLocalState(appState);localStateRevision+=1;queueSharedStateSave();}
  GapLayout.beforeRender();
  SiteEditing.beforeRender();
  syncGatheringDefinitions(appState.events);
  if(!document.querySelector('#eventSelectionPage').hidden){renderGatheringHome();return;}
  const event = EVENT_DETAILS[viewedEventId];
  const features=GatheringFeatures.forGathering(viewedEventId);
  const hostView = isHostView();
  updateSignedInAccountBanner();
  document.body.className = `theme-${event.theme}`;
  applyGatheringColors();
  document.title = 'The Meyers';
  document.querySelector('meta[name="description"]').content = `The Meyers ${event.name} potluck and RSVP page.`;
  document.querySelector('#weddingRsvpUploadToolbar').hidden=false;
  document.querySelector('#rsvpPageToolbar').hidden=false;
  renderSyncStatus();
  updateHostToolsPanel();
  document.querySelector('#editItemsButton').textContent = 'Edit';
  renderEventDock();
  updateHeaderImage(event);
  const eventDate = new Date(`${state.eventDate}T12:00:00`);
  document.querySelector('#eventHeaderText').innerHTML = formatEditableText(state.headerText || '');
  const dateElement = document.querySelector('#eventDate');
  dateElement.dateTime = state.eventDate;
  document.querySelector('#rsvpDeadline').hidden = !SiteEditing.enabled;
  document.querySelector('#rsvpDeadline').textContent = state.rsvpDate ? `Kindly RSVP by ${new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric'}).format(new Date(`${state.rsvpDate}T12:00:00`))}` : 'RSVP deadline not set';
  dateElement.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate).replaceAll(',', '');
  document.querySelector('#eventAddress').innerHTML = formatEditableText(gatheringHeaderAddress(),{inline:true});
  document.querySelector('#eventPage footer address').innerHTML = `<b>${escapeHtml(appState.sharedSite?.footerName || 'The Meyers')}</b><br>${formatEditableText(SharedDetails.homeAddress(state),{inline:true})}`;
  document.body.classList.toggle('host-rsvp-view',hostView);
  document.querySelector('#hostRsvpCounters').hidden=!hostView;
  document.querySelector('#remainingSummary').hidden=!features.menu;
  document.querySelector('.summary-strip').style.setProperty('--summary-columns',features.menu?'5':'4');
  document.querySelector('.summary-strip').hidden = !hostView;
  renderGatheringPages(features,hostView);
  renderWeddingGathering(hostView);
  renderGatheringMedia(hostView);
  const neededRows=state.items.flatMap(item=>{const remaining=Math.max(0,item.needed-item.claims.length);return remaining?[renderDish(item,remaining)]:[];});
  const claimedRows=state.items.flatMap(item=>[...new Set(item.claims)].map(claimant=>renderDish(item,item.claims.filter(name=>name===claimant).length,claimant)));
  document.querySelector('#menuGrid').innerHTML=[['Still needed','needed',neededRows],['Claimed','claimed',claimedRows]].map(([title,key,rows])=>`<section data-dish-group="${key}"><h3 class="dish-list-group-title">${title}</h3>${rows.length?rows.join(''):'<p class="guest-empty">No dishes in this group.</p>'}</section>`).join('');
  const needed = state.items.reduce((sum, item) => sum + (item.optional ? 0 : Math.max(0, item.needed - item.claims.length)), 0);
  document.querySelector('#dishListTotals').textContent=`${needed} still needed · ${state.items.reduce((sum,item)=>sum+item.claims.length,0)} claimed`;
  const guests = GuestPlanning.guestResponses(state.rsvps).reduce((sum, rsvp) => sum + rsvp.adults + rsvp.children, 0);
  const invitedAccounts = appState.accounts.filter(account => accountIsInvited(account, viewedEventId));
  const summaryCounts=attendanceSummaryCounts();
  for(const [id,key] of [['guestCount','attending'],['notAttendingCount','notAttending'],['noResponseCount','noResponse'],['invitedCount','invited']]) {
    const count=summaryCounts[key];
    document.getElementById(id).textContent=`${count.adults}/${count.children}`;
    document.getElementById(id).parentElement.setAttribute('aria-label',`${key==='noResponse'?'No Response':key}: ${count.adults} adults, ${count.children} children`);
  }
  const invitedAdults=invitedAccounts.reduce((sum,account)=>sum+invitedAdultCount(account),0);
  document.querySelector('#remainingCount').textContent = needed;
  const guestListButton = document.querySelector('#guestListButton');
  guestListButton.disabled = !hostView;
  guestListButton.title = hostView ? 'View guest names and RSVP details' : 'Guest details are private to the host';
  guestListButton.setAttribute('aria-label', hostView ? `${summaryCounts.attending.adults} adults and ${summaryCounts.attending.children} children attending; view private guest list` : `${guests} guests attending; details visible only to the host`);
  const invitedListButton = document.querySelector('#invitedListButton');
  invitedListButton.disabled = !hostView;
  invitedListButton.title = hostView ? 'View invited adults by invitation' : 'Invitation details are private to the host';
  invitedListButton.setAttribute('aria-label', hostView ? `${invitedAdults} adults and ${summaryCounts.invited.children} children invited; view private invitation list` : `${invitedAdults} adults invited; details visible only to the host`);
  if(document.querySelector('#rsvpDialog').open)renderRsvpEventHeader();
  renderInlineEditing();
  if (document.querySelector('#guestListDialog').open || document.querySelector('#notAttendingDialog').open) renderGuestAttendance();
  if (document.querySelector('#noResponseDialog').open) renderNoResponseAccounts();
  // Static text editors can restore their original copy during a redraw.
  // Reapply the active RSVP step's heading without restarting the journey.
  RsvpFlow.refresh();
  document.querySelector('#eventPage').dataset.hostHome=String(hostView);
  document.querySelectorAll('#rsvpWeddingPages>section').forEach(page=>page.classList.add('rsvp-page-shell'));
  GapLayout.render({state,eventId:viewedEventId,host:hostView,editing:SiteEditing.enabled,save:()=>saveState({refresh:false})});
  PageActions.sync();
  syncHostToolbar();
  renderWeddingPageToolbar();
  renderHostFirstPageActions();
  renderRsvpPageNavigation();
  ElementAppearance.render({state,eventId:viewedEventId,host:hostView,enabled:SiteEditing.enabled,
    setImage:(image,url)=>{const key=image.id==='rsvpFirstPageImage'?'rsvpHeaderImage':image.id==='eventHeaderImage'?'siteHeaderImage':null;if(!key)return false;state[key]=url;const field=SiteEditing.editorFor(image.closest('.header-art'))?.fields?.[0];if(field)field.value=url;return true;},
    save:()=>saveState({refresh:false}),format:(value,options)=>formatEditableText(value,options),upload:async file=>(await uploadTemplateBackground(`appearance-${crypto.randomUUID()}`,file)).url});
  GapLayout.refresh();
}

function renderInlineEditing() {
  for(const map of [state.elementAppearance,state.textAppearance])if(map)for(const key of Object.keys(map)){const next=key.replace(/^#eventPage>main>section:nth-of-type\(1\)/,'#hostRsvpCounters');if(next!==key){map[next]??=map[key];delete map[key];}}

  // Preserve edited copy when page content moves to a different container.
  if(viewedEventId==='wedding' && state.siteText) {
    const attireTextIds=['registryAttireKicker','registryAttireLead','registryAttireBudgetNote','registryAttireShoppingIntro','registryAttireClosing'];
    const movedText=[['#weddingMediaUpload>p:nth-of-type(1)','#weddingMediaIntro'],['#weddingMediaUpload>p:nth-of-type(2)','#weddingMediaUploadNotice'],...attireTextIds.map((id,index)=>[`#registryAffordableAttire>p:nth-of-type(${index+1})`,`#${id}`])];
    for(const [oldKey,newKey] of movedText) {
      if(Object.hasOwn(state.siteText,oldKey)) {
        state.siteText[newKey] ??= state.siteText[oldKey];delete state.siteText[oldKey];
      }
    }
  }
  SiteEditing.render({ host: isHostView(), eventId: viewedEventId, state,
    party: Boolean(state.weddingPartyMembers?.some(member => weddingPartyPersonMatches(member.name, signedInPersonName))),
    save: () => saveState({refresh:!SiteEditing.flushing}), refresh: render,
    directSaved: () => {
      syncGatheringDefinitions(appState.events);
      document.querySelectorAll('[data-switch-event]').forEach(button => {
        const name=EVENT_DETAILS[button.dataset.switchEvent]?.name;
        if(name){button.querySelector('span').textContent=name;button.setAttribute('aria-label',`${name}${button.dataset.switchEvent===viewedEventId?', current event':''}`);}
      });
      document.querySelectorAll('#brideGroomTabs [data-bride-groom-page]').forEach(tab => {
        const page=state.brideGroomPages?.find(page=>page.id===tab.dataset.brideGroomPage);
        if(page)tab.textContent=page.title;
      });
      const personalPages=WeddingParty.visiblePages(state.weddingPartyMembers || [],isHostView(),state.weddingPartyMembers?.find(member=>weddingPartyPersonMatches(member.name,signedInPersonName))?.id);
      const selectedPartyTab=document.querySelector('#matronInfoTabs [role="tab"][aria-selected="true"]');
      const selectedCustom=state.sitePages?.find(page=>`custom-page-${page.id}`===selectedPartyTab?.getAttribute('aria-controls'));
      renderWeddingPartyPageHeading(selectedMatronTab,selectedCustom || personalPages.find(page=>page.key===selectedMatronTab),isHostView()?null:state.weddingPartyMembers?.find(member=>weddingPartyPersonMatches(member.name,signedInPersonName)));
      document.querySelectorAll('#matronInfoTabs [data-member-page]').forEach(tab => {
        const page=personalPages.find(page=>page.key===tab.dataset.memberPage);
        if(page)tab.textContent=isHostView()?`${page.memberName} — ${page.title}`:page.title;
      });
      document.querySelectorAll('[aria-controls^="custom-page-"]').forEach(tab => {
        const page=state.sitePages?.find(page=>`custom-page-${page.id}`===tab.getAttribute('aria-controls'));
        if(page)tab.textContent=page.title;
      });
      renderWeddingPageToolbar();
    }, format: (value,options) => formatEditableText(value,options), escape: escapeHtml });
  SiteEditing.field(document.querySelector('#sharedGalleryLink'),'shared photo folder',[
    {label:'Button text',value:state.mediaGalleryLabel || 'View & Download Photos & Videos',required:true},
    {label:'Dropbox folder link (add after the gathering)',type:'url',value:state.mediaGalleryUrl || ''}
  ],([label,url])=>{state.mediaGalleryLabel=label.trim();state.mediaGalleryUrl=gatheringGalleryUrl(url.trim());});
  SiteEditing.field(document.querySelector('#customGatheringHeading'), 'text', [{label:'Gathering name',value:state.gatheringName,required:true}], ([value])=>{state.gatheringName=value.trim();});
  const field = (selector, title, keys, types = {}) => SiteEditing.field(document.querySelector(selector), title,
    keys.map(([key, label]) => ({ label, value: key==='homeAddress' ? SharedDetails.homeAddress(state) : state[key] || '', type: types[key] || 'textarea', required: types[key] === 'date', min:key==='eventDate' && GatheringHistory.completed(state)?new Date(Date.parse(GatheringHistory.today())+86400000).toISOString().slice(0,10):undefined })),
    values => keys.forEach(([key], index) => { setGatheringDetail(key,values[index]); }));
  SiteEditing.field(document.querySelector('#rsvpDeadline'), 'RSVP deadline', [{label:'RSVP deadline (through end of day, Pacific time; clear for no deadline)',type:'date',value:state.rsvpDate || ''}], ([value]) => { state.rsvpDate=value; });
  field('#eventHeaderText', 'text', [['headerText', 'Header text']]);
  field('#eventDate', 'date', [['eventDate', 'Gathering date']], { eventDate: 'date' });
  if (GatheringFeatures.forGathering(viewedEventId).ceremonyAddresses) {
    SiteEditing.field(document.querySelector('#eventAddress'), 'address', [{label:'Address (one per line if locations differ)',type:'textarea',value:gatheringHeaderAddress()}], ([value]) => {
      const addresses=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      state.churchStreet=addresses[0] || '';state.churchCityStateZip='';
      state.venueStreet=addresses.slice(1).join(', ') || addresses[0] || '';state.venueCityStateZip='';
    });
  } else field('#eventAddress', 'address', [['homeAddress','Home address']]);
  SiteEditing.field(document.querySelector('#eventPage footer address'), 'footer', [
    {label:'Name',value:appState.sharedSite?.footerName || 'The Meyers'},
    {label:'Home address (shared with the header and invitations)',value:SharedDetails.homeAddress(state),type:'textarea'}
  ], ([name,address]) => {appState.sharedSite??={};appState.sharedSite.footerName=name;SharedDetails.setDetail(appState.events,viewedEventId,'homeAddress',address);});
  const features=GatheringFeatures.forGathering(viewedEventId);
  if(features.notes)field('#hostNotesContent', 'notes' , [['hostNotes','Notes']]);
  const prepare = () => { openAdmin(); document.querySelector('#adminDialog').close(); };
  if(features.weddingPages){
  field('#perfectExperienceContent', 'page', [['perfectExperienceContent','The Perfect Experience']]);
  field('#weddingPartyAttireIntroText','text',[['weddingPartyAttireIntro','Text above the attire containers']]);
  for(const id of ['whatToExpectContent','partySharedDetailsContent'])SiteEditing.field(document.getElementById(id),'text',[{label:'Details content',type:'textarea',value:sharedWeddingDetailsText()}],([value])=>saveSharedWeddingDetails(value));
  field('#weddingTimelineSection', 'timeline', [['timelineAboveContent','Text above timeline'], ['timelineContent','Timeline rows (time, event, notes separated by tabs)'], ['timelineBelowContent','Text below timeline']]);
  field('#registrySection .registry-actions', 'links', [['registryUrl','Registry URL'], ['monetaryGiftUrl','Monetary gift URL']], { registryUrl:'url', monetaryGiftUrl:'url' });
  const page = state.brideGroomPages?.find(page => page.id === selectedBrideGroomPage);
  if (page) SiteEditing.field(document.querySelector('#brideGroomContent'), 'page', [{label:'Title',value:page.title,required:true},{label:'Content',value:page.content,type:'textarea'}], ([title,content]) => { page.title=title;page.content=content; });
  state.weddingPartyMembers?.forEach(member => {
    const card = document.querySelector(`[data-responsibilities-member="${CSS.escape(member.id)}"]`);
    if (card) SiteEditing.field(card, member.name, [{label:'Name',value:member.name,required:true},{label:'Role',value:member.title,options:['',...WEDDING_PARTY_TITLES.map(role=>role.value)]},{label:'Responsibilities',value:member.responsibilities,type:'textarea'}], ([name,title,responsibilities]) => { Object.assign(member,{name,title,responsibilities}); });
    member.pages?.forEach(page => {
      if (selectedMatronTab !== `member-page:${JSON.stringify([member.id,page.id])}`) return;
      SiteEditing.field(document.querySelector('#weddingPartyPersonalPage'), 'page', [{label:'Title',value:page.title,required:true},{label:'Content',value:page.content,type:'textarea'}], ([title,content]) => { Object.assign(page,{title,content}); },{titleTarget:document.querySelector('#weddingPartyHeading')});
    });
  });
  SiteEditing.portal(document.querySelector('#registryAttireSection'), 'images and videos', ['#weddingPartyAttireAdmin','#guestAttireVideosAdmin'], prepare);
  SiteEditing.portal(document.querySelector('#weddingPartyDetails'), 'party members', ['#weddingPartyAdmin'], prepare);
  }
  if (features.menu) {
    document.querySelectorAll('#menuGrid [data-dish-id]').forEach(dish => {
      const item = state.items.find(item => item.id === dish.dataset.dishId);
      SiteEditing.field(dish, item.name, [{label:'Name',value:item.name,required:true},{label:'Category',value:item.category,options:['Appetizers','Main Table','Sides','Desserts','Drinks']},{label:'Amount',value:item.needed,type:'number',min:1},{label:'Unit',value:item.unit,options:(state.quantityUnits || ['item','dozen']).map(unit=>typeof unit==='string'?unit:unit.id)}], ([name,category,needed,unit]) => { Object.assign(item,{name,category,needed:Number(needed),unit}); });
      if(SiteEditing.enabled)SiteEditing.button('Change my claim',()=>claimItem(item.id),dish);
      if (SiteEditing.enabled) SiteEditing.button('×', () => { if (confirm(`Delete “${item.name}”?`)) { state.items=state.items.filter(entry=>entry.id!==item.id); saveState(); } }, dish, `Delete ${item.name}`);
    });
    SiteEditing.button('Add dish',()=>openCustomItem('Main Table'),document.querySelector('#gatheringMenuSection'));
    SiteEditing.portal(document.querySelector('#gatheringMenuSection'), 'menu items and claims', ['#menuAdminFields'], prepare);
  }
  SiteEditing.field(document.querySelector('#eventPage .header-art'), 'header image', [
    {label:'Gathering header banner URL (empty to remove)',value:state.siteHeaderImage ?? EVENT_DETAILS[viewedEventId].header,type:'url'},
    {label:'RSVP first-page banner URL (empty to remove; changes only RSVP)',value:state.rsvpHeaderImage ?? state.siteHeaderImage ?? EVENT_DETAILS[viewedEventId].header,type:'url'}
  ], ([header,rsvpHeader])=>{state.siteHeaderImage=header;state.rsvpHeaderImage=rsvpHeader;}, {replace:false});
  SiteEditing.staticText(document.querySelector('#eventPage'));
  SiteEditing.staticText(document.querySelector('#rsvpDialog'));
  document.querySelectorAll('#eventPage [role="tablist"],#rsvpWeddingPages [role="tablist"],#weddingPartyTabs').forEach(nav => {
    if(nav.id==='gatheringTabs' ? !features.menu && !features.notes : !features.weddingPages)return;
    const config = { available: nav.id==='brideGroomTabs' && selectedWeddingTab==='couple' && viewedEventId==='wedding' };
    if(nav.id==='weddingPartyTabs')Object.assign(config,{toolbar:true,allowNoSelection:true,pageHost:document.querySelector('#rsvpWeddingPages'),panelIds:['whatToExpectSection','brideGroomSection','weddingTimelineSection','hostNotesSection'],scroll:true,
      hidePage:page=>page.weddingDefault==='details',
      defaultPage:['details','guest'].includes(selectedWeddingTab) && selectedGuestTab==='details'?page=>page.weddingDefault==='details':null});
    if(nav.id==='gatheringTabs')Object.assign(config,{pageHost:document.querySelector('#rsvpWeddingPages'),allowNoSelection:true,panelIds:['hostNotesSection','weddingMediaSection']});
    if (nav.id==='brideGroomTabs') Object.assign(config, { audience:'host',
      add: () => { state.brideGroomPages.push({id:crypto.randomUUID(),title:'New page',content:''});selectedBrideGroomPage=state.brideGroomPages.at(-1).id; },
      rename: (tab,title) => { if(tab.dataset.brideGroomPage==='__wedding-timeline')state.timelineTabTitle=title;else state.brideGroomPages.find(page=>page.id===tab.dataset.brideGroomPage).title=title; },
      remove: tab => { if(tab.dataset.brideGroomPage==='__wedding-timeline'){state.siteHiddenTabs??=[];state.siteHiddenTabs.push('brideGroomTabs:brideGroomPage=__wedding-timeline');}else state.brideGroomPages=state.brideGroomPages.filter(page=>page.id!==tab.dataset.brideGroomPage); }
    });
    if (nav.id==='matronInfoTabs') Object.assign(config,{audience:'party',externalHeading:true,
      rename:(tab,title)=>{
        if(tab.dataset.memberPage){
          const [memberId,pageId]=JSON.parse(tab.dataset.memberPage.slice('member-page:'.length));
          const page=state.weddingPartyMembers?.find(member=>member.id===memberId)?.pages?.find(page=>page.id===pageId);
          if(page)page.title=title;
        } else {
          const key=`${nav.id}:${Object.entries(tab.dataset).filter(([key])=>key!=='editingTitle').map(([key,value])=>`${key}=${value}`).join('|')}`;
          state.siteTabTitles??={};state.siteTabTitles[key]=title;
        }
      },onSelect:page=>{if(page)renderWeddingPartyPageHeading('custom',page);}});
    if (nav.id==='weddingHostTabs')Object.assign(config,{audience:'host',allowNoSelection:true,pageHost:document.querySelector('#rsvpWeddingPages'),panelIds:['weddingPartySection','registryAttireSection','registrySection','whatToExpectSection','weddingMediaSection','hostNotesSection']});
    SiteEditing.tabs(nav,config);
  });
  document.querySelectorAll('.event-dock').forEach(toolbar=>SiteEditing.field(toolbar,'toolbar',[],()=>{}));
  renderRsvpInlineEditing();
  SiteEditing.movableText(document.querySelector('#weddingMediaSection'));
}
function renderRsvpInlineEditing() {
  if (!SiteEditing.enabled) {document.querySelector('#weddingRsvpGuests')?.querySelectorAll('[data-edit-meal-preview]').forEach(element=>element.remove());return;}
  const header=document.querySelector('#rsvpEventHeader .header-art');
  if(header)SiteEditing.field(header,'header image',[{label:'RSVP first-page banner URL (empty to remove)',type:'url',value:state.rsvpHeaderImage ?? state.siteHeaderImage ?? EVENT_DETAILS[viewedEventId].header}],([value])=>{state.rsvpHeaderImage=value;},{key:'rsvp-first-page-banner'});
  SiteEditing.field(document.querySelector('#rsvpFirstPageDate'),'date',[{label:'Gathering date',type:'date',value:state.eventDate,required:true}],([value])=>{setGatheringDetail('eventDate',value);});
  for(const [selector,value,key] of rsvpFirstPageTextFields()) {
    SiteEditing.field(document.querySelector(selector),'text',[{label:'Text (Markdown supported)',type:'textarea',value}],([text])=>{state[key]=text;},{key,placement:'text'});
  }
  if (!GatheringFeatures.rsvp(viewedEventId).meals) return;
  const preview=document.querySelector('#weddingRsvpGuests');
  if(!SiteEditing.enabled)preview.querySelectorAll('[data-edit-meal-preview]').forEach(element=>element.remove());
  if(SiteEditing.enabled && !preview.childElementCount)preview.innerHTML=`<fieldset class="wedding-rsvp-guest" data-edit-meal-preview><legend>Meal options</legend><div class="wedding-meal-options">${GuestPlanning.weddingMeals(state).map(meal=>`<label class="wedding-meal-choice"><span>${escapeHtml(meal.name)}</span></label>`).join('')}</div></fieldset>`;
  SiteEditing.settings(document.querySelector('#weddingRsvpMenu'),'meal options',area=>{
    const audiences=['Adults and children','Adults only','Children only'];
    const saveMeals=next=>{const draft={menuSelections:captureRsvpMeals()};GuestPlanning.saveWeddingMeals(state,next,[draft]);renderWeddingRsvpMenu(draft.menuSelections);saveState({refresh:false});};
    const draw=()=>{
      area.replaceChildren();const meals=GuestPlanning.weddingMeals(state);
      const rowFor=(meal,index)=>{
        const row=document.createElement('div');row.className='inline-meal-row';area.append(row);
        const input=document.createElement('input');input.value=meal.name;input.setAttribute('aria-label',index<0?'New meal name':`Meal name: ${meal.name}`);row.append(input);
        const audience=document.createElement('select');audience.setAttribute('aria-label','Meal audience');for(const value of audiences){const option=document.createElement('option');option.value=option.textContent=value;audience.append(option);}audience.value=meal.audience;row.append(audience);
        const action=document.createElement('button');action.type='button';action.textContent=index<0?'Add meal':'Remove meal';row.append(action);
        const update=()=>{if(index<0 || !input.value.trim())return;saveMeals(GuestPlanning.weddingMeals(state).map(entry=>entry.id===meal.id?{...entry,name:input.value.trim(),audience:audience.value}:entry));};input.addEventListener('change',update);audience.addEventListener('change',update);
        action.addEventListener('click',()=>{if(index<0){if(!input.value.trim())return;saveMeals([...GuestPlanning.weddingMeals(state),{id:crypto.randomUUID(),name:input.value.trim(),audience:audience.value}]);}else if(confirm(`Delete “${meal.name}” from the meal options?`))saveMeals(GuestPlanning.weddingMeals(state).filter(entry=>entry.id!==meal.id));draw();});
      };meals.forEach(rowFor);rowFor({name:'',audience:audiences[0]},-1);
    };draw();
  });
}

function renderWeddingPageToolbar(){
  const icons={media:'M8 3 6 6H3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-2-3H8Zm4 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',party:'M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM3 22v-3a9 7 0 0 1 18 0v3H3Z',attire:'M2 5v14l8-5V10L2 5Zm20 0-8 5v4l8 5V5ZM10 9h4v6h-4V9Z',registry:'M2 8h20v5h-9v9h-2v-9H2V8Zm2 7h5v7H4v-7Zm11 0h5v7h-5v-7ZM7 1c3 0 5 5 5 5s2-5 5-5a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6Zm0 2a1 1 0 0 0 0 2h3S8 3 7 3Zm10 0c-1 0-3 2-3 2h3a1 1 0 0 0 0-2Z',custom:'M4 2h12l4 4v16H4V2Zm3 7v2h10V9H7Zm0 5v2h10v-2H7Z'};
  document.querySelectorAll('#weddingPartyTabs>button').forEach(button=>{
    const firstName=signedInPersonName.trim().split(/\s+/)[0];
    const title=button.dataset.weddingTab==='party' && firstName ? firstName : button.textContent.trim(),selected=button.getAttribute('aria-selected')==='true';
    button.setAttribute('aria-pressed',String(selected));button.tabIndex=0;
    button.innerHTML=`<svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[button.dataset.weddingTab] || icons.custom}"/></svg><span>${escapeHtml(title)}</span>`;
  });
}
function renderRsvpPageNavigation(){
  const nav=document.querySelector('#rsvpPageNavigation');nav.replaceChildren();
  const owner=document.querySelector(hostAuthenticated?'#hostToolsPanel':'#rsvpPageToolbar');
  const print=owner.querySelector('[data-toolbar-page-actions]');owner.insertBefore(nav,print);
  nav.hidden=(!GatheringFeatures.forGathering(viewedEventId).weddingPages && !isHostView()) || !document.querySelector('#rsvpDialog').open || document.querySelector('#rsvpEventConfirmation').hasAttribute('data-rsvp-flow-hidden');
  if(nav.hidden)return;
  const restoreOrder=()=>{const order=state.rsvpToolbarOrder || [];const rank=button=>{const index=order.indexOf(button.dataset.pageKey);return index<0?order.length:index;};[...nav.children].sort((a,b)=>rank(a)-rank(b)).forEach(button=>nav.append(button));};
  const add=(title,source)=>{
    const key=source?.dataset.weddingTab || source?.dataset.gatheringTab || 'details';
    const button=document.createElement('button');button.type='button';button.id=`rsvp-nav-${key}`;button.dataset.pageKey=key;button.setAttribute('aria-label',title);button.setAttribute('aria-pressed',String(source?source.getAttribute('aria-selected')==='true':selectedWeddingTab==='details'));
    button.innerHTML=source?.querySelector('svg')?.outerHTML || '<svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2h12l4 4v16H4V2Zm3 7v2h10V9H7Zm0 5v2h10v-2H7Z"/></svg>';
    const label=document.createElement('span');
    label.textContent=title;
    button.append(label);nav.append(button);
    const move=direction=>{const buttons=[...nav.children],index=buttons.indexOf(button),neighbor=buttons[index+direction];if(!neighbor)return;if(direction<0)nav.insertBefore(button,neighbor);else nav.insertBefore(neighbor,button);state.rsvpToolbarOrder=[...nav.children].map(button=>button.dataset.pageKey);saveState();};
    const entry=source && SiteEditing.editorFor(source),actions=[...(entry?.options?.actions || []).filter(([title])=>!['Move left','Move right'].includes(title)),['Move left',()=>move(-1)],['Move right',()=>move(1)]];
    SiteEditing.field(button,entry?.title || 'text',entry?.fields || [{label:'Page title',value:title,required:true}],entry?.commit || (([title])=>{state.rsvpDetailsTitle=title;}),{...entry?.options,actions});
    button.addEventListener('click',()=>{
      commitAllPendingEditorInputs();
      SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);SiteEditing.resetTabSelection('weddingHostTabs',viewedEventId);SiteEditing.resetTabSelection('gatheringTabs',viewedEventId);
      if(source)ElementEditor.activate(source);else{selectedWeddingTab='details';selectedGuestTab='details';render();}
      [...document.querySelectorAll('#rsvpWeddingPages>section')].find(element=>!element.hidden && element.getClientRects().length)?.scrollIntoView({block:'start',behavior:'auto'});
    });
  };
  if(!GatheringFeatures.forGathering(viewedEventId).weddingPages){document.querySelectorAll('#gatheringTabs>button[data-gathering-tab]').forEach(button=>{if(!button.hidden)add(button.textContent.trim(),button);});restoreOrder();return;}
  document.querySelectorAll('#weddingPartyTabs>button').forEach(button=>{if(!button.hidden && ['party','attire','registry'].includes(button.dataset.weddingTab))add(button.textContent.trim(),button);});
  add(state.rsvpDetailsTitle || 'Details');restoreOrder();
}
function renderHostFirstPageActions(){
  const menu=document.querySelector('#hostFirstPageActions');menu.hidden=!isHostView();menu.replaceChildren();if(!isHostView())return;
  const add=(title,source)=>{
    if(['party','attire','registry'].includes(source?.dataset.weddingTab) || source?.dataset.gatheringTab || title==='Details')return;
    const button=document.createElement('button');button.type='button';
    button.innerHTML='<svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2h12l4 4v16H4V2Zm3 7v2h10V9H7Zm0 5v2h10v-2H7Z"/></svg>';
    const icon=source?.querySelector('svg');if(icon)button.firstElementChild.replaceWith(icon.cloneNode(true));
    const label=document.createElement('span');label.textContent=title;button.append(label);menu.append(button);
    const entry=source && SiteEditing.editorFor(source);if(entry?.fields)SiteEditing.field(button,entry.title,entry.fields,entry.commit,entry.options);
    button.addEventListener('click',async()=>{
    commitAllPendingEditorInputs();
    if(!document.querySelector('#rsvpDialog').open || activeHostDialog()?.id!=='rsvpDialog'){await closeHostDialogs();showSignedInDestination();openRsvp({fromEntry:true});}
    RsvpFlow.first();SiteEditing.resetTabSelection('weddingHostTabs',viewedEventId);SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);SiteEditing.resetTabSelection('gatheringTabs',viewedEventId);
    if(source)ElementEditor.activate(source);else{selectedWeddingTab='details';selectedGuestTab='details';selectedGatheringTab='details';render();}
    const page=source?document.getElementById(source.getAttribute('aria-controls')):[...document.querySelectorAll('#rsvpWeddingPages>section')].find(element=>!element.hidden && element.getClientRects().length);
    page?.scrollIntoView({block:'start',behavior:'auto'});
  });};
  if(GatheringFeatures.forGathering(viewedEventId).weddingPages){
    document.querySelectorAll('#weddingHostTabs>button').forEach(button=>{if(!button.hidden)add(button.textContent.trim(),button);});
    add('Details');
    document.querySelectorAll('#weddingPartyTabs>button').forEach(button=>{if(!button.hidden)add(button.textContent.trim(),button);});
  }else{
    document.querySelectorAll('#gatheringTabs>button').forEach(button=>{if(!button.hidden)add(button.textContent.trim(),button);});
    const upload=document.querySelector('#uploadPhotosButton');add(upload.textContent.trim(),upload);
  }
}
function renderEventDock() {
  const dock = document.querySelector('#eventDock');
  const switchButtons = document.querySelector('#eventSwitchButtons');
  const ids = availableEventIds();
  dock.hidden = hostAuthenticated || !guestName || ids.length === 0;
  switchButtons.innerHTML = ids.map(id => {
    const name = EVENT_DETAILS[id].name;
    const accessibleLabel = `${name}${id === viewedEventId ? ', current event' : ''}`;
    return `<button type="button" data-switch-event="${id}" aria-label="${escapeHtml(accessibleLabel)}" ${id === viewedEventId ? 'aria-current="page"' : ''}><span>${escapeHtml(name)}</span></button>`;
  }).join('');
}
function renderDish(item,quantity=Math.max(0,item.needed-item.claims.length),claimant=null) {
  const family=claimant===null?'':claimant===HOST_DISPLAY_NAME?'Host':[...new Set(accountSignInNames(claimant).map(name=>firstAccountLastName(name)))].join(' / ');
  return `<div class="guest-entry invited-entry dish dish-list-row" data-dish-id="${escapeAttribute(item.id)}"><strong class="dish-title">${escapeHtml(item.name)}</strong> <span class="dish-status">(${quantity} of ${item.needed})${claimant===null?' still needed':''}</span>${claimant===null?'':` <span class="dish-claimants">${escapeHtml(family)}</span>`}</div>`;
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
      showSiteDialog(document.querySelector('#claimQuantityDialog'));
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
    showSiteDialog(document.querySelector('#customItemDialog'));
  });
}

document.querySelector('#passwordForm').addEventListener('submit', event => {
  event.preventDefault();
  const firstNameInput = document.querySelector('#accountFirstName');
  const firstName = firstNameInput.value.trim();
  if (!isAccountQrRoute() && firstName === HOST_PASSWORD) {
    const password = firstName;
    hostAuthenticated = true;hostReturnSession=null;hostWeddingPartyViewName='';
    selectedGatheringTab = null;
    hostCredential = password;
    guestName = HOST_DISPLAY_NAME;
    signedInPersonName = '';
    if (viewedEventId === 'wedding') {
      selectedWeddingTab = 'couple';
      selectedMatronTab = 'duties';
      hostWeddingPartyViewName = '';
    }
    updateHostToolsPanel();
    const action = pendingAccountAction;
    pendingAccountAction = null;
    showEventSelection();
    document.querySelector('#accountPasswordError').textContent = '';
    firstNameInput.value = '';
    if (action) action();
    return;
  }
  if (signInStep < 2) {
    const current = document.querySelector(`[data-sign-in-step="${signInStep}"] input`);
    if (!current.value.trim()) {
      document.querySelector('#accountPasswordError').textContent = signInStep === 0 ? 'Enter your first name.' : 'Enter your last name.';
      current.focus(); return;
    }
    setSignInStep(signInStep + 1); return;
  }
  const lastName = document.querySelector('#accountLastName').value.trim();
  const suffix = document.querySelector('#accountSuffix').value.trim();
  const accountName = [firstName, lastName, suffix].filter(Boolean).join(' ');
  if (!firstName || !lastName) { document.querySelector('#accountPasswordError').textContent = 'Enter your first and last name, plus your suffix if you have one.'; return; }
  const account = accountForSignIn(accountName);
  if (!account) { document.querySelector('#accountPasswordError').textContent = 'That name and suffix are not recognized.'; return; }
  if (!availableEventIds(account.name).length) { document.querySelector('#accountPasswordError').textContent = 'Sign-in access has not been enabled for your account yet.'; return; }
  selectedGatheringTab = null;
  guestName = account.name;
  signedInPersonName = accountPersonName(accountName, account) || accountName;
  selectedWeddingTab = 'guest';
  document.querySelector('#accountPasswordError').textContent = '';
  showEventSelection();
  pendingAccountAction = null;
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
document.querySelectorAll('#weddingPartyTabs,#weddingHostTabs').forEach(nav=>nav.addEventListener('click', event => {
  const button = event.target.closest('[data-wedding-tab]');
  if (!button) return;
  selectedWeddingTab = button.dataset.weddingTab;
  if(!GatheringFeatures.forGathering(viewedEventId).weddingPages && selectedWeddingTab==='media'){selectedGatheringTab='media';SiteEditing.resetTabSelection('gatheringTabs',viewedEventId);}
  if(nav.id==='weddingPartyTabs')SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);
  if(['attire','details'].includes(selectedWeddingTab))selectedGuestTab=selectedWeddingTab;
  render();
  if(nav.id==='weddingPartyTabs')document.getElementById(button.getAttribute('aria-controls'))?.scrollIntoView({block:'start',behavior:'auto'});
}));
document.querySelectorAll('#weddingPartyTabs,#weddingHostTabs').forEach(nav=>nav.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...event.currentTarget.querySelectorAll('[data-wedding-tab]:not([hidden])')];
  const currentIndex = tabs.findIndex(button => button.getAttribute('aria-selected') === 'true');
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  if(!tabs.length)return;
  selectedWeddingTab = tabs[(currentIndex + direction + tabs.length) % tabs.length].dataset.weddingTab;
  if(event.currentTarget.id==='weddingPartyTabs')SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);
  render();
  const selected=event.currentTarget.querySelector(`[data-wedding-tab="${selectedWeddingTab}"]`);selected.focus();
  if(event.currentTarget.id==='weddingPartyTabs')document.getElementById(selected.getAttribute('aria-controls'))?.scrollIntoView({block:'start',behavior:'auto'});
}));
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
document.querySelector('#adminAddBrideGroomPage').addEventListener('click', () => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  commitBrideGroomPageEditors();
  state.brideGroomPages ||= [];
  const pageNumber = state.brideGroomPages.length + 1;
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
let rsvpChildPicker=ChildPicker.create([]),rsvpChildNone=false;
let rsvpGuestPicker=ChildPicker.create([]),rsvpGuestNone=false;
function readRsvpChildNames(){return ChildPicker.names(rsvpChildPicker);}
function readRsvpGuestNames(){return GatheringFeatures.rsvp(viewedEventId).guestCounter?ChildPicker.names(rsvpGuestPicker):[];}
function rsvpChoiceHtml(attribute,label,checked=false,disabled=false){
  return `<label class="rsvp-person-choice"><input type="checkbox" ${attribute} ${checked?'checked':''} ${disabled?'disabled':''}><span>${label}</span></label>`;
}
function rsvpCustomNamesHtml(picker,kind){
  const title=kind==='child'?'Additional Child’s Name':'Guest’s Name';
  return picker.custom.map((name,index)=>`<div class="rsvp-custom-person"><label class="rsvp-person-choice"><input type="checkbox" data-remove-rsvp-${kind}="${index}" checked><span>${title}</span></label><input data-rsvp-${kind}-name="${index}" aria-label="${title}" placeholder="Name" value="${escapeAttribute(name)}" required></div>`).join('');
}
function renderRsvpChildNames(){
  const count=readRsvpChildNames().length;
  document.querySelector('#children').value=count;
  const known=rsvpChildPicker.known.map((name,index)=>rsvpChoiceHtml(`data-rsvp-known-child="${index}"`,escapeHtml(name),rsvpChildPicker.selected.includes(name),!rsvpChildPicker.selected.includes(name)&&count>=20)).join('');
  document.querySelector('#rsvpChildNames').innerHTML=rsvpChoiceHtml('data-rsvp-no-children','No Children',rsvpChildNone)+known+rsvpCustomNamesHtml(rsvpChildPicker,'child')+rsvpChoiceHtml('data-rsvp-add-child','Another child',false,count>=20);
}
function renderRsvpGuests(){
  const names=readRsvpGuestNames();
  document.querySelector('#extraGuests').value=names.length;
  document.querySelector('#rsvpGuestsCounter').hidden=!GatheringFeatures.rsvp(viewedEventId).guestCounter;
  document.querySelector('#rsvpGuestNames').innerHTML=rsvpChoiceHtml('data-rsvp-no-guests','We aren’t bringing a guest',rsvpGuestNone)+rsvpCustomNamesHtml(rsvpGuestPicker,'guest')+rsvpChoiceHtml('data-rsvp-add-guest',names.length?'We’re bringing another guest':'Yes we’re bringing a guest',false,names.length>=20);
}
function refreshRsvpChildMeals(before,meals){
  rsvpMealDraft=ChildPicker.remapMeals(before,readRsvpChildNames(),meals);
  renderWeddingRsvpMenu(rsvpMealDraft);
}
document.querySelector('#rsvpChildNames').addEventListener('input',event=>{
  if(!event.target.matches('[data-rsvp-child-name]'))return;
  const meals=captureRsvpMeals();
  rsvpChildPicker.custom[Number(event.target.dataset.rsvpChildName)]=event.target.value;
  renderWeddingRsvpMenu(meals);
});
document.querySelector('#rsvpChildNames').addEventListener('change',event=>{
  const input=event.target;
  if(input.matches('[data-remove-rsvp-child]')){
    if(input.checked)return;
    const before=readRsvpChildNames(),meals=captureRsvpMeals();
    ChildPicker.remove(rsvpChildPicker,Number(input.dataset.removeRsvpChild));
    renderRsvpChildNames();refreshRsvpChildMeals(before,meals);
    document.querySelector('[data-rsvp-add-child]')?.focus({preventScroll:true});
    return;
  }
  if(!input.matches('[data-rsvp-no-children],[data-rsvp-known-child],[data-rsvp-add-child]'))return;
  const before=readRsvpChildNames(),meals=captureRsvpMeals();
  if(input.matches('[data-rsvp-no-children]')){rsvpChildNone=input.checked;if(input.checked)ChildPicker.clear(rsvpChildPicker);}
  else {
    rsvpChildNone=false;
    if(input.matches('[data-rsvp-add-child]'))ChildPicker.add(rsvpChildPicker);
    else ChildPicker.toggle(rsvpChildPicker,Number(input.dataset.rsvpKnownChild),input.checked);
  }
  renderRsvpChildNames();refreshRsvpChildMeals(before,meals);
  if(input.matches('[data-rsvp-add-child]'))document.querySelector(`[data-rsvp-child-name="${rsvpChildPicker.custom.length-1}"]`)?.focus();
  else document.querySelector(input.matches('[data-rsvp-no-children]')?'[data-rsvp-no-children]':`[data-rsvp-known-child="${input.dataset.rsvpKnownChild}"]`)?.focus({preventScroll:true});
});
document.querySelector('#rsvpGuestNames').addEventListener('input',event=>{
  if(event.target.matches('[data-rsvp-guest-name]'))rsvpGuestPicker.custom[Number(event.target.dataset.rsvpGuestName)]=event.target.value;
});
document.querySelector('#rsvpGuestNames').addEventListener('change',event=>{
  if(event.target.matches('[data-remove-rsvp-guest]')){
    if(event.target.checked)return;
    ChildPicker.remove(rsvpGuestPicker,Number(event.target.dataset.removeRsvpGuest));
    renderRsvpGuests();RsvpFlow.refresh();document.querySelector('[data-rsvp-add-guest]')?.focus({preventScroll:true});
    return;
  }
  if(event.target.matches('[data-rsvp-no-guests]')){rsvpGuestNone=event.target.checked;if(rsvpGuestNone)ChildPicker.clear(rsvpGuestPicker);}
  else if(event.target.matches('[data-rsvp-add-guest]')){rsvpGuestNone=false;ChildPicker.add(rsvpGuestPicker);}
  else return;
  renderRsvpGuests();RsvpFlow.refresh();
  if(event.target.matches('[data-rsvp-add-guest]'))document.querySelector(`[data-rsvp-guest-name="${rsvpGuestPicker.custom.length-1}"]`)?.focus();
  else document.querySelector('[data-rsvp-no-guests]')?.focus({preventScroll:true});
});
let rsvpMealDraft = [];
function captureRsvpMeals() {
  for (const selection of readWeddingMenuSelections()) {
    rsvpMealDraft = rsvpMealDraft.filter(saved => !(saved.type === selection.type && (selection.type === 'child' ? saved.index === selection.index : saved.name === selection.name)));
    rsvpMealDraft.push(selection);
  }
  return rsvpMealDraft;
}
function openRsvp({fromEntry=false,page=null}={}) {ensureAccount(() => {
  if(document.querySelector('#rsvpDialog').open)return;
  if(document.querySelector('#eventPage').hidden)showSignedInDestination();
  if(GatheringFeatures.forGathering(viewedEventId).weddingPages){
    selectedWeddingTab=page || (isHostView()?'couple':'media');selectedGuestTab='details';
    if(selectedWeddingTab==='party'){selectedMatronTab='duties';SiteEditing.resetTabSelection('matronInfoTabs',viewedEventId);}
    SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);
  }
  document.querySelector('#rsvpForm').dataset.fromEntry=String(fromEntry);
  document.querySelector('#rsvpForm').dataset.saved='false';
  document.querySelector('#rsvpForm').dataset.eventId = viewedEventId;
  document.querySelector('#rsvpForm').dataset.accountName = guestName;
  const existing = currentInvitationRsvp();
  document.querySelector('#rsvpForm').dataset.personName=signedInPersonName;
  document.querySelector('#rsvpForm').dataset.invitation=String(currentInvitationNumber());
  if (!rsvpNames().length) { showToast('Sign in with your own name to RSVP for your invitation.');return; }
  const groupHint=document.querySelector('#rsvpInvitationGroup');groupHint.hidden=GuestPlanning.invitationCount(rsvpAccount(),viewedEventId)<=1;groupHint.textContent=`Invitation #${currentInvitationNumber()} — RSVP for the people on your invitation.`;
  rsvpMealDraft = existing?.savedMenuSelections || existing?.menuSelections || [];
  applyRsvpDeadline();
  renderRsvpPeople(existing);
  rsvpChildPicker=ChildPicker.create(rsvpAccount()?.children || [],Array.from({length:existing?.children || 0},(_,index)=>existing?.childNames?.[index] || ''));
  rsvpChildNone=Boolean(existing)&&!readRsvpChildNames().length;
  const savedGuests=Array.from({length:existing?.extraGuests || 0},(_,index)=>existing?.extraGuestNames?.[index] || '');
  if(GatheringFeatures.rsvp(viewedEventId).guestCounter)(existing?.people || []).filter(person=>person.attending===true && person.guestChoice==='guest' && person.guestName?.trim()).forEach(person=>savedGuests.push(person.guestName));
  rsvpGuestPicker=ChildPicker.create([],GatheringFeatures.rsvp(viewedEventId).guestCounter?savedGuests:[]);
  rsvpGuestNone=Boolean(existing)&&!readRsvpGuestNames().length;
  renderRsvpGuests();
  rsvpMealDraft=ChildPicker.remapMeals(existing?.childNames || [],readRsvpChildNames(),rsvpMealDraft);
  renderRsvpChildNames();
  renderWeddingRsvpMenu(rsvpMealDraft);
  renderRsvpDishes();
  renderRsvpAttire();
  renderRsvpEventHeader();
  document.querySelector('#rsvpDialog').showModal();
  RsvpFlow.start({steps:rsvpFlowSteps,review:renderRsvpReview,validate:validateRsvpQuestion,finishOn:key=>key==='bringing-dish'&&document.querySelector('#rsvpBringingDish').value==='no',get editing(){return SiteEditing.enabled;},pageChanged:()=>{GapLayout.refresh();ElementAppearance.refreshControls();syncHostToolbar();}});
  // Render saved layout only after the RSVP flow has hidden inactive questions.
  render();
});}
// Every gathering uses these same two editable text slots and the same HTML layout.
function rsvpFirstPageTextFields() {
  const saved=state.siteText || {};
  return [
    ['#rsvpFirstPageText',state.rsvpIntroText ?? saved['#rsvpEventHeader>div:nth-of-type(1)>div:nth-of-type(1)>p:nth-of-type(1)'] ?? state.headerText ?? '','rsvpIntroText'],
    ['#rsvpFirstPageDetails',state.rsvpDetailsText ?? saved['#rsvpEventHeader>div:nth-of-type(1)>p:nth-of-type(1)'] ?? gatheringHeaderAddress(),'rsvpDetailsText']
  ];
}
function renderRsvpStatusIcon() {
  const button=document.querySelector('#rsvpConfirmEvent');
  const status=gatheringRsvpStatus(viewedEventId) || 'pending';
  const icons={pending:'M12 2a7 7 0 0 0-7 7h3a4 4 0 1 1 6 3.46C11.7 13.79 10.5 15.2 10.5 18h3c0-1.7.55-2.2 2-3.04A7 7 0 0 0 12 2Zm-1.5 18h3v3h-3v-3Z',attending:'M9 16 4 11l-2 2 7 7L22 7l-2-2L9 16Z',declined:'M5 3 3 5l7 7-7 7 2 2 7-7 7 7 2-2-7-7 7-7-2-2-7 7-7-7Z'};
  const description={pending:'Not yet responded',attending:'Attending',declined:'Not attending'}[status];
  button.dataset.rsvpStatus=status;button.setAttribute('aria-description',description);
  button.querySelector('svg path').setAttribute('d',icons[status]);
}
function renderRsvpEventHeader() {
  const section=document.querySelector('#rsvpEventConfirmation');
  section.hidden=false;
  document.querySelector('#rsvpConfirmEvent').disabled=false;
  renderRsvpStatusIcon();
  const banner=document.querySelector('#rsvpFirstPageImage');
  const source=state.rsvpHeaderImage ?? state.siteHeaderImage ?? EVENT_DETAILS[viewedEventId].header ?? '';
  banner.removeAttribute('src');banner.hidden=!source;
  if(source)banner.src=source;
  banner.addEventListener('error',()=>{banner.hidden=true;},{once:true});
  const date=document.querySelector('#rsvpFirstPageDate');
  date.dateTime=state.eventDate;
  date.textContent=document.querySelector('#eventDate').textContent;
  for(const [selector,value] of rsvpFirstPageTextFields()) {
    document.querySelector(selector).innerHTML=formatEditableText(value);
  }
  SiteEditing.applyStaticText(document.querySelector('#rsvpDialog'),state,(value,options)=>formatEditableText(value,options));
}
document.querySelector('#rsvpConfirmEvent').addEventListener('click',()=>document.querySelector('#rsvpForm').requestSubmit(document.querySelector('#rsvpNext')));
document.querySelector('#rsvpAttireAcknowledge').addEventListener('click',()=>document.querySelector('#rsvpForm').requestSubmit(document.querySelector('#rsvpNext')));
document.querySelector('#rsvpDialog').addEventListener('close',()=>{
  const form=document.querySelector('#rsvpForm');
  form.dataset.fromEntry='false';
  if(form.dataset.saved==='true' && GatheringFeatures.forGathering(viewedEventId).weddingPages){
    selectedWeddingTab='registry';
    SiteEditing.resetTabSelection('weddingPartyTabs',viewedEventId);
    showSignedInDestination();
    openRsvp({page:'registry'});
    document.querySelector('#registrySection').scrollIntoView({block:'start',behavior:'auto'});
    return;
  }
  if(!isHostView()){
    showEventSelection();
    return;
  }
  showEventSelection();
});
function renderRsvpAttire(){
  const section=document.querySelector('#rsvpAttire');section.hidden=viewedEventId!=='wedding' || SiteEditing.enabled;
  const columns=document.querySelector('#rsvpAttireColumns');columns.replaceChildren();
  if(section.hidden)return;
  const member=state.weddingPartyMembers?.find(member=>weddingPartyPersonMatches(member.name,signedInPersonName));
  if(member){renderWeddingPartyAttireImages(true);if(state.weddingPartyAttireIntro?.trim()){const intro=document.createElement('div');intro.className='rsvp-party-attire-intro';intro.innerHTML=formatEditableText(state.weddingPartyAttireIntro);columns.append(intro);}}
  document.querySelectorAll('#weddingAttireGuidance>article').forEach(source=>{
    if(member && !WeddingParty.attireSections(member.title).includes(source.dataset.attireGroup))return;
    const article=document.createElement('article');article.className='flow-panel';article.id=`rsvpAttire-${source.dataset.attireGroup}`;
    for(const selector of (member?['h4','.guest-attire-requirements','.wedding-party-attire-gallery']:['h4','.guest-attire-requirements'])){const original=source.querySelector(selector);if(original){const copy=original.cloneNode(true);copy.querySelectorAll('button,.inline-edit-control').forEach(node=>node.remove());copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));article.append(copy);}}
    columns.append(article);
  });
}
document.querySelectorAll('.stepper button').forEach(button => button.addEventListener('click', () => {
  const before=readRsvpChildNames(),meals=captureRsvpMeals();
  const output = document.querySelector(`#${button.dataset.target}`);
  output.value = Math.max(0, Math.min(20, Number(output.value) + Number(button.dataset.step)));
  renderRsvpChildNames();
  if(button.dataset.target==='children')refreshRsvpChildMeals(before,meals);
  else renderWeddingRsvpMenu(meals);
}));
function rsvpFlowSteps() {
  if(SiteEditing.enabled){
    const pages=[{key:'event-confirmation',element:document.querySelector('#rsvpEventConfirmation'),title:'Gathering page'}];
    const features=GatheringFeatures.rsvp(viewedEventId);
    document.querySelectorAll('[data-rsvp-person]').forEach((row,index)=>pages.push({key:`person-${index}`,element:row.querySelector('.rsvp-attendance-options'),title:row.dataset.rsvpPerson}));
    pages.push({key:'children',element:document.querySelector('#rsvpChildrenQuestion'),title:'Any children attending?'});
    if(features.guestCounter)pages.push({key:'guests',element:document.querySelector('#rsvpGuestsCounter'),title:'Any guests?'});
    if(features.meals){const element=document.querySelector('#weddingRsvpMenu');element.hidden=false;pages.push({key:'meal-options',element,title:'Meal options'});}
    if(features.contributions)pages.push({key:'bringing-dish',element:document.querySelector('#rsvpDishQuestion'),title:'Will you be bringing a dish?'});
    return pages;
  }
  const steps=[];
  const add=(key,element,title)=>{if(element)steps.push({key,element,title});};
  if(!SiteEditing.enabled)add('event-confirmation',document.querySelector('#rsvpEventConfirmation'),'Confirm your gathering');
  if(viewedEventId==='wedding' && !SiteEditing.enabled)add('attire',document.querySelector('#rsvpAttire'),'Formal Attire Required');
  document.querySelectorAll('[data-rsvp-person]').forEach((row,index)=>{
    add(`person-${index}`,row.querySelector('.rsvp-attendance-options'),row.dataset.rsvpPerson);
    if(rsvpAttendanceValue(row)==='yes' && !rsvpOptionsLocked()) {
      const choice=row.querySelector('[data-person-guest]');
      if(choice){add(`guest-${index}`,choice.closest('label'),'Bringing a guest?');if(choice.value==='guest')add(`guest-name-${index}`,row.querySelector('[data-person-guest-name]'),'Your guest’s name');}
    }
  });
  add('children',document.querySelector('#rsvpChildrenQuestion'),'Any children attending?');
  if(GatheringFeatures.rsvp(viewedEventId).guestCounter)add('guests',document.querySelector('#rsvpGuestsCounter'),'Any guests?');
  if(GatheringFeatures.rsvp(viewedEventId).meals && !rsvpOptionsLocked())document.querySelectorAll('.wedding-rsvp-guest:not([data-edit-meal-preview])').forEach(card=>{
    const id=`${card.dataset.guestType}-${card.dataset.guestIndex}`;
    const name=card.dataset.rsvpDisplayName || card.querySelector('[data-rsvp-guest-name]').value;
    add(`meal-${id}`,card.querySelector('.wedding-meal-options'),`Choose ${name}'s meal`);
    add(`dietary-${id}`,card.querySelector('[data-rsvp-dietary]').closest('label'),`${name}'s dietary needs`);
  });
  if(rsvpDishesEnabled()){
    add('bringing-dish',document.querySelector('#rsvpDishQuestion'),'Will you be bringing a dish?');
    if(document.querySelector('#rsvpBringingDish').value==='yes'){
      add('dishes',document.querySelector('#rsvpDishOptions'),'What will you bring?');
      if(document.querySelector('#rsvpCustomDish').checked){
        add('custom-dish-name',document.querySelector('#rsvpCustomDishNameQuestion'),'Your dish');
        add('custom-dish-quantity',document.querySelector('#rsvpCustomDishQuantityQuestion'),'Dish quantity');
        add('custom-dish-category',document.querySelector('#rsvpCustomDishCategoryQuestion'),'Dish category');
      }
    }
  }
  return steps;
}
function rsvpDishesEnabled(){return GatheringFeatures.rsvp(viewedEventId).contributions && !SiteEditing.enabled && !rsvpOptionsLocked();}
function renderRsvpDishes(){
  const enabled=rsvpDishesEnabled();
  document.querySelectorAll('[data-rsvp-question]').forEach(section=>{section.hidden=!(enabled || (section.id==='rsvpDishQuestion' && SiteEditing.enabled && GatheringFeatures.rsvp(viewedEventId).contributions));section.querySelectorAll('input,select').forEach(input=>{input.disabled=!enabled;input.required=false;input.setCustomValidity('');});});
  document.querySelectorAll('[data-rsvp-dish-answer]').forEach(button=>{button.disabled=SiteEditing.enabled;});
  const choice=document.querySelector('#rsvpBringingDish');
  choice.value=state.items.some(item=>item.claims.includes(guestName))?'yes':'';
  const categories=[...new Set(state.items.map(item=>item.category))];
  const anythingElse=document.querySelector('#rsvpAnythingElse');
  const choices=document.querySelector('#rsvpDishChoices');
  choices.innerHTML=enabled?categories.map(category=>{
    const items=state.items.filter(item=>item.category===category).flatMap(item=>{
      const saved=item.claims.filter(name=>name===guestName).length;
      const available=Math.max(0,item.needed-item.claims.filter(name=>name!==guestName).length);
      const claimedByOthers=!available&&!saved;
      const limit=Math.max(available,saved);
      const quantity=limit>1?`<label class="rsvp-dish-quantity" ${saved?'':'hidden'}><span>How many?</span><select data-rsvp-dish-quantity aria-label="Quantity of ${escapeAttribute(item.name)}" ${saved?'required':''}><option value="">Choose</option>${Array.from({length:limit},(_,index)=>{const quantity=index+1;return `<option value="${quantity}" ${quantity===saved?'selected':''}>${escapeHtml(formatQuantity(quantity,item))}</option>`;}).join('')}</select></label>`:'<input type="hidden" data-rsvp-dish-quantity value="1">';
      return [`<div class="rsvp-dish-option${claimedByOthers?' rsvp-dish-covered':''}"><label class="rsvp-dish-choice"><input type="checkbox" data-rsvp-dish="${escapeAttribute(item.id)}" ${saved||claimedByOthers?'checked':''} ${claimedByOthers?'disabled':''}><span>${escapeHtml(item.name)}<small>${available?`${formatQuantity(available,item)} available`:'Already claimed'}</small></span></label>${quantity}</div>`];
    }).join('');return items?`<section class="rsvp-dish-category" data-rsvp-dish-category="${escapeAttribute(category)}"><h4>${escapeHtml(category)}</h4><div class="rsvp-dish-grid">${items}</div></section>`:'';
  }).join(''):'';
  if(enabled&&!document.querySelector('#rsvpDishChoices').textContent.trim())document.querySelector('#rsvpDishChoices').textContent='The listed dishes are covered. You can bring something else or go back and choose No.';
  const drinks=[...choices.querySelectorAll('[data-rsvp-dish-category]')].find(section=>section.dataset.rsvpDishCategory.toLowerCase()==='drinks');
  if(drinks)drinks.after(anythingElse);else choices.append(anythingElse);
  document.querySelector('#rsvpCustomDish').checked=false;document.querySelector('#rsvpCustomDishName').value='';document.querySelector('#rsvpCustomDishQuantity').value=1;
  document.querySelector('#rsvpCustomDishUnit').innerHTML=unitOptions();
  document.querySelector('#rsvpCustomDishCategory').innerHTML=[...new Set([...categories,'Appetizers','Main Table','Sides','Desserts','Drinks'])].map(category=>`<option>${escapeHtml(category)}</option>`).join('');
}
function rsvpDishDraft(){
  if(!rsvpDishesEnabled())return null;
  const yes=document.querySelector('#rsvpBringingDish').value==='yes';
  const quantities=new Map([...document.querySelectorAll('[data-rsvp-dish]')].map(input=>[input.dataset.rsvpDish,yes&&input.checked&&!input.disabled?Number(input.closest('.rsvp-dish-option').querySelector('[data-rsvp-dish-quantity]').value):0]));
  const custom=yes&&document.querySelector('#rsvpCustomDish').checked?{name:document.querySelector('#rsvpCustomDishName').value.trim(),quantity:Number(document.querySelector('#rsvpCustomDishQuantity').value),unit:document.querySelector('#rsvpCustomDishUnit').value,category:document.querySelector('#rsvpCustomDishCategory').value}:null;
  return {quantities,custom};
}
function validateRsvpQuestion(key){
  for(const [step,selector,none,names] of [['children','[data-rsvp-no-children]',rsvpChildNone,readRsvpChildNames()],['guests','[data-rsvp-no-guests]',rsvpGuestNone,readRsvpGuestNames()]]){
    if(step==='guests'&&!GatheringFeatures.rsvp(viewedEventId).guestCounter)continue;
    const choice=document.querySelector(selector);
    choice?.setCustomValidity('');
    if((key===step||key==='review')&&!none&&!names.length){choice?.setCustomValidity(step==='children'?'Choose No Children or select the children attending.':'Choose whether you are bringing a guest.');return key==='review'?step:false;}
  }
  const custom=rsvpDishesEnabled()&&document.querySelector('#rsvpBringingDish').value==='yes'&&document.querySelector('#rsvpCustomDish').checked;
  document.querySelector('#rsvpCustomDishName').required=custom;
  document.querySelector('#rsvpCustomDishName').setCustomValidity(custom&&!document.querySelector('#rsvpCustomDishName').value.trim()?'Enter a dish name.':'');
  document.querySelector('#rsvpCustomDishQuantity').required=custom;
  const draft=rsvpDishDraft();
  const choice=document.querySelector('#rsvpCustomDish');choice.setCustomValidity('');
  if((key==='dishes'||key==='review')&&draft&&document.querySelector('#rsvpBringingDish').value==='yes'&&!draft.custom&&!document.querySelector('[data-rsvp-dish]:checked:not(:disabled)')){choice.setCustomValidity('Choose a dish or select “I’ll bring something else”.');return key==='review'?'dishes':false;}
  return true;
}
function applyRsvpDishes(draft){
  if(!draft)return true;
  for(const [id,quantity] of draft.quantities){const item=state.items.find(item=>item.id===id);if(quantity>0&&(!item||!Number.isInteger(quantity)||quantity>Math.max(0,item.needed-item.claims.filter(name=>name!==guestName).length)))return false;}
  for(const item of state.items){const quantity=draft.quantities.get(item.id)||0;item.claims=[...item.claims.filter(name=>name!==guestName),...Array(quantity).fill(guestName)];}
  if(draft.custom){const item=draft.custom;state.items.push({id:`custom-${crypto.randomUUID()}`,name:item.name,category:item.category,needed:item.quantity,unit:item.unit,claims:Array(item.quantity).fill(guestName)});}
  return true;
}
document.querySelector('#rsvpDishChoices').addEventListener('change',event=>{
  if(event.target.matches('[data-rsvp-dish]')){
    const option=event.target.closest('.rsvp-dish-option');
    const question=option.querySelector('.rsvp-dish-quantity');
    if(question){question.hidden=!event.target.checked;question.querySelector('select').required=event.target.checked;}
  }
  validateRsvpQuestion('');
});
document.querySelector('#rsvpCustomDish').addEventListener('change',()=>{validateRsvpQuestion('');RsvpFlow.refresh();});
document.querySelectorAll('[data-rsvp-dish-answer]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('#rsvpBringingDish').value=button.dataset.rsvpDishAnswer;
  validateRsvpQuestion('');
  RsvpFlow.refresh();
  document.querySelector('#rsvpForm').requestSubmit(document.querySelector('#rsvpNext'));
}));
function renderRsvpReview(container) {
  container.replaceChildren();
  const title=document.createElement('h3');title.textContent='Review your RSVP';container.append(title);
  const line=(label,value)=>{const row=document.createElement('p'),name=document.createElement('strong');name.textContent=`${label}: `;row.append(name,document.createTextNode(value));container.append(row);};
  readRsvpPeople().forEach(person=>{
    line(person.name,person.attending?'Accepts with pleasure':person.attending===false?'Declines with regret':'Choose attendance');
    if(person.attending && person.guestChoice==='guest' && person.guestName)line('Guest',person.guestName);
  });
  if(GatheringFeatures.rsvp(viewedEventId).childNames && !isHostView())readRsvpChildNames().filter(Boolean).forEach(name=>line(name,'Accepts with pleasure'));
  else {line('Children',String(document.querySelector('#children').value));readRsvpChildNames().filter(Boolean).forEach((name,index)=>line(`Child ${index+1}`,name));}
  if(GatheringFeatures.rsvp(viewedEventId).guestCounter){line('Guests',String(readRsvpGuestNames().length));readRsvpGuestNames().filter(Boolean).forEach(name=>line(name,'Accepts with pleasure'));}
  if(GatheringFeatures.rsvp(viewedEventId).contributions){
    const draft=rsvpDishDraft();
    const dishes=draft?[...draft.quantities].flatMap(([id,quantity])=>{const item=state.items.find(item=>item.id===id);return quantity&&item?[`${item.name} (${formatQuantity(quantity,item)})`]:[];}):state.items.flatMap(item=>{const quantity=item.claims.filter(name=>name===guestName).length;return quantity?[`${item.name} (${formatQuantity(quantity,item)})`]:[];});
    if(draft?.custom)dishes.push(`${draft.custom.name} (${draft.custom.quantity})`);
    line('Bringing',dishes.join(', ')||'No dish');
  }
  if(GatheringFeatures.rsvp(viewedEventId).meals)readWeddingMenuSelections().forEach(selection=>{
    const name=selection.type==='child'&&!isHostView()?readRsvpChildNames()[selection.index] || selection.name:selection.name;
    line(name,selection.meal==='none'?'My child is too young':selection.meal || 'No meal selected');
    if(selection.dietaryRestrictions)line('Dietary restrictions',selection.dietaryRestrictions);
  });
}
function rsvpOptionsLocked() { return !isHostView() && GuestPlanning.rsvpClosed(state); }
function applyRsvpDeadline() {
  const locked = rsvpOptionsLocked();
  const notice = document.querySelector('#rsvpDeadlineNotice');
  const changed=notice.hidden!==!locked;
  notice.hidden = !locked;
  notice.textContent = GatheringFeatures.rsvp(viewedEventId).namedGuests?'The RSVP deadline has passed. You can still change who is attending and the number of children attending. Guest names, meals, and dietary notes are locked. Contact the hosts for other changes.':'The RSVP deadline has passed. You can still change who is attending and the number of children and guests attending.';
  document.querySelectorAll('#rsvpForm [data-person-guest], #rsvpForm [data-person-guest-name], #rsvpForm [data-rsvp-meal], #rsvpForm [data-rsvp-dietary]').forEach(input => { input.disabled=locked; });
  document.querySelectorAll('[data-rsvp-question] input,[data-rsvp-question] select').forEach(input=>{input.disabled=locked || !GatheringFeatures.rsvp(viewedEventId).contributions || SiteEditing.enabled;});
  if(changed)RsvpFlow.refresh();
}
setInterval(() => { if (document.querySelector('#rsvpDialog').open) applyRsvpDeadline(); }, 1000);
function rsvpAccount() { return findAccount(guestName); }
function currentInvitationNumber() { return InvitationGroups.number(rsvpAccount(),viewedEventId,signedInPersonName); }
function rsvpNames() {
  const account=rsvpAccount();
  return account ? InvitationGroups.members(account,viewedEventId,accountSignInNames(account.name),signedInPersonName) : [guestName];
}
function currentInvitationRsvp() {
  const existing=state.rsvps.find(rsvp=>rsvp.name===guestName),account=rsvpAccount();
  return account ? InvitationGroups.response(account,viewedEventId,accountSignInNames(account.name),currentInvitationNumber(),existing) : existing;
}
function rsvpAttendanceValue(row) {return row.querySelector('[data-person-attending]:checked')?.value || '';}
function readRsvpPeople() {
  return [...document.querySelectorAll('[data-rsvp-person]')].map(row => ({
    name: row.dataset.rsvpPerson,
    attending: rsvpAttendanceValue(row) === '' ? null : rsvpAttendanceValue(row) === 'yes',
    guestChoice: row.querySelector('[data-person-guest]') ? row.querySelector('[data-person-guest]').value : 'no-guest',
    guestName: rsvpAttendanceValue(row) === 'yes' && row.querySelector('[data-person-guest]')?.value === 'guest' ? row.querySelector('[data-person-guest-name]').value.trim() : ''
  }));
}
function updateRsvpPeople() {
  document.querySelectorAll('[data-rsvp-person]').forEach(row => {
    const attendance=[...row.querySelectorAll('[data-person-attending]')];
    attendance[0].setCustomValidity(attendance.some(input=>input.checked)?'':'Choose attendance.');
    const attending = rsvpAttendanceValue(row) === 'yes';
    const fields = row.querySelector('.rsvp-guest-fields');
    if (!fields) return;
    fields.hidden = !attending;
    const choice = fields.querySelector('[data-person-guest]'); choice.required = attending;
    const name = fields.querySelector('[data-person-guest-name]');
    name.hidden = !attending || choice.value !== 'guest'; name.required = attending && choice.value === 'guest';
  });
  document.querySelector('#adults').value = GuestPlanning.attendees(readRsvpPeople()).length;
  applyRsvpDeadline();
}
function renderRsvpPeople(existing) {
  const account = rsvpAccount();
  const names = rsvpNames();
  const allowed = GatheringFeatures.rsvp(viewedEventId).namedGuests?GuestPlanning.plusOnePeople(account,viewedEventId,names):[];
  document.querySelector('#rsvpPeople').innerHTML = names.map(name => {
    const saved = existing?.people?.find(person => normalizeAccountName(person.name) === normalizeAccountName(name));
    const attending = saved?.attending === true ? 'yes' : saved?.attending === false ? 'no' : '';
    const guest = allowed.includes(name) ? `<div class="rsvp-guest-fields" hidden><label><span>Guest for ${escapeHtml(name)}</span><select data-person-guest><option value="">Choose a guest option</option><option value="no-guest" ${saved?.guestChoice === 'no-guest' ? 'selected' : ''}>NO GUEST</option><option value="guest" ${saved?.guestChoice === 'guest' ? 'selected' : ''}>Bringing a guest</option></select></label><input data-person-guest-name aria-label="Guest name for ${escapeAttribute(name)}" value="${escapeAttribute(saved?.guestName || '')}" placeholder="Guest’s full name" hidden></div>` : '';
    return `<fieldset class="rsvp-person" data-rsvp-person="${escapeAttribute(name)}"><legend>${escapeHtml(name)}</legend><div class="rsvp-attendance-options" role="group" aria-label="Attendance for ${escapeAttribute(name)}"><label class="rsvp-attendance-choice"><input type="checkbox" data-person-attending value="yes" ${attending==='yes'?'checked':''}><span>Accepts with pleasure.</span></label><label class="rsvp-attendance-choice"><input type="checkbox" data-person-attending value="no" ${attending==='no'?'checked':''}><span>Declines with regret.</span></label></div>${guest}</fieldset>`;
  }).join('');
  updateRsvpPeople();
}
document.querySelector('#rsvpPeople').addEventListener('change', event => {
  if(event.target.matches('[data-person-attending]') && event.target.checked)event.target.closest('[data-rsvp-person]').querySelectorAll('[data-person-attending]').forEach(input=>{if(input!==event.target)input.checked=false;});
  const selections = captureRsvpMeals(); updateRsvpPeople(); renderWeddingRsvpMenu(selections);
});
document.querySelector('#rsvpPeople').addEventListener('input', event => {
  if (!event.target.matches('[data-person-guest-name]')) return;
  const selections = captureRsvpMeals(); updateRsvpPeople(); renderWeddingRsvpMenu(selections);
});
function readWeddingMenuSelections() {
  return [...document.querySelectorAll('.wedding-rsvp-guest:not([data-edit-meal-preview])')].map(card => ({
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
  const hasMeals=GatheringFeatures.rsvp(viewedEventId).meals;
  section.hidden=!hasMeals;
  if(!hasMeals){document.querySelector('#weddingRsvpGuests').replaceChildren();RsvpFlow.refresh();return;}
  const counts = { adult: Number(document.querySelector('#adults').value), child: Number(document.querySelector('#children').value) };
  const cards = ['adult', 'child'].flatMap(type => Array.from({ length: counts[type] }, (_, index) => {
    const personName = type === 'adult' ? GuestPlanning.attendees(readRsvpPeople())[index] : GuestPlanning.childLabel(index,readRsvpChildNames()[index]);
    const displayName=type==='child'&&!isHostView()?readRsvpChildNames()[index] || personName:personName;
    const saved = selections.find(selection => selection.type === type && selection.name === personName) || selections.find(selection => selection.type === type && Number(selection.index) === index && (type === 'child' || !selection.name)) || {};
    const mealOptions = GuestPlanning.weddingMealOptions(state,type);
    const radioName = `wedding-meal-${type}-${index}`;
    const radios = mealOptions.map(meal => `<label class="wedding-meal-choice"><input type="radio" data-rsvp-meal name="${radioName}" value="${escapeAttribute(meal)}" ${saved.meal === meal ? 'checked' : ''} required><span>${escapeHtml(meal)}</span></label>`).join('');
    const none = type === 'child' ? `<label class="wedding-meal-choice"><input type="radio" data-rsvp-meal name="${radioName}" value="none" ${saved.meal === 'none' ? 'checked' : ''} required><span>My child is too young</span></label>` : '';
    return `<fieldset class="wedding-rsvp-guest" data-guest-type="${type}" data-guest-index="${index}" data-rsvp-display-name="${escapeAttribute(displayName)}"><legend>${escapeHtml(displayName)}</legend><input type="hidden" data-rsvp-guest-name value="${escapeAttribute(personName)}"><input type="hidden" data-rsvp-custom-name value=""><div class="wedding-meal-options">${radios}${none || (!mealOptions.length ? '<p class="form-error">Meal options have not been added yet.</p>' : '')}</div><label><span>Please note any dietary restrictions or food allergies.</span><textarea data-rsvp-dietary maxlength="500" placeholder="Optional">${escapeHtml(saved.dietaryRestrictions || '')}</textarea></label></fieldset>`;
  }));
  if(SiteEditing.enabled && !cards.length)cards.push(`<fieldset class="wedding-rsvp-guest" data-edit-meal-preview><legend>Meal options</legend><div class="wedding-meal-options">${GuestPlanning.weddingMeals(state).map(meal=>`<label class="wedding-meal-choice"><span>${escapeHtml(meal.name)}</span></label>`).join('')}</div></fieldset>`);
  document.querySelector('#weddingRsvpGuests').innerHTML = cards.join('');
  applyRsvpDeadline();
  document.querySelectorAll('.event-dock').forEach(toolbar=>SiteEditing.field(toolbar,'toolbar',[],()=>{}));
  renderRsvpInlineEditing();
  RsvpFlow.refresh();
}
document.querySelector('#rsvpForm').addEventListener('submit', event => {
  if (event.submitter?.value === 'cancel') return;
  const form = document.querySelector('#rsvpForm');
  if (form.dataset.eventId !== viewedEventId || form.dataset.accountName !== guestName || form.dataset.personName !== signedInPersonName || form.dataset.invitation !== String(currentInvitationNumber())) { event.preventDefault(); form.closest('dialog').close(); showToast('Please reopen RSVP for the current account and gathering.'); return; }
  if(!RsvpFlow.submit(event)){event.preventDefault();return;}
  updateRsvpPeople();
  const people = readRsvpPeople();
  if(people.some(person=>person.attending!==true && person.attending!==false)){event.preventDefault();showToast('Please choose attendance for each person.');return;}
  const childNames=readRsvpChildNames();
  if(childNames.some(name=>!name)){event.preventDefault();showToast('Please enter a name for each child.');return;}
  const names=rsvpNames();
  if (!names.length || people.length!==names.length || new Set(people.map(person=>person.name)).size!==names.length || people.some(person=>!names.includes(person.name))) { event.preventDefault();showToast('Your invitation has changed. Please reopen RSVP.');return; }
  const allowed = GuestPlanning.plusOnePeople(rsvpAccount(),viewedEventId,people.map(person=>person.name));
  if (GatheringFeatures.rsvp(viewedEventId).namedGuests && !rsvpOptionsLocked() && people.some(person=>person.attending && allowed.includes(person.name) && (!person.guestChoice || (person.guestChoice === 'guest' && !person.guestName)))) { event.preventDefault(); showToast('Enter each guest’s name or choose NO GUEST.'); return; }
  const menuSelections = GatheringFeatures.rsvp(viewedEventId).meals ? readWeddingMenuSelections() : [];
  const extraGuestNames=readRsvpGuestNames();
  if(extraGuestNames.some(name=>!name)){event.preventDefault();showToast('Please enter a name for each guest.');return;}
  const extraGuests=extraGuestNames.length;
  let rsvp = { name: guestName, people, childNames, extraGuests, extraGuestNames, adults: Number(document.querySelector('#adults').value)+extraGuests, children: Number(document.querySelector('#children').value), ...(GatheringFeatures.rsvp(viewedEventId).meals ? { menuSelections } : {}) };
  const index = state.rsvps.findIndex(entry => entry.name === guestName);
  if (GatheringFeatures.rsvp(viewedEventId).namedGuests && rsvpOptionsLocked()) rsvp = GuestPlanning.lockedRsvp(currentInvitationRsvp(), rsvp);
  const account=rsvpAccount();
  if(account)rsvp=InvitationGroups.merge(account,viewedEventId,accountSignInNames(account.name),currentInvitationNumber(),state.rsvps[index],rsvp);
  if(!applyRsvpDishes(rsvpDishDraft())){event.preventDefault();showToast('A dish is no longer available. Please reopen RSVP and choose again.');return;}
  if (index >= 0) state.rsvps[index] = rsvp; else state.rsvps.push(rsvp);
  form.dataset.saved='true';
  saveState({refresh:true}); showToast('Your RSVP has been saved.');
});
const editorInputSaveTimers = new WeakMap();
function commitPendingEditorControl(control) {
  clearTimeout(editorInputSaveTimers.get(control));
  editorInputSaveTimers.delete(control);
  if (!control.isConnected || !control.hasAttribute('data-editor-dirty')) return;
  control.removeAttribute('data-editor-dirty');
  control.dispatchEvent(new Event('change', { bubbles: true }));
}
function commitPendingEditorInputs(form) {
  // Extra Bride & Groom pages are rendered dynamically. Capture the complete
  // title/content pair before committing individual controls because saving a
  // title rebuilds the page editors and can otherwise replace an unsaved
  // textarea before Done finishes processing the form.
  if (form.querySelector('#adminWeddingPartyMembers [data-editor-dirty]')) commitWeddingPartyEditors();
  if (form.querySelector('#adminBrideGroomPages [data-editor-dirty]')) commitBrideGroomPageEditors();
  const dirtyControls = [...form.querySelectorAll('[data-editor-dirty]')];
  dirtyControls.forEach(control => {
    commitPendingEditorControl(control);
  });
}
function commitAllPendingEditorInputs() {
  SiteEditing.flush();
  document.querySelectorAll('.editor-dialog form,.inline-portal-editor').forEach(commitPendingEditorInputs);
}
// Inline editors reuse the original controls outside their dialog form.
// Delegate once so their debounced saves keep working after reparenting.
document.addEventListener('input', event => {
  if (!event.target.closest('.editor-dialog form,.inline-portal-editor') || !event.target.matches('input:not([type="file"]), select, textarea')) return;
  event.target.dataset.editorDirty = 'true';
  clearTimeout(editorInputSaveTimers.get(event.target));
  editorInputSaveTimers.set(event.target, setTimeout(() => commitPendingEditorControl(event.target), 300));
});
document.addEventListener('change', event => {
  if (!event.target.closest('.editor-dialog form,.inline-portal-editor')) return;
  clearTimeout(editorInputSaveTimers.get(event.target));
  editorInputSaveTimers.delete(event.target);
  delete event.target.dataset.editorDirty;
});
document.querySelectorAll('.editor-dialog form').forEach(form => {
  // Closing with Done, the X button, or Escape all means the host is finished
  // editing. Always flush the current value; the old cancel branch silently
  // discarded keystrokes made within the debounce window.
  form.addEventListener('submit', () => commitPendingEditorInputs(form));
  form.closest('dialog').addEventListener('cancel', () => commitPendingEditorInputs(form));
  form.closest('dialog').addEventListener('close', () => commitPendingEditorInputs(form));
});
function invitationGroupTitle(group) {
  return [...new Set(group.names.map(name=>firstAccountLastName(name)))].join(' / ');
}
function invitationAttendanceRsvps() {
  return GuestPlanning.guestResponses(state.rsvps).flatMap(rsvp=>{
    const account=appState.accounts.find(account=>account.name===rsvp.name);
    if(!account)return [{...rsvp,invitationTitle:rsvp.name}];
    return InvitationGroups.groups(account,viewedEventId,accountSignInNames(account.name),rsvp).map(group=>({...group.rsvp,invitationTitle:invitationGroupTitle(group)}));
  });
}
function peopleTotalsLabel({adults,children,households}) {
  return `${households} household${households===1?'':'s'} · ${adults} adult${adults===1?'':'s'} · ${children} child${children===1?'':'ren'} total`;
}
function accountPeopleTotals(accounts) {
  return accounts.reduce((sum,account)=>({adults:sum.adults+invitedAdultCount(account),children:sum.children+(account.children || []).length,households:sum.households+1}),{adults:0,children:0,households:0});
}
function declinedChildren(rsvp) {
  const account=appState.accounts.find(account=>account.name===rsvp.name);
  const names=account ? accountSignInNames(account.name) : [];
  return names.length && names.every(name=>rsvp.people?.some(person=>person.name===name && person.attending===false))
    ? (account.children || []).length : 0;
}
function attendanceSummaryCounts() {
  const invited=accountPeopleTotals(appState.accounts.filter(account=>accountIsInvited(account,viewedEventId)));
  const noResponse=accountPeopleTotals(noResponseAccounts());
  const responses=GuestPlanning.guestResponses(state.rsvps);
  const totals=GuestPlanning.rsvpTotals(responses);
  const groups=GuestPlanning.attendanceGroups(responses);
  const notAttending={adults:groups.notAttending.length,children:responses.reduce((sum,rsvp)=>sum+declinedChildren(rsvp),0),households:new Set(groups.notAttending.map(person=>person.household)).size};
  return {attending:{adults:totals.adults,children:totals.children,households:new Set(groups.attending.map(rsvp=>rsvp.name)).size},notAttending,noResponse,invited};
}
function attendanceEntryHtml(title,adults,children,rows) {
  return invitationEntryHtml({title,adults,children,names:[]},{headings:rows});
}
function renderPeopleSection(listId,totalId,totals,html) {
  const total=document.getElementById(totalId);
  total.classList.add('invited-people-total');
  total.textContent=peopleTotalsLabel(totals);
  document.getElementById(listId).innerHTML=html;
}
function noResponseAccounts() {
  const responded = new Set(state.rsvps.filter(rsvp => !rsvp.people?.length || rsvp.people.some(person => person.attending === true || person.attending === false)).map(rsvp => rsvp.name));
  return appState.accounts.filter(account => account.name !== HOST_DISPLAY_NAME && accountIsInvited(account, viewedEventId) && !responded.has(account.name))
    .sort((left, right) => left.name.localeCompare(right.name));
}
function renderNoResponseAccounts() {
  if (!isHostView()) return;
  const accounts = noResponseAccounts();
  renderPeopleSection('noResponseList','noResponseTotal',accountPeopleTotals(accounts), accounts.length
    ? accounts.flatMap(account=>invitedInvitationGroups(account).map(group=>invitationEntryHtml(group))).join('')
    : '<p class="guest-empty">All invited accounts have responded.</p>');
}
document.querySelector('#noResponseButton').addEventListener('click', () => {
  if (!isHostView()) return;
  renderNoResponseAccounts();
  showSiteDialog(document.querySelector('#noResponseDialog'));
});
function renderGuestAttendance() {
  if (!hostAuthenticated) return;
  const totals = GuestPlanning.rsvpTotals(state.rsvps, GatheringFeatures.rsvp(viewedEventId).meals?GuestPlanning.weddingMealOptions(state):[]);
  const meals = [...totals.meals,...(totals.noMeal ? [['No meal',totals.noMeal]] : []),...(totals.unselected ? [['No meal selected',totals.unselected]] : [])];
  document.querySelector('#guestListMealTotals').innerHTML=GatheringFeatures.rsvp(viewedEventId).meals?`<dl class="meal-totals">${meals.map(([label,count])=>`<div><dt>${escapeHtml(label)}</dt><dd>${count}</dd></div>`).join('')}</dl>`:'';
  const groupedRsvps=invitationAttendanceRsvps();
  const { attending: attendingRsvps } = GuestPlanning.attendanceGroups(groupedRsvps);
  renderPeopleSection('guestList','guestListTotals',attendanceSummaryCounts().attending,attendingRsvps.length ? hostFirstRsvps(attendingRsvps).map(rsvp => {
    const wedding=GatheringFeatures.rsvp(viewedEventId).meals;
    const adultNames=GuestPlanning.attendees(rsvp.people || []);
    if(!adultNames.length && !rsvp.people?.length && rsvp.adults>0){
      const account=appState.accounts.find(account=>account.name===rsvp.name);
      if(account)adultNames.push(...accountSignInNames(account.name));
    }
    const childNames=GuestPlanning.childLabels(rsvp);
    const selections=rsvp.menuSelections || [];
    const selectionName=selection=>selection.name==='someone-else'?selection.customName:selection.name || `${selection.type} ${selection.index+1}`;
    const legacyNames=!rsvp.people?.length ? selections.map(selectionName) : [];
    const names=[...new Set([...adultNames,...(rsvp.extraGuestNames || []),...childNames,...legacyNames])];
    const rows=names.map(name=>{
      const selection=selections.find(selection=>normalizeAccountName(selectionName(selection))===normalizeAccountName(name));
      return `<div>${escapeHtml(name)}${wedding?`: ${escapeHtml(selection?.meal==='none'?'No meal':selection?.meal || 'No meal selected')}`:''}${selection?.dietaryRestrictions?`<small>Dietary restrictions / allergies: ${escapeHtml(selection.dietaryRestrictions)}</small>`:''}</div>`;
    }).join('');
    return attendanceEntryHtml(rsvp.invitationTitle,rsvp.adults,rsvp.children,rows);
  }).join('') : '<p class="guest-empty">No guests are attending yet.</p>');
  const declined=groupedRsvps.map(rsvp=>({rsvp,people:GuestPlanning.attendanceGroups([rsvp]).notAttending})).filter(group=>group.people.length);
  const childHouseholds=new Set();
  renderPeopleSection('notAttendingList','notAttendingTotal',attendanceSummaryCounts().notAttending,declined.length ? declined.map(({rsvp,people})=>{
    const household=state.rsvps.find(saved=>saved.name===rsvp.name);
    const children=childHouseholds.has(rsvp.name)?0:declinedChildren(household || rsvp);
    childHouseholds.add(rsvp.name);
    const childNames=children?(appState.accounts.find(account=>account.name===rsvp.name)?.children || []):[];
    const rows=[...people.map(person=>person.name),...childNames].map(name=>`<div>${escapeHtml(name)}</div>`).join('');
    return attendanceEntryHtml(rsvp.invitationTitle,people.length,children,rows);
  }).join('') : '<p class="guest-empty">No declined RSVPs yet.</p>');
}
document.querySelector('#remainingSummary').addEventListener('click',()=>{
  if(!isHostView() || !GatheringFeatures.forGathering(viewedEventId).menu)return;
  commitAllPendingEditorInputs();showSiteDialog(document.querySelector('#dishListDialog'));
});
document.querySelector('#closeDishListButton').addEventListener('click',()=>document.querySelector('#dishListDialog').close());
document.querySelector('#guestListButton').addEventListener('click', () => {
  if (!isHostView()) return;
  renderGuestAttendance();
  showSiteDialog(document.querySelector('#guestListDialog'));
});
document.querySelector('#notAttendingButton').addEventListener('click', () => {
  if (!isHostView()) return;
  renderGuestAttendance(); showSiteDialog(document.querySelector('#notAttendingDialog'));
});
document.querySelector('#invitedListButton').addEventListener('click', () => {
  if (!isHostView()) return;
  const invitedAccounts = appState.accounts
    .filter(account => accountIsInvited(account, viewedEventId))
    .sort((left, right) => left.name.localeCompare(right.name));
  const totals = invitedAccounts.reduce((sum, account) => ({
    households: sum.households + 1,
    adults: sum.adults + invitedAdultCount(account),
    children: sum.children + (account.children || []).length
  }), { adults: 0, children: 0, households: 0 });
  renderPeopleSection('invitedList','invitedPeopleTotal',totals,invitedAccounts.length
    ? invitedAccounts.flatMap(account=>invitedInvitationGroups(account).map(group=>invitationEntryHtml(group))).join('')
    : '<p class="guest-empty">No one is currently invited.</p>');
  showSiteDialog(document.querySelector('#invitedListDialog'));
});
function openAdmin() {
  const isWedding = GatheringFeatures.forGathering(viewedEventId).weddingPages;
  document.querySelector('#adminDialog .modal-card').classList.toggle('wedding-details-editor', isWedding);
  document.querySelector('#adminEventDate').value = state.eventDate;
  document.querySelector('#adminEventDate').min=GatheringHistory.completed(state)?new Date(Date.parse(GatheringHistory.today())+86400000).toISOString().slice(0,10):'';
  document.querySelector('#adminHomeAddress').value = state.homeAddress || '';
  populateClearClaimControls();
  document.querySelector('#adminHostNotesSection').hidden = isWedding;
  document.querySelector('#adminHostNotes').value = isWedding ? '' : state.hostNotes || '';
  document.querySelector('#adminHeading').textContent = isWedding ? 'Edit wedding details' : 'Edit Details';
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
    renderBrideGroomPageAdmin();
    document.querySelector('#adminPerfectExperienceContent').value = state.perfectExperienceContent || '';
    document.querySelector('#adminTimelineAboveContent').value = state.timelineAboveContent || '';
    document.querySelector('#adminTimelineContent').value = state.timelineContent || '';
    document.querySelector('#adminTimelineBelowContent').value = state.timelineBelowContent || '';
    document.querySelector('#adminWhatToExpectContent').value = state.whatToExpectContent || '';
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
  const dialog = document.querySelector('#adminDialog'); if (!dialog.open && !SiteEditing.enabled) dialog.showModal();
}
function renderBrideGroomPageAdmin() {
  const pages = state.brideGroomPages || [];
  const container = document.querySelector('#adminBrideGroomPages');
  container.innerHTML = pages.map((page, index) => `<div class="wedding-party-description-editor wedding-page-editor bride-groom-extra-page" data-bride-groom-admin-page="${escapeAttribute(page.id)}"><div class="wedding-page-editor-heading"><input type="text" value="${escapeAttribute(page.title)}" aria-label="Bride & Groom page ${index + 1} tab name" maxlength="60"><button type="button" class="admin-delete" aria-label="Delete ${escapeAttribute(page.title)} page" title="Delete page">×</button></div><textarea class="wedding-copy-editor" aria-label="${escapeAttribute(page.title)} page content" placeholder="Add your notes here…">${escapeHtml(page.content)}</textarea></div>`).join('');
  container.querySelectorAll('[data-bride-groom-admin-page]').forEach(editor => {
    const page = pages.find(item => item.id === editor.dataset.brideGroomAdminPage);
    const [heading, content] = [editor.querySelector('input'), editor.querySelector('textarea')];
    [heading, content].forEach(control => control.addEventListener('change', commitBrideGroomPageEditors));
    editor.querySelector('.admin-delete').addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      if (!confirm(`Delete the “${page.title}” page?`)) return;
      commitBrideGroomPageEditors();
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
    ? videos.map((video, index) => `<div class="admin-video-row"><a href="${escapeAttribute(typeof video === 'string' ? video : AttireVideos.assetUrl(SHARED_STATE_URL, video.id))}" target="_blank" rel="noopener noreferrer">${escapeHtml(typeof video === 'string' ? `Video ${index + 1}` : video.name)}</a><button type="button" data-remove-attire-video="${index}" aria-label="Remove video ${index + 1}">Remove</button></div>`).join('')
    : '<p class="guest-empty">No attire videos have been added.</p>';
}
const editedWeddingPartyMembers = new Set();
function renderWeddingPartyDescriptionAdmin() {
  const container = document.querySelector('#adminWeddingPartyMembers');
  container.querySelectorAll('[data-member-editor]').forEach(editor => {
    const member = state.weddingPartyMembers.find(item => item.id === editor.dataset.memberEditor);
    editor.querySelector('.member-editor-content').innerHTML = `<div class="member-editor-pages editor-page-line"><label><span>Responsibilities</span><textarea class="wedding-copy-editor" data-member-responsibilities aria-label="Responsibilities for ${escapeAttribute(member.name)}" placeholder="Assign responsibilities to this person…">${escapeHtml(member.responsibilities || '')}</textarea></label><div>${(member.pages || []).map(page => `<div class="wedding-page-editor" data-member-page-editor="${escapeAttribute(page.id)}"><div class="wedding-page-editor-heading"><input data-page-title value="${escapeAttribute(page.title)}" maxlength="60" aria-label="Page name for ${escapeAttribute(member.name)}"><button type="button" class="admin-delete" data-delete-member-page aria-label="Delete ${escapeAttribute(page.title)}">×</button></div><textarea class="wedding-copy-editor" data-page-content aria-label="${escapeAttribute(page.title)} content for ${escapeAttribute(member.name)}">${escapeHtml(page.content)}</textarea></div>`).join('')}</div></div>`;
  });
  container.querySelectorAll('[data-member-editor]').forEach(editor => {
    const member = state.weddingPartyMembers.find(item => item.id === editor.dataset.memberEditor);
    editor.querySelectorAll('input, textarea').forEach(control => control.addEventListener('change', () => {
      commitWeddingPartyEditors();
    }));
    editor.querySelector('[data-edit-member]').addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      commitWeddingPartyEditors();
      if (editedWeddingPartyMembers.has(member.id)) editedWeddingPartyMembers.delete(member.id);
      else editedWeddingPartyMembers.add(member.id);
      renderWeddingPartyAdmin();
    });
    editor.querySelector('[data-add-member-page]').addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      commitWeddingPartyEditors();
      member.pages ||= [];
      const page = { id: crypto.randomUUID(), title: `Page ${member.pages.length + 1}`, content: '' };
      member.pages.push(page); saveState(); renderWeddingPartyAdmin();
      container.querySelector(`[data-member-page-editor="${CSS.escape(page.id)}"] input`).focus();
    });
    editor.querySelectorAll('[data-delete-member-page]').forEach(button => button.addEventListener('click', () => {
      if (!hostAuthenticated || viewedEventId !== 'wedding') return;
      commitWeddingPartyEditors();
      const id = button.closest('[data-member-page-editor]').dataset.memberPageEditor;
      if (!confirm(`Delete the “${member.pages.find(page => page.id === id)?.title || 'personal'}” page?`)) return;
      member.pages = member.pages.filter(page => page.id !== id);
      saveState(); renderWeddingPartyAdmin();
    }));
  });
}
function commitWeddingPartyEditors() {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  let changed = false;
  document.querySelectorAll('#adminWeddingPartyMembers [data-member-editor]').forEach(editor => {
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
  document.querySelector('#invitationQrMode').value = state.invitationQrMode === 'general' ? 'general' : 'account';
  document.querySelector('#invitationEventDate').value = state.eventDate;
  document.querySelector('#invitationEventDate').min=GatheringHistory.completed(state)?new Date(Date.parse(GatheringHistory.today())+86400000).toISOString().slice(0,10):'';
  const invitationFallback = defaultInvitationSettings(state.eventDate);
  document.querySelector('#invitationRsvpDate').value = state.rsvpDate || invitationFallback.rsvpDate;
  document.querySelector('#invitationAddress1').value = state.addressLine1 || invitationFallback.addressLine1;
  document.querySelector('#invitationAddress2').value = state.addressLine2 || invitationFallback.addressLine2;
  document.querySelector('#invitationTemplateAssignment').innerHTML = '<option value="">No template assigned</option>' + invitationTemplatesForEvent().map(template => `<option value="${escapeAttribute(template.id)}" ${template.id === state.invitationTemplateId ? 'selected' : ''}>${escapeHtml(template.name)}</option>`).join('');
}
function canDeleteWebsiteAccount(account) {
  // AnyList-linked accounts stay managed by sync, even if first created here.
  return !!account && account.anyListCategoryId == null && account.source !== 'anylist';
}
function deleteWebsiteAccount(account) {
  if (!hostAuthenticated || !canDeleteWebsiteAccount(account)) return false;
  const index = appState.accounts.indexOf(account);
  if (index < 0) return false;
  appState.accounts.splice(index, 1);
  // Keep historical RSVPs, item claims, and member content intact.
  if (qrScopedAccount === account) qrScopedAccount = null;
  saveState(); render(); openAccountsAdmin();
  showToast(`${account.name}'s account deleted.`);
  return true;
}
function openAccountsAdmin() {
  const accountEventId = viewedEventId;
  const sortedAccounts = appState.accounts.map((account, index) => ({ account, index })).sort((left, right) =>
    firstAccountLastName(left.account.name).localeCompare(firstAccountLastName(right.account.name), 'en-US', { sensitivity: 'base' })
    || left.account.name.localeCompare(right.account.name, 'en-US', { sensitivity: 'base' }));
  document.querySelector('#adminAccounts').innerHTML = sortedAccounts.length ? sortedAccounts.map(({ account, index }) => {
    const deleteControl = canDeleteWebsiteAccount(account) ? `<button class="account-delete-button" type="button" aria-label="Delete account for ${escapeAttribute(account.name)}">Delete</button>` : '';
    const legacy = !Array.isArray(account.plusOnePeople?.[accountEventId]) && plusOneCount(account,accountEventId)>0;
    const guestPermissionControl = legacy ? `<p data-legacy-plus-ones>Previously ${plusOneCount(account,accountEventId)} account plus-one(s). Select the people who may bring a guest.</p>` : '';
    return `<div class="account-row account-row-with-plus-ones" data-account-index="${index}" data-account-name="${escapeAttribute(account.name)}"><div class="account-people"><div class="account-preview-actions"><div class="account-access"><label class="account-selection"><input class="account-selected" type="checkbox" ${accountCanSignIn(account, accountEventId) ? 'checked' : ''}><span>Give Access</span></label><label class="account-selection"><input class="account-invited" type="checkbox" ${accountIsInvited(account, accountEventId) ? 'checked' : ''}><span>Invite</span></label></div><div class="account-toolbar-buttons"><button class="account-qr-button" type="button" aria-label="View QR code for ${escapeAttribute(account.name)}">QR</button><button class="account-invitation-button" type="button" aria-label="View invitation for ${escapeAttribute(account.name)}" ${account.qrToken || state.invitationQrMode === 'general' ? '' : 'disabled title="QR access is required"'}>Inv</button>${deleteControl}</div></div><div class="account-contact-details">${accountContactsHtml(account)}${guestPermissionControl}</div></div></div>`;
  }).join('') : '<p class="guest-empty">No guest accounts yet.</p>';
  document.querySelectorAll('.account-row').forEach(row => {
    const access = row.querySelector('.account-access');
    const previewActions = row.querySelector('.account-preview-actions');
    row.querySelectorAll('[data-host-account-person]').forEach(button=>button.addEventListener('click',()=>signIntoAccount(appState.accounts.find(account=>account.name===row.dataset.accountName),button.dataset.hostAccountPerson)));
    const viewQr = previewActions.querySelector('.account-qr-button');
    const viewInvitation = previewActions.querySelector('.account-invitation-button');
    row.addEventListener('change',event=>{
      if(!event.target.matches('[data-person-invitation]'))return;
      const account=appState.accounts.find(account=>account.name===row.dataset.accountName);
      if(account && InvitationGroups.assign(account,accountEventId,event.target.dataset.personInvitation,event.target.value))saveState();
      else if(account){event.target.value=InvitationGroups.number(account,accountEventId,event.target.dataset.personInvitation);showToast('Enter an invitation number of 1 or higher.');}
    });
    access.querySelector('.account-selected').addEventListener('change', event => {
      const account = appState.accounts.find(account => account.name === row.dataset.accountName);
      if(!account)return;
      account.selectedEvents ??= {};
      account.selectedEvents[accountEventId] = event.target.checked;
      row.querySelectorAll('[data-host-account-person]').forEach(button=>{button.disabled=!Object.keys(EVENT_DETAILS).some(id=>accountCanSignIn(account,id));});
      if (!event.target.checked && guestName === account.name) guestName = '';
      saveState();
    });
    row.querySelectorAll('[data-plus-one-person]').forEach(input=>input.addEventListener('change',()=>{
      const account=appState.accounts.find(account => account.name === row.dataset.accountName);if(!account)return;
      GuestPlanning.setPlusOnePeople(account,accountEventId,[...row.querySelectorAll('[data-plus-one-person]:checked')].map(input=>input.dataset.plusOnePerson));
      row.querySelector('[data-legacy-plus-ones]')?.remove();
      saveState();
    }));
    access.querySelector('.account-invited').addEventListener('change', event => {
      const account = appState.accounts.find(account => account.name === row.dataset.accountName);
      if(!account)return;
      account.invitedEvents ??= {};
      account.invitedEvents[accountEventId] = event.target.checked;
      saveState();
    });
    row.querySelector('.account-delete-button')?.addEventListener('click', () => {
      const account = appState.accounts.find(account => account.name === row.dataset.accountName);
      if (!hostAuthenticated || !canDeleteWebsiteAccount(account)) return;
      if (!window.confirm(`Delete ${account.name}'s account? This removes their sign-in access to all gatherings. Their RSVP history, item claims, and wedding party content will be kept.`)) return;
      deleteWebsiteAccount(account);
    });
    viewQr.addEventListener('click', () => openQrCode(appState.accounts.find(account => account.name === row.dataset.accountName)));
    viewInvitation.addEventListener('click', () => openInvitationPreview(appState.accounts.find(account => account.name === row.dataset.accountName)));
  });
  const dialog = document.querySelector('#accountsDialog'); if (!dialog.open) showSiteDialog(dialog);
}

function renderWeddingPartyAdmin() {
  state.weddingPartyMembers ??= [];
  document.querySelector('#adminWeddingPartyMembers').innerHTML = state.weddingPartyMembers.length
    ? renderWeddingPartyMemberList(state.weddingPartyMembers)
    : '<p class="guest-empty">No wedding party members yet.</p>';
  renderWeddingPartyDescriptionAdmin();
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
  const memberCard = (member, index, rolePosition, roleCount) => `<fieldset class="wedding-party-member ${editedWeddingPartyMembers.has(member.id) ? 'is-editing' : ''}" data-wedding-party-index="${index}" data-member-editor="${escapeAttribute(member.id)}"><legend>${escapeHtml(member.name)}</legend><div class="wedding-party-member-heading"><div class="member-name-controls"><button type="button" data-edit-member aria-expanded="${editedWeddingPartyMembers.has(member.id)}" aria-label="${editedWeddingPartyMembers.has(member.id) ? 'Done editing' : 'Edit'} ${escapeAttribute(member.name)}">${editedWeddingPartyMembers.has(member.id) ? 'Done' : 'Edit'}</button><button type="button" class="add-bride-groom-page" ${editedWeddingPartyMembers.has(member.id) ? '' : 'hidden'} data-add-member-page aria-label="Add page for ${escapeAttribute(member.name)}">+</button></div><span class="member-role-label" ${editedWeddingPartyMembers.has(member.id) ? 'hidden' : ''}>${escapeHtml(member.title || 'Wedding Party')}</span><select ${editedWeddingPartyMembers.has(member.id) ? '' : 'hidden'} class="wedding-party-title" aria-label="Title for ${escapeAttribute(member.name)}"><option value="">Select title</option>${WEDDING_PARTY_TITLES.map(title => `<option value="${escapeAttribute(title.value)}" ${member.title === title.value ? 'selected' : ''}>${escapeHtml(title.value)}</option>`).join('')}</select><span class="wedding-party-order-controls"><button type="button" data-move-wedding-party="up" data-wedding-party-move-index="${index}" aria-label="Move ${escapeAttribute(member.name)} up within ${escapeAttribute(member.title)}" ${rolePosition === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move-wedding-party="down" data-wedding-party-move-index="${index}" aria-label="Move ${escapeAttribute(member.name)} down within ${escapeAttribute(member.title)}" ${rolePosition === roleCount - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-remove-wedding-party="${index}" aria-label="Remove ${escapeAttribute(member.name)} from wedding party">×</button></div><div class="member-editor-content wedding-party-description-editor" ${editedWeddingPartyMembers.has(member.id) ? '' : 'hidden'}></div></fieldset>`;
  const cardsFor = title => {
    const roleMembers = members.map((member, index) => ({ member, index })).filter(({ member }) => member.title === title);
    return roleMembers.map(({ member, index }, rolePosition) => memberCard(member, index, rolePosition, roleMembers.length)).join('');
  };
  const fullWidthGroup = (title, position) => `<div class="wedding-party-role-group wedding-party-role-group-${position}" aria-label="${escapeAttribute(title)}">${cardsFor(title)}</div>`;
  const pairedGroup = (leftTitle, rightTitle) => `<div class="wedding-party-pair"><div class="wedding-party-role-column" aria-label="${escapeAttribute(leftTitle)}">${cardsFor(leftTitle)}</div><div class="wedding-party-role-column" aria-label="${escapeAttribute(rightTitle)}">${cardsFor(rightTitle)}</div></div>`;

  return fullWidthGroup('Officiant', 'top')
    + pairedGroup('Matron of Honor', 'Best Man')
    + pairedGroup('Bridesmaid', 'Groomsman')
    + fullWidthGroup('Ushers', 'bottom')
    + fullWidthGroup('', 'unassigned');
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
  preview.innerHTML = (account.generalLogin || account.qrToken) ? qrSvg(makeQrCode(accountQrUrl(account))) : '';
  unavailable.hidden = Boolean((account.generalLogin || account.qrToken));
  linkWrapper.hidden = !(account.generalLogin || account.qrToken);
  signInLink.href = (account.generalLogin || account.qrToken) ? accountQrUrl(account) : '';
  signInLink.textContent = (account.generalLogin || account.qrToken) ? accountQrUrl(account) : '';
  buttons.forEach(button => { button.disabled = !(account.generalLogin || account.qrToken); });
  showSiteDialog(document.querySelector('#qrCodeDialog'));
}
document.querySelector('#downloadQrPng').addEventListener('click', () => { if ((qrAdminAccount?.generalLogin || qrAdminAccount?.qrToken)) downloadQrPng(qrAdminAccount); });
document.querySelector('#downloadQrSvg').addEventListener('click', () => { if ((qrAdminAccount?.generalLogin || qrAdminAccount?.qrToken)) downloadQrSvg(qrAdminAccount); });
[['invitationEventDate', 'eventDate'], ['invitationRsvpDate', 'rsvpDate'], ['invitationAddress1', 'addressLine1'], ['invitationAddress2', 'addressLine2']].forEach(([id, key]) => {
  document.querySelector(`#${id}`).addEventListener('change', event => {
    const value = event.target.value.trim(); if (!value || !event.target.reportValidity()) return;
    setGatheringDetail(key,value); saveState(); renderInvitationSettings(); showToast('Invitation setting updated.');
  });
});
document.querySelector('#viewGeneralLoginQr').addEventListener('click', () => openQrCode({ name: 'General Login', generalLogin: true }));
document.querySelector('#invitationQrMode').addEventListener('change', event => {
  state.invitationQrMode = event.target.value === 'general' ? 'general' : 'account';
  saveState(); renderInvitationSettings(); showToast('Invitation QR option updated.');
});
document.querySelector('#invitationTemplateAssignment').addEventListener('change', event => {
  state.invitationTemplateId = event.target.value; saveState(); showToast('Invitation template assignment updated.');
});
document.querySelector('#downloadInvitationPng').addEventListener('click', async () => {
  const account=invitationPreviewAccount,count=account?GuestPlanning.invitationCount(account,viewedEventId):1;
  if(!count){showToast('This account has zero invitations selected.');return;}
  if(count>65535){showToast('A ZIP can contain at most 65,535 invitations.');return;}
  const blob=await canvasBlob(document.querySelector('#invitationCanvas'));if(!blob)return;
  if(count===1){downloadBlob(blob,window.Invitation.filenameFor(account?.name||'General Login',EVENT_DETAILS[viewedEventId].name));return;}
  const files=Array.from({length:count},(_,index)=>new File([blob],window.Invitation.filenameFor(`${account.name}-copy-${index+1}`,EVENT_DETAILS[viewedEventId].name),{type:'image/png'}));
  downloadBlob(await InvitationZip.zipFiles(files),`${safeQrFilename(account.name)}-invitations.zip`);
});
document.querySelector('#configureInvitationTemplate').addEventListener('click', () => {
  document.querySelector('#invitationPreviewDialog').close();
  document.querySelector('#accountsDialog').close();
  renderTemplateManager();
  showSiteDialog(document.querySelector('#invitationTemplatesDialog'));
});
let bulkInvitationAction = 'download';
let bulkInvitationFiles = [];
let bulkInvitationBusy = false;
function openBulkInvitationChoice(action) {
  if (!state.invitationTemplateId) { showToast('Assign an invitation template first.'); return; }
  bulkInvitationAction = action; bulkInvitationFiles = [];
  document.querySelector('#bulkInvitationHeading').textContent = action === 'email' ? 'Email invitations' : 'Download invitations';
  document.querySelector('#bulkInvitationStatus').textContent = '';
  document.querySelector('#shareBulkInvitations').hidden = true;
  document.querySelector('#bulkInvitationChoices').hidden = false;
  showSiteDialog(document.querySelector('#bulkInvitationDialog'));
}
document.querySelector('#downloadAllInvitations').addEventListener('click', () => openBulkInvitationChoice('download'));
document.querySelector('#emailAllInvitations').addEventListener('click', () => openBulkInvitationChoice('email'));
document.querySelector('#bulkInvitationDialog').addEventListener('cancel', event => { if (bulkInvitationBusy) event.preventDefault(); });
document.querySelector('#bulkInvitationChoices').addEventListener('click', async event => {
  const choice = event.target.closest('[data-bulk-qr]');
  if (!choice || bulkInvitationBusy) return;
  const mode = choice.dataset.bulkQr, dialog = document.querySelector('#bulkInvitationDialog');
  const status = document.querySelector('#bulkInvitationStatus');
  const buttons = [...dialog.querySelectorAll('button')];
  bulkInvitationBusy = true; buttons.forEach(button => { button.disabled = true; });
  status.textContent = 'Preparing invitations…';
  try {
    const accounts=invitationAccounts(mode).filter(account=>GuestPlanning.invitationCount(account,viewedEventId)>0);
    if(!accounts.length)throw new Error('There are no invited accounts with a nonzero invitation quantity for this QR option.');
    const files=[],total=accounts.reduce((sum,account)=>sum+GuestPlanning.invitationCount(account,viewedEventId),0);
    if(total>65535)throw new Error('A ZIP can contain at most 65,535 invitations. Reduce the selected quantities.');
    for(const account of accounts)for(let copy=0;copy<GuestPlanning.invitationCount(account,viewedEventId);copy++){
      status.textContent=`Preparing invitation ${files.length+1} of ${total}…`;
      const image=await invitationFile(account,mode);
      files.push(new File([image],window.Invitation.filenameFor(`${account.name}-copy-${copy+1}`,EVENT_DETAILS[viewedEventId].name),{type:'image/png'}));
    }
    const zip=await InvitationZip.zipFiles(files);
    const file=new File([zip],`${viewedEventId}-${mode==='general'?'general':'individual'}-invitations.zip`,{type:'application/zip'});
    if (bulkInvitationAction === 'download') { downloadBlob(file, file.name); dialog.close(); }
    else {
      bulkInvitationFiles = [file];
      document.querySelector('#bulkInvitationChoices').hidden = true;
      document.querySelector('#shareBulkInvitations').hidden = false;
      status.textContent = 'Your invitation attachment is ready. Open sharing and choose your email app.';
    }
  } catch (error) { status.textContent = error.message || 'Could not prepare invitations. Please try again.'; }
  finally { bulkInvitationBusy = false; buttons.forEach(button => { button.disabled = false; }); }
});
document.querySelector('#shareBulkInvitations').addEventListener('click', async () => {
  try {
    const files = bulkInvitationFiles;
    if (!files.length) return;
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files }))) throw new Error('This browser cannot attach invitations to an email. Download them instead, then attach the file in your email app.');
    await navigator.share({ files, title: `${EVENT_DETAILS[viewedEventId].name} invitations`, text: 'Invitations are attached.' });
    document.querySelector('#bulkInvitationDialog').close();
  } catch (error) { if (error.name !== 'AbortError') document.querySelector('#bulkInvitationStatus').textContent = error.message; }
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
function openTemplateManager() { renderTemplateManager(); showSiteDialog(document.querySelector('#invitationTemplatesDialog')); }
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
  document.querySelector('#templatePreviewAccount').innerHTML = '<option value="">General login QR</option>' + invitationAccounts().map(account => `<option value="${escapeAttribute(account.qrToken)}">${escapeHtml(account.name)}</option>`).join('');
  document.querySelector('#invitationTemplatesDialog').close(); showSiteDialog(document.querySelector('#invitationEditorDialog'));
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
  await window.Invitation.render(canvas, model, makeQrCode(model.qrUrl)); document.querySelector('#invitationPreviewHeading').textContent = templateDraft.name; document.querySelector('#invitationPreviewAccount').textContent = invitationQrUrl(account) === generalLoginUrl() ? 'Previewing the general login QR.' : `Previewing ${account.name}'s existing account QR. The name is not printed.`; document.querySelector('#invitationPreviewStatus').textContent = ''; document.querySelector('#invitationPreviewStatus').classList.remove('form-error'); document.querySelector('#invitationCanvasWrap').hidden = false; document.querySelector('#configureInvitationTemplate').hidden = true; document.querySelector('#downloadInvitationPng').disabled = false; showSiteDialog(document.querySelector('#invitationPreviewDialog'));
});
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
function populateClearClaimControls() {
  const claimedItems = state.items.filter(item => item.claims.length);
  const itemSelect = document.querySelector('#clearClaimItem');
  itemSelect.innerHTML = claimedItems.map(item => `<option value="${escapeAttribute(item.id)}">${escapeHtml(item.name)} (${escapeHtml(formatQuantity(item.claims.length, item))} claimed)</option>`).join('');
  const hasClaims = claimedItems.length > 0;
  document.querySelector('#clearClaimError').textContent = hasClaims ? '' : 'There are no claimed dishes to clear.';
  document.querySelector('#clearClaimSubmit').disabled = !hasClaims;
  updateClearClaimFamilies();

}
document.querySelector('#gatheringTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-gathering-tab]');
  if (!button || button.hidden || (button.dataset.gatheringTab === 'notes' && !isHostView())) return;
  selectedGatheringTab = button.dataset.gatheringTab; render();document.getElementById(button.getAttribute('aria-controls'))?.scrollIntoView({block:'start',behavior:'auto'});
});
document.querySelector('#gatheringTabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-gathering-tab]:not([hidden])')];
  const current = tabs.findIndex(button => button.getAttribute('aria-selected') === 'true');
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click(); tabs[next].focus();
});
document.querySelector('#adminHostNotes').addEventListener('change', event => {
  if (!isHostView() || !GatheringFeatures.forGathering(viewedEventId).notes) return;
  state.hostNotes = event.target.value; saveState(); render();
});
document.querySelector('#editItemsButton').addEventListener('click', async () => {
  if (!hostAuthenticated) return;
  if(isViewingAsGuest()){await closeHostDialogs();restoreHostSession();}
  if (SiteEditing.enabled) commitAllPendingEditorInputs();
  SiteEditing.toggle(render);
});

document.querySelector('#editAccountsButton').addEventListener('click', async () => { if(!hostAuthenticated)return;commitAllPendingEditorInputs();if(isViewingAsGuest()){await closeHostDialogs();restoreHostSession();}if(!document.querySelector('#accountsDialog').open)openAccountsAdmin(); });
async function signIntoAccount(account,person) {
  if(!hostAuthenticated || !account)return;
  const events=Object.keys(EVENT_DETAILS).filter(id=>accountCanSignIn(account,id));if(!events.length)return;
  commitAllPendingEditorInputs();if(SiteEditing.enabled)SiteEditing.toggle(render);
  if(!hostReturnSession)hostReturnSession={eventId:viewedEventId,guestName,signedInPersonName,selectedGatheringTab,selectedWeddingTab,selectedMatronTab,selectedGuestTab,selectedBrideGroomPage};
  await closeHostDialogs();
  hostWeddingPartyViewName=account.name;guestName=account.name;
  signedInPersonName=person || accountSignInNames(account.name)[0] || account.name;
  enterEvent(events.includes(viewedEventId)?viewedEventId:events[0]);
}
function restoreHostSession() {
  if(!hostAuthenticated)return;
  const previous=hostReturnSession;hostReturnSession=null;hostWeddingPartyViewName='';
  guestName=previous?.guestName || HOST_DISPLAY_NAME;signedInPersonName=previous?.signedInPersonName || '';
  viewedEventId=GuestPlanning.retainedEvent(previous?.eventId || viewedEventId,appState.events,viewedEventId);state=appState.events[viewedEventId];
  selectedGatheringTab=previous?.selectedGatheringTab ?? null;selectedWeddingTab=previous?.selectedWeddingTab || 'couple';
  selectedMatronTab=previous?.selectedMatronTab || 'duties';selectedGuestTab=previous?.selectedGuestTab || 'attire';selectedBrideGroomPage=previous?.selectedBrideGroomPage || 'main';
  showSignedInDestination();render();openRsvp({page:GatheringFeatures.forGathering(viewedEventId).weddingPages?selectedWeddingTab:null});window.scrollTo({top:0,left:0,behavior:'auto'});
}
document.querySelector('#cancelViewAsButton').addEventListener('click',async()=>{if(!isViewingAsGuest())return;await closeHostDialogs();restoreHostSession();});
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
  const accountList=document.querySelector('#adminAccounts');
  accountList.inert=true;
  try {
    clearTimeout(sharedSaveTimer);
    while(sharedSaveInProgress) await wait(50);
    if(sharedSavePending) await saveSharedState();
    if(sharedSavePending) throw new Error('Pending account changes could not be saved.');
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
    if(!await loadSharedState({allowActiveEditor:true})) {
      const error=new Error('Account refresh failed.');
      error.displayMessage='AnyList synced, but the website could not refresh the accounts. Please reload before editing accounts.';
      throw error;
    }
    if (document.querySelector('#accountsDialog').open) openAccountsAdmin();
    const added = outcome.added ? `${outcome.added} new account${outcome.added === 1 ? '' : 's'} added` : 'no new accounts found';
    const skipped = outcome.skipped ? `, ${outcome.skipped} entr${outcome.skipped === 1 ? 'y' : 'ies'} skipped` : '';
    const qrResult = outcome.qrAccessCreated
      ? ` Created QR access for ${outcome.qrAccessCreated} account${outcome.qrAccessCreated === 1 ? '' : 's'}.`
      : ' All accounts already have QR access.';
    const updated=outcome.updated ? `, ${outcome.updated} account${outcome.updated===1?'':'s'} updated` : '';
    result.textContent = `Sync complete — ${added}${updated}${skipped}.${qrResult}`;
  } catch (error) {
    console.error(error);
    result.textContent = error.displayMessage || (error instanceof TypeError
      ? 'Unable to contact the AnyList sync service. Deploy the latest Cloudflare Worker and check its allowed origin.'
      : 'Unable to sync AnyList Address Book. Existing accounts were not changed.');
  } finally {
    button.disabled = false;
    button.textContent = 'Sync AnyList Address Book';
    accountList.inert=false;
  }
});
document.querySelector('#clearClaimItem').addEventListener('change', updateClearClaimFamilies);
document.querySelector('#clearClaimFamily').addEventListener('change', updateClearClaimQuantities);
document.querySelector('#clearClaimSubmit').addEventListener('click', event => {
  if (!isHostView() || !GatheringFeatures.forGathering(viewedEventId).menu) return;
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const item = state.items.find(entry => entry.id === document.querySelector('#clearClaimItem').value);
  const family = document.querySelector('#clearClaimFamily').value;
  const quantity = Number(document.querySelector('#clearClaimQuantity').value);
  if (!item || !family || quantity < 1) return;
  const removed = removeItemClaims(item, family, quantity);
  if (!removed) return;
  saveState();
  populateClearClaimControls();
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
  let account = appState.accounts.find(item => accountNameMatches(name, item));
  const accountCreated = !account;
  if (accountCreated) {
    account = { name, source: 'website', selected: false, selectedEvents: { wedding: true }, invitedEvents: { wedding: true } };
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
  button.disabled = true; button.querySelector('span').textContent = 'Uploading…'; error.textContent = '';
  try {
    const uploaded = await uploadWeddingPartyAttireImage(crypto.randomUUID(), weddingPartyAttireFile);
    state.weddingPartyAttireImages ??= { ladies: [], gentlemen: [] };
    state.weddingPartyAttireImages[section].push({ ...uploaded, caption: captionInput.value.trim() });
    fileInput.value = ''; captionInput.value = ''; weddingPartyAttireFile = null; updateDropzone(weddingPartyAttireDropzone, null);
    saveState(); renderWeddingPartyAttireAdmin(); showToast('Private wedding party attire image added.');
  } catch (uploadError) { console.error(uploadError); error.textContent = uploadError.message || 'Could not upload the image.'; }
  finally { button.disabled = false; button.querySelector('span').textContent = 'Add Image'; }
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
document.querySelector('#adminEventDate').addEventListener('change', event => { if (!event.target.value || !event.target.reportValidity()) return; setGatheringDetail('eventDate',event.target.value); state.accountSelectionResetFor = ''; saveState(); showToast('Event date updated.'); });
document.querySelector('#adminHomeAddress').addEventListener('change', event => {
  SharedDetails.setDetail(appState.events, viewedEventId, 'homeAddress', event.target.value.trim());
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
  if (!GatheringFeatures.forGathering(viewedEventId).weddingPages) return;
  state.registryUrl = event.target.value.trim();
  saveState();
  showToast('Registry link updated.');
});
document.querySelector('#adminMonetaryGiftUrl').addEventListener('change', event => {
  if (!GatheringFeatures.forGathering(viewedEventId).weddingPages) return;
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
document.querySelector('#adminUploadAttireVideo').addEventListener('click', async event => {
  if (!hostAuthenticated || viewedEventId !== 'wedding') return;
  const input = document.querySelector('#adminAttireVideoFile');
  const file = input.files[0];
  const error = document.querySelector('#adminAttireVideoError');
  error.textContent = AttireVideos.validate(file);
  if (error.textContent) return;
  if (!SHARED_STATE_URL) { error.textContent = 'Configure shared saving before uploading videos.'; return; }
  const button = event.currentTarget;
  const progress = document.querySelector('#adminAttireVideoProgress');
  const video = { id: crypto.randomUUID(), name: file.name, contentType: AttireVideos.fileType(file) };
  button.disabled = true; input.disabled = true; progress.hidden = false; progress.textContent = 'Uploading video…';
  try {
    await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', AttireVideos.assetUrl(SHARED_STATE_URL, video.id));
      request.setRequestHeader('Content-Type', video.contentType);
      request.setRequestHeader('X-Host-Password', hostCredential);
      request.timeout = 300000;
      request.upload.onprogress = event => { if (event.lengthComputable) progress.textContent = `Uploading video… ${Math.round(event.loaded / event.total * 100)}%`; };
      request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error([404, 405].includes(request.status) ? 'Deploy the latest Cloudflare Worker to enable video uploads.' : request.responseText || `Video upload failed (${request.status}).`));
      request.onerror = () => reject(new Error('Could not upload the video. Check your connection and the deployed Worker.'));
      request.ontimeout = () => reject(new Error('Video upload timed out. Try again with a smaller video.'));
      request.send(file);
    });
    const currentWedding = appState.events.wedding;
    currentWedding.attireVideos ??= []; currentWedding.attireVideos.push(video);
    if (state === currentWedding) saveState();
    else { storeLocalState(appState); localStateRevision += 1; queueSharedStateSave(); }
    input.value = ''; progress.textContent = 'Video uploaded.';
    if (viewedEventId === 'wedding') renderAdminAttireVideos();
    showToast('Attire video uploaded.');
  } catch (uploadError) { error.textContent = uploadError.message; progress.hidden = true; }
  finally { button.disabled = false; input.disabled = false; }
});
document.querySelector('#adminAttireVideos').addEventListener('click', async event => {
  const button = event.target.closest('[data-remove-attire-video]');
  if (!button || !hostAuthenticated || viewedEventId !== 'wedding') return;
  const wedding = state;
  const video = wedding.attireVideos[Number(button.dataset.removeAttireVideo)];
  if (!video) return;
  button.disabled = true;
  try {
    if (typeof video === 'object') {
      const result = await fetchWithTimeout(AttireVideos.assetUrl(SHARED_STATE_URL, video.id), { method: 'DELETE', headers: { 'X-Host-Password': hostCredential } });
      if (!result.ok && result.status !== 404) throw new Error('Could not remove the uploaded video. Please try again.');
    }
    const currentWedding = appState.events.wedding;
    const index = currentWedding.attireVideos.findIndex(item => typeof video === 'string' ? item === video : item.id === video.id);
    if (index >= 0) currentWedding.attireVideos.splice(index, 1);
    if (state === currentWedding) saveState();
    else { storeLocalState(appState); localStateRevision += 1; queueSharedStateSave(); }
    if (viewedEventId === 'wedding') renderAdminAttireVideos();
  } catch (error) { document.querySelector('#adminAttireVideoError').textContent = error.message; button.disabled = false; }
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
    if (!qrScopedAccount) {
      document.querySelector('#accountLinkError').hidden = false;
      document.querySelector('#guestSignInFields').hidden = true;
      document.querySelector('#guestSignInFields').querySelectorAll('input').forEach(input => { input.disabled = true; });
      document.querySelector('#signInSubmit').hidden = true;
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
startApp().finally(() => window.MeyersLoading?.finish());
function resumeSharedSync() {
  if(sharedSavePending && !sharedSaveInProgress){clearTimeout(sharedSaveTimer);return saveSharedState();}
  return loadSharedState();
}
window.addEventListener('focus', resumeSharedSync);
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

// New gatherings can only be opened from the host gathering chooser.
document.querySelector('#newGatheringButton').addEventListener('click',()=>{
  if(!isHostView() || document.querySelector('#eventSelectionPage').hidden || activeHostDialog())return;
  document.querySelector('#newGatheringForm').reset();
  document.querySelector('#newGatheringAddress').value=SharedDetails.homeAddress(state);
  showSiteDialog(document.querySelector('#newGatheringDialog'));
});
document.querySelector('#newGatheringForm').addEventListener('submit',async event=>{
  if(event.submitter?.value==='cancel')return;
  if(!isHostView()){event.preventDefault();return;}
  const name=document.querySelector('#newGatheringName').value.trim();
  if(!name){event.preventDefault();document.querySelector('#newGatheringName').focus();return;}
  const id=`gathering-${crypto.randomUUID()}`;
  appState.events[id]={...makeEvent([],document.querySelector('#newGatheringDate').value),gatheringName:name,gatheringTheme:'neutral',homeAddress:document.querySelector('#newGatheringAddress').value.trim()};
  for(const account of appState.accounts){
    account.selectedEvents={...account.selectedEvents,[id]:false};
    account.invitedEvents={...account.invitedEvents,[id]:false};
  }
  syncGatheringDefinitions(appState.events);
  event.preventDefault();await closeHostDialogs();
  enterEvent(id);saveState();showToast('Gathering created. Add menu items and choose accounts to invite.');
});

function renderGatheringHistory() {
  if(!isHostView())return;
  const snapshot=appState.gatheringHistory?.[viewedEventId]?.[document.querySelector('#gatheringHistoryDate').value];
  const area=document.querySelector('#gatheringHistoryContent');
  if(!snapshot){area.innerHTML='<p>No completed gatherings have been saved yet. History is saved after the gathering date ends.</p>';return;}
  const event=snapshot.event,accounts=snapshot.accounts || [],rsvps=event.rsvps || [];
  const label=name=>name===HOST_DISPLAY_NAME?'Host':name;
  const section=(title,body)=>`<section><h3>${title}</h3>${body || '<p>None recorded.</p>'}</section>`;
  const accountHtml=account=>`<article><strong>${escapeHtml(account.name)}</strong>${account.address?`<p>${escapeHtml(account.address)}</p>`:''}<ul>${accountSignInNames(account.name).map(name=>`<li>${escapeHtml(name)} · Inv #${InvitationGroups.number(account,snapshot.eventId,name)}</li>`).join('')}</ul>${account.children?.length?`<p>Children: ${account.children.map(escapeHtml).join(', ')}</p>`:''}<p>${account.invitationCountAtEvent ?? GuestPlanning.invitationCount(account,snapshot.eventId)} invitation(s)</p></article>`;
  const personRows=rsvps.flatMap(rsvp=>rsvp.people?.length?rsvp.people.map(person=>({name:person.name,attending:person.attending,guest:person.guestChoice==='guest'?person.guestName:''})): [{name:rsvp.name,attending:rsvp.adults+rsvp.children>0}]);
  const peopleHtml=attending=>personRows.filter(person=>person.attending===attending).map(person=>`<p>${escapeHtml(label(person.name))}${person.attending&&person.guest?` · Guest: ${escapeHtml(person.guest)}`:''}</p>`).join('');
  const missing=account=>{const rsvp=rsvps.find(rsvp=>rsvp.name===account.name);return accountSignInNames(account.name).filter(name=>!rsvp || rsvp.people?.length && !rsvp.people.some(person=>person.name===name));};
  const totals=rsvps.reduce((totals,rsvp)=>({adults:totals.adults+(Number(rsvp.adults)||0),children:totals.children+(Number(rsvp.children)||0)}),{adults:0,children:0});
  area.innerHTML=`<h3>${escapeHtml(snapshot.name)} · ${escapeHtml(snapshot.date)}</h3><p>Read-only snapshot · ${totals.adults} adults · ${totals.children} children. Attendance reflects saved RSVPs.</p>`
    +section('Location',`<p>${escapeHtml(snapshot.eventId==='wedding'?[event.churchStreet,event.churchCityStateZip,event.venueStreet,event.venueCityStateZip].filter(Boolean).join(' · '):SharedDetails.homeAddress(event))}</p>`)
    +section('Invited',accounts.filter(account=>account.invitedEvents?.[snapshot.eventId]).map(accountHtml).join(''))
    +section('Attending',peopleHtml(true)+(GatheringFeatures.rsvp(snapshot.eventId).childNames?rsvps.flatMap(rsvp=>GuestPlanning.childLabels(rsvp)).map(name=>`<p>${escapeHtml(name)}</p>`).join(''):''))+section('Declined',peopleHtml(false))
    +section('No RSVP',accounts.filter(account=>account.invitedEvents?.[snapshot.eventId]&&missing(account).length).map(account=>`<article><strong>${escapeHtml(account.name)}</strong><p>${missing(account).map(escapeHtml).join(', ')}</p></article>`).join(''))
    +section('Contributions and menu requests',(event.items || []).map(item=>{const counts=new Map();for(const name of item.claims || [])counts.set(name,(counts.get(name)||0)+1);return `<article><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.category || '')} · ${item.needed} ${escapeHtml(item.unit || 'item')}(s) requested</p>${[...counts].map(([name,quantity])=>`<p>${escapeHtml(label(name))}: ${quantity}</p>`).join('') || '<p>No claims recorded.</p>'}</article>`;}).join(''))
    +section('Meals and dietary requests',rsvps.flatMap(rsvp=>(rsvp.menuSelections || []).map(meal=>`<p>${escapeHtml(meal.name || rsvp.name)}: ${escapeHtml(meal.meal || 'No meal selected')}${meal.dietaryRestrictions?` · ${escapeHtml(meal.dietaryRestrictions)}`:''}</p>`)).join(''))
    +section('Host notes',event.hostNotes?`<p class="history-notes">${escapeHtml(event.hostNotes)}</p>`:'');
}
document.querySelector('#gatheringHistoryButton').addEventListener('click',async()=>{
  if(!hostAuthenticated)return;if(isViewingAsGuest()){await closeHostDialogs();restoreHostSession();}
  commitAllPendingEditorInputs();if(captureGatheringHistory())saveState({refresh:false});
  const dates=Object.keys(appState.gatheringHistory?.[viewedEventId] || {}).sort().reverse();
  document.querySelector('#gatheringHistoryDate').innerHTML=dates.map(date=>`<option>${escapeHtml(date)}</option>`).join('');
  document.querySelector('#gatheringHistoryDate').disabled=!dates.length;
  document.querySelector('#nextGatheringForm').hidden=!GatheringHistory.completed(state);
  document.querySelector('#nextGatheringDate').min=new Date(Date.parse(GatheringHistory.today())+86400000).toISOString().slice(0,10);
  document.querySelector('#nextGatheringDate').value='';document.querySelector('#nextGatheringError').textContent='';
  renderGatheringHistory();showSiteDialog(document.querySelector('#gatheringHistoryDialog'));
});
document.querySelector('#gatheringHistoryDate').addEventListener('change',renderGatheringHistory);
document.querySelector('#closeGatheringHistory').addEventListener('click',()=>document.querySelector('#gatheringHistoryDialog').close());
document.querySelector('#nextGatheringForm').addEventListener('submit',event=>{
  event.preventDefault();if(!isHostView())return;
  try {
    captureGatheringHistory();state=GatheringHistory.startNext(appState,viewedEventId,document.querySelector('#nextGatheringDate').value);
    document.querySelector('#gatheringHistoryDialog').close();saveState();showToast('Next gathering started. Choose the accounts to invite.');
  } catch(error){document.querySelector('#nextGatheringError').textContent=error.message;}
});
setInterval(()=>{if(captureGatheringHistory()){storeLocalState(appState);localStateRevision+=1;queueSharedStateSave();}},60000);
