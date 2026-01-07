import { useRef, useLayoutEffect } from 'react';
import type { Paragraph, Token } from './pdf';

/**
 * Custom hook to efficiently manage token element collection
 * Memoizes element collection to prevent unnecessary DOM queries
 */
export function useTokenElements(
  flowRef: React.RefObject<HTMLDivElement>,
  paragraphs: Paragraph[],
  tokens: Token[]
) {
  const orderedTokenElementsRef = useRef<HTMLElement[]>([]);
  const tokenElementMapRef = useRef<Map<number, HTMLElement>>(new Map());

  useLayoutEffect(() => {
    if (!flowRef.current) {
      orderedTokenElementsRef.current = [];
      tokenElementMapRef.current = new Map();
      return;
    }

    // Use querySelectorAll which is faster than manual iteration
    const elements = Array.from(flowRef.current.querySelectorAll<HTMLElement>('[data-idx]'));
    const byIndex = new Map<number, HTMLElement>();
    
    // Single pass to build the map
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rawIdx = el.dataset.idx;
      if (rawIdx) {
        const idx = Number(rawIdx);
        if (!Number.isNaN(idx)) {
          byIndex.set(idx, el);
        }
      }
    }
    
    orderedTokenElementsRef.current = elements;
    tokenElementMapRef.current = byIndex;
  }, [flowRef, paragraphs, tokens]);

  return {
    orderedElements: orderedTokenElementsRef,
    elementMap: tokenElementMapRef
  };
}
