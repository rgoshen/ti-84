import {
  ARTIFACT_WIDTH,
  exportFilename,
  type ExportFormat,
  type ExportToolSlug,
} from './model';

export interface CaptureOptions {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  backgroundColor: string;
}

export interface ExportDependencies {
  toPng(node: HTMLElement, options: CaptureOptions): Promise<string>;
  savePng(dataUrl: string, filename: string): void;
  savePdf(
    dataUrl: string,
    width: number,
    height: number,
    filename: string,
  ): Promise<void> | void;
}

export interface PdfImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LETTER_LANDSCAPE_WIDTH = 792;
const LETTER_LANDSCAPE_HEIGHT = 612;
const PDF_MARGIN = 18;

export function fitImageToLetterLandscape(
  imageWidth: number,
  imageHeight: number,
): PdfImagePlacement {
  const availableWidth = LETTER_LANDSCAPE_WIDTH - PDF_MARGIN * 2;
  const availableHeight = LETTER_LANDSCAPE_HEIGHT - PDF_MARGIN * 2;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (LETTER_LANDSCAPE_WIDTH - width) / 2,
    y: (LETTER_LANDSCAPE_HEIGHT - height) / 2,
    width,
    height,
  };
}

const browserDependencies: ExportDependencies = {
  async toPng(node, options) {
    const { toPng } = await import('html-to-image');
    return toPng(node, options);
  },
  savePng(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  async savePdf(dataUrl, width, height, filename) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'letter',
    });
    const placement = fitImageToLetterLandscape(width, height);
    pdf.addImage(
      dataUrl,
      'PNG',
      placement.x,
      placement.y,
      placement.width,
      placement.height,
    );
    pdf.save(filename);
  },
};

export async function downloadExportArtifact(
  node: HTMLElement,
  format: ExportFormat,
  slug: ExportToolSlug,
  now = new Date(),
  dependencies: ExportDependencies = browserDependencies,
): Promise<void> {
  const height = node.scrollHeight;
  const dataUrl = await dependencies.toPng(node, {
    width: ARTIFACT_WIDTH,
    height,
    canvasWidth: ARTIFACT_WIDTH,
    canvasHeight: height,
    pixelRatio: 1,
    backgroundColor: '#f8fafc',
  });
  const filename = exportFilename(slug, format, now);

  if (format === 'png') {
    dependencies.savePng(dataUrl, filename);
    return;
  }
  await dependencies.savePdf(dataUrl, ARTIFACT_WIDTH, height, filename);
}
