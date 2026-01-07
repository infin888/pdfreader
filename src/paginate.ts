export function getPageCount(
  viewport: HTMLElement,
  flow: HTMLElement,
  orderedElements?: HTMLElement[]
): number {
  if (orderedElements && orderedElements.length > 0) {
    // Optimize by sampling elements instead of checking all
    const sampleSize = Math.min(orderedElements.length, 50);
    const step = Math.max(1, Math.floor(orderedElements.length / sampleSize));
    let maxPage = 0;
    for (let i = 0; i < orderedElements.length; i += step) {
      const el = orderedElements[i];
      const page = getTokenPageFromElement(el, viewport);
      if (page > maxPage) {
        maxPage = page;
      }
    }
    // Always check the last element to ensure we get the true max
    const lastEl = orderedElements[orderedElements.length - 1];
    const lastPage = getTokenPageFromElement(lastEl, viewport);
    if (lastPage > maxPage) {
      maxPage = lastPage;
    }
    return maxPage + 1;
  }

  const viewportWidth = Math.max(1, viewport.clientWidth);
  const totalWidth = flow.scrollWidth;
  return Math.max(1, Math.ceil(totalWidth / viewportWidth));
}

function getTokenPageFromElement(el: HTMLElement, viewport: HTMLElement): number {
  // Use getClientRects first as it's faster for multi-line elements
  const rects = el.getClientRects();
  const rect = rects.length > 0 ? rects[0] : el.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const relativeLeft = rect.left - viewportRect.left + viewport.scrollLeft;
  const width = Math.max(1, viewport.clientWidth);
  return Math.max(0, Math.floor(relativeLeft / width));
}

export function collectTokenElements(flow: HTMLElement): { ordered: HTMLElement[]; byIndex: Map<number, HTMLElement> } {
  const elements = Array.from(flow.querySelectorAll<HTMLElement>('[data-idx]'));
  const byIndex = new Map<number, HTMLElement>();
  for (const el of elements) {
    const rawIdx = el.dataset.idx;
    if (!rawIdx) {
      continue;
    }
    const idx = Number(rawIdx);
    if (!Number.isNaN(idx)) {
      byIndex.set(idx, el);
    }
  }
  return { ordered: elements, byIndex };
}

export function getTokenPageIndex(
  tokenIdx: number,
  tokenElements: Map<number, HTMLElement>,
  viewport: HTMLElement
): number | null {
  const el = tokenElements.get(tokenIdx);
  return el ? getTokenPageFromElement(el, viewport) : null;
}

export function findAnchorTokenIndex(
  orderedElements: HTMLElement[],
  viewport: HTMLElement,
  pageIndex: number
): number | null {
  for (const el of orderedElements) {
    const tokenPage = getTokenPageFromElement(el, viewport);
    if (tokenPage === pageIndex) {
      const idx = Number(el.dataset.idx);
      if (!Number.isNaN(idx)) {
        return idx;
      }
    }
  }
  return null;
}

export function countWordsForPage(
  orderedElements: HTMLElement[],
  viewport: HTMLElement,
  pageIndex: number
): number {
  let count = 0;
  const viewportWidth = Math.max(1, viewport.clientWidth);
  const pageStart = pageIndex * viewportWidth;
  const pageEnd = pageStart + viewportWidth;
  
  // Use binary search to find first element on page for faster counting
  let firstOnPage = -1;
  for (let i = 0; i < orderedElements.length; i++) {
    const el = orderedElements[i];
    const tokenPage = getTokenPageFromElement(el, viewport);
    if (tokenPage === pageIndex) {
      if (firstOnPage === -1) {
        firstOnPage = i;
      }
      count += 1;
    } else if (tokenPage > pageIndex && firstOnPage !== -1) {
      // Early exit: we've passed the current page
      break;
    }
  }
  return count;
}
