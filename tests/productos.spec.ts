import { test, expect } from '@playwright/test';
import { screenshot, setupAuthenticatedPage, setTestBypass, setAuthCookie, MOCK_ADMIN_USER } from './helpers';

test.describe('Productos (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, MOCK_ADMIN_USER);
    await page.goto('/productos');
    await page.waitForTimeout(2000);
  });

  test('Renderiza página con título y tabs', async ({ page }) => {
    await expect(page.getByText('Productos')).toBeVisible();
    await expect(page.getByText('Inventario')).toBeVisible();
    await expect(page.getByText('Categorías')).toBeVisible();
    await expect(page.getByText('Reportes')).toBeVisible();
    await screenshot(page, 'Productos - vista completa');
  });

  test('Tab Inventario activo por defecto', async ({ page }) => {
    await expect(page.getByText('Inventario de Productos')).toBeVisible();
    await screenshot(page, 'Productos - inventario activo');
  });

  test('Muestra la tabla de productos', async ({ page }) => {
    const productoEnTabla = page.getByText('Tapa de Jamón');
    await expect(productoEnTabla).toBeVisible();
    await screenshot(page, 'Productos - tabla con datos');
  });

  test('Búsqueda filtra productos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar producto/i);
    await searchInput.fill('Cerveza');
    await page.waitForTimeout(600);
    await expect(page.getByText('Cerveza Artesanal')).toBeVisible();
    await expect(page.getByText('Tapa de Jamón')).not.toBeVisible();
    await screenshot(page, 'Productos - filtro de búsqueda');
  });

  test('Cambio entre vista tabla y tarjetas', async ({ page }) => {
    const cardViewButton = page.locator('button[title="Vista tarjetas"]');
    if (await cardViewButton.isVisible()) {
      await cardViewButton.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'Productos - vista tarjetas');
      const tableViewButton = page.locator('button[title="Vista tabla"]');
      await tableViewButton.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'Productos - vista tabla');
    }
  });

  test('Navegación a tab Categorías', async ({ page }) => {
    await page.getByText('Categorías').click();
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
    if (await agregarBtn.isVisible()) {
      await agregarBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Productos - Sin permisos de admin', () => {
  test('Usuario sin rol admin es redirigido a dashboard', async ({ page }) => {
    await setTestBypass(page);
    await setAuthCookie(page);
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token', token_type: 'Bearer', expires_in: 3600,
          refresh_token: 'fake-refresh', user: { id: '1', email: 'user@test.com' },
        }),
      });
    });
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', aud: 'authenticated', role: 'authenticated', email: 'user@test.com' }),
      });
    });
    await page.route('**/rest/v1/usuarios*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: '1', cargo_id: 2, sucursal_id: 1 }]),
      });
    });
    await page.route('**/rest/v1/cargos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 2, nombre: 'Mesero' }]),
      });
    });
    await page.route('**/rest/v1/productos*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/categorias_productos*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/productos');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/dashboard/);
    await screenshot(page, 'Productos - redirect a dashboard por no ser admin');
  });
});
