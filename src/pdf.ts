import { getDocument, GlobalWorkerOptions, type TextContent } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = workerSrc;

export interface Token {
  idx: number;
  text: string;
}

export interface Paragraph {
  id: string;
  tokens: Token[];
}

export interface LoadResult {
  docId: string;
  tokens: Token[];
  paragraphs: Paragraph[];
  title?: string;
}

export interface LoadOptions {
  onProgress?: (progress: number) => void;
}

type SourceKind = 'file' | 'url';

type TextItem = {
  str: string;
  hasEOL?: boolean;
};

const SPACE_REGEX = /\s+/g;

function normalizeTextContent(content: TextContent): string[] {
  const chunks: string[] = [];
  const items = content.items as TextItem[];
  const length = items.length;
  
  for (let i = 0; i < length; i++) {
    const item = items[i];
    if (!item || typeof item.str !== 'string') {
      continue;
    }
    const clean = item.str.replace(SPACE_REGEX, ' ').trim();
    if (clean.length) {
      chunks.push(clean);
    }
    if (item.hasEOL) {
      chunks.push('\n');
    }
  }

  const joined = chunks.join(' ');
  return joined
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(SPACE_REGEX, ' ').trim())
    .filter(Boolean);
}

function buildParagraphs(paragraphStrings: string[], startIndex: number): {
  paragraphs: Paragraph[];
  tokens: Token[];
  nextIndex: number;
} {
  const numParagraphs = paragraphStrings.length;
  // Pre-allocate arrays with estimated size for better performance
  const paragraphs: Paragraph[] = new Array(numParagraphs);
  const tokens: Token[] = [];
  let idx = startIndex;
  let paragraphCount = 0;

  for (let i = 0; i < numParagraphs; i++) {
    const paragraph = paragraphStrings[i];
    const words = paragraph.split(SPACE_REGEX).filter(Boolean);
    if (!words.length) {
      continue;
    }
    const wordCount = words.length;
    const paragraphTokens: Token[] = new Array(wordCount);
    for (let j = 0; j < wordCount; j++) {
      paragraphTokens[j] = {
        idx: idx++,
        text: words[j]
      };
    }
    paragraphs[paragraphCount++] = { 
      id: `p-${i}-${startIndex}`, 
      tokens: paragraphTokens 
    };
    tokens.push(...paragraphTokens);
  }

  // Trim to actual size
  paragraphs.length = paragraphCount;

  return { paragraphs, tokens, nextIndex: idx };
}

async function loadPdf(data: ArrayBuffer, kind: SourceKind, key: string, options?: LoadOptions): Promise<LoadResult> {
  const docId = `${kind}:${key}`;
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  let index = 0;
  const allTokens: Token[] = [];
  const allParagraphs: Paragraph[] = [];

  try {
    // Fetch metadata early and in parallel with first page
    const metadataPromise = pdf.getMetadata().catch(() => null);
    
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      // Clean up page reference after use
      page.cleanup();
      
      const normalizedParagraphs = normalizeTextContent(textContent);
      const { paragraphs, tokens, nextIndex } = buildParagraphs(normalizedParagraphs, index);
      index = nextIndex;
      allParagraphs.push(...paragraphs);
      allTokens.push(...tokens);
      options?.onProgress?.(pageNumber / totalPages);
    }

    const metadata = await metadataPromise;

    return {
      docId,
      tokens: allTokens,
      paragraphs: allParagraphs,
      title: metadata?.info?.Title ?? undefined
    };
  } finally {
    // Ensure cleanup happens even on error
    loadingTask.destroy();
  }
}

export async function loadPdfFromFile(file: File, options?: LoadOptions): Promise<LoadResult> {
  const buffer = await file.arrayBuffer();
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  return loadPdf(buffer, 'file', key, options);
}

export async function loadPdfFromUrl(url: string, options?: LoadOptions): Promise<LoadResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load PDF from URL (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return loadPdf(buffer, 'url', url, options);
}
