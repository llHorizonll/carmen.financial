export const createBlankReport = (companyName, userIds, newId = `rep-${Date.now()}`, owner = '') => ({
  id: newId,
  name: 'New Custom Report',
  companyName,
  category: ['ALL'],
  assignedUsers: [...userIds],
  isActive: true,
  periodFormat: 'standard',
  reportType: 'Monthly',
  owner,
  overrideDateDisplay: '',
  overridePeriodDisplay: '',
  day: '',
  theme: 'blue',
  descriptionPosition: 0,
  columns: [
    { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, formatAsPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' }
  ],
  rows: [
    { id: 'r-1', desc: 'Revenue', isActive: true, isHeader: true, isTotal: false, indent: 0 },
    { id: 'r-2', desc: 'Room Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '', percentBase: '', formula: '', indent: 1 }
  ]
});
