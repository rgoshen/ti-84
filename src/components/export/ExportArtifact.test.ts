import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ExportArtifact from './ExportArtifact';
import GraphResultExport from './GraphResultExport';
import type { ExportArtifactModel } from '@/scripts/export/model';

const MODEL: ExportArtifactModel = {
  slug: 'graphing-calculator',
  title: 'Graphing Calculator',
  exportedAt: 'July 12, 2026',
  window: { xMin: -10.459925966974, xMax: 11.57158384563583, yMin: -5, yMax: 20 },
  legend: [{
    label: 'y = thisIsAnIntentionallyLongFunctionName(x) + x²',
    color: '#2563eb',
    detail: 'Points hidden',
  }],
  sections: [
    {
      title: 'Graph information',
      facts: [
        { label: 'x range', value: '-10 to 10' },
        { label: 'Functions', value: '1' },
      ],
    },
    {
      title: 'Analysis',
      facts: [{ label: 'Domain', value: 'All real numbers' }],
    },
    {
      title: 'Visible settings',
      facts: [{ label: 'Grid', value: 'Shown' }],
    },
  ],
  table: {
    title: 'Selected values',
    headers: ['x', 'thisIsAnIntentionallyLongFunctionName(x) + x²'],
    rows: [
      ['0', '0'],
      ['1', '1'],
    ],
  },
};

describe('ExportArtifact', () => {
  it('renders the fixed light result surface without interactive controls', () => {
    const html = renderToStaticMarkup(React.createElement(ExportArtifact, { model: MODEL }));

    expect(html).toContain('data-testid="export-artifact"');
    expect(html).toContain('width:1440px');
    expect(html).toContain('width:960px;height:560px');
    expect(html).toContain('background:#f8fafc');
    expect(html).toContain('Graphing Calculator');
    expect(html).toContain('y = thisIsAnIntentionallyLongFunctionName(x) + x²');
    expect(html).toContain('x [-10.46, 11.572]');
    expect(html).toContain('Graph information');
    expect(html).toContain('data-testid="export-details"');
    expect(html).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
    expect(html).toContain('Analysis');
    expect(html).toContain('Visible settings');
    expect(html).toContain('Selected values');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('table-layout:fixed');
    expect(html).not.toMatch(/<(button|input|select|nav)\b/);
  });

  it('renders an accessible disabled Export trigger with eligibility guidance', () => {
    const html = renderToStaticMarkup(
      React.createElement(GraphResultExport, {
        hasGraph: false,
        createSnapshot: () => {
          throw new Error('not called while disabled');
        },
      }),
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Export.*<\/button>/);
    expect(html).toContain('Graph something before exporting.');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('role="status"');
  });
});
