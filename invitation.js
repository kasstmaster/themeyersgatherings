(function (root) {
  'use strict';

  const FIELD_DEFINITIONS = Object.freeze({
    eventTime: { label: 'Event Time', type: 'text', formatter: 'plain' },
    address: { label: 'Full Address', type: 'text', formatter: 'plain' },
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
    ['weekday-month-day-year-spaced', 'Saturday   November   21   2026'],
    ['weekday-month-ordinal-year-spaced', 'Saturday   November   21st   2026'],
    ['weekday-month-ordinal-year', 'Saturday November 21st 2026'],
    ['month-ordinal-year', 'November 21st 2026'],
    ['month-day-year', 'November 6 2026'],
    ['month-day-comma-year', 'November 21, 2026']
  ]);
  const RSVP_FORMATTERS = Object.freeze([['by-short-month-day', 'Kindly RSVP By Nov. 7'], ['short-month-day', 'Nov. 7'], ['month-day', 'November 7']]);

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
    if (formatter === 'weekday-month-day-year-spaced') return `${weekday} ${month} ${day} ${year}`;
    if (formatter === 'month-ordinal-year') return `${month} ${ordinal(day)} ${year}`;
    if (formatter === 'month-day-year') return `${month} ${day} ${year}`;
    if (formatter === 'month-day-comma-year') return `${month} ${day}, ${year}`;
    return `${weekday} ${month} ${ordinal(day)} ${year}`;
  }
  function formatRsvpDate(value, formatter = 'by-short-month-day') {
    const date = parseDate(value); if (!date) return '';
    if (formatter === 'month-day') return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const short = `${shortMonths[date.getUTCMonth()]} ${date.getUTCDate()}`;
    return formatter === 'short-month-day' ? short : `Kindly RSVP By ${short}`;
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
  function newImage(image,canvas) {
    const scale=Math.min(1,canvas.width*.4/image.width,canvas.height*.4/image.height),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
    return {id:id('field'),key:'image',type:'image',label:'Image',image:{...image},lockAspect:true,width,height,x:Math.round((canvas.width-width)/2),y:Math.round((canvas.height-height)/2)};
  }
  function resizeImage(field,key,value) {
    const next=Math.max(1,Number(value));if(!Number.isFinite(next))return;
    field[key]=next;
    if(field.lockAspect!==false){const ratio=field.image.width/field.image.height;if(key==='width')field.height=next/ratio;else field.width=next*ratio;}
  }
  function createTemplate(name, background) {
    const now = new Date().toISOString();
    return { id: id(), name: String(name || 'Untitled template').trim(), background: { ...background }, fields: [], createdAt: now, updatedAt: now };
  }
  function duplicateTemplate(template, name = `${template.name} copy`) {
    const copy = createTemplate(name, template.background);
    copy.fields = template.fields.map(field => ({ ...field, ...(field.image?{image:{...field.image}}:{}), id: id('field') }));
    return copy;
  }
  function replaceBackground(template, background) {
    const dimensionsChanged = template.background.width !== background.width || template.background.height !== background.height;
    return { template: { ...template, background: { ...background }, updatedAt: new Date().toISOString() }, dimensionsChanged };
  }
  function fieldValue(field, eventState) {
    eventState=root.SharedDetails?root.SharedDetails.invitationValues(eventState):{...eventState,eventTime:eventState.eventTime || eventState.ceremonyTime || eventState.churchTime || '',ceremonyTime:eventState.eventTime || eventState.ceremonyTime || eventState.churchTime || '',address:eventState.homeAddress || [eventState.addressLine1,eventState.addressLine2].filter(Boolean).join('\n')};
    const raw = field.key === 'rsvpBy' ? eventState.rsvpDate : field.key === 'customText' ? field.customText : eventState[field.key];
    const value=field.key==='eventDate'?formatEventDate(raw,field.formatter):field.key==='rsvpBy'?formatRsvpDate(raw,field.formatter):String(raw || '');
    return field.allCaps?value.toUpperCase():value;
  }

  function dateFormatOptions(field,eventState) {
    const formats=field.key==='eventDate'?EVENT_DATE_FORMATTERS:RSVP_FORMATTERS;
    return formats.map(([value])=>({value,label:(fieldValue({...field,formatter:value},eventState) || value.split('-').join(' ')).replace(/ /g,value.endsWith('-spaced')?'\u2002\u2002':' ')}));
  }

  function snapHorizontal(field,canvasWidth,scale=1,enabled=true) {
    const x=(canvasWidth-field.width)/2;
    return enabled&&field.width<=canvasWidth&&Math.abs((field.x-x)*scale)<=8?{x,snapped:true}:{x:field.x,snapped:false};
  }
  function mandatoryFields(background) {
    const {width,height}=background;
    return ['eventDate','eventTime','address','rsvpBy'].map((key,index)=>({...newField(key,width*.1,height*[.5,.59,.68,.85][index]),width:Math.round(width*.8),height:Math.round(height*(key==='address'?.15:.08)),fontSize:Math.min(28,Math.max(10,Math.round(width/24)))}));
  }
  function validateTemplate(template,event) {
    if(!event||typeof event!=='object')throw new Error('That gathering is no longer available.');
    if(!template?.background||!Array.isArray(template.fields)||template.fields.some(field=>!field||!['text','qr','image'].includes(field.type)||typeof field.key!=='string'))throw new Error('This template has invalid field data.');
    for(const field of template.fields.filter(field=>field.type==='image')){let url;try{url=new URL(field.image?.url);}catch{throw new Error('This image has not finished uploading.');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password||![field.image.width,field.image.height,field.width,field.height].every(value=>Number.isFinite(value)&&value>0))throw new Error('This image has invalid dimensions or address.');}
    return true;
  }
  function templateRequirements(template,event) {
    const values=root.SharedDetails?root.SharedDetails.invitationValues(event):event || {},missingValues=[],missingFields=[];
    if(!parseDate(values.eventDate))missingValues.push('eventDate');
    if(!String(values.eventTime ?? values.ceremonyTime ?? values.churchTime ?? '').trim())missingValues.push('eventTime');
    if(!String(values.address || values.homeAddress || values.addressLine1 || values.churchStreet || '').trim())missingValues.push('address');
    if(!parseDate(values.rsvpDate))missingValues.push('rsvpBy');
    const fields=(template.fields || []).filter(field=>field?.type==='text'&&field.width>0&&field.height>0&&field.x>=0&&field.y>=0&&field.x<template.background?.width&&field.y<template.background?.height),has=key=>fields.some(field=>field.key===key);
    if(!has('eventDate'))missingFields.push('eventDate');
    if(!has('eventTime')&&!has('ceremonyTime'))missingFields.push('eventTime');
    if(!has('address')&&(!has('addressLine1')||(String(values.addressLine2 || '').trim()&&!has('addressLine2'))))missingFields.push('address');
    if(!has('rsvpBy'))missingFields.push('rsvpBy');
    return {missingValues,missingFields};
  }
  function copyForGathering(source,eventId,name,background) {
    const template=duplicateTemplate(source,name);template.eventId=eventId;template.background={...background};return template;
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
  function textFont(field) {return `${field.italic ? 'italic ' : ''}${field.fontWeight || 400} ${field.fontSize}px ${JSON.stringify(field.fontFamily || 'Georgia')}, serif`;}
  async function loadTextFonts(fields,values) {
    if(!root.document?.fonts?.load)return;
    await Promise.all(fields.filter(field=>field.type==='text').map(field=>root.document.fonts.load(textFont(field),String(values[field.id] || ' '))));
  }
  function configureText(ctx,field) {
    ctx.font=textFont(field);ctx.fillStyle=field.color || '#222';ctx.textAlign=field.textAlign || 'left';ctx.textBaseline='top';
    if('letterSpacing' in ctx)ctx.letterSpacing=`${field.letterSpacing || 0}px`;
    if('wordSpacing' in ctx)ctx.wordSpacing=`${field.wordSpacing || 0}px`;
  }
  function textVerticalOffset(ctx,text,field) {
    const lines=String(text).split(/\r?\n/),step=field.fontSize*(field.lineHeight || 1.2);let top=Infinity,bottom=-Infinity;
    lines.forEach((line,index)=>{const m=ctx.measureText?.(line || ' ') || {};top=Math.min(top,index*step-(m.actualBoundingBoxAscent ?? 0));bottom=Math.max(bottom,index*step+(m.actualBoundingBoxDescent ?? field.fontSize));});
    return (field.height-(bottom-top))/2-top;
  }
  function drawText(ctx, text, field) {
    ctx.save(); ctx.beginPath(); ctx.rect(field.x, field.y, field.width, field.height); ctx.clip();
    configureText(ctx,field);
    const x = field.textAlign === 'center' ? field.x + field.width / 2 : field.textAlign === 'right' ? field.x + field.width : field.x;
    const offset=textVerticalOffset(ctx,text,field);
    String(text).split(/\r?\n/).forEach((line,index)=>ctx.fillText(line,x,field.y+offset+index*field.fontSize*(field.lineHeight || 1.2))); ctx.restore();
  }
  async function renderTextField(canvas,field,text) {
    await loadTextFonts([field],{[field.id]:text});
    canvas.width=Math.max(1,Math.ceil(field.width));canvas.height=Math.max(1,Math.ceil(field.height));
    drawText(canvas.getContext('2d'),text,{...field,x:0,y:0});return canvas;
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
    await loadTextFonts(template.fields,model.values);
    const images=new Map(await Promise.all(template.fields.filter(field=>field.type==='image').map(async field=>[field.id,await loadImage(field.image.url,field.image.updatedAt)])));
    for(const field of template.fields){if(field.type==='image')ctx.drawImage(images.get(field.id),field.x,field.y,field.width,field.height);else if(field.type==='qr')drawQr(ctx,qr,field);else drawText(ctx,model.values[field.id],field);}
    return canvas;
  }
  function overflowDetails(canvas,model) {
    const ctx=canvas.getContext('2d'),issues=[];
    for(const field of model.template.fields.filter(field=>field.type==='text')){
      configureText(ctx,field);let width=false,height=false;
      const anchor=field.textAlign==='center'?field.width/2:field.textAlign==='right'?field.width:0;
      const offset=textVerticalOffset(ctx,model.values[field.id] || '',field);
      String(model.values[field.id] || '').split(/\r?\n/).forEach((line,index)=>{
        if(!line.trim())return;
        const metrics=ctx.measureText(line),advance=metrics.width+('letterSpacing' in ctx?0:Math.max(0,line.length-1)*(field.letterSpacing || 0))+('wordSpacing' in ctx?0:(line.split(' ').length-1)*(field.wordSpacing || 0));
        const left=Number.isFinite(metrics.actualBoundingBoxLeft)?metrics.actualBoundingBoxLeft:field.textAlign==='center'?advance/2:field.textAlign==='right'?advance:0;
        const right=Number.isFinite(metrics.actualBoundingBoxRight)?metrics.actualBoundingBoxRight:advance-left;
        const y=offset+index*field.fontSize*(field.lineHeight || 1.2),top=y-(metrics.actualBoundingBoxAscent ?? 0),bottom=y+(metrics.actualBoundingBoxDescent ?? field.fontSize);
        if(anchor-left<-.5||anchor+right>field.width+.5)width=true;
        if(top<-.5||bottom>field.height+.5)height=true;
      });
      if(width||height)issues.push({label:field.label,width,height});
    }
    return issues;
  }
  function overflowWarnings(canvas,model){return overflowDetails(canvas,model).map(issue=>issue.label);}
  root.Invitation = { dateFormatOptions, versionedImageUrl, newImage, resizeImage, renderTextField, textFont, snapHorizontal, mandatoryFields, validateTemplate, templateRequirements, copyForGathering, FIELD_DEFINITIONS, FONT_FAMILIES, EVENT_DATE_FORMATTERS, RSVP_FORMATTERS, parseDate, ordinal, formatEventDate, formatRsvpDate, newField, createTemplate, duplicateTemplate, replaceBackground, fieldValue, invitationModel, filenameFor, eligibleAccounts, render, overflowDetails, overflowWarnings };
  if (typeof module !== 'undefined') module.exports = root.Invitation;
})(typeof globalThis !== 'undefined' ? globalThis : window);
