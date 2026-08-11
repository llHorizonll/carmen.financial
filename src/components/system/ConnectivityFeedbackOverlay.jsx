import '@astryxdesign/core/astryx.css';
import { Banner } from '@astryxdesign/core/Banner';
import { ToastViewport, useToast } from '@astryxdesign/core/Toast';
import { useEffect } from 'react';

function FeedbackVisuals({ isOnline, pendingError, onErrorConsumed }) {
  const showToast = useToast();

  useEffect(() => {
    if (!pendingError?.message) return;

    showToast({
      body: pendingError.message,
      type: 'error',
      isAutoHide: pendingError.kind !== 'session',
      autoHideDuration: 7000,
      uniqueID: pendingError.kind === 'session' ? 'carmen-session-error' : 'carmen-api-error',
      collisionBehavior: 'overwrite',
    });
    onErrorConsumed(pendingError.id);
  }, [onErrorConsumed, pendingError, showToast]);

  if (isOnline) return null;

  return (
    <aside className="sticky top-0 z-50 print:hidden">
      <Banner
        status="warning"
        title="You’re offline"
        description="Check your internet connection. Changes cannot be saved until you’re back online."
        container="section"
      />
    </aside>
  );
}

export default function ConnectivityFeedbackOverlay(props) {
  return (
    <ToastViewport position="bottomEnd" maxVisible={3}>
      <FeedbackVisuals {...props} />
    </ToastViewport>
  );
}
