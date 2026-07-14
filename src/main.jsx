import React from 'react';
import ReactDOM from 'react-dom/client';
import './config.js';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import LoginShell from './app/LoginShell.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';
import './index.css';
import { initializeTheme } from './lib/theme.js';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TooltipProvider>
      <LoginShell />
    </TooltipProvider>
  </React.StrictMode>
);
