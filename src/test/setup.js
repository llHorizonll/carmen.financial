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
});
afterEach(() => cleanup());
