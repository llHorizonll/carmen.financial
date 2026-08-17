import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_LOAD_TIMEOUT_MS = 30000;
const loadDefaultOverlay = () => import('./ConnectivityFeedbackOverlay.jsx');

export default function ConnectivityFeedbackCoordinator({
  children,
  loadOverlay = loadDefaultOverlay,
}) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const [Overlay, setOverlay] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadPromiseRef = useRef(null);

  const ensureOverlay = useCallback(() => {
    if (Overlay || loadPromiseRef.current) return loadPromiseRef.current;

    setLoadFailed(false);
    const loadPromise = loadOverlay()
      .then((module) => {
        setOverlay(() => module.default);
        return module.default;
      })
      .catch(() => {
        loadPromiseRef.current = null;
        setLoadFailed(true);
        return null;
      });

    loadPromiseRef.current = loadPromise;
    return loadPromise;
  }, [Overlay, loadOverlay]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      ensureOverlay();
    };
    const handleIntent = () => ensureOverlay();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pointerdown', handleIntent, { once: true, passive: true });
    window.addEventListener('keydown', handleIntent, { once: true });

    if (!isOnline) ensureOverlay();

    const idleId = window.setTimeout(ensureOverlay, IDLE_LOAD_TIMEOUT_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pointerdown', handleIntent);
      window.removeEventListener('keydown', handleIntent);
      window.clearTimeout(idleId);
    };
  }, [ensureOverlay, isOnline]);

  return (
    <>
      {Overlay ? (
        <Overlay isOnline={isOnline} />
      ) : loadFailed && !isOnline ? (
        <aside
          className="sticky top-0 z-50 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden"
          role="status"
        >
          You are offline. Check your internet connection.
        </aside>
      ) : null}
      {children}
    </>
  );
}
