import { test, expect } from '@playwright/test';
import { screenshot, submitForm, setupAuthenticatedPage } from './helpers';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Renderiza formulario de login con todos los elementos', async ({ page }) => {
    await expect(page.getByText('Iniciar Sesión')).toBeVisible();
    await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
    await expect(page.getByPlaceholder('Usuario o Correo')).toBeVisible();
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible();
    await expect(page.getByText('Recordarme')).toBeVisible();
    await expect(page.getByText('¿Olvidaste tu contraseña?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();
    await screenshot(page, 'Login - formulario completo');
  });

  test('Formulario vacío muestra error', async ({ page }) => {
    await page.locator('#identifier').fill('');
    await page.locator('#password').fill('');
    await submitForm(page);
    await expect(page.getByText('Todos los campos son obligatorios')).toBeVisible();
    await screenshot(page, 'Login - error campos vacíos');
  });

  test('Login exitoso redirige a dashboard', async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.locator('#identifier').fill('admin@test.com');
    await page.locator('#password').fill('password123');
    await submitForm(page);

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await screenshot(page, 'Login - éxito redirige a dashboard');
  });

  test('Error de credenciales muestra mensaje', async ({ page }) => {
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
    });

    await page.locator('#identifier').fill('admin@test.com');
    await page.locator('#password').fill('wrong-password');
    await submitForm(page);
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
    await screenshot(page, 'Login - credenciales inválidas');
  });

  test('Botones de OAuth se renderizan', async ({ page }) => {
    const socialButtons = page.locator('button[type="button"]');
    await expect(socialButtons.first()).toBeVisible();
    await screenshot(page, 'Login - botones sociales');
  });

  test('Input con icono cambia valor correctamente', async ({ page }) => {
    const identifierInput = page.locator('#identifier');
    await identifierInput.fill('usuario@test.com');
    await expect(identifierInput).toHaveValue('usuario@test.com');

    const passwordInput = page.locator('#password');
    await passwordInput.fill('mypassword');
    await expect(passwordInput).toHaveValue('mypassword');
  });
});
