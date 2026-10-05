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
        title: ({ 'Maid/Matron of Honor': 'Matron of Honor', Groomsmen: 'Groomsman', Usher: 'Ushers' })[member.title] || String(member.title || ''),
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
  globalThis.WeddingParty = { normalizeMembers, visiblePages };
})();
