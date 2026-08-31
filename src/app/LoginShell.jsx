import React, { Suspense, lazy, useState, useSyncExternalStore } from 'react';
import { BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { clearCarmenSession, getStoredCarmenSession } from '../features/report/lib/carmenSession.js';
import {
  clearCarmenApiFailure,
  getCarmenApiFailure,
  reportCarmenApiFailure,
  subscribeToCarmenApiFailure,
} from '../lib/carmenApiFailure.js';
import { initializeTheme } from '../lib/theme.js';

const App = lazy(() => import('./App.jsx'));
const LoginForm = lazy(() => import('./LoginForm.jsx'));
const LoginFeatures = lazy(() => import('./LoginFeatures.jsx'));
const hasSession = () => Boolean(getStoredCarmenSession()?.accessToken);

export default function LoginShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession);
  const apiFailure = useSyncExternalStore(
    subscribeToCarmenApiFailure,
    getCarmenApiFailure,
    () => null,
  );
  const sessionNotice = apiFailure && {
    title: 'Session expired',
    message: apiFailure.kind === 'session'
      ? 'Your Carmen session has expired. Please sign in again.'
      : 'The Carmen API request failed, so this session was closed. Please sign in again.',
  };

  React.useEffect(() => {
    initializeTheme();
  }, []);

  React.useEffect(() => {
    const handleApiError = (event) => {
      if (!isAuthenticated) return;
      clearCarmenSession();
      reportCarmenApiFailure(event?.detail || {});
    };

    window.addEventListener('carmen-api-error', handleApiError);
    return () => window.removeEventListener('carmen-api-error', handleApiError);
  }, [isAuthenticated]);

  React.useEffect(() => {
    const syncSessionState = () => setIsAuthenticated(hasSession());
    window.addEventListener('storage', syncSessionState);
    window.addEventListener('carmen-session-changed', syncSessionState);
    return () => {
      window.removeEventListener('storage', syncSessionState);
      window.removeEventListener('carmen-session-changed', syncSessionState);
    };
  }, []);

  const content = isAuthenticated && !apiFailure ? (
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Loading Carmen Financial BI...</div>}>
        <App
          onLogout={() => {
            clearCarmenSession();
            clearCarmenApiFailure();
            setIsAuthenticated(false);
          }}
        />
      </Suspense>
  ) : (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl items-stretch px-4 py-8 sm:px-6 sm:py-10 lg:items-center lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <section className="order-2 flex flex-col justify-center gap-8 lg:order-1">
            <header className="login-enter-from-left max-w-2xl space-y-5">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1"><BarChart3 className="size-3.5" />Carmen Financial BI</Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">A focused workspace for financial reporting.</h1>
                <p className="max-w-xl text-base leading-7 text-pretty text-muted-foreground">Sign in to review reports, adjust report structure, and manage access in one consistent workspace.</p>
              </div>
            </header>
            <Suspense fallback={<Skeleton className="h-56 w-full max-w-2xl rounded-xl" aria-hidden="true" />}>
              <LoginFeatures />
            </Suspense>
          </section>
          <Suspense fallback={<Skeleton className="order-1 h-148 w-full max-w-md self-center rounded-xl lg:order-2" aria-label="Loading sign-in form" />}>
            <LoginForm onAuthenticated={() => {
              clearCarmenApiFailure();
              setIsAuthenticated(true);
            }} />
          </Suspense>
        </div>
      </div>
    </main>
  );

  return (
    <>
      {content}
      <AlertDialog open={Boolean(sessionNotice)} onOpenChange={(open) => !open && clearCarmenApiFailure()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sessionNotice?.title}</AlertDialogTitle>
            <AlertDialogDescription>{sessionNotice?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={clearCarmenApiFailure}>Back to sign in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
