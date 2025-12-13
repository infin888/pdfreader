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
  for (const item of content.items as TextItem[]) {
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
  const paragraphs: Paragraph[] = [];
  const tokens: Token[] = [];
  let idx = startIndex;

  paragraphStrings.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(SPACE_REGEX).filter(Boolean);
    if (!words.length) {
      return;
    }
    const paragraphTokens: Token[] = words.map((word) => ({
      idx: idx++,
      text: word
    }));
    paragraphs.push({ id: `p-${paragraphIndex}-${startIndex}`, tokens: paragraphTokens });
    tokens.push(...paragraphTokens);
  });

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
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const normalizedParagraphs = normalizeTextContent(textContent);
      const { paragraphs, tokens, nextIndex } = buildParagraphs(normalizedParagraphs, index);
      index = nextIndex;
      allParagraphs.push(...paragraphs);
      allTokens.push(...tokens);
      options?.onProgress?.(pageNumber / totalPages);
    }

    const metadata = await pdf.getMetadata().catch(() => null);

    return {
      docId,
      tokens: allTokens,
      paragraphs: allParagraphs,
      title: metadata?.info?.Title ?? undefined
    };
  } finally {
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
