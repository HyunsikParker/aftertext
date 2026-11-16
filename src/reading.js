/**
 * Make a heading focusable by setting tabindex and focus it.
 * @param {Object} host - Object with querySelector method
 * @returns {boolean} true if heading exists and was focused, false otherwise
 */
export function focusReadingHeading(host) {
  const heading = host.querySelector('h2');
  if (!heading) return false;
  heading.tabIndex = -1;
  heading.focus();
  return true;
}

/**
 * Determine whether focus should move to the reading heading based on state.
 * @param {Object} state - Object with { mode, format, initiated } properties
 * @returns {boolean} true if focus should move, false otherwise
 */
export function shouldMoveFocus(state) {
  return state.mode === 'reader' && state.format === 'text' && state.initiated === true;
}

/**
 * Build a polite announcement message for screen readers when navigating to a page.
 * @param {Object} pageData - Object with { pageNumber, kind, title, article, subpageIndex, subpageCount }
 * @param {Array} articles - Array of article objects sorted by page, each with a 'page' property
 * @param {string} [format] - The current format ('text' or 'grid'). Subpage info is only added in 'grid' format.
 * @returns {string} Announcement message
 */
export function buildAnnouncementMessage(pageData, articles, format) {
  const totalNotices = articles.length;
  if (pageData.kind === 'index') {
    const plural = totalNotices === 1 ? 'notice' : 'notices';
    return `Page 100, index, ${totalNotices} ${plural}`;
  }
  const position = findNoticePosition(pageData.pageNumber, articles);
  const base = `Page ${pageData.pageNumber}, ${pageData.title}, notice ${position} of ${totalNotices}`;
  if (format === 'grid' && pageData.subpageCount > 1) {
    return `${base}, subpage ${pageData.subpageIndex + 1} of ${pageData.subpageCount}`;
  }
  return base;
}

/**
 * Find the 1-based position of a notice by page number in the articles array.
 * The articles are sorted by page number to find the correct position.
 * @param {number} pageNumber - The page number to find
 * @param {Array} articles - Array of article objects with a 'page' property
 * @returns {number} 1-based position of the notice, or 0 if not found
 */
export function findNoticePosition(pageNumber, articles) {
  const sorted = [...articles].sort((a, b) => a.page - b.page);
  const index = sorted.findIndex(a => a.page === pageNumber);
  return index >= 0 ? index + 1 : 0;
}
