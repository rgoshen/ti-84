import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_WIDTH,
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  MAX_EXPORT_TABLE_ROWS,
  exportEligibility,
  exportFilename,
  formatExportBound,
  formatExportEquation,
  formatExportValue,
  selectRepresentativeRows,
} from './model';

describe('graph export model', () => {
  it('pins the audited export dimensions', () => {
    expect({ ARTIFACT_WIDTH, EXPORT_GRAPH_WIDTH, EXPORT_GRAPH_HEIGHT, MAX_EXPORT_TABLE_ROWS }).toEqual({
      ARTIFACT_WIDTH: 1440,
      EXPORT_GRAPH_WIDTH: 960,
      EXPORT_GRAPH_HEIGHT: 560,
      MAX_EXPORT_TABLE_ROWS: 9,
    });
  });

  it('requires a graph without rejecting wide windows', () => {
    expect(exportEligibility(false)).toEqual({
      enabled: false,
      reason: 'Graph something before exporting.',
    });
    expect(exportEligibility(true)).toEqual({ enabled: true, reason: null });
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

  it('formats graph bounds for a human-readable report', () => {
    expect(formatExportBound(-10.459925966974)).toBe('-10.46');
    expect(formatExportBound(11.57158384563583)).toBe('11.572');
    expect(formatExportBound(-10)).toBe('-10');
  });

  it('formats integer exponents with readable superscripts', () => {
    expect(formatExportEquation('x^2')).toBe('x²');
    expect(formatExportEquation('2x^10 - x^-3')).toBe('2x¹⁰ - x⁻³');
    expect(formatExportEquation('x ^ 2 + x^(10)')).toBe('x² + x¹⁰');
  });

  it('selects at most nine representative rows including both endpoints', () => {
    const rows = Array.from({ length: 22 }, (_, index) => index - 10);

    const selected = selectRepresentativeRows(rows);

    expect(selected).toHaveLength(9);
    expect(selected[0]).toBe(-10);
    expect(selected.at(-1)).toBe(11);
    expect(selected).toEqual([...selected].sort((a, b) => a - b));
    expect(selectRepresentativeRows([0, 1, 2])).toEqual([0, 1, 2]);
  });
});
