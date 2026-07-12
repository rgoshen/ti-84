import { describe, expect, it, vi } from 'vitest';

import { downloadExportArtifact, type ExportDependencies } from './download';

describe('downloadExportArtifact', () => {
  const node = { scrollHeight: 900 } as HTMLElement;

  it('captures and saves one PNG with the audited dimensions', async () => {
    const dependencies: ExportDependencies = {
      toPng: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      savePng: vi.fn(),
      savePdf: vi.fn(),
    };

    await downloadExportArtifact(
      node,
      'png',
      'graphing-calculator',
      new Date('2026-07-12T00:00:00Z'),
      dependencies,
    );

    expect(dependencies.toPng).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ width: 1440, height: 900, pixelRatio: 1 }),
    );
    expect(dependencies.savePng).toHaveBeenCalledWith(
      'data:image/png;base64,abc',
      'graphing-calculator-2026-07-12.png',
    );
    expect(dependencies.savePdf).not.toHaveBeenCalled();
  });

  it('embeds the identical capture in one PDF', async () => {
    const dependencies: ExportDependencies = {
      toPng: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      savePng: vi.fn(),
      savePdf: vi.fn(),
    };

    await downloadExportArtifact(
      node,
      'pdf',
      'function-explorer',
      new Date('2026-07-12T00:00:00Z'),
      dependencies,
    );

    expect(dependencies.savePdf).toHaveBeenCalledWith(
      'data:image/png;base64,abc',
      1440,
      900,
      'function-explorer-2026-07-12.pdf',
    );
    expect(dependencies.savePng).not.toHaveBeenCalled();
  });
});
