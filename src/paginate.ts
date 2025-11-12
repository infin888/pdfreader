export function getPageCount(viewport: HTMLElement, flow: HTMLElement): number {
  const viewportWidth = Math.max(1, viewport.clientWidth);
  const totalWidth = flow.scrollWidth;
  return Math.max(1, Math.ceil(totalWidth / viewportWidth));
}

function getTokenPageFromElement(el: HTMLElement, viewport: HTMLElement): number {
  const rect = el.getClientRects()[0] ?? el.getBoundingClientRect();
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
  for (const el of orderedElements) {
    const tokenPage = getTokenPageFromElement(el, viewport);
    if (tokenPage === pageIndex) {
      count += 1;
    }
  }
  return count;
}
