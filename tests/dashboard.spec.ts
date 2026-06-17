import { test, expect } from '@playwright/test';
import { screenshot, setupAuthenticatedPage } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
  });

  test('Renderiza título y fecha del dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Resumen del día')).toBeVisible();
    await screenshot(page, 'Dashboard - vista completa');
  });

  test('Renderiza los 4 KPIs principales', async ({ page }) => {
    await expect(page.getByText('Mesas Ocupadas')).toBeVisible();
    await expect(page.getByText('Comandas Activas')).toBeVisible();
    await expect(page.getByText('Total del Día')).toBeVisible();
    await expect(page.getByText('Cubiertos Hoy')).toBeVisible();
    await screenshot(page, 'Dashboard - KPIs visibles');
  });

  test('Enlaces rápidos a Órdenes e Historial', async ({ page }) => {
    await expect(page.getByText('Ir a Mesas')).toBeVisible();
    await expect(page.getByText('Ver Historial')).toBeVisible();
    await expect(page.getByText('Gestionar pedidos y comandas')).toBeVisible();
    await expect(page.getByText('Comandas cerradas y pagos')).toBeVisible();
    await screenshot(page, 'Dashboard - enlaces rápidos');
  });

  test('Click en "Ir a Mesas" navega a /ordenes', async ({ page }) => {
    await page.getByText('Ir a Mesas').click();
    await expect(page).toHaveURL('/ordenes');
  });

  test('Click en "Ver Historial" navega a /ordenes?tab=historial', async ({ page }) => {
    await page.getByText('Ver Historial').click();
    await expect(page).toHaveURL(/.*historial/);
  });

  test('Sidebar se renderiza con enlaces correctos', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Mesas')).toBeVisible();
    await expect(page.getByText('Cerrar Sesión')).toBeVisible();
    await screenshot(page, 'Dashboard - sidebar');
  });
});
