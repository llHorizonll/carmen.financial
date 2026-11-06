import { useTranslation, useLanguage } from "@/lib/i18n.js";
import React, { Suspense, lazy, useCallback, useSyncExternalStore } from 'react';
import { BarChart3, TriangleAlert, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
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
import LanguagePreference from './LanguagePreference.jsx';


const App = lazy(() => import('./App.jsx'));
const LoginForm = lazy(() => import('./LoginForm.jsx'));
const LoginFeatures = lazy(() => import('./LoginFeatures.jsx'));
const groupLookupWarnings = {
  '/api/DepartmentCategory/search': 'You do not have permission to load department groups (HTTP 403).',
  '/api/accountGroup/search': 'You do not have permission to load account groups (HTTP 403).',
};
const hasSession = () => Boolean(getStoredCarmenSession()?.accessToken);
const subscribeToCarmenSession = (listener) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', listener);
  window.addEventListener('carmen-session-changed', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('carmen-session-changed', listener);
  };
};

export default function LoginShell() {
  const language = useLanguage();
  const t = useTranslation();
  React.useEffect(() => { document.documentElement.lang = language; }, [language]);
  const isAuthenticated = useSyncExternalStore(
    subscribeToCarmenSession,
    hasSession,
    () => false,
  );
  const apiFailure = useSyncExternalStore(
    subscribeToCarmenApiFailure,
    getCarmenApiFailure,
    () => null,
  );
  const sessionNotice = apiFailure?.kind === 'session' ? {
    title: 'Session expired',
    message: 'Your Carmen session has expired. Please sign in again.',
    action: 'Back to sign in',
  } : null;
  const groupLookupWarning = isAuthenticated && apiFailure?.status === 403
    ? groupLookupWarnings[apiFailure.path]
    : null;
  // Required workspace requests render errors inline; optional group lookups show a warning.
  const apiErrorNotice = !isAuthenticated && apiFailure && apiFailure.kind !== 'session' ? {
    title: 'API request failed',
    message: apiFailure.message,
    action: 'Close',
  } : null;
  const handleLogout = useCallback(() => {
    clearCarmenSession();
    clearCarmenApiFailure();
  }, []);
  const handleAuthenticated = useCallback(() => {
    clearCarmenApiFailure();
  }, []);

  React.useEffect(() => {
    initializeTheme();
  }, []);

  React.useEffect(() => {
    const handleApiError = (event) => {
      if (!isAuthenticated) return;
      if (event?.detail?.kind === 'session') clearCarmenSession();
      reportCarmenApiFailure(event?.detail || {});
    };

    window.addEventListener('carmen-api-error', handleApiError);
    return () => window.removeEventListener('carmen-api-error', handleApiError);
  }, [isAuthenticated]);

  const content = isAuthenticated ? (
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">{t("Loading Carmen Blue Financial Report...")}</div>}>
        <App
          onLogout={handleLogout}
        />
      </Suspense>
  ) : (
    <main className="relative min-h-dvh bg-background text-foreground">
      <header className="absolute top-4 right-4 z-10 sm:right-6">
        <LanguagePreference compact />
      </header>
      <div className="mx-auto flex min-h-dvh max-w-5xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <section className="order-2 hidden flex-col justify-center gap-8 lg:flex">
            <header className="login-enter-from-right max-w-2xl space-y-5">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1"><BarChart3 className="size-3.5" />Carmen Blue Financial Report</Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">{t("A focused workspace for financial reporting.")}</h1>
                <p className="max-w-xl text-base leading-7 text-pretty text-muted-foreground">{t("Sign in to review reports, adjust report structure, and manage access in one consistent workspace.")}</p>
              </div>
            </header>
            <Suspense fallback={<Skeleton className="h-56 w-full max-w-2xl rounded-xl" aria-hidden="true" />}>
              <LoginFeatures />
            </Suspense>
          </section>
          <Suspense fallback={<Skeleton className="order-1 h-148 w-full max-w-md justify-self-center self-center rounded-xl lg:justify-self-start" aria-label={t("Loading sign-in form")} />}>
            <LoginForm onAuthenticated={handleAuthenticated} />
          </Suspense>
        </div>
      </div>
    </main>
  );

  return (
    <>
      {content}
      {groupLookupWarning && (
        <aside className="fixed inset-x-4 bottom-[calc(var(--spacing)*16+env(safe-area-inset-bottom))] z-50 flex items-start gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg print:hidden sm:left-auto sm:w-96">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <section role="alert" className="min-w-0 flex-1 space-y-1">
            <h2 className="text-balance text-sm font-semibold leading-5">{t('Group lookup unavailable')}</h2>
            <p className="text-pretty text-sm leading-5 text-muted-foreground">{t(groupLookupWarning)}</p>
          </section>
          <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground"
            aria-label={t('Close notification')} onClick={clearCarmenApiFailure}>
            <X aria-hidden="true" />
          </Button>
        </aside>
      )}
      <AlertDialog open={Boolean(sessionNotice || apiErrorNotice)} onOpenChange={(open) => !open && clearCarmenApiFailure()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(sessionNotice?.title || apiErrorNotice?.title)}</AlertDialogTitle>
            <AlertDialogDescription>{t(sessionNotice?.message || apiErrorNotice?.message)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={clearCarmenApiFailure}>
              {t(sessionNotice?.action || apiErrorNotice?.action)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
