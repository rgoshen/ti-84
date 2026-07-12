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
  window: { xMin: -10, xMax: 10, yMin: -5, yMax: 20 },
  legend: [{ label: 'y = x^2', color: '#2563eb', detail: 'Points hidden' }],
  sections: [
    {
      title: 'Graph information',
      facts: [
        { label: 'x range', value: '-10 to 10' },
        { label: 'Functions', value: '1' },
      ],
    },
  ],
  table: {
    title: 'Value table',
    headers: ['x', 'x^2'],
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
    expect(html).toContain('y = x^2');
    expect(html).toContain('Graph information');
    expect(html).toContain('Value table');
    expect(html).not.toMatch(/<(button|input|select|nav)\b/);
  });

  it('renders an accessible disabled Export trigger with eligibility guidance', () => {
    const html = renderToStaticMarkup(
      React.createElement(GraphResultExport, {
        hasGraph: false,
        rowCount: 0,
        createSnapshot: () => {
          throw new Error('not called while disabled');
        },
      }),
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Export.*<\/button>/);
    expect(html).toContain('Graph something before exporting.');
  });
});
