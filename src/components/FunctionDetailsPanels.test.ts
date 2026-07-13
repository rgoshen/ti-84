import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FunctionDetailsPanels from './FunctionDetailsPanels';

describe('FunctionDetailsPanels', () => {
  it('renders nothing when there are no function details', () => {
    expect(
      renderToStaticMarkup(React.createElement(FunctionDetailsPanels, { entries: [] })),
    ).toBe('');
  });

  it('renders color-owned semantic facts with stable wrapping', () => {
    const html = renderToStaticMarkup(
      React.createElement(FunctionDetailsPanels, {
        testId: 'graphing-function-details',
        entries: [
          {
            id: 'equation-1',
            title: 'Function details · y = 1/x²',
            color: '#60a5fa',
            facts: [
              { label: 'Domain', value: '(-∞, 0) ∪ (0, ∞)' },
              { label: 'Range', value: '(0, ∞)' },
            ],
          },
        ],
      }),
    );

    expect(html).toContain('data-testid="graphing-function-details"');
    expect(html).toContain('aria-label="Function details"');
    expect(html).toContain('data-function-details-id="equation-1"');
    expect(html).toContain('Function details · y = 1/x²');
    expect(html).toContain('<dt');
    expect(html).toContain('Domain');
    expect(html).toContain('<dd');
    expect(html).toContain('(-∞, 0) ∪ (0, ∞)');
    expect(html).toContain('border-left:4px solid #60a5fa');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).not.toMatch(/<(button|input|select)\b/);
  });
});
