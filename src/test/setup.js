import { expect, afterEach, beforeEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

const createMemoryStorage = () => {
  let store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const createMatchMedia = () => (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.HTMLElement !== 'undefined' && typeof globalThis.HTMLElement.prototype.scrollIntoView !== 'function') {
  globalThis.HTMLElement.prototype.scrollIntoView = () => {};
}

// jsdom 29 keeps the sheet of a <style> that is removed together with an ancestor (for example the Radix ScrollArea
// style when a test unmounts), so sheets pile up, slow every getComputedStyle call and keep old DOM trees alive.
// Rewriting the text makes jsdom re-check the now-disconnected element and drop its sheet. Remove once jsdom is fixed.
const dropDetachedStyleSheets = () => {
  if (typeof document === 'undefined') return;
  for (const sheet of Array.from(document.styleSheets)) {
    const owner = sheet.ownerNode;
    if (owner?.localName === 'style' && !owner.isConnected) {
      owner.textContent = owner.textContent;
    }
  }
};

beforeEach(() => {
  if (
    typeof globalThis.localStorage?.getItem !== 'function' ||
    typeof globalThis.localStorage?.setItem !== 'function'
  ) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
  }
  globalThis.localStorage.clear();

  if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.matchMedia !== 'function') {
    Object.defineProperty(globalThis.window, 'matchMedia', {
      value: createMatchMedia(),
      configurable: true,
    });
  }

  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverMock;
  }
});
afterEach(() => {
  cleanup();
  dropDetachedStyleSheets();
});
