export const normalizeLookupCode = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  if (/^\d+(?:\.0+)?$/.test(raw)) return String(Number(raw));
  return raw;
};

export const normalizeDeptLookupCode = normalizeLookupCode;
export const normalizeAccLookupCode = normalizeLookupCode;

