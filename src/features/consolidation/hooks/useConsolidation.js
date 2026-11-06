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
  const [mode, setMode] = useState('reports');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [templateView, setTemplateView] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [paneBusy, setBusy] = useState(false);
  const [openingTemplate, setOpeningTemplate] = useState(false);
  const busy = paneBusy || openingTemplate;
  const [generation, setGeneration] = useState(0);
  const requestId = useRef(0);
  const failedTemplate = useRef(null);
  const templatesRequestId = useRef(0);
  const defaultReportProfile = useRef(null);

  useEffect(() => () => { requestId.current += 1; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const navigate = (action) => {
    if (busy) return;
    const apply = () => {
      requestId.current += 1;
      defaultReportProfile.current = null;
      setLoading(false); setDirty(false); setGeneration((value) => value + 1);
      action();
    };
    if (dirty) confirmDiscard(apply);
    else apply();
  };
  const reloadProfiles = async (showWizard = false, requireSelection = true, openFirstReport = false) => {
    failedTemplate.current = null;
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      const list = await consolidationApi.listProfiles();
      if (id !== requestId.current) return;
      if (!Array.isArray(list)) throw new Error('Invalid consolidation profile response.');
      setProfiles(list);
      const selected = list.find((item) => item.tenant === profile?.tenant)
        || (list.length === 1 ? list[0] : null);
      const nextProfile = openFirstReport && selected ? { ...selected } : selected;
      if (openFirstReport) {
        defaultReportProfile.current = nextProfile;
        if (nextProfile) setTemplatesLoading(true);
      }
      setProfile(nextProfile);
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
    const id = ++templatesRequestId.current;
    setTemplates([]); setTemplateError(''); setTemplatesLoading(true);
    consolidationApi.listReports(profile.tenant).then((list) => {
      if (!cancelled && id === templatesRequestId.current) {
        if (!Array.isArray(list)) throw new Error('Invalid consolidation report response.');
        setTemplates(list);
        if (defaultReportProfile.current === profile) {
          defaultReportProfile.current = null;
          if (list.length) void loadTemplate(list[0], profile.tenant);
        }
      }
    }).catch((failure) => { if (!cancelled && id === templatesRequestId.current) setTemplateError(failure.message); })
      .finally(() => { if (!cancelled && id === templatesRequestId.current) setTemplatesLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, profile]);

  const openReports = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); setMode('reports'); setTemplate(null); setTemplateView(false);
    void reloadProfiles(false, false, true);
  });
  const backToReports = () => navigate(() => {
    const hasReport = template && template.profileTenant === profile?.tenant;
    setMode(hasReport ? 'template' : 'reports');
    setTemplateView(Boolean(hasReport));
    setError('');
  });
  const openMapping = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); setMode('mapping');
    void reloadProfiles(false);
  });
  const openNewTemplate = () => navigate(() => {
    if (!enabled) return;
    setActive(true); setNavigationActive(true); setMode('template'); setTemplate(null); setTemplateView(false);
    void reloadProfiles(false);
  });
  const openProfile = () => {
    if (!enabled || busy) return;
    if (profile) setProfileOpen(true);
    else void reloadProfiles(true);
  };
  const profileSaved = (saved) => {
    setProfiles((previous) => [...(previous || []).filter((item) => item.tenant !== profile?.tenant && item.tenant !== saved.tenant), saved]);
    setProfile(saved); setProfileOpen(false); setError('');
    setActive(true); setNavigationActive(true);
  };
  const selectProfile = (next) => navigate(() => {
    if (mode === 'reports' && next && next !== profile) {
      defaultReportProfile.current = next;
      setTemplatesLoading(true);
    }
    setProfile(next); setTemplate(null); setTemplateView(false);
  });
  async function loadTemplate(selected, tenant) {
    failedTemplate.current = null;
    setError('');
    const id = requestId.current;
    setOpeningTemplate(true);
    try {
      const loaded = await consolidationApi.getReport(selected.id);
      if (loaded.profileTenant !== tenant) throw new Error('This template belongs to another headquarter profile. Reload the report list.');
      if (id === requestId.current) { setMode('template'); setTemplate(loaded); setTemplateView(true); }
    } catch (failure) { if (id === requestId.current) { failedTemplate.current = selected; setError(failure.message); } }
    finally { if (id === requestId.current) setOpeningTemplate(false); }
  }
  const openTemplate = (selected = null) => navigate(() => {
    if (!profile) return;
    setActive(true); setNavigationActive(true); setError('');
    if (!selected) { setMode('template'); setTemplate(null); setTemplateView(false); return; }
    void loadTemplate(selected, profile.tenant);
  });
  const templateSaved = (saved) => {
    setTemplate(saved);
    setTemplates((list) => [...list.filter((item) => item.id !== saved.id), saved]);
    setDirty(false);
    setProfile((previous) => previous.headquarterLocked ? previous : { ...previous, headquarterLocked: true });
  };
  const mappingSaved = () => setProfile((previous) => previous.headquarterLocked ? previous : { ...previous, headquarterLocked: true });
  const deleteTemplate = async () => {
    if (!template || !profile || busy) return;
    setBusy(true);
    try {
      await consolidationApi.setReportDeleted(template, profile, true);
      templatesRequestId.current += 1;
      setTemplatesLoading(false);
      setTemplates((list) => list.filter((item) => item.id !== template.id));
      setTemplate(null); setDirty(false); setMode('reports'); setTemplateView(false);
      setGeneration((value) => value + 1);
    } finally { setBusy(false); }
  };
  const templateRestored = (restored) => {
    templatesRequestId.current += 1;
    setTemplatesLoading(false);
    setTemplates((list) => [...list.filter((item) => item.id !== restored.id), restored]);
  };
  const viewTemplate = () => navigate(() => setTemplateView(true));
  const previewTemplate = () => setTemplateView(true);
  const editTemplate = () => setTemplateView(false);
  const leave = (action = () => {}) => navigate(() => { setActive(false); setNavigationActive(false); action(); });
  const retry = () => failedTemplate.current ? openTemplate(failedTemplate.current) : reloadProfiles(false, mode !== 'reports', mode === 'reports');
  return { active, navigationActive, profiles, profile, profileOpen, setProfileOpen, loading, error, templates, templatesLoading, templateError,
    openReports, backToReports,
    mode, template, templateView, viewTemplate, previewTemplate, editTemplate, dirty, busy, openingTemplate, generation, setDirty, setBusy, openMapping, openNewTemplate, openProfile, reloadProfiles, retry,
    profileSaved, selectProfile, openTemplate, templateSaved, templateRestored, deleteTemplate, mappingSaved, leave,
    selectReport: (report) => navigate(() => { setActive(false); onSelectReport(report); }) };
}
