let latestFailure = null;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

export const reportCarmenApiFailure = (failure = {}) => {
  latestFailure = {
    kind: failure.kind || 'api',
    message: failure.message || 'The Carmen API request failed.',
    path: failure.path || '',
    status: failure.status || null,
  };
  notify();
};

export const clearCarmenApiFailure = () => {
  if (!latestFailure) return;
  latestFailure = null;
  notify();
};

export const getCarmenApiFailure = () => latestFailure;

export const subscribeToCarmenApiFailure = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
