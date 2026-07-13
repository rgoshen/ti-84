import * as React from 'react';

import { Card } from '@/components/ui/card';
import type { ExportFact } from '@/scripts/export/model';

export interface FunctionDetailsPanelEntry {
  id: string;
  title: string;
  color?: string;
  facts: ExportFact[];
}

export interface FunctionDetailsPanelsProps {
  entries: FunctionDetailsPanelEntry[];
  testId?: string;
}

export default function FunctionDetailsPanels({
  entries,
  testId = 'function-details',
}: FunctionDetailsPanelsProps): React.JSX.Element | null {
  if (entries.length === 0) return null;

  return (
    <section
      data-testid={testId}
      aria-label="Function details"
      className="grid gap-3 md:grid-cols-2"
    >
      {entries.map((entry) => (
        <Card
          key={entry.id}
          data-function-details-id={entry.id}
          className="gap-2 p-4"
          style={{ borderLeft: entry.color ? `4px solid ${entry.color}` : undefined }}
        >
          <h3 className="text-sm font-medium" style={{ overflowWrap: 'anywhere' }}>
            {entry.title}
          </h3>
          <dl className="text-xs">
            {entry.facts.map((fact, index) => (
              <div
                key={`${fact.label}-${index}`}
                className="flex justify-between gap-3 border-b py-1.5 last:border-0"
              >
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd
                  className="text-right font-mono tabular-nums"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </section>
  );
}
