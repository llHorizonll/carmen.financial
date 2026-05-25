import React, { useMemo, useState } from 'react';
import App from './App.jsx';
import {
  clearCarmenSession,
  fetchBusinessUnitsByUsername,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  loginWithCarmenCredentials,
  saveCarmenSession,
} from '../features/report/lib/reportApi.js';

const languageList = [
  {
    value: 'en-US',
    label: 'English (United States)',
  },
  {
    value: 'th-TH',
    label: 'ไทย',
  },
  {
    value: 'vi-VN',
    label: 'Việt Nam',
  },
];

const hasSession = () => Boolean(getStoredCarmenSession()?.accessToken);

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
  const [usernameUsedForBusinessUnits, setUsernameUsedForBusinessUnits] = useState('');

  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((item) => getBusinessUnitTenant(item) === selectedTenant) || null,
    [businessUnits, selectedTenant],
  );

  const loadBusinessUnits = async () => {
    const trimmedUserName = username.trim();
    if (!trimmedUserName) return;
    if (trimmedUserName === usernameUsedForBusinessUnits) return;

    setError('');
    setIsLoadingBusinessUnits(true);
    try {
      const items = await fetchBusinessUnitsByUsername(trimmedUserName);
      setBusinessUnits(items);
      setUsernameUsedForBusinessUnits(trimmedUserName);
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
    if (next.trim() !== usernameUsedForBusinessUnits) {
      setBusinessUnits([]);
      setSelectedTenant('');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const trimmedUserName = username.trim();
    if (!trimmedUserName || !password || !selectedTenant) return;

    setError('');
    setIsLoggingIn(true);
    try {
      const loginResult = await loginWithCarmenCredentials({
        userName: trimmedUserName,
        password,
        tenant: selectedTenant,
        language,
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
    return <App onLogout={() => {
      clearCarmenSession();
      setIsAuthenticated(false);
      setPassword('');
    }}
    />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-black text-slate-800">Carmen BI Login</h1>

        <label className="block text-sm font-semibold text-slate-700">
          Username
          <input
            type="text"
            value={username}
            onChange={onUsernameChange}
            onBlur={loadBusinessUnits}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="username"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="current-password"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Business Unit
          <select
            value={selectedTenant}
            onChange={(event) => setSelectedTenant(event.target.value)}
            disabled={!username.trim() || isLoadingBusinessUnits || businessUnits.length === 0}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">{isLoadingBusinessUnits ? 'Loading...' : 'Select Business Unit'}</option>
            {businessUnits.map((item) => {
              const tenant = getBusinessUnitTenant(item);
              return (
                <option key={tenant} value={tenant}>
                  {getBusinessUnitDisplayName(item)}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {languageList.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!username.trim() || !password || !selectedTenant || isLoggingIn}
          className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-bold disabled:bg-slate-300"
        >
          {isLoggingIn ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
