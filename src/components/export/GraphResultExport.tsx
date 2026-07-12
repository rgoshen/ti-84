import * as React from 'react';
import { Download, FileImage, FileText, LoaderCircle } from 'lucide-react';

import ExportArtifact from './ExportArtifact';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadExportArtifact } from '@/scripts/export/download';
import {
  exportEligibility,
  type ExportFormat,
  type ExportSnapshot,
} from '@/scripts/export/model';

export interface GraphResultExportProps {
  hasGraph: boolean;
  rowCount: number;
  createSnapshot: () => ExportSnapshot;
}

interface PendingExport {
  format: ExportFormat;
  snapshot: ExportSnapshot;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export default function GraphResultExport({
  hasGraph,
  rowCount,
  createSnapshot,
}: GraphResultExportProps): React.JSX.Element {
  const eligibility = exportEligibility(hasGraph, rowCount);
  const [pending, setPending] = React.useState<PendingExport | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const artifactRef = React.useRef<HTMLDivElement>(null);
  const graphRef = React.useRef<HTMLDivElement>(null);

  const requestExport = (format: ExportFormat): void => {
    if (!eligibility.enabled || busy) return;
    setBusy(true);
    setStatus(`Preparing ${format.toUpperCase()}...`);
    requestAnimationFrame(() => {
      try {
        setPending({ format, snapshot: createSnapshot() });
      } catch {
        setStatus('Could not export this graph. Try again.');
        setBusy(false);
      }
    });
  };

  React.useEffect(() => {
    if (!pending || !artifactRef.current || !graphRef.current) return;
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        graphRef.current?.replaceChildren();
        if (!graphRef.current) throw new Error('Export graph target unavailable');
        pending.snapshot.renderGraph(graphRef.current);
        await document.fonts?.ready;
        await nextFrame();
        await nextFrame();
        if (cancelled || !artifactRef.current) return;
        await downloadExportArtifact(
          artifactRef.current,
          pending.format,
          pending.snapshot.model.slug,
        );
        if (!cancelled) setStatus(`${pending.format.toUpperCase()} download ready.`);
      } catch {
        if (!cancelled) setStatus('Could not export this graph. Try again.');
      } finally {
        if (!cancelled) {
          setPending(null);
          setBusy(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" disabled={!eligibility.enabled || busy}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => requestExport('png')}>
            <FileImage aria-hidden="true" />
            Download PNG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => requestExport('pdf')}>
            <FileText aria-hidden="true" />
            Download PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {eligibility.reason ? (
        <p className="text-xs text-muted-foreground">{eligibility.reason}</p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {pending ? (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -100000, top: 0, width: 1440, pointerEvents: 'none' }}
        >
          <ExportArtifact
            model={pending.snapshot.model}
            artifactRef={artifactRef}
            graphRef={graphRef}
          />
        </div>
      ) : null}
    </div>
  );
}
