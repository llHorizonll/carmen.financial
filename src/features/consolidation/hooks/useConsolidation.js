import { useEffect, useRef, useState } from 'react';
import { consolidationApi } from '../lib/consolidationApi.js';

export default function useConsolidation({ enabled, confirmDiscard, onSelectReport }) {
  const [active, setActive] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [profiles, setProfiles] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateError, setTemplateError] = useState('');
  const [mode, setMode] = useState('mapping');
  const [template, setTemplate] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [paneBusy, setBusy] = useState(false);
  const [openingTemplate, setOpeningTemplate] = useState(false);
  const busy = paneBusy || openingTemplate;
  const [generation, setGeneration] = useState(0);
  const requestId = useRef(0);

  useEffect(() => () => { requestId.current += 1; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const navigate = (action) => {
    if (busy) return;
    const apply = () => { requestId.current += 1; setDirty(false); setGeneration((value) => value + 1); action(); };
    if (dirty) confirmDiscard(apply);
    else apply();
  };
  const reloadProfiles = async (showWizard = false, requireSelection = true) => {
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      const list = await consolidationApi.listProfiles();
      if (id !== requestId.current) return;
      if (!Array.isArray(list)) throw new Error('Invalid consolidation profile response.');
      setProfiles(list);
      const selected = list.find((item) => item.tenant === profile?.tenant)
        || (list.length === 1 ? list[0] : null);
      setProfile(selected);
      if (showWizard || (requireSelection && !selected)) setProfileOpen(true);
    } catch (failure) { if (id === requestId.current) setError(failure.message); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  useEffect(() => {
    if (enabled) void reloadProfiles(false, false);
    // The session mounts this hook once; explicit navigation refreshes the selected profile.
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !profile) return;
    let cancelled = false;
    setTemplates([]); setTemplateError('');
    consolidationApi.listReports(profile.tenant).then((list) => {
      if (!cancelled) {
        if (!Array.isArray(list)) throw new Error('Invalid consolidation report response.');
        setTemplates(list);
      }
    }).catch((failure) => { if (!cancelled) setTemplateError(failure.message); });
    return () => { cancelled = true; };
  }, [enabled, profile]);

  const openMapping = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); setMode('mapping'); setTemplate(null);
    void reloadProfiles(false);
  });
  const openNewTemplate = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); setMode('template'); setTemplate(null);
    void reloadProfiles(false);
  });
  const openProfile = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); if (profile) setMode('mapping'); setTemplate(null);
    void reloadProfiles(true);
  });
  const profileSaved = (saved) => {
    setProfiles((previous) => [...(previous || []).filter((item) => item.tenant !== profile?.tenant && item.tenant !== saved.tenant), saved]);
    setProfile(saved); setProfileOpen(false); setError('');
    setActive(true); setNavigationActive(true); setTemplate(null); setDirty(false);
    setGeneration((value) => value + 1);
  };
  const selectProfile = (next) => navigate(() => {
    setProfile(next); setTemplate(null);
  });
  const openTemplate = (selected = null) => navigate(async () => {
    if (!profile) return;
    setActive(true); setNavigationActive(true); setError('');
    if (!selected) { setMode('template'); setTemplate(null); return; }
    const id = requestId.current;
    setOpeningTemplate(true);
    try {
      const loaded = await consolidationApi.getReport(selected.id);
      if (loaded.profileTenant !== profile.tenant) throw new Error('This template belongs to another headquarter profile. Reload the report list.');
      if (id === requestId.current) { setMode('template'); setTemplate(loaded); }
    } catch (failure) { if (id === requestId.current) setError(failure.message); }
    finally { if (id === requestId.current) setOpeningTemplate(false); }
  });
  const templateSaved = (saved) => {
    setTemplate(saved);
    setTemplates((list) => [...list.filter((item) => item.id !== saved.id), saved]);
    setDirty(false);
    setProfile((previous) => previous.headquarterLocked ? previous : { ...previous, headquarterLocked: true });
  };
  const mappingSaved = () => setProfile((previous) => previous.headquarterLocked ? previous : { ...previous, headquarterLocked: true });
  const leave = (action = () => {}) => navigate(() => { setActive(false); setNavigationActive(false); action(); });
  return { active, navigationActive, profiles, profile, profileOpen, setProfileOpen, loading, error, templates, templateError,
    mode, template, dirty, busy, openingTemplate, generation, setDirty, setBusy, openMapping, openNewTemplate, openProfile, reloadProfiles,
    profileSaved, selectProfile, openTemplate, templateSaved, mappingSaved, leave,
    selectReport: (report) => navigate(() => { setActive(false); onSelectReport(report); }) };
}
