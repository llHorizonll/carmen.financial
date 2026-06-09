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
afterEach(() => cleanup());
