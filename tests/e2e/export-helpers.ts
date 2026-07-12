import type { Download, Locator, Page } from '@playwright/test';

export async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function downloadExport(
  page: Page,
  format: 'PNG' | 'PDF',
  inspectArtifact?: (artifact: Locator) => Promise<void>,
): Promise<Download> {
  await page.getByRole('button', { name: 'Export' }).click();
  const inspectionPromise = inspectArtifact?.(page.getByTestId('export-artifact'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: `Download ${format}` }).click();
  await inspectionPromise;
  return downloadPromise;
}
