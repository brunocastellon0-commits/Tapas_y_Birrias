import { test, expect } from '@playwright/test';
import { screenshot, setupAuthenticatedPage } from './helpers';

test.describe('Órdenes / Servicio', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('Renderiza página con tabs correctos', async ({ page }) => {
    await page.goto('/ordenes');
    await page.waitForTimeout(2000);
    await expect(page.getByText('Operación en Vivo')).toBeVisible();
    await expect(page.getByText('Historial de Comandas')).toBeVisible();
    await expect(page.getByText('Caja')).toBeVisible();
    await screenshot(page, 'Ordenes - tabs principales');
  });

  test('Navegación a tab Historial vía URL', async ({ page }) => {
    await page.goto('/ordenes?tab=historial');
    await page.waitForTimeout(2000);
    await expect(page.getByText('Historial de Comandas')).toBeVisible();
    await screenshot(page, 'Ordenes - historial de comandas');
  });

  test('Navegación a tab Caja vía URL', async ({ page }) => {
    await page.goto('/ordenes?tab=caja');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: 'Caja', exact: true })).toBeVisible();
    await screenshot(page, 'Ordenes - panel de caja');
  });

  test('Sin mesa seleccionada, panel derecho muestra placeholder', async ({ page }) => {
    await page.goto('/ordenes');
    await page.waitForTimeout(2000);
    const body = page.locator('body');
    await expect(body).toContainText(/Selecciona una mesa|selecciona/i);
    await screenshot(page, 'Ordenes - sin mesa seleccionada');
  });

  test('Tab de Caja muestra botón Abrir/Cerrar Caja', async ({ page }) => {
    await page.goto('/ordenes?tab=caja');
    await page.waitForTimeout(2000);
    const cajaBtn = page.getByText(/Abrir Caja|Cerrar Caja/i);
    await expect(cajaBtn).toBeVisible();
    await screenshot(page, 'Ordenes - botón abrir/cerrar caja');
  });
});
