/* One shared RSVP journey; gathering-specific questions come from app.js. */
(() => {
  let context, key = '', active = false;
  const form = document.querySelector('#rsvpForm');
  const dialog = document.querySelector('#rsvpDialog');
  const next = document.querySelector('#rsvpNext');
  const back = document.querySelector('#rsvpBack');
  const progress = document.querySelector('#rsvpProgress');
  const review = document.querySelector('#rsvpReview');
  const candidates = '[data-rsvp-question],#rsvpAttendance,#rsvpPeople,.rsvp-person,.rsvp-person>label,.rsvp-guest-fields,.rsvp-guest-fields>label,[data-person-guest-name],#rsvpChildrenCounter,#rsvpGuestsCounter,#rsvpAdultsCounter,#rsvpChildNames,.rsvp-child-name,#weddingRsvpMenu,#weddingRsvpGuests,.wedding-rsvp-guest,.wedding-meal-options,.wedding-rsvp-guest>label';
  function steps() { return [...context.steps(), { key:'review', element:review }]; }
  function focus(element) {
    const input = element.querySelector('input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)') || (element.matches('input,select,textarea') && !element.disabled ? element : next);
    input.focus({preventScroll:true});
  }
  function show(moveFocus = false) {
    if (!active || !dialog.open) return;
    const all = steps();
    let index = all.findIndex(step=>step.key===key);
    if (index < 0) { index = 0; key = all[0].key; }
    const step = all[index];
    form.querySelectorAll(candidates).forEach(element=>element.setAttribute('data-rsvp-flow-hidden',''));
    review.hidden = step.key !== 'review';
    for (let element=step.element;element && element!==form;element=element.parentElement) element.removeAttribute('data-rsvp-flow-hidden');
    if (step.key === 'review') context.review(review);
    back.hidden = index === 0;
    next.textContent = step.key === 'review' || context.finishOn?.(step.key) ? 'Save my RSVP' : 'Next';
    progress.textContent = `Step ${index + 1} of ${all.length}`;
    if (moveFocus) { dialog.scrollTop=0; form.scrollTop=0; focus(step.element); }
  }
  function invalid(step) {
    const controls = [...step.element.querySelectorAll('input,select,textarea')];
    if (step.element.matches('input,select,textarea')) controls.unshift(step.element);
    return controls.find(input=>input.willValidate && !input.checkValidity());
  }
  function start(options) {
    context = options;
    active = !options.editing;
    form.classList.toggle('rsvp-guided',active);
    form.querySelectorAll('[data-rsvp-flow-hidden]').forEach(element=>element.removeAttribute('data-rsvp-flow-hidden'));
    review.hidden=true;progress.hidden=!active;back.hidden=true;
    next.textContent=active?'Next':'Save my RSVP';
    key=active?steps()[0].key:'';
    if (active) show(true);
  }
  function submit(event) {
    if (!active) return form.reportValidity();
    const all=steps(),index=all.findIndex(step=>step.key===key),step=all[index];
    if(index<0){event.preventDefault();show(true);return false;}
    const validation=context.validate?.(step.key);
    const finishing=step.key==='review'||context.finishOn?.(step.key);
    const bad=validation===false?step:typeof validation==='string'?all.find(candidate=>candidate.key===validation):finishing?all.slice(0,-1).find(candidate=>invalid(candidate)):invalid(step)?step:null;
    if (bad) {
      event.preventDefault();key=bad.key;show(true);invalid(bad)?.reportValidity();return false;
    }
    if (!finishing) {event.preventDefault();key=all[index+1].key;show(true);return false;}
    return true;
  }
  back.addEventListener('click',()=>{const all=steps(),index=all.findIndex(step=>step.key===key);if(index>0){key=all[index-1].key;show(true);}});
  dialog.querySelector('.modal-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{active=false;form.querySelectorAll('[data-rsvp-flow-hidden]').forEach(element=>element.removeAttribute('data-rsvp-flow-hidden'));});
  globalThis.RsvpFlow={start,submit,refresh:()=>show()};
})();
