import React, { Suspense, lazy, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { clearCarmenSession, getStoredCarmenSession } from '../features/report/lib/carmenSession.js';
import { initializeTheme } from '../lib/theme.js';

const App = lazy(() => import('./App.jsx'));
const LoginForm = lazy(() => import('./LoginForm.jsx'));
const LoginFeatures = lazy(() => import('./LoginFeatures.jsx'));
const hasSession = () => Boolean(getStoredCarmenSession()?.accessToken);
const getLoginDelayStyle = (delayMs) => ({ animationDelay: `${delayMs}ms` });

export default function LoginShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession);

  React.useEffect(() => {
    initializeTheme();
  }, []);

  React.useEffect(() => {
    const syncSessionState = () => setIsAuthenticated(hasSession());
    window.addEventListener('storage', syncSessionState);
    window.addEventListener('carmen-session-changed', syncSessionState);
    return () => {
      window.removeEventListener('storage', syncSessionState);
      window.removeEventListener('carmen-session-changed', syncSessionState);
    };
  }, []);

  if (isAuthenticated) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/20 text-sm text-muted-foreground">Loading Carmen Financial BI...</div>}>
        <App
          onLogout={() => {
            clearCarmenSession();
            setIsAuthenticated(false);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-muted/20 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] hidden h-[30rem] w-[30rem] rounded-full bg-foreground/5 blur-3xl md:block" />
        <div className="absolute right-[-8rem] top-[8rem] hidden h-[24rem] w-[24rem] rounded-full bg-primary/5 blur-3xl md:block" />
        <div className="absolute inset-x-0 bottom-[-10rem] mx-auto hidden h-[18rem] w-[36rem] rounded-full bg-foreground/5 blur-3xl lg:block" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-stretch px-4 py-6 sm:px-6 sm:py-10 lg:items-center lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <section className="order-2 flex flex-col justify-center gap-8 lg:order-1">
            <div className="login-enter-from-left max-w-2xl space-y-5" style={getLoginDelayStyle(90)}>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1"><Sparkles className="size-3.5" />Carmen Financial BI</Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">A calm workspace for reports, setup, and access control.</h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Sign in to review financial reports, adjust report structure, and keep GL and budget workflows in one place.</p>
              </div>
            </div>
            <Suspense fallback={<Skeleton className="h-56 w-full max-w-2xl rounded-2xl" aria-hidden="true" />}>
              <LoginFeatures />
            </Suspense>
          </section>
          <Suspense fallback={<Skeleton className="order-1 h-148 w-full max-w-[420px] self-center rounded-2xl lg:order-2" aria-label="Loading sign-in form" />}>
            <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
