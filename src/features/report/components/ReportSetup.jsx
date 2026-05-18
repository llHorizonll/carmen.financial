import React from 'react';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';

export default function ReportSetup(props) {
  return (
    <div className="space-y-6 overflow-y-auto pr-2 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full custom-scrollbar">
      <ReportDetailsPanel {...props} />
      <ColumnsConfigurator {...props} />
      <RowsConfigurator {...props} />
    </div>
  );
}
