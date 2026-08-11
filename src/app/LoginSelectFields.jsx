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
  return (
    <>
      <div className="space-y-2.5">
        <Label htmlFor="business-unit" className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Business Unit
        </Label>
        <Select
          value={selectedTenant}
          onValueChange={setSelectedTenant}
          disabled={!username.trim() || isLoadingBusinessUnits || businessUnits.length === 0}
        >
          <SelectTrigger
            id="business-unit"
            className="h-12 w-full rounded-2xl border-border bg-card px-4 shadow-sm transition-colors hover:bg-muted/40"
            aria-invalid={Boolean(submitAttempted && fieldErrors.selectedTenant)}
            aria-describedby={fieldErrors.selectedTenant ? 'business-unit-error' : undefined}
          >
            <SelectValue placeholder={isLoadingBusinessUnits ? 'Loading business units...' : 'Select business unit'} />
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
        <Label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-border bg-card px-4 shadow-sm transition-colors hover:bg-muted/40">
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
