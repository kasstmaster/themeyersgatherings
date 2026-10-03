(function (root) {
  'use strict';

  const FIELD_DEFINITIONS = Object.freeze({
    eventDate: { label: 'Event Date', type: 'text', formatter: 'weekday-month-ordinal-year' },
    rsvpBy: { label: 'RSVP By', type: 'text', formatter: 'by-short-month-day' },
    addressLine1: { label: 'Address Line 1', type: 'text', formatter: 'plain' },
    addressLine2: { label: 'Address Line 2', type: 'text', formatter: 'plain' },
    venueName: { label: 'Venue Name', type: 'text', formatter: 'plain' },
    churchName: { label: 'Church Name', type: 'text', formatter: 'plain' },
    ceremonyTime: { label: 'Ceremony Time', type: 'text', formatter: 'plain' },
    receptionLocation: { label: 'Reception Location', type: 'text', formatter: 'plain' },
    cityStateZip: { label: 'City / State / ZIP', type: 'text', formatter: 'plain' },
    customText: { label: 'Custom Text', type: 'text', formatter: 'plain' },
    accountQr: { label: 'Account QR Code', type: 'qr' }
  });
  const FONT_FAMILIES = Object.freeze(['Georgia', 'Times New Roman', 'serif', 'Arial', 'sans-serif']);
  const EVENT_DATE_FORMATTERS = Object.freeze([
    ['weekday-month-ordinal-year-spaced', 'Saturday   November   21st   2026'],
    ['weekday-month-ordinal-year', 'Saturday November 21st 2026'],
    ['month-ordinal-year', 'November 21st 2026'],
    ['month-day-comma-year', 'November 21, 2026']
  ]);
  const RSVP_FORMATTERS = Object.freeze([['by-short-month-day', 'By Nov. 7'], ['short-month-day', 'Nov. 7'], ['month-day', 'November 7']]);

  function id(prefix = 'template') {
    const random = root.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${random}`;
  }
  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const parts = { year: +match[1], month: +match[2], day: +match[3] };
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
    return date.getUTCFullYear() === parts.year && date.getUTCMonth() === parts.month - 1 && date.getUTCDate() === parts.day ? date : null;
  }
  function ordinal(day) {
    const remainder100 = day % 100;
    if (remainder100 >= 11 && remainder100 <= 13) return `${day}th`;
    return `${day}${({ 1: 'st', 2: 'nd', 3: 'rd' })[day % 10] || 'th'}`;
  }
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function formatEventDate(value, formatter = 'weekday-month-ordinal-year') {
    const date = parseDate(value); if (!date) return '';
    const weekday = weekdays[date.getUTCDay()], month = months[date.getUTCMonth()], day = date.getUTCDate(), year = date.getUTCFullYear();
    if (formatter === 'month-ordinal-year') return `${month} ${ordinal(day)} ${year}`;
    if (formatter === 'month-day-comma-year') return `${month} ${day}, ${year}`;
    return `${weekday} ${month} ${ordinal(day)} ${year}`;
  }
  function formatRsvpDate(value, formatter = 'by-short-month-day') {
    const date = parseDate(value); if (!date) return '';
    if (formatter === 'month-day') return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const short = `${shortMonths[date.getUTCMonth()]} ${date.getUTCDate()}`;
    return formatter === 'short-month-day' ? short : `By ${short}`;
  }
  function newField(key, x, y) {
    const definition = FIELD_DEFINITIONS[key] || FIELD_DEFINITIONS.customText;
    const qr = definition.type === 'qr';
    return {
      id: id('field'), key, type: definition.type, label: definition.label,
      x: Math.round(x), y: Math.round(y), width: qr ? 160 : 420, height: qr ? 160 : 48,
      ...(qr ? { quietZone: 4 } : {
        fontFamily: 'Georgia', fontSize: 28, fontWeight: '400', italic: false,
        color: '#222222', textAlign: 'left', letterSpacing: 0, lineHeight: 1.2,
        formatter: definition.formatter, customText: '', wordSpacing: definition.formatter.includes('spaced') ? 14 : 0
      })
    };
  }
  function createTemplate(name, background) {
    const now = new Date().toISOString();
    return { id: id(), name: String(name || 'Untitled template').trim(), background: { ...background }, fields: [], createdAt: now, updatedAt: now };
  }
  function duplicateTemplate(template, name = `${template.name} copy`) {
    const copy = createTemplate(name, template.background);
    copy.fields = template.fields.map(field => ({ ...field, id: id('field') }));
    return copy;
  }
  function replaceBackground(template, background) {
    const dimensionsChanged = template.background.width !== background.width || template.background.height !== background.height;
    return { template: { ...template, background: { ...background }, updatedAt: new Date().toISOString() }, dimensionsChanged };
  }
  function fieldValue(field, eventState) {
    const raw = field.key === 'rsvpBy' ? eventState.rsvpDate : field.key === 'customText' ? field.customText : eventState[field.key];
    if (field.key === 'eventDate') return formatEventDate(raw, field.formatter);
    if (field.key === 'rsvpBy') return formatRsvpDate(raw, field.formatter);
    return String(raw || '');
  }
  function invitationModel(template, eventState, qrUrl) {
    if (!template) throw new Error('This gathering has no invitation template assigned.');
    return { template, values: Object.fromEntries(template.fields.filter(field => field.type === 'text').map(field => [field.id, fieldValue(field, eventState)])), qrUrl };
  }
  function filenameFor(accountName, eventName) {
    const safe = `${accountName}-${eventName}-Invitation`.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${safe || 'Invitation'}.png`;
  }
  function eligibleAccounts(accounts, eventId) {
    return accounts.filter(account => account?.qrToken && account.invitedEvents?.[eventId] === true)
      .sort((left, right) => left.name.localeCompare(right.name, 'en-US', { sensitivity: 'base' }));
  }
  function versionedImageUrl(src, version) {
    if (!version) return src;
    return `${src}${src.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
  }
  function loadImage(src, version) {
    return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Unable to load invitation background.')); image.crossOrigin = 'anonymous'; image.src = versionedImageUrl(src, version); });
  }
  function drawText(ctx, text, field) {
    ctx.save(); ctx.beginPath(); ctx.rect(field.x, field.y, field.width, field.height); ctx.clip();
    ctx.font = `${field.italic ? 'italic ' : ''}${field.fontWeight || 400} ${field.fontSize}px ${JSON.stringify(field.fontFamily || 'Georgia')}, serif`;
    ctx.fillStyle = field.color || '#222'; ctx.textAlign = field.textAlign || 'left'; ctx.textBaseline = 'top';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${field.letterSpacing || 0}px`;
    if ('wordSpacing' in ctx) ctx.wordSpacing = `${field.wordSpacing || 0}px`;
    const x = field.textAlign === 'center' ? field.x + field.width / 2 : field.textAlign === 'right' ? field.x + field.width : field.x;
    ctx.fillText(text, x, field.y, field.width); ctx.restore();
  }
  function drawQr(ctx, qr, field) {
    const size = Math.min(field.width, field.height), count = qr.getModuleCount(), quiet = Math.max(4, field.quietZone || 4), modules = count + quiet * 2;
    const moduleSize = Math.floor(size / modules), drawn = moduleSize * modules, left = Math.round(field.x + (size - drawn) / 2), top = Math.round(field.y + (size - drawn) / 2);
    ctx.fillStyle = '#000';
    for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) if (qr.isDark(row, col)) ctx.fillRect(left + (col + quiet) * moduleSize, top + (row + quiet) * moduleSize, moduleSize, moduleSize);
  }
  async function render(canvas, model, qr) {
    const { template } = model, ctx = canvas.getContext('2d');
    canvas.width = template.background.width; canvas.height = template.background.height;
    ctx.drawImage(await loadImage(template.background.url, template.background.updatedAt || template.updatedAt), 0, 0, canvas.width, canvas.height);
    template.fields.forEach(field => field.type === 'qr' ? drawQr(ctx, qr, field) : drawText(ctx, model.values[field.id], field));
    return canvas;
  }
  function overflowWarnings(canvas, model) {
    const ctx = canvas.getContext('2d');
    return model.template.fields.filter(field => field.type === 'text').filter(field => {
      ctx.font = `${field.italic ? 'italic ' : ''}${field.fontWeight || 400} ${field.fontSize}px ${field.fontFamily || 'Georgia'}`;
      const value = model.values[field.id] || '';
      return ctx.measureText(value).width + Math.max(0, value.length - 1) * (field.letterSpacing || 0) + (value.split(' ').length - 1) * (field.wordSpacing || 0) > field.width;
    }).map(field => field.label);
  }
  root.Invitation = { FIELD_DEFINITIONS, FONT_FAMILIES, EVENT_DATE_FORMATTERS, RSVP_FORMATTERS, parseDate, ordinal, formatEventDate, formatRsvpDate, newField, createTemplate, duplicateTemplate, replaceBackground, fieldValue, invitationModel, filenameFor, eligibleAccounts, render, overflowWarnings };
  if (typeof module !== 'undefined') module.exports = root.Invitation;
})(typeof globalThis !== 'undefined' ? globalThis : window);
