// All gatherings share one sizing rule for RSVP titles and the first-page date and information.
(() => {
  const selector='#rsvpFirstPageText,#rsvpFirstPageDetails,#rsvpFirstPageDate,#rsvpDialog h1,#rsvpDialog h2,#rsvpDialog h3,#rsvpDialog h4,#rsvpDialog h5,#rsvpDialog h6,#rsvpDialog legend,.site-edit-mode #rsvpConfirmEvent>span,.site-edit-mode #hostFirstPageActions button>span,.site-edit-mode #weddingRsvpUploadToolbar button>span,.site-edit-mode #rsvpDialog .primary-button:not(:has(>span))';
  const observed=new Set();
  const fitted=new WeakMap();
  function fit(element,force=false) {
    if(element.closest?.('.inline-editor,.inline-edit-tools'))return;
    const authored=globalThis.ElementAppearance?.values?.(element)?.fontSize;
    const style=getComputedStyle(element),width=element.clientWidth;
    const signature=JSON.stringify([width,element.innerHTML??element.textContent,authored,style.fontFamily,style.fontWeight,style.fontStyle,style.letterSpacing,style.textTransform]);
    if(!force&&width&&fitted.get(element)===signature)return;
    const owner=element.closest?.('dialog[open]')||document.scrollingElement;
    const scrollTop=owner?.scrollTop,scrollLeft=owner?.scrollLeft;
    try {
    element.style.removeProperty('--fitted-text-scale');
    // Fit from the saved size, not the theme default. Redraws must not erase
    // the gathering's authored typography while measuring available width.
    if(Number.isFinite(authored) && authored>=8 && authored<=96)element.style.setProperty('font-size',`calc(${authored}px * var(--fitted-text-scale,1))`,'important');
    else element.style.removeProperty('font-size');
    if(!width || !element.textContent.trim())return;
    const maximum=parseFloat(getComputedStyle(element).fontSize);
    if(!Number.isFinite(maximum) || element.scrollWidth<=width)return;
    // Find the largest fitting size rather than repeatedly scaling down.
    let low=0,high=maximum;
    for(let pass=0;pass<12 && high-low>.05;pass++) {
      const size=(low+high)/2;
      element.style.fontSize=`${size}px`;
      element.style.setProperty('--fitted-text-scale',String(size/maximum));
      if(element.scrollWidth<=width)low=size;else high=size;
    }
    element.style.fontSize=`${low}px`;
    element.style.setProperty('--fitted-text-scale',String(low/maximum));
    }finally{
      if(width)fitted.set(element,signature);else fitted.delete(element);
      // Binary-search measurements temporarily shrink the scrollable content.
      // Restore its position once the final fitted height is in place.
      if(Number.isFinite(scrollTop)&&owner.scrollTop!==scrollTop){if(owner.scrollTo)owner.scrollTo({top:scrollTop,left:scrollLeft,behavior:'instant'});else owner.scrollTop=scrollTop;}
    }
  }
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target))):null;
  function fitAll(force=false) {
    // Dynamic RSVP pages are rebuilt often; don't retain removed headings.
    for(const element of observed)if(element.isConnected===false){resize?.unobserve(element);observed.delete(element);}
    document.querySelectorAll(selector).forEach(element=>{
      if(!observed.has(element)){observed.add(element);resize?.observe(element);}
      fit(element,force);
    });
  }
  const changes=new MutationObserver(()=>fitAll());
  changes.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',()=>fitAll());
  document.fonts?.ready.then(()=>fitAll(true));
  globalThis.FittedText={fit:element=>fit(element,true),fitAll};
  fitAll();
})();
