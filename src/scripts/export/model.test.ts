import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_WIDTH,
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  MAX_EXPORT_ROWS,
  exportEligibility,
  exportFilename,
  formatExportValue,
} from './model';

describe('graph export model', () => {
  it('pins the audited export dimensions', () => {
    expect({ ARTIFACT_WIDTH, EXPORT_GRAPH_WIDTH, EXPORT_GRAPH_HEIGHT, MAX_EXPORT_ROWS }).toEqual({
      ARTIFACT_WIDTH: 1440,
      EXPORT_GRAPH_WIDTH: 960,
      EXPORT_GRAPH_HEIGHT: 560,
      MAX_EXPORT_ROWS: 201,
    });
  });

  it('rejects empty and oversized exports without truncating rows', () => {
    expect(exportEligibility(false, 1)).toEqual({
      enabled: false,
      reason: 'Graph something before exporting.',
    });
    expect(exportEligibility(true, 201)).toEqual({ enabled: true, reason: null });
    expect(exportEligibility(true, 202)).toEqual({
      enabled: false,
      reason: 'Narrow the x window to 201 whole-number values or fewer.',
    });
  });

  it('builds deterministic filenames without user input', () => {
    expect(
      exportFilename('function-explorer', 'png', new Date('2026-07-12T19:00:00Z')),
    ).toBe('function-explorer-2026-07-12.png');
  });

  it('formats missing and finite table values consistently', () => {
    expect(formatExportValue(null)).toBe('-');
    expect(formatExportValue(Number.POSITIVE_INFINITY)).toBe('-');
    expect(formatExportValue(1.23456789)).toBe('1.234568');
  });
});
