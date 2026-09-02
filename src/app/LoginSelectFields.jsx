import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

export default function LoginSelectFields({
  businessUnits,
  fieldErrors,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  isLoadingBusinessUnits,
  language,
  languageList,
  selectedTenant,
  setLanguage,
  setSelectedTenant,
  submitAttempted,
  username,
}) {
  const selectedBusinessUnit = businessUnits.find(
    (item) => getBusinessUnitTenant(item) === selectedTenant,
  );

  return (
    <>
      <div className="space-y-2.5">
        <Label htmlFor="business-unit">
          Business Unit
        </Label>
        <Select
          value={selectedTenant}
          onValueChange={setSelectedTenant}
          disabled={!username.trim() || isLoadingBusinessUnits || businessUnits.length === 0}
        >
          <SelectTrigger
            id="business-unit"
            className="h-10 w-full"
            aria-invalid={Boolean(submitAttempted && fieldErrors.selectedTenant)}
            aria-describedby={fieldErrors.selectedTenant ? 'business-unit-error' : undefined}
          >
            <SelectValue placeholder={isLoadingBusinessUnits ? 'Loading business units...' : 'Select business unit'}>
              {selectedBusinessUnit ? getBusinessUnitDisplayName(selectedBusinessUnit) : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {businessUnits.map((item) => {
              const tenant = getBusinessUnitTenant(item);
              return (
                <SelectItem key={tenant} value={tenant}>
                  {getBusinessUnitDisplayName(item)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {submitAttempted && fieldErrors.selectedTenant && (
          <p id="business-unit-error" className="text-xs text-destructive">
            {fieldErrors.selectedTenant}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label>Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {languageList.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
