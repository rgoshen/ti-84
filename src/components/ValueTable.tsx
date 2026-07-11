import * as React from 'react';

import { Card } from '@/components/ui/card';

/** One column: a header, a colour, and values parallel to `xs` (precomputed by the caller). */
export interface ValueColumn {
  key: string;
  header: React.ReactNode;
  color: string;
  /** `null` = no value at that x (rendered as "—"). */
  values: Array<number | null>;
}

export interface ValueTableProps {
  xs: number[];
  columns: ValueColumn[];
  emptyMessage: string;
  note?: string;
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * The value table is the only place an explorer's math exists as real, screen-readable
 * text rather than SVG — hence a genuine <table> with scope="col" headers.
 *
 * Purely presentational: it evaluates NOTHING. The caller passes precomputed values, which
 * keeps `evalAt` (which re-parses its expression on every call) out of the render path.
 */
export default function ValueTable({
  xs,
  columns,
  emptyMessage,
  note,
}: ValueTableProps): React.JSX.Element {
  const hasRows = xs.length > 0 && columns.length > 0;

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Value table (whole-number x)</h3>
        {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
      </div>

      {hasRows ? (
        <div className="max-h-72 overflow-auto">
          <table data-testid="value-table" className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th
                  scope="col"
                  className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium"
                >
                  x
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium"
                    style={{ color: col.color }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x, i) => (
                <tr key={x} data-x={x} className={i % 2 ? 'bg-muted/40' : ''}>
                  <td className="whitespace-nowrap border-b px-2 py-1 font-mono">{x}</td>
                  {columns.map((col) => {
                    const v = col.values[i];
                    return (
                      <td
                        key={col.key}
                        data-col={col.key}
                        className="whitespace-nowrap border-b px-2 py-1 font-mono"
                      >
                        {v === null || v === undefined ? '—' : round6(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      )}
    </Card>
  );
}
