import { test, expect } from '@playwright/test';
import { screenshot, setupAuthenticatedPage } from './helpers';

test.describe('Registro de Empleados', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.goto('/empleados/registrar');
    await page.waitForTimeout(1500);
  });

  test('Renderiza formulario completo con todos los campos', async ({ page }) => {
    await expect(page.getByText('Registrar Empleado')).toBeVisible();
    await expect(page.getByText('Nuevo Registro')).toBeVisible();
    await expect(page.getByText('Datos Básicos')).toBeVisible();
    await expect(page.getByText('Asignación y Fechas')).toBeVisible();
    await expect(page.getByText('Datos de Nómina')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. Juan')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. Pérez')).toBeVisible();
    await expect(page.getByPlaceholder('ejemplo@correo.com')).toBeVisible();
    await expect(page.getByText('Registrar Nuevo Empleado')).toBeVisible();
    await screenshot(page, 'Empleados - formulario completo');
  });

  test('Select de Cargo tiene opciones', async ({ page }) => {
    const cargoSelect = page.locator('select[name="cargo_id"]');
    await expect(cargoSelect).toBeVisible();
    const options = cargoSelect.locator('option');
    await expect(options).toHaveCount(4);
    await screenshot(page, 'Empleados - select cargo');
  });

  test('Select de Sucursal tiene opciones', async ({ page }) => {
    const sucursalSelect = page.locator('select[name="sucursal_id"]');
    await expect(sucursalSelect).toBeVisible();
    const options = sucursalSelect.locator('option');
    await expect(options).toHaveCount(3);
    await screenshot(page, 'Empleados - select sucursal');
  });

  test('Checkbox de salario fijo funciona', async ({ page }) => {
    const checkbox = page.locator('input[name="es_salario_fijo"]');
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('Campos de fecha se renderizan', async ({ page }) => {
    await expect(page.locator('input[name="fechaIngreso"]')).toBeVisible();
    await expect(page.locator('input[name="fechaSalida"]')).toBeVisible();
  });

  test('Campos de nómina se renderizan', async ({ page }) => {
    await expect(page.locator('input[name="tarifa_hora"]')).toBeVisible();
    await expect(page.getByText('Tiene salario fijo')).toBeVisible();
    await screenshot(page, 'Empleados - datos de nómina');
  });
});
