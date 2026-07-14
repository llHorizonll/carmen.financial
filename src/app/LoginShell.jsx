import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
import {
  clearCarmenSession,
  fetchBusinessUnitsByUsername,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  loginWithCarmenCredentials,
  saveCarmenSession,
} from '../features/report/lib/reportApi.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { initializeTheme } from '../lib/theme.js';
import { AlertTriangle, FileText, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';

const App = lazy(() => import('./App.jsx'));

const languageList = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'th-TH', label: 'Thai' },
  { value: 'vi-VN', label: 'Vietnamese' },
];

const languageToApiCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('th')) return 'TH';
  if (normalized.startsWith('vi')) return 'VI';
  return 'EN';
};

const hasSession = () => Boolean(getStoredCarmenSession()?.accessToken);

const featureRows = [
  {
    icon: FileText,
    title: 'Report viewing',
    description: 'Open monthly and daily reports with the current business unit context.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Setup tools',
    description: 'Edit rows, columns, access, and templates in a single workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Controlled access',
    description: 'Load the right tenant and keep report access tied to the signed-in user.',
  },
];

const getLoginDelayStyle = (delayMs) => ({ animationDelay: `${delayMs}ms` });

export default function LoginShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const usernameUsedForBusinessUnitsRef = useRef('');

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

  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((item) => getBusinessUnitTenant(item) === selectedTenant) || null,
    [businessUnits, selectedTenant],
  );
  const canSubmit = Boolean(username.trim() && password && selectedTenant && !isLoggingIn);

  const loadBusinessUnits = async () => {
    const trimmedUserName = username.trim();
    if (!trimmedUserName) return;
    if (trimmedUserName === usernameUsedForBusinessUnitsRef.current) return;

    setError('');
    setIsLoadingBusinessUnits(true);
    try {
      const items = await fetchBusinessUnitsByUsername(trimmedUserName);
      setBusinessUnits(items);
      usernameUsedForBusinessUnitsRef.current = trimmedUserName;
      const defaultItem = items.find((item) => item?.IsDefault === true) || items[0] || null;
      setSelectedTenant(defaultItem ? getBusinessUnitTenant(defaultItem) : '');
      if (!defaultItem) {
        setError('No business unit found for this username.');
      }
    } catch (fetchError) {
      setBusinessUnits([]);
      setSelectedTenant('');
      setError(fetchError?.message || 'Unable to load business units.');
    } finally {
      setIsLoadingBusinessUnits(false);
    }
  };

  const onUsernameChange = (event) => {
    const next = event.target.value;
    setUsername(next);
    setFieldErrors((prev) => ({ ...prev, username: '' }));
    if (next.trim() !== usernameUsedForBusinessUnitsRef.current) {
      setBusinessUnits([]);
      setSelectedTenant('');
      setFieldErrors((prev) => ({ ...prev, selectedTenant: '' }));
    }
  };

  const onPasswordChange = (event) => {
    setPassword(event.target.value);
    setFieldErrors((prev) => ({ ...prev, password: '' }));
  };

  const validateLoginForm = () => {
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    if (!selectedTenant) nextErrors.selectedTenant = 'Choose a business unit.';
    return nextErrors;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const nextErrors = validateLoginForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const trimmedUserName = username.trim();

    setError('');
    setIsLoggingIn(true);
    try {
      const loginResult = await loginWithCarmenCredentials({
        userName: trimmedUserName,
        password,
        tenant: selectedTenant,
        language: languageToApiCode(language),
      });
      saveCarmenSession({
        accessToken: loginResult.accessToken,
        username: trimmedUserName,
        businessUnit: {
          description: selectedBusinessUnit
            ? getBusinessUnitDisplayName(selectedBusinessUnit)
            : selectedTenant,
          tenant: selectedTenant,
        },
        user: loginResult.user,
      });
      setIsAuthenticated(true);
    } catch (loginError) {
      clearCarmenSession();
      setError(loginError?.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-muted/20 text-sm text-muted-foreground">
            Loading Carmen Financial BI...
          </div>
        }
      >
        <App
          onLogout={() => {
            clearCarmenSession();
            setIsAuthenticated(false);
            setPassword('');
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
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Sparkles className="size-3.5" />
                Carmen Financial BI
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                  A calm workspace for reports, setup, and access control.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Sign in to review financial reports, adjust report structure, and keep GL and budget workflows in one place.
                </p>
              </div>
            </div>

            <div className="grid max-w-2xl gap-0 overflow-hidden rounded-2xl border bg-background/90 shadow-sm">
              {featureRows.map((item, index) => {
                const Icon = item.icon;
                const delayMs = 220 + (index * 120);
                return (
                  <React.Fragment key={item.title}>
                    {index > 0 && <Separator />}
                    <div
                      className="login-enter-rise flex items-start gap-4 px-4 py-4 sm:px-5"
                      style={getLoginDelayStyle(delayMs)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
                        <Icon className="size-4 text-foreground" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-sm leading-6 text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <Card
            className="login-enter-from-right order-1 self-center border border-border bg-card/95 shadow-sm ring-0 lg:order-2"
            style={getLoginDelayStyle(180)}
          >
            <CardHeader className="space-y-2">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                Secure sign-in
              </Badge>
              <CardTitle className="text-xl tracking-tight sm:text-2xl">Carmen BI Login</CardTitle>
              <CardDescription>Use your Carmen credentials to continue.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 pb-6 sm:pb-8">
                <div className="space-y-2.5">
                  <Label htmlFor="username" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={onUsernameChange}
                    onBlur={loadBusinessUnits}
                    autoComplete="username"
                    placeholder="Enter username"
                    aria-invalid={Boolean(submitAttempted && fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                  />
                  {submitAttempted && fieldErrors.username && (
                    <p id="username-error" className="text-xs text-destructive">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={onPasswordChange}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    aria-invalid={Boolean(submitAttempted && fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  />
                  {submitAttempted && fieldErrors.password && (
                    <p id="password-error" className="text-xs text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="business-unit" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Business Unit
                  </Label>
                  <Select
                    value={selectedTenant}
                    onValueChange={setSelectedTenant}
                    disabled={!username.trim() || isLoadingBusinessUnits || businessUnits.length === 0}
                  >
                    <SelectTrigger
                      id="business-unit"
                      className="h-12 w-full rounded-2xl border-border bg-card px-4 shadow-sm transition-colors hover:bg-muted/40"
                      aria-invalid={Boolean(submitAttempted && fieldErrors.selectedTenant)}
                      aria-describedby={fieldErrors.selectedTenant ? 'business-unit-error' : undefined}
                    >
                      <SelectValue placeholder={isLoadingBusinessUnits ? 'Loading business units...' : 'Select business unit'} />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      {businessUnits.map((item) => {
                        const tenant = getBusinessUnitTenant(item);
                        return (
                          <SelectItem key={tenant} value={tenant}>
                            {getBusinessUnitDisplayName(item)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {submitAttempted && fieldErrors.selectedTenant && (
                    <p id="business-unit-error" className="text-xs text-destructive">
                      {fieldErrors.selectedTenant}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-12 w-full rounded-2xl border-border bg-card px-4 shadow-sm transition-colors hover:bg-muted/40">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      {languageList.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p className="leading-5">{error}</p>
                  </div>
                )}
              </CardContent>

              <div className="flex flex-col items-stretch gap-3 px-4 pb-5 pt-3 sm:pb-6">
                <Button
                  type="submit"
                  className="h-11 w-full border border-primary/90 bg-primary text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:bg-primary/90 hover:shadow-md active:translate-y-0"
                  disabled={!canSubmit}
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
