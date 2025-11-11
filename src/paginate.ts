import type { Token } from './pdf';

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

export function getTokenPageIndex(tokenIdx: number, flow: HTMLElement, viewport: HTMLElement): number | null {
  const el = flow.querySelector<HTMLElement>(`[data-idx="${tokenIdx}"]`);
  if (!el) {
    return null;
  }
  return getTokenPageFromElement(el, viewport);
}

export function findAnchorTokenIndex(tokens: Token[], flow: HTMLElement, viewport: HTMLElement, pageIndex: number): number | null {
  for (const token of tokens) {
    const el = flow.querySelector<HTMLElement>(`[data-idx="${token.idx}"]`);
    if (!el) {
      continue;
    }
    const tokenPage = getTokenPageFromElement(el, viewport);
    if (tokenPage === pageIndex) {
      return token.idx;
    }
  }
  return null;
}

export function countWordsForPage(tokens: Token[], flow: HTMLElement, viewport: HTMLElement, pageIndex: number): number {
  let count = 0;
  const width = Math.max(1, viewport.clientWidth);
  const viewportRect = viewport.getBoundingClientRect();
  for (const token of tokens) {
    const el = flow.querySelector<HTMLElement>(`[data-idx="${token.idx}"]`);
    if (!el) {
      continue;
    }
    const rect = el.getClientRects()[0] ?? el.getBoundingClientRect();
    const relativeLeft = rect.left - viewportRect.left + viewport.scrollLeft;
    const tokenPage = Math.max(0, Math.floor(relativeLeft / width));
    if (tokenPage === pageIndex) {
      count += 1;
    }
  }
  return count;
}
