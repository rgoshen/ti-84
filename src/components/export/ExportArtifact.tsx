import * as React from 'react';

import {
  ARTIFACT_WIDTH,
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  type ExportArtifactModel,
} from '@/scripts/export/model';

export interface ExportArtifactProps {
  model: ExportArtifactModel;
  artifactRef?: React.Ref<HTMLDivElement>;
  graphRef?: React.Ref<HTMLDivElement>;
}

const BORDER = '#cbd5e1';
const MUTED = '#64748b';

export default function ExportArtifact({
  model,
  artifactRef,
  graphRef,
}: ExportArtifactProps): React.JSX.Element {
  const { window: win } = model;

  return (
    <article
      ref={artifactRef}
      data-testid="export-artifact"
      aria-hidden="true"
      style={{
        width: ARTIFACT_WIDTH,
        boxSizing: 'border-box',
        background: '#f8fafc',
        color: '#172033',
        padding: 40,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'end',
          justifyContent: 'space-between',
          gap: 24,
          paddingBottom: 18,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div>
          <div style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase' }}>
            Exported result
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: 30, lineHeight: 1.2 }}>{model.title}</h1>
        </div>
        <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.5, textAlign: 'right' }}>
          <div>{model.exportedAt}</div>
          <div>
            x [{win.xMin}, {win.xMax}] | y [{win.yMin}, {win.yMax}]
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${EXPORT_GRAPH_WIDTH}px 1fr`,
          gap: 24,
          alignItems: 'start',
          marginTop: 24,
        }}
      >
        <div
          ref={graphRef}
          data-testid="export-graph"
          style={{
            width: EXPORT_GRAPH_WIDTH,
            height: EXPORT_GRAPH_HEIGHT,
            overflow: 'hidden',
            border: `1px solid ${BORDER}`,
            background: '#ffffff',
          }}
        />

        <aside style={{ display: 'grid', gap: 16 }}>
          {model.legend.length > 0 ? (
            <section
              style={{ padding: 16, border: `1px solid ${BORDER}`, background: '#ffffff' }}
            >
              <h2
                style={{
                  margin: '0 0 8px',
                  color: '#475569',
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}
              >
                Equations
              </h2>
              {model.legend.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom:
                      index === model.legend.length - 1 ? undefined : '1px solid #e2e8f0',
                    fontSize: 14,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 12, height: 12, flex: 'none', borderRadius: '50%', background: item.color }}
                  />
                  <strong>{item.label}</strong>
                  {item.detail ? (
                    <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 11 }}>
                      {item.detail}
                    </span>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {model.sections.map((section) => (
            <section
              key={section.title}
              style={{ padding: 16, border: `1px solid ${BORDER}`, background: '#ffffff' }}
            >
              <h2
                style={{
                  margin: '0 0 8px',
                  color: '#475569',
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </h2>
              {section.facts.map((fact, index) => (
                <div
                  key={`${fact.label}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '7px 0',
                    borderBottom:
                      index === section.facts.length - 1 ? undefined : '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: MUTED }}>{fact.label}</span>
                  <strong style={{ textAlign: 'right' }}>{fact.value}</strong>
                </div>
              ))}
            </section>
          ))}
        </aside>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2
          style={{ margin: '0 0 8px', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}
        >
          {model.table.title}
        </h2>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', fontSize: 12 }}
        >
          <thead>
            <tr>
              {model.table.headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  scope="col"
                  style={{ padding: '7px 10px', border: `1px solid ${BORDER}`, background: '#e8eef5', textAlign: 'right' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => (
                  <td
                    key={columnIndex}
                    style={{ padding: '6px 10px', border: `1px solid ${BORDER}`, textAlign: 'right' }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer
        style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, color: MUTED, fontSize: 11 }}
      >
        <span>Interactive controls omitted from export.</span>
        <span>One graph | one artifact</span>
      </footer>
    </article>
  );
}
