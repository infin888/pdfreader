export function getPageCount(
  viewport: HTMLElement,
  flow: HTMLElement,
  pageWidth: number,
  orderedElements?: HTMLElement[]
): number {
  if (orderedElements && orderedElements.length > 0) {
    let maxPage = 0;
    for (const el of orderedElements) {
      const page = getTokenPageFromElement(el, viewport, pageWidth);
      if (page > maxPage) {
        maxPage = page;
      }
    }
    return maxPage + 1;
  }

  const totalWidth = flow.scrollWidth;
  const width = Math.max(1, pageWidth);
  return Math.max(1, Math.ceil(totalWidth / width));
}

function getTokenPageFromElement(el: HTMLElement, viewport: HTMLElement, pageWidth: number): number {
  const rect = el.getClientRects()[0] ?? el.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const relativeLeft = rect.left - viewportRect.left + viewport.scrollLeft;
  const width = Math.max(1, pageWidth);
  return Math.max(0, Math.floor(relativeLeft / width));
}

export function getElementPage(element: HTMLElement, viewport: HTMLElement, pageWidth: number): number {
  return getTokenPageFromElement(element, viewport, pageWidth);
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
  viewport: HTMLElement,
  pageWidth: number
): number | null {
  const el = tokenElements.get(tokenIdx);
  return el ? getTokenPageFromElement(el, viewport, pageWidth) : null;
}

export function findAnchorTokenIndex(
  orderedElements: HTMLElement[],
  viewport: HTMLElement,
  pageIndex: number,
  pageWidth: number
): number | null {
  for (const el of orderedElements) {
    const tokenPage = getTokenPageFromElement(el, viewport, pageWidth);
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
  pageIndex: number,
  pageWidth: number
): number {
  let count = 0;
  for (const el of orderedElements) {
    const tokenPage = getTokenPageFromElement(el, viewport, pageWidth);
    if (tokenPage === pageIndex) {
      count += 1;
    }
  }
  return count;
}
