import React from 'react';
import ReactDOM from 'react-dom/client';
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
