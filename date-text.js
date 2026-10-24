// All gatherings share one first-page RSVP date sizing rule.
(() => {
  const selector='#rsvpFirstPageDate';
  const observed=new WeakSet();
  function fit(element) {
    element.style.removeProperty('font-size');
    const width=element.clientWidth;
    if(!width || !element.textContent.trim())return;
    const maximum=parseFloat(getComputedStyle(element).fontSize);
    if(!Number.isFinite(maximum) || element.scrollWidth<=width)return;
    // Find the largest fitting size rather than repeatedly scaling down.
    let low=0,high=maximum;
    for(let pass=0;pass<12 && high-low>.05;pass++) {
      const size=(low+high)/2;
      element.style.fontSize=`${size}px`;
      if(element.scrollWidth<=width)low=size;else high=size;
    }
    element.style.fontSize=`${low}px`;
  }
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target))):null;
  function fitAll() {
    document.querySelectorAll(selector).forEach(element=>{
      if(!observed.has(element)){observed.add(element);resize?.observe(element);}
      fit(element);
    });
  }
  const changes=new MutationObserver(fitAll);
  changes.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',fitAll);
  document.fonts?.ready.then(fitAll);
  globalThis.DateText={fit,fitAll};
  fitAll();
})();
