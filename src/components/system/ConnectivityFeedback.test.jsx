import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectivityFeedback from './ConnectivityFeedback.jsx';

const setOnlineState = (value) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
};

describe('ConnectivityFeedback', () => {
  afterEach(() => {
    setOnlineState(true);
    vi.restoreAllMocks();
  });

  it('keeps the optional visual layer out of the initial online render', () => {
    const loadOverlay = vi.fn(() => Promise.resolve({ default: () => <aside>Feedback</aside> }));

    render(
      <ConnectivityFeedback loadOverlay={loadOverlay}>
        <main>Report</main>
      </ConnectivityFeedback>,
    );

    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(loadOverlay).not.toHaveBeenCalled();
  });

  it('loads a persistent status banner immediately while the browser is offline', async () => {
    setOnlineState(false);
    render(
      <ConnectivityFeedback>
        <main>Report</main>
      </ConnectivityFeedback>,
    );

    expect(await screen.findByText('You’re offline')).toBeInTheDocument();

    setOnlineState(true);
    fireEvent(window, new Event('online'));
    expect(screen.queryByText('You’re offline')).not.toBeInTheDocument();
  });

  it('leaves API errors to the app Notice instead of loading a toast layer', () => {
    const loadOverlay = vi.fn(() => Promise.resolve({ default: () => null }));
    render(
      <ConnectivityFeedback loadOverlay={loadOverlay}>
        <main>Report</main>
      </ConnectivityFeedback>,
    );

    window.dispatchEvent(new CustomEvent('carmen-api-error', {
      detail: { kind: 'session', message: 'Your session has expired. Please sign in again.' },
    }));

    expect(loadOverlay).not.toHaveBeenCalled();
    expect(screen.queryByText('Your session has expired. Please sign in again.')).not.toBeInTheDocument();
  });

  it('preloads the visual layer after the first user intent', async () => {
    const loadOverlay = vi.fn(() => Promise.resolve({ default: () => null }));
    render(
      <ConnectivityFeedback loadOverlay={loadOverlay}>
        <main>Report</main>
      </ConnectivityFeedback>,
    );

    fireEvent.pointerDown(window);
    await waitFor(() => expect(loadOverlay).toHaveBeenCalledOnce());
  });

  it('shows an accessible offline fallback when the visual chunk cannot load', async () => {
    const loadOverlay = vi.fn(() => Promise.reject(new Error('Chunk unavailable')));
    setOnlineState(false);
    render(
      <ConnectivityFeedback loadOverlay={loadOverlay}>
        <main>Report</main>
      </ConnectivityFeedback>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('offline');
  });
});
