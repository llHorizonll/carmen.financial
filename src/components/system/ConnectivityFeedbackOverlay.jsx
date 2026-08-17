import { Banner } from '@astryxdesign/core/Banner';

export default function ConnectivityFeedbackOverlay({ isOnline }) {
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
