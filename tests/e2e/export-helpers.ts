import type { Download, Page } from '@playwright/test';

export async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function downloadExport(page: Page, format: 'PNG' | 'PDF'): Promise<Download> {
  await page.getByRole('button', { name: 'Export' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: `Download ${format}` }).click();
  return downloadPromise;
}
