import * as React from 'react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import {
  ARTIFACT_WIDTH,
  EXPORT_GRAPH_HEIGHT,
  EXPORT_GRAPH_WIDTH,
  formatExportBound,
  type ExportArtifactModel,
  type ExportSection,
} from '@/scripts/export/model';

export interface ExportArtifactProps {
  model: ExportArtifactModel;
  artifactRef?: React.Ref<HTMLDivElement>;
  graphRef?: React.Ref<HTMLDivElement>;
}

const BORDER = '#cbd5e1';
const MUTED = '#64748b';

function InformationSection({ section }: { section: ExportSection }): React.JSX.Element {
  return (
    <section
      data-export-section={section.id}
      style={{
        padding: 16,
        border: `1px solid ${BORDER}`,
        borderLeft: section.color ? `4px solid ${section.color}` : undefined,
        background: '#ffffff',
      }}
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
  );
}

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
            x [{formatExportBound(win.xMin)}, {formatExportBound(win.xMax)}] | y [{formatExportBound(win.yMin)}, {formatExportBound(win.yMax)}]
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
                    minWidth: 0,
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
                  <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{item.label}</strong>
                  {item.detail ? (
                    <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 11 }}>
                      {item.detail}
                    </span>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {model.sections[0] ? <InformationSection section={model.sections[0]} /> : null}
        </aside>
      </div>

      {model.sections.length > 1 ? (
        <div
          data-testid="export-details"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(2, model.sections.length - 1)}, minmax(0, 1fr))`,
            gap: 16,
            marginTop: 24,
          }}
        >
          {model.sections.slice(1).map((section, index) => (
            <InformationSection
              key={section.id ?? `${section.title}-${index}`}
              section={section}
            />
          ))}
        </div>
      ) : null}

      {model.table ? (
        <section style={{ marginTop: 24 }}>
          <h2
            style={{ margin: '0 0 8px', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}
          >
            {model.table.title}
          </h2>
          <table
            style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              background: '#ffffff',
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {model.table.headers.map((header, index) => (
                  <th
                    key={`${header}-${index}`}
                    scope="col"
                    style={{ padding: '7px 10px', border: `1px solid ${BORDER}`, background: '#e8eef5', textAlign: 'right', overflowWrap: 'anywhere' }}
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
      ) : null}

      <footer
        style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, color: MUTED, fontSize: 11 }}
      >
        <span>Interactive controls omitted from export.</span>
        <span>One graph | one artifact</span>
      </footer>
    </article>
  );
}
