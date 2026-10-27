(() => {
  const homeAddress = event => event.homeAddress || [event.addressLine1, event.addressLine2].filter(Boolean).join('\n');
  function setDetail(events, eventId, key, value) {
    const event = events[eventId];
    if (!['homeAddress', 'addressLine1', 'addressLine2'].includes(key)) { event[key] = value; return; }
    event[key] = value;
    const address = key === 'homeAddress' ? value : [event.addressLine1, event.addressLine2].filter(Boolean).join('\n');
    // Header, invitations and variables within this gathering share its address.
    // Matching text in another gathering does not make it shared data.
    event.homeAddress = address;
    const lines = address.split(/\r?\n/);
    event.addressLine1 = lines[0] || '';
    event.addressLine2 = lines.slice(1).join('\n');
  }
  globalThis.SharedDetails = { homeAddress, setDetail };
})();
