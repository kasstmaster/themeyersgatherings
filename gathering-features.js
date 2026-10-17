// Behavior belongs to gathering types, not individual holidays or themes.
(() => {
  const standard = Object.freeze({
    menu: true,
    notes: true,
    weddingPages: false,
    ceremonyAddresses: false,
    welcome: Object.freeze({
      showKicker: true,
      title: "WE'D LOVE FOR YOU TO BRING A DISH TO SHARE",
      message: "Choose something delicious to bring. If bringing something isn't practical, simply come and enjoy the evening with us."
    }),
    rsvp: Object.freeze({ childNames: false, guestCounter: true, namedGuests: false, meals: false })
  });
  const wedding = Object.freeze({
    menu: false,
    notes: false,
    weddingPages: true,
    ceremonyAddresses: true,
    welcome: Object.freeze({
      showKicker: false,
      title: 'TOGETHER WITH THEIR PARENTS',
      message: 'Kassandra Lynne Raudman and Steven Michael Meyer request the honor of your presence at their marriage'
    }),
    rsvp: Object.freeze({ childNames: true, guestCounter: false, namedGuests: true, meals: true })
  });
  const forGathering = eventId => eventId === 'wedding' ? wedding : standard;
  const rsvp = eventId => forGathering(eventId).rsvp;
  function childNames(eventId, draft, count) {
    return rsvp(eventId).childNames
      ? Array.from({ length: count }, (_, index) => String(draft[index] || '').trim()) : [];
  }
  globalThis.GatheringFeatures = { forGathering, rsvp, childNames };
})();
