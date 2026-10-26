import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORTS, getDefaultReports } from './defaultReports.js';

describe('defaultReports', () => {
  it('returns a clone of the default report catalog', () => {
    const reports = getDefaultReports();

    expect(reports).toEqual(DEFAULT_REPORTS);
    expect(reports).not.toBe(DEFAULT_REPORTS);
  });
});
