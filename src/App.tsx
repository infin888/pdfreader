import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Paragraph, Token } from './pdf';
import { loadPdfFromFile, loadPdfFromUrl } from './pdf';
import { countWordsForPage, findAnchorTokenIndex, getPageCount, getTokenPageIndex } from './paginate';
import { persistReadingState, restoreReadingState } from './storage';

const DEFAULT_FONT_SIZE = 18;
const MIN_FONT = 14;
const MAX_FONT = 26;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function App(): JSX.Element {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string | undefined>();
  const [pageCount, setPageCount] = useState<number>(1);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [wordsOnPage, setWordsOnPage] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const anchorTokenRef = useRef<number | null>(null);
  const pendingPageRef = useRef<number | null>(null);

  const hasDocument = tokens.length > 0;

  const scrollToPage = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      const clampedIndex = clamp(index, 0, Math.max(0, pageCount - 1));
      const targetLeft = clampedIndex * viewport.clientWidth;
      viewport.scrollTo({ left: targetLeft, behavior });
    },
    [pageCount]
  );

  const captureAnchor = useCallback(() => {
    if (!flowRef.current || !viewportRef.current || !tokens.length) {
      return null;
    }
    return findAnchorTokenIndex(tokens, flowRef.current, viewportRef.current, pageIndex);
  }, [pageIndex, tokens]);

  const handlePrev = useCallback(() => {
    scrollToPage(pageIndex - 1);
  }, [pageIndex, scrollToPage]);

  const handleNext = useCallback(() => {
    scrollToPage(pageIndex + 1);
  }, [pageIndex, scrollToPage]);

  const handlePageSelect = useCallback(
    (value: number) => {
      scrollToPage(value);
    },
    [scrollToPage]
  );

  const onFontSizeChange = useCallback(
    (value: number) => {
      anchorTokenRef.current = captureAnchor();
      setFontSize(value);
    },
    [captureAnchor]
  );

  const updateWordsForPage = useCallback(
    (page: number) => {
      if (!flowRef.current || !viewportRef.current || !tokens.length) {
        setWordsOnPage(0);
        return;
      }
      const count = countWordsForPage(tokens, flowRef.current, viewportRef.current, page);
      setWordsOnPage(count);
    },
    [tokens]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const width = Math.max(1, viewport.clientWidth);
        const currentPage = Math.round(viewport.scrollLeft / width);
        setPageIndex((prev) => {
          if (prev === currentPage) {
            return prev;
          }
          return clamp(currentPage, 0, Math.max(0, pageCount - 1));
        });
      });
    };
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, [pageCount]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const updateSize = () => {
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(() => {
      anchorTokenRef.current = captureAnchor();
      updateSize();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [captureAnchor]);

  useLayoutEffect(() => {
    if (!flowRef.current || !viewportRef.current || !tokens.length) {
      setPageCount(1);
      setWordsOnPage(0);
      return;
    }
    const viewport = viewportRef.current;
    const flow = flowRef.current;
    const newPageCount = getPageCount(viewport, flow);
    setPageCount(newPageCount);

    let targetPage = clamp(pageIndex, 0, newPageCount - 1);

    if (pendingPageRef.current != null) {
      targetPage = clamp(pendingPageRef.current, 0, newPageCount - 1);
      pendingPageRef.current = null;
    } else if (anchorTokenRef.current != null) {
      const anchorPage = getTokenPageIndex(anchorTokenRef.current, flow, viewport);
      if (anchorPage != null) {
        targetPage = clamp(anchorPage, 0, newPageCount - 1);
      }
      anchorTokenRef.current = null;
    }

    setTimeout(() => {
      scrollToPage(targetPage, 'auto');
      updateWordsForPage(targetPage);
    }, 0);

    setPageIndex((prev) => (prev === targetPage ? prev : targetPage));
  }, [fontSize, pageIndex, scrollToPage, tokens, updateWordsForPage, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!hasDocument) {
      return;
    }
    updateWordsForPage(pageIndex);
  }, [pageIndex, fontSize, tokens, viewportSize.width, viewportSize.height, updateWordsForPage, hasDocument]);

  useEffect(() => {
    if (!docId || !hasDocument) {
      return;
    }
    persistReadingState(docId, { pageIndex, fontSizePx: fontSize });
  }, [docId, pageIndex, fontSize, hasDocument]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, handlePrev]);

  const loadResultIntoState = useCallback(
    (result: { tokens: Token[]; paragraphs: Paragraph[]; docId: string; title?: string }) => {
      setTokens(result.tokens);
      setParagraphs(result.paragraphs);
      setDocId(result.docId);
      setDocTitle(result.title);
      const restored = restoreReadingState(result.docId);
      if (restored) {
        setFontSize(restored.fontSizePx);
        pendingPageRef.current = restored.pageIndex;
        setPageIndex(restored.pageIndex);
      } else {
        setFontSize(DEFAULT_FONT_SIZE);
        pendingPageRef.current = 0;
        setPageIndex(0);
      }
    },
    []
  );

  const handleLoad = useCallback(
    async (loader: () => Promise<{ tokens: Token[]; paragraphs: Paragraph[]; docId: string; title?: string }>) => {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);
      try {
        const result = await loader();
        loadResultIntoState(result);
        setLoadingProgress(1);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setTokens([]);
        setParagraphs([]);
        setDocId(null);
        setDocTitle(undefined);
        setWordsOnPage(0);
      } finally {
        setIsLoading(false);
      }
    },
    [loadResultIntoState]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      void handleLoad(() =>
        loadPdfFromFile(file, {
          onProgress: setLoadingProgress
        })
      );
    },
    [handleLoad]
  );

  const handleUrlSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!urlInput.trim()) {
        return;
      }
      const url = urlInput.trim();
      void handleLoad(() =>
        loadPdfFromUrl(url, {
          onProgress: setLoadingProgress
        })
      );
    },
    [handleLoad, urlInput]
  );

  const handleLoadSample = useCallback(() => {
    void handleLoad(() =>
      loadPdfFromUrl('/sample.pdf', {
        onProgress: setLoadingProgress
      })
    );
  }, [handleLoad]);

  const pageOptions = useMemo(() => Array.from({ length: pageCount }, (_, i) => i), [pageCount]);
  const toolbarTitle = docTitle ?? (hasDocument ? 'Loaded Document' : 'Reflow PDF Reader');

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-10 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-[200px] flex-1">
            <h1 className="text-base font-semibold text-slate-850" title={toolbarTitle}>
              {toolbarTitle}
            </h1>
            <p className="text-xs text-slate-500">Use ← → keys or swipe to move between pages</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-medium text-slate-600" htmlFor="file-input">
              Open PDF
            </label>
            <input
              id="file-input"
              aria-label="Open PDF file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <form className="flex flex-1 items-center gap-2" onSubmit={handleUrlSubmit}>
            <label className="text-xs font-medium text-slate-600" htmlFor="url-input">
              Or load by URL
            </label>
            <input
              id="url-input"
              aria-label="PDF URL"
              type="url"
              placeholder="https://example.com/doc.pdf"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              className="w-full flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="control-button rounded bg-slate-850 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none"
            >
              Load
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="control-button rounded border border-slate-400 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Sample
            </button>
          </form>
          <div className="flex items-center gap-3">
            <label htmlFor="font-slider" className="text-xs font-medium text-slate-600">
              Font size
            </label>
            <input
              id="font-slider"
              aria-label="Font size"
              type="range"
              min={MIN_FONT}
              max={MAX_FONT}
              step={1}
              value={fontSize}
              onChange={(event) => onFontSizeChange(Number(event.target.value))}
              className="w-28"
            />
            <span className="text-sm font-semibold text-slate-700">{fontSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous page"
              className="control-button rounded border border-slate-400 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              disabled={pageIndex <= 0}
            >
              ←
            </button>
            <select
              aria-label="Select page"
              value={pageCount ? clamp(pageIndex, 0, pageCount - 1) : 0}
              onChange={(event) => handlePageSelect(Number(event.target.value))}
              className="control-button rounded border border-slate-300 px-2 py-1 text-sm"
              disabled={!hasDocument}
            >
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  Page {page + 1}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next page"
              className="control-button rounded border border-slate-400 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              disabled={pageIndex >= pageCount - 1}
            >
              →
            </button>
          </div>
          <div className="min-w-[150px] text-xs font-medium text-slate-600">
            Words on page: <span className="font-semibold text-slate-900">~{wordsOnPage}</span>
          </div>
        </div>
        {isLoading ? (
          <div className="h-1 w-full bg-slate-200">
            <div className="h-full bg-slate-700 transition-all" style={{ width: `${Math.round(loadingProgress * 100)}%` }} />
          </div>
        ) : null}
        {error ? (
          <div className="bg-red-100 px-4 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 min-h-0">
        {!hasDocument && !isLoading ? (
          <section className="flex flex-1 items-center justify-center rounded border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-700">Load a PDF to begin</h2>
              <p className="text-sm">
                Choose a local file or paste a URL. Text will be reflowed into responsive pages optimized for any device.
              </p>
            </div>
          </section>
        ) : null}
        <section className="flex h-full min-h-0 flex-1 flex-col rounded-lg bg-white shadow">
          <div
            ref={viewportRef}
            className="reader-viewport flex-1 min-h-[300px] overflow-x-auto overflow-y-hidden rounded-t-lg px-6 py-6 snap-x snap-mandatory"
          >
            <div
              ref={flowRef}
              className="reader-flow h-full text-slate-900"
              style={{
                columnWidth: viewportSize.width ? `${viewportSize.width}px` : undefined,
                fontSize: `${fontSize}px`,
                lineHeight: 1.6
              }}
            >
              {paragraphs.map((paragraph) => (
                <p key={paragraph.id} className="snap-start">
                  {paragraph.tokens.map((token, index) => (
                    <span key={token.idx} data-idx={token.idx}>
                      {token.text}
                      {index < paragraph.tokens.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-white/70 py-2 text-center text-xs text-slate-500">
        Tip: Use the keyboard arrows or swipe to move between pages. Your spot is saved automatically.
      </footer>
    </div>
  );
}
