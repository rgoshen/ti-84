import type { Window2D } from '@/scripts/graphing/math';

export const ARTIFACT_WIDTH = 1440;
export const EXPORT_GRAPH_WIDTH = 960;
export const EXPORT_GRAPH_HEIGHT = 560;
export const MAX_EXPORT_TABLE_ROWS = 9;

export type ExportFormat = 'png' | 'pdf';
export type ExportToolSlug =
  | 'graphing-calculator'
  | 'function-explorer'
  | 'transformation-explorer';

export interface ExportLegendItem {
  label: string;
  color: string;
  detail?: string;
}

export interface ExportFact {
  label: string;
  value: string;
}

export interface ExportSection {
  title: string;
  facts: ExportFact[];
}

export interface ExportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ExportArtifactModel {
  slug: ExportToolSlug;
  title: string;
  exportedAt: string;
  window: Window2D;
  legend: ExportLegendItem[];
  sections: ExportSection[];
  table: ExportTable;
}

export type ExportGraphRenderer = (target: HTMLElement) => void;

export interface ExportSnapshot {
  model: ExportArtifactModel;
  renderGraph: ExportGraphRenderer;
}

export interface ExportEligibility {
  enabled: boolean;
  reason: string | null;
}

export function exportEligibility(hasGraph: boolean): ExportEligibility {
  if (!hasGraph) {
    return { enabled: false, reason: 'Graph something before exporting.' };
  }
  return { enabled: true, reason: null };
}

export function exportFilename(
  slug: ExportToolSlug,
  format: ExportFormat,
  now: Date,
): string {
  return `${slug}-${now.toISOString().slice(0, 10)}.${format}`;
}

export function formatExportValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return String(Math.round(value * 1e6) / 1e6);
}

export function formatExportBound(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

export function formatExportEquation(expression: string): string {
  return expression.replace(/\^(-?\d+)/g, (_match, exponent: string) =>
    [...exponent].map((character) => SUPERSCRIPT_DIGITS[character]).join(''),
  );
}

export function selectRepresentativeRows<T>(
  rows: readonly T[],
  maximum = MAX_EXPORT_TABLE_ROWS,
): T[] {
  if (maximum <= 0 || rows.length === 0) return [];
  if (rows.length <= maximum) return [...rows];
  if (maximum === 1) return [rows[0]];

  return Array.from({ length: maximum }, (_, index) => {
    const sourceIndex = Math.round((index * (rows.length - 1)) / (maximum - 1));
    return rows[sourceIndex];
  });
}
