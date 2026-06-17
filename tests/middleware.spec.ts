import { test, expect } from '@playwright/test';
import { screenshot, MOCK_USER } from './helpers';

test.describe('Middleware - Redirecciones de Autenticación', () => {
  test('Sin sesión: /dashboard redirige a /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await screenshot(page, 'Middleware - dashboard sin sesión redirige a login');
  });

  test('Sin sesión: /ordenes redirige a /login', async ({ page }) => {
    await page.goto('/ordenes');
    await expect(page).toHaveURL('/login');
  });

  test('Sin sesión: /productos redirige a /login', async ({ page }) => {
    await page.goto('/productos');
    await expect(page).toHaveURL('/login');
  });

  test('Sin sesión: /empleados/registrar redirige a /login', async ({ page }) => {
    await page.goto('/empleados/registrar');
    await expect(page).toHaveURL('/login');
  });

  test('Ruta raíz redirige a /login sin sesión', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });
});
