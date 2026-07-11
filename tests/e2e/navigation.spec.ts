import { test, expect, type Page } from '@playwright/test';

/**
 * Site navigation: the home page routes into the Explorers *hub* (not straight
 * into one explorer), and the header's Explorers item is a link to the hub plus
 * a keyboard-accessible dropdown of the individual explorers.
 */

const header = (page: Page) => page.locator('header');
const caret = (page: Page) => header(page).getByRole('button', { name: 'Show explorers' });
const menu = (page: Page) => page.locator('#explorers-menu');
const explorersNav = (page: Page) => page.locator('[data-explorers-nav]');

test('the home Explorers card opens the hub, not a specific explorer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Browse the explorers/i }).click();

  await expect(page).toHaveURL(/\/explorers\/?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Explorers' })).toBeVisible();
});

test('the dropdown is closed by default and the caret opens it with both explorers', async ({
  page,
}) => {
  await page.goto('/');

  await expect(menu(page)).toBeHidden();
  await expect(caret(page)).toHaveAttribute('aria-expanded', 'false');

  await caret(page).click();

  await expect(menu(page)).toBeVisible();
  await expect(caret(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(menu(page).getByRole('link', { name: 'Function Explorer' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Transformation Explorer' })).toBeVisible();
});

test('hovering the Explorers nav opens the dropdown', async ({ page }) => {
  await page.goto('/');
  await explorersNav(page).hover();
  await expect(menu(page)).toBeVisible();
});

test('picking an explorer from the dropdown navigates to it', async ({ page }) => {
  await page.goto('/');
  await caret(page).click();
  await menu(page).getByRole('link', { name: 'Transformation Explorer' }).click();

  await expect(page).toHaveURL(/\/explorers\/transformations\/?$/);
});

test('the Explorers label itself still links to the hub', async ({ page }) => {
  await page.goto('/');
  await header(page).getByRole('link', { name: 'Explorers', exact: true }).click();

  await expect(page).toHaveURL(/\/explorers\/?$/);
});

test('keyboard: the caret opens the dropdown and Escape closes it', async ({ page }) => {
  await page.goto('/');

  await caret(page).focus();
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
  await expect(caret(page)).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();
  await expect(caret(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(caret(page)).toBeFocused();
});

test('the dropdown marks the explorer you are currently on', async ({ page }) => {
  await page.goto('/explorers/transformations');
  await caret(page).click();

  await expect(menu(page).getByRole('link', { name: 'Transformation Explorer' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
