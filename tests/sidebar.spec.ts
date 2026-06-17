import { test, expect } from '@playwright/test';
import { screenshot, loginAsAdmin, setupAuthenticatedPage } from './helpers';

test.describe('Sidebar de Navegación', () => {
  test('Sidebar muestra enlaces para usuario normal', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mesas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Registrar' })).toBeVisible();
    await screenshot(page, 'Sidebar - usuario normal sin productos');
  });

  test('Sidebar muestra Productos solo para admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mesas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Productos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Registrar' })).toBeVisible();
    await screenshot(page, 'Sidebar - admin con productos visible');
  });

  test('Botón Cerrar Sesión está presente', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Cerrar Sesión')).toBeVisible();
    await screenshot(page, 'Sidebar - cerrar sesión visible');
  });
});
