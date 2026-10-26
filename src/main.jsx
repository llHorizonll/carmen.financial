import React from 'react';
import ReactDOM from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import LoginShell from './app/LoginShell.jsx';
import ConnectivityFeedback from './components/system/ConnectivityFeedback.jsx';
import './index.css';
import { initializeTheme } from './lib/theme.js';

initializeTheme();

const activateDeferredStylesheets = () => {
  document.querySelectorAll('link[data-deferred-stylesheet]').forEach((link) => {
    link.rel = 'stylesheet';
    link.removeAttribute('as');
    link.removeAttribute('data-deferred-stylesheet');
  });
};

if (document.readyState === 'complete') activateDeferredStylesheets();
else window.addEventListener('load', activateDeferredStylesheets, { once: true });

const container = document.getElementById('root');
const application = (
  <React.StrictMode>
    <ConnectivityFeedback>
      <LoginShell />
    </ConnectivityFeedback>
  </React.StrictMode>
);

if (container.hasChildNodes()) ReactDOM.hydrateRoot(container, application);
else ReactDOM.createRoot(container).render(application);
