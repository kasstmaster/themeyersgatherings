/* One shared RSVP journey; gathering-specific questions come from app.js. */
(() => {
  let context, key = '', active = false;
  const form = document.querySelector('#rsvpForm');
  const dialog = document.querySelector('#rsvpDialog');
  const next = document.querySelector('#rsvpNext');
  const back = document.querySelector('#rsvpBack');
  const navigation=next.closest('.modal-dialog-footer');
  const review = document.querySelector('#rsvpReview');
  const heading=document.querySelector('#rsvpHeading');
  const kicker=form.querySelector('.section-kicker');
  const childAge=document.querySelector('#rsvpChildAge');
  let defaultHeading=heading.textContent,defaultKicker=kicker.textContent;
  const candidates = '#rsvpEventConfirmation,#rsvpAttire,[data-rsvp-question],#rsvpAttendance,#rsvpPeople,.rsvp-person,.rsvp-attendance-options,.rsvp-person>label,.rsvp-guest-fields,.rsvp-guest-fields>label,[data-person-guest-name],#rsvpChildrenQuestion,#rsvpGuestsCounter,#rsvpAdultsCounter,#weddingRsvpMenu,#weddingRsvpGuests,.wedding-rsvp-guest,.wedding-meal-options,.wedding-rsvp-guest>label';
  function steps() { return context.editing?context.steps():[...context.steps(), { key:'review', element:review, title:'Review your RSVP' }]; }
  function focus(element) {
    if(element.id==='rsvpAttire'){heading.focus({preventScroll:true});return;}
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
    if(context.editing && step.key==='meal-options')step.element.querySelectorAll('[data-rsvp-flow-hidden]').forEach(element=>element.removeAttribute('data-rsvp-flow-hidden'));
    heading.textContent=step.title || defaultHeading;
    heading.hidden=step.key==='event-confirmation';
    const attendance=step.key.startsWith('person-');
    kicker.hidden=!attendance && step.key!=='attire';
    kicker.textContent=step.key==='attire'?'Dress for the occasion':defaultKicker;
    childAge.hidden=step.key!=='children';
    form.classList.toggle('rsvp-choosing-attendance',attendance);
    form.classList.toggle('rsvp-personal-meal',step.key.startsWith('meal-')||step.key.startsWith('dietary-'));
    if (step.key === 'review') context.review(review);
    back.hidden = index === 0;
    next.hidden=Boolean(step.element.querySelector('[data-rsvp-advance]'));
    navigation.hidden=back.hidden && next.hidden;
    form.classList.toggle('rsvp-direct-choice',next.hidden);
    form.classList.toggle('rsvp-attire-step',step.key==='attire');
    form.classList.toggle('rsvp-dish-selection',step.key==='dishes'||step.key==='attire'||step.key==='event-confirmation');
    next.textContent=step.key==='review'||(!context.editing && context.finishOn?.(step.key))?'Save my RSVP':'Next';
    if (moveFocus) { dialog.scrollTop=0; form.scrollTop=0; focus(step.element);context.pageChanged?.(); }
  }
  function invalid(step) {
    const controls = [...step.element.querySelectorAll('input,select,textarea')];
    if (step.element.matches('input,select,textarea')) controls.unshift(step.element);
    return controls.find(input=>input.willValidate && !input.checkValidity());
  }
  function start(options) {
    context = options;
    defaultHeading=heading.textContent;defaultKicker=kicker.textContent;
    active = true;
    form.classList.toggle('rsvp-guided',active);
    form.classList.remove('rsvp-direct-choice','rsvp-dish-selection','rsvp-choosing-attendance','rsvp-personal-meal','rsvp-attire-step');
    childAge.hidden=true;heading.hidden=false;
    form.querySelectorAll('[data-rsvp-flow-hidden]').forEach(element=>element.removeAttribute('data-rsvp-flow-hidden'));
    review.hidden=true;back.hidden=true;next.hidden=false;kicker.hidden=false;
    next.textContent='Next';
    key=steps()[0].key;show(true);
  }
  function submit(event) {
    if (!active) return form.reportValidity();
    const all=steps(),index=all.findIndex(step=>step.key===key),step=all[index];
    if(index<0){event.preventDefault();show(true);return false;}
    if(context.editing){event.preventDefault();key=all[(index+1)%all.length].key;show(true);return false;}
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
  function exitQuestions(){if(active && context && key!==steps()[0].key){key=steps()[0].key;show(true);return true;}return false;}
  dialog.querySelector('.modal-close').addEventListener('click',()=>{if(!exitQuestions())dialog.close();});
  dialog.addEventListener('cancel',event=>{if(exitQuestions())event.preventDefault();});
  dialog.addEventListener('close',()=>{active=false;heading.hidden=false;heading.textContent=defaultHeading;kicker.textContent=defaultKicker;kicker.hidden=false;childAge.hidden=true;form.querySelectorAll('[data-rsvp-flow-hidden]').forEach(element=>element.removeAttribute('data-rsvp-flow-hidden'));});
  globalThis.RsvpFlow={go:target=>{if(active&&steps().some(step=>step.key===target)){key=target;show(true);}},first:()=>{if(active && context){key=steps()[0].key;show(true);}},start,submit,refresh:()=>show()};
})();
