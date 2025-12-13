export interface ReadingState {
  pageIndex: number;
  fontSizePx: number;
}

const STORAGE_PREFIX = 'reflow-reader:';

export function persistReadingState(docId: string, state: ReadingState): void {
  try {
    const payload = JSON.stringify(state);
    window.localStorage.setItem(`${STORAGE_PREFIX}${docId}`, payload);
  } catch (error) {
    console.warn('Failed to persist reading state', error);
  }
}

export function restoreReadingState(docId: string): ReadingState | null {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${docId}`);
    if (!value) {
      return null;
    }
    const parsed = JSON.parse(value) as ReadingState;
    if (typeof parsed.pageIndex === 'number' && typeof parsed.fontSizePx === 'number') {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn('Failed to restore reading state', error);
    return null;
  }
}
