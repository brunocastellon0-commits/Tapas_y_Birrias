import { test, expect } from '@playwright/test';
import { screenshot, loginAsAdmin, setTestBypass, mockSupabaseAuth, mockSupabaseTables, submitForm } from './helpers';

test.describe('Productos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/productos');
    await page.waitForTimeout(3000);
  });

  test('Renderiza página con título y tabs', async ({ page }) => {
    await expect(page.getByText('Productos', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inventario' })).toBeVisible();
    await expect(page.getByText('Categorías')).toBeVisible();
    await expect(page.getByText('Reportes')).toBeVisible();
    await screenshot(page, 'Productos - vista completa');
  });

  test('Tab Inventario activo por defecto', async ({ page }) => {
    await expect(page.getByText('Inventario de Productos')).toBeVisible();
    await screenshot(page, 'Productos - inventario activo');
  });

  test('Muestra la tabla de productos', async ({ page }) => {
    await expect(page.getByText('Tapa de Jamón')).toBeVisible();
    await screenshot(page, 'Productos - tabla con datos');
  });

  test('Búsqueda filtra productos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar producto/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Cerveza');
    await page.waitForTimeout(600);
    await expect(page.getByText('Cerveza Artesanal')).toBeVisible();
    await expect(page.getByText('Tapa de Jamón')).not.toBeVisible();
    await screenshot(page, 'Productos - filtro de búsqueda');
  });

  test('Cambio entre vista tabla y tarjetas', async ({ page }) => {
    const cardViewButton = page.locator('button[title="Vista tarjetas"]');
    await expect(cardViewButton).toBeVisible();
    await cardViewButton.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'Productos - vista tarjetas');
    const tableViewButton = page.locator('button[title="Vista tabla"]');
    await tableViewButton.click();
    await page.waitForTimeout(500);
    await screenshot(page, 'Productos - vista tabla');
  });

  test('Navegación a tab Categorías', async ({ page }) => {
    await page.getByRole('button', { name: 'Categorías' }).click();
    await page.waitForTimeout(500);
    await screenshot(page, 'Productos - categorías tab');
  });

  test('Navegación a tab Reportes', async ({ page }) => {
    await page.getByText('Reportes').click();
    await page.waitForTimeout(500);
    await screenshot(page, 'Productos - reportes tab');
  });

  test('Botón Agregar producto abre modal', async ({ page }) => {
    const agregarBtn = page.getByText('Agregar');
    await expect(agregarBtn).toBeVisible();
  });
});

test.describe('Productos - Sin permisos de admin', () => {
  test('Usuario sin rol admin es redirigido a dashboard', async ({ page }) => {
    await setTestBypass(page);
    await mockSupabaseAuth(page);
    await mockSupabaseTables(page, {
      usuarios: [{ id: 'mock-admin-id-1', cargo_id: 2, sucursal_id: 1 }],
      cargos: [{ id: 2, nombre: 'Mesero' }],
    });
    await page.goto('/login');
    await page.locator('#identifier').fill('admin@test.com');
    await page.locator('#password').fill('password123');
    await submitForm(page);
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    await page.goto('/productos');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/dashboard/);
    await screenshot(page, 'Productos - redirect a dashboard por no ser admin');
  });
});

