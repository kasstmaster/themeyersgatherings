(() => {
  function normalizeMembers(members) {
    const usedIds = new Set();
    return (Array.isArray(members) ? members : []).map((entry, index) => {
      const member = typeof entry === 'string' ? { name: entry } : entry || {};
      let id = String(member.id || `party-member-${index + 1}`);
      while (usedIds.has(id)) id += '-duplicate';
      usedIds.add(id);
      const usedPageIds = new Set();
      const pages = (Array.isArray(member.pages) ? member.pages : []).filter(page => page && typeof page === 'object').map((page, pageIndex) => {
        let pageId = String(page.id || `page-${pageIndex + 1}`);
        while (usedPageIds.has(pageId)) pageId += '-duplicate';
        usedPageIds.add(pageId);
        return { id: pageId, title: String(page.title || `Page ${pageIndex + 1}`), content: typeof page.content === 'string' ? page.content : '' };
      });
      return {
        id, name: String(member.name || ''),
        title: ['Flower Girl', 'Ring Bearer'].includes(member.title) ? '' : ({ 'Maid/Matron of Honor': 'Matron of Honor', Groomsmen: 'Groomsman', Usher: 'Ushers' })[member.title] || String(member.title || ''),
        // Old role descriptions and member.description are intentionally retired.
        responsibilities: typeof member.responsibilities === 'string' ? member.responsibilities : '', pages
      };
    }).filter(member => member.name);
  }
  function visiblePages(members, hostView, memberId) {
    return members.filter(member => hostView || member.id === memberId).flatMap(member => (member.pages || []).map(page => ({
      ...page, memberName: member.name, key: `member-page:${JSON.stringify([member.id, page.id])}`
    })));
  }
  function sortByRole(members, roles) {
    const rank = new Map(roles.map((role, index) => [role, index]));
    // Sort a copy, preserving the host's ordering within each role.
    return [...members].sort((left, right) =>
      (rank.get(left.title) ?? roles.length) - (rank.get(right.title) ?? roles.length));
  }
  function normalizeBrideGroomPages(wedding) {
    const pages = Array.isArray(wedding.brideGroomPages) ? wedding.brideGroomPages : [];
    wedding.brideGroomPages = pages.filter(page => page && typeof page === 'object').map((page, index) => ({
      id: String(page.id || `bride-groom-page-${index + 2}`),
      title: String(page.title || `Page ${index + 2}`),
      content: typeof page.content === 'string' ? page.content : ''
    }));
    if (wedding.brideGroomPagesVersion !== 1) {
      wedding.brideGroomPages.unshift({ id: 'main', title: 'Bride & Groom', content: typeof wedding.brideGroomContent === 'string' ? wedding.brideGroomContent : '' });
    }
    wedding.brideGroomPagesVersion = 1;
    delete wedding.brideGroomContent;
    return wedding.brideGroomPages;
  }
  function attireSections(role) {
    const normalized=String(role || '').trim().replace(/\s+/g,' ').toLowerCase();
    if(['groomsman','groomsmen','best man','officiant'].includes(normalized))return ['gentlemen'];
    if(['bridesmaid','bridesmaids','matron of honor'].includes(normalized))return ['ladies'];
    return ['ladies','gentlemen'];
  }
  function headingDefaults(tab,page,member) {
    if(page)return {kicker:'The people by our side',title:page.title};
    if(tab==='duties'&&member)return {kicker:member.title||'Wedding Party',title:member.name};
    if(tab==='shared-timeline'||tab==='shared-details')return {kicker:'The people by our side',title:tab==='shared-timeline'?'Timeline':'Details'};
    if(tab==='attire')return {kicker:'Dress for the occasion',title:'FORMAL ATTIRE REQUIRED'};
    return {kicker:'The people by our side',title:tab==='duties'?'Your Responsibilities':'The Perfect Experience'};
  }
  function headingOwner(tab,page,member) {
    if(page?.key?.startsWith('member-page:'))return ['member-page',...JSON.parse(page.key.slice(12)).map(String)];
    if(page?.id!==undefined&&page?.id!==null)return ['site-page',String(page.id)];
    return tab==='duties'&&member?['duties',String(member.id)]:[tab];
  }
  const headingKey=(owner,part)=>'party-heading:'+encodeURIComponent(JSON.stringify([...owner,part]));
  const headingPath=(owner,part)=>`[data-content-key="${headingKey(owner,part)}"]`;
  function parseHeadingPath(path) {
    const match=/^\[data-content-key="party-heading:([^"\]]+)"\]$/.exec(path);
    if(!match)return null;
    try {const value=JSON.parse(decodeURIComponent(match[1]));return Array.isArray(value)&&value.every(item=>typeof item==='string')&&['title','kicker'].includes(value.at(-1))?value:null;}catch{return null;}
  }
  function headingCandidates(state) {
    const result=[];
    const add=(tab,page,member)=>result.push({owner:headingOwner(tab,page,member),...headingDefaults(tab,page,member)});
    for(const tab of ['duties','experience','attire'])add(tab);
    add('shared-timeline',{title:state.timelineTabTitle||'Timeline'});
    const details=(state.sitePages||[]).find(page=>!['host','party'].includes(page.audience)&&(page.weddingDefault==='details'||page.nav==='weddingPartyTabs'&&/^(?:what to expect|details)$/i.test(String(page.title||'').trim())));
    add('shared-details',{title:details?.title||'Details'});
    const members=normalizeMembers(state.weddingPartyMembers||[]);
    for(const member of members)add('duties',null,member);
    for(const page of visiblePages(members,true))add('custom',page);
    for(const page of state.sitePages||[])if(page.nav==='matronInfoTabs')add('custom',page);
    return result;
  }
  // Old reused-node overrides have no explicit owner. Recover only when their
  // original text identifies exactly one owner. Never delete or guess at data.
  function legacyHeadingText(state) {
    const result={},candidates=headingCandidates(state),normalize=value=>String(value||'').trim().replace(/\s+/g,' ');
    for(const [part,id] of [['title','weddingPartyHeading'],['kicker','weddingPartyKicker']]) {
      const record=state.textAppearance?.['#'+id]?.parts?.[0];
      if(!record||typeof record.markup!=='string')continue;
      const original=record.original??(record.overrideText===undefined?record.source:undefined);
      if(typeof original!=='string'||!normalize(original))continue;
      const matches=candidates.filter(candidate=>normalize(candidate[part])===normalize(original));
      const owners=[...new Map(matches.map(candidate=>[headingPath(candidate.owner,part),candidate])).keys()];
      if(owners.length===1)result[owners[0]]=record.markup;
    }
    return result;
  }
  function headingFields(state,tab,page,member) {
    const owner=headingOwner(tab,page,member),defaults=headingDefaults(tab,page,member),legacy=legacyHeadingText(state);
    return ['kicker','title'].map(part=>{const path=headingPath(owner,part);return {part,path,key:headingKey(owner,part),value:state.siteText?.[path]??legacy[path]??defaults[part]};});
  }
  globalThis.WeddingParty = { normalizeBrideGroomPages, normalizeMembers, visiblePages, sortByRole, attireSections, headingDefaults,headingOwner,headingKey,headingPath,parseHeadingPath,legacyHeadingText,headingFields };
})();
