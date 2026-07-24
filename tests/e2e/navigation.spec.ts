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

test('the dropdown is closed by default and the caret opens it with every explorer', async ({
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
  await expect(menu(page).getByRole('link', { name: 'Angle Explorer' })).toBeVisible();
  // Every explorer route must appear here, not just the catalog page — the two lists
  // are maintained separately, so this count guards against a new explorer being added
  // to /explorers but forgotten in the header dropdown.
  await expect(menu(page).getByRole('link')).toHaveCount(3);
});

test('picking the Angle Explorer from the dropdown navigates to it', async ({ page }) => {
  await page.goto('/');
  await caret(page).click();
  await menu(page).getByRole('link', { name: 'Angle Explorer' }).click();
  await expect(page).toHaveURL(/\/explorers\/angles\/?$/);
});

test('the dropdown marks the Angle Explorer when you are on it', async ({ page }) => {
  await page.goto('/explorers/angles');
  await caret(page).click();

  await expect(menu(page).getByRole('link', { name: 'Angle Explorer' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('hovering the Explorers nav opens the dropdown', async ({ page }) => {
  await page.goto('/');
  await explorersNav(page).hover();
  await expect(menu(page)).toBeVisible();
});

/**
 * THE RULE: a real mouse must be able to travel from the nav item into the menu
 * and click an item. `locator.hover()` TELEPORTS the cursor, so it never crosses
 * the space between the nav item and the menu — that blind spot let a `mt-1` gap
 * ship, which fired `mouseleave` mid-journey and closed the menu before you could
 * reach it. Here we walk the cursor in steps, the way a hand does.
 */
test('the mouse can travel from the nav into the dropdown and click an item', async ({ page }) => {
  await page.goto('/');

  const navBox = await explorersNav(page).boundingBox();
  if (!navBox) throw new Error('explorers nav not found');
  await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2, { steps: 5 });
  await expect(menu(page)).toBeVisible();

  const item = menu(page).getByRole('link', { name: 'Transformation Explorer' });
  const itemBox = await item.boundingBox();
  if (!itemBox) throw new Error('menu item not found');

  // Cross the space between the item and the menu the way a real cursor does.
  await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, { steps: 25 });
  await expect(menu(page)).toBeVisible(); // must NOT have closed on the way down

  await page.mouse.down();
  await page.mouse.up();
  await expect(page).toHaveURL(/\/explorers\/transformations\/?$/);
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

test('the embedded TI-84 does not expose graph result export commands', async ({ page }) => {
  await page.goto('/ti-84');
  await expect(page.getByRole('button', { name: 'Export' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Download PNG' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Download PDF' })).toHaveCount(0);
});
