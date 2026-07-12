import type { Window2D } from '@/scripts/graphing/math';

export const ARTIFACT_WIDTH = 1440;
export const EXPORT_GRAPH_WIDTH = 960;
export const EXPORT_GRAPH_HEIGHT = 560;
export const MAX_EXPORT_ROWS = 201;

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

export function exportEligibility(hasGraph: boolean, rowCount: number): ExportEligibility {
  if (!hasGraph) {
    return { enabled: false, reason: 'Graph something before exporting.' };
  }
  if (rowCount > MAX_EXPORT_ROWS) {
    return {
      enabled: false,
      reason: 'Narrow the x window to 201 whole-number values or fewer.',
    };
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
