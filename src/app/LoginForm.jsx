import { useTranslation, getLanguage } from "@/lib/i18n.js";
import React, { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  clearCarmenSession,
  getDefaultBusinessUnit,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  saveCarmenSession,
} from '../features/report/lib/carmenSession.js';

const loadLoginApi = () => import('../features/report/lib/reportApi.js');

export default function LoginForm({ onAuthenticated }) {
  const t = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const usernameRef = useRef('');
  const lookupRef = useRef(null);
  const submittingRef = useRef(false);
  const canSubmit = Boolean(username.trim() && password && !isLoggingIn);

  const loadBusinessUnits = (trimmedUserName) => {
    if (!trimmedUserName) return Promise.resolve(null);
    if (lookupRef.current?.username === trimmedUserName) return lookupRef.current.promise;
    setError('');
    setIsLoadingBusinessUnits(true);
    const lookup = { username: trimmedUserName };
    lookup.promise = (async () => {
      try {
        const { fetchBusinessUnitsByUsername } = await loadLoginApi();
        const items = await fetchBusinessUnitsByUsername(trimmedUserName);
        const defaultItem = getDefaultBusinessUnit(items);
        if (!getBusinessUnitTenant(defaultItem)) {
          throw new Error('No business unit was found for this username. Check the username and try again.');
        }
        return defaultItem;
      } catch (fetchError) {
        if (lookupRef.current === lookup) lookupRef.current = null;
        if (usernameRef.current === trimmedUserName) {
          setError(fetchError?.message || 'Unable to load business units.');
        }
        throw fetchError;
      } finally {
        if (usernameRef.current === trimmedUserName) setIsLoadingBusinessUnits(false);
      }
    })();
    lookupRef.current = lookup;
    return lookup.promise;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setSubmitAttempted(true);
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const trimmedUserName = username.trim();
    setError('');
    submittingRef.current = true;
    setIsLoggingIn(true);
    try {
      const { loginWithCarmenCredentials } = await loadLoginApi();
      const selectedBusinessUnit = await loadBusinessUnits(trimmedUserName);
      if (usernameRef.current !== trimmedUserName) return;
      const selectedTenant = getBusinessUnitTenant(selectedBusinessUnit);
      const loginResult = await loginWithCarmenCredentials({
        userName: trimmedUserName,
        password,
        tenant: selectedTenant,
        language: getLanguage().toUpperCase(),
      });
      saveCarmenSession({
        accessToken: loginResult.accessToken,
        username: trimmedUserName,
        businessUnit: {
          description: getBusinessUnitDisplayName(selectedBusinessUnit),
          tenant: selectedTenant,
        },
        user: loginResult.user,
      });
      onAuthenticated();
    } catch (loginError) {
      clearCarmenSession();
      setError(loginError?.message || 'Login failed.');
    } finally {
      submittingRef.current = false;
      setIsLoggingIn(false);
    }
  };

  return (
    <Card className="login-enter-from-left order-1 w-full max-w-md justify-self-center self-center border border-border bg-card shadow-lg ring-0 lg:justify-self-start">
      <CardHeader className="space-y-2">
        <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">{t("Secure sign-in")}</Badge>
        <CardTitle className="text-xl tracking-tight sm:text-2xl">{t("Carmen Blue Financial Report Login")}</CardTitle>
        <CardDescription>{t("Use your Carmen credentials to continue.")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-5 pb-6 sm:pb-8">
          <div className="space-y-2.5">
            <Label htmlFor="username">{t("Username")}</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                const next = event.target.value;
                setUsername(next);
                usernameRef.current = next.trim();
                setFieldErrors((prev) => ({ ...prev, username: '' }));
                setError('');
                setIsLoadingBusinessUnits(false);
              }}
              onBlur={() => { void loadBusinessUnits(usernameRef.current).catch(() => {}); }}
              disabled={isLoggingIn}
              autoComplete="username"
              placeholder={t("Enter username")}
              aria-invalid={Boolean(submitAttempted && fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {submitAttempted && fieldErrors.username && <p id="username-error" className="text-xs text-destructive">{t(fieldErrors.username)}</p>}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              disabled={isLoggingIn}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              autoComplete="current-password"
              placeholder={t("Enter password")}
              aria-invalid={Boolean(submitAttempted && fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {submitAttempted && fieldErrors.password && <p id="password-error" className="text-xs text-destructive">{t(fieldErrors.password)}</p>}
          </div>

          {isLoadingBusinessUnits && <p role="status" className="text-sm text-muted-foreground">{t("Loading business units...")}</p>}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="leading-5">{t(error)}</p>
            </div>
          )}
        </CardContent>
        <div className="flex flex-col items-stretch gap-3 px-4 pb-5 pt-3 sm:pb-6">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {isLoggingIn ? t("Signing in...") : t("Sign in")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
