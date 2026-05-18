import { useEffect, useState } from 'react';

export default function usePersistentState(key, initialValue) {
  const getInitialValue = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    const savedValue = window.localStorage.getItem(key);
    if (savedValue) {
      try {
        return JSON.parse(savedValue);
      } catch {
        // Fall back to the provided initial value.
      }
    }

    return typeof initialValue === 'function' ? initialValue() : initialValue;
  };

  const [value, setValue] = useState(getInitialValue);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
