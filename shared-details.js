(() => {
  const homeAddress = event => event.homeAddress || [event.addressLine1, event.addressLine2].filter(Boolean).join('\n');
  const comparable = value => String(value || '').replace(/[,\s]+/g, ' ').trim().toLowerCase();
  function setDetail(events, eventId, key, value) {
    const event = events[eventId];
    if (!['homeAddress', 'addressLine1', 'addressLine2'].includes(key)) { event[key] = value; return; }
    const previous = homeAddress(event);
    event[key] = value;
    const address = key === 'homeAddress' ? value : [event.addressLine1, event.addressLine2].filter(Boolean).join('\n');
    // Events with a different location keep their own address. Matching home
    // locations and invitation address fields stay linked to the edited value.
    for (const candidate of Object.values(events)) {
      if (candidate !== event && comparable(homeAddress(candidate)) !== comparable(previous)) continue;
      candidate.homeAddress = address;
      const lines = address.split(/\r?\n/);
      candidate.addressLine1 = lines[0] || '';
      candidate.addressLine2 = lines.slice(1).join('\n');
    }
  }
  globalThis.SharedDetails = { homeAddress, setDetail };
})();
