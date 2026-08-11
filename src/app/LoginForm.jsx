import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  clearCarmenSession,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  saveCarmenSession,
} from '../features/report/lib/carmenSession.js';

const LoginSelectFields = lazy(() => import('./LoginSelectFields.jsx'));
const loadLoginApi = () => import('../features/report/lib/reportApi.js');
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

export default function LoginForm({ onAuthenticated }) {
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
  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((item) => getBusinessUnitTenant(item) === selectedTenant) || null,
    [businessUnits, selectedTenant],
  );
  const canSubmit = Boolean(username.trim() && password && selectedTenant && !isLoggingIn);

  const loadBusinessUnits = async () => {
    const trimmedUserName = username.trim();
    if (!trimmedUserName || trimmedUserName === usernameUsedForBusinessUnitsRef.current) return;

    setError('');
    setIsLoadingBusinessUnits(true);
    try {
      const { fetchBusinessUnitsByUsername } = await loadLoginApi();
      const items = await fetchBusinessUnitsByUsername(trimmedUserName);
      setBusinessUnits(items);
      usernameUsedForBusinessUnitsRef.current = trimmedUserName;
      const defaultItem = items.find((item) => item?.IsDefault === true) || items[0] || null;
      setSelectedTenant(defaultItem ? getBusinessUnitTenant(defaultItem) : '');
      if (!defaultItem) setError('No business unit found for this username.');
    } catch (fetchError) {
      setBusinessUnits([]);
      setSelectedTenant('');
      setError(fetchError?.message || 'Unable to load business units.');
    } finally {
      setIsLoadingBusinessUnits(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    if (!selectedTenant) nextErrors.selectedTenant = 'Choose a business unit.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const trimmedUserName = username.trim();
    setError('');
    setIsLoggingIn(true);
    try {
      const { loginWithCarmenCredentials } = await loadLoginApi();
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
          description: selectedBusinessUnit ? getBusinessUnitDisplayName(selectedBusinessUnit) : selectedTenant,
          tenant: selectedTenant,
        },
        user: loginResult.user,
      });
      onAuthenticated();
    } catch (loginError) {
      clearCarmenSession();
      setError(loginError?.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Card className="login-enter-from-right order-1 w-full max-w-[420px] self-center border border-border bg-card/95 shadow-sm ring-0 lg:order-2">
      <CardHeader className="space-y-2">
        <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">Secure sign-in</Badge>
        <CardTitle className="text-xl tracking-tight sm:text-2xl">Carmen BI Login</CardTitle>
        <CardDescription>Use your Carmen credentials to continue.</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-5 pb-6 sm:pb-8">
          <div className="space-y-2.5">
            <Label htmlFor="username" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                const next = event.target.value;
                setUsername(next);
                setFieldErrors((prev) => ({ ...prev, username: '' }));
                if (next.trim() !== usernameUsedForBusinessUnitsRef.current) {
                  setBusinessUnits([]);
                  setSelectedTenant('');
                  setFieldErrors((prev) => ({ ...prev, selectedTenant: '' }));
                }
              }}
              onBlur={loadBusinessUnits}
              autoComplete="username"
              placeholder="Enter username"
              aria-invalid={Boolean(submitAttempted && fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {submitAttempted && fieldErrors.username && <p id="username-error" className="text-xs text-destructive">{fieldErrors.username}</p>}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              autoComplete="current-password"
              placeholder="Enter password"
              aria-invalid={Boolean(submitAttempted && fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {submitAttempted && fieldErrors.password && <p id="password-error" className="text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          <Suspense fallback={<Skeleton className="h-44 w-full rounded-2xl" aria-hidden="true" />}>
            <LoginSelectFields
              businessUnits={businessUnits}
              fieldErrors={fieldErrors}
              getBusinessUnitDisplayName={getBusinessUnitDisplayName}
              getBusinessUnitTenant={getBusinessUnitTenant}
              isLoadingBusinessUnits={isLoadingBusinessUnits}
              language={language}
              languageList={languageList}
              selectedTenant={selectedTenant}
              setLanguage={setLanguage}
              setSelectedTenant={setSelectedTenant}
              submitAttempted={submitAttempted}
              username={username}
            />
          </Suspense>

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
            className="h-11 w-full border border-primary/90 bg-primary text-primary-foreground shadow-sm transition-transform hover:-translate-y-px hover:bg-primary/90 hover:shadow-md active:translate-y-0"
            disabled={!canSubmit}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
