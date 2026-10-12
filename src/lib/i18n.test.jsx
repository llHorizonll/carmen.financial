import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getLocale, translate, useTranslation } from './i18n.js';
import LanguagePreference from '../app/LanguagePreference.jsx';
import LoginForm from '../app/LoginForm.jsx';
import { clearCarmenSession, saveCarmenSession, setCarmenSessionLanguage } from '../features/report/lib/carmenSession.js';

function Preview() {
  const t = useTranslation();
  return <><LanguagePreference /><h1>{t('Reports')}</h1><p>{'TODAY\nActual'}</p></>;
}
describe('frontend language', () => {
  beforeEach(() => window.localStorage.clear());
  it('changes UI immediately, preserves report labels, and restores the choice after remount', () => {
    const { unmount } = render(<Preview />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('button', { name: 'ไทย' }));
    expect(screen.getByRole('heading')).toHaveTextContent('รายงาน');
    expect(screen.getByText('TODAY Actual').textContent).toBe('TODAY\nActual');
    unmount();
    render(<Preview />);
    expect(screen.getByRole('heading')).toHaveTextContent('รายงาน');
    fireEvent.click(screen.getByRole('button', { name: 'ภาษา' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading')).toHaveTextContent('Reports');
  });
  it('translates login fields and keeps the preference through login and logout', () => {
    setCarmenSessionLanguage('th');
    render(<LoginForm onAuthenticated={() => {}} />);
    expect(screen.getByLabelText('ชื่อผู้ใช้')).toBeInTheDocument();
    expect(screen.getByLabelText('รหัสผ่าน')).toBeInTheDocument();
    act(() => { saveCarmenSession({ accessToken: 'token' }); clearCarmenSession(); });
    expect(window.localStorage.getItem('carmen_language')).toBe('th');
    expect(getLocale()).toBe('th-TH-u-ca-gregory');
  });
  it('uses the English server snapshot so persisted Thai can hydrate safely', () => {
    setCarmenSessionLanguage('th');
    expect(renderToString(<Preview />)).toContain('<h1>Reports</h1>');
  });
  it('falls back for missing translations and unsupported stored preferences', () => {
    expect(translate('Delete “{name}”?', 'th', { name: 'TODAY Actual' })).toBe('ลบ “TODAY Actual” หรือไม่?');
    expect(translate('Custom report title', 'th')).toBe('Custom report title');
    expect(translate('constructor', 'th')).toBe('constructor');
    expect(translate('Reports', 'vi')).toBe('Reports');
    window.localStorage.setItem('carmen_language', 'bad');
    expect(getLocale()).toBe('en-US');
  });
});
