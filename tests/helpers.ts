import { test, Page } from '@playwright/test';

export async function setTestBypass(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-test-bypass': '1' });
}

export async function setAuthCookie(page: Page) {
  await page.context().addCookies([
    {
      name: 'sb-vliahhgkfwpyutdfszra-auth-token',
      value: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: { id: 'mock-user-id-1', email: 'test@hadassa.com' },
      }),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

export async function screenshot(page: Page, name: string) {
  const buffer = await page.screenshot({ fullPage: true });
  await test.info().attach(name, {
    contentType: 'image/png',
    body: buffer,
  });
}

export async function submitForm(page: Page) {
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });
}

export const MOCK_USER = {
  id: 'mock-user-id-1',
  email: 'test@hadassa.com',
  user_metadata: { nombre: 'Test', apellido: 'User' },
  app_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
};

export const MOCK_ADMIN_USER = {
  ...MOCK_USER,
  id: 'mock-admin-id-1',
  email: 'admin@hadassa.com',
};

export async function mockSupabaseAuth(page: Page, user = MOCK_USER) {
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'email' },
        user_metadata: { nombre: user.user_metadata?.nombre ?? '', apellido: user.user_metadata?.apellido ?? '' },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });
}

export async function mockSupabaseTables(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('mesas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, numero: 1, zona: 'Interior', sillas: 4, activa: true, shape: 'square' },
          { id: 2, numero: 2, zona: 'Terraza', sillas: 2, activa: true, shape: 'circle' },
          { id: 3, numero: 3, zona: 'Interior', sillas: 6, activa: true, shape: 'rectangle' },
          { id: 4, numero: 4, zona: 'Terraza', sillas: 4, activa: true, shape: 'square' },
          { id: 5, numero: 5, zona: 'VIP', sillas: 8, activa: true, shape: 'rectangle' },
        ]),
      });
    } else if (url.includes('comandas') && !url.includes('count')) {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1, mesa_id: 1, etapa: 'tomada', cubiertos: 2, total: 0, items: [],
              mesa: { numero: 1 }, usuario: { nombre: 'Test', apellido: 'User' }, pago: [],
              created_at: new Date().toISOString(),
            },
            {
              id: 2, mesa_id: 3, etapa: 'en-cocina', cubiertos: 4, total: 0, items: [],
              mesa: { numero: 3 }, usuario: { nombre: 'Test', apellido: 'User' }, pago: [],
              created_at: new Date().toISOString(),
            },
          ]),
        });
      } else {
        await route.fulfill({ status: 201, body: JSON.stringify({ id: 99 }) });
      }
    } else if (url.includes('pagos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { monto: 450, created_at: new Date().toISOString() },
          { monto: 320, created_at: new Date().toISOString() },
        ]),
      });
    } else if (url.includes('productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nombre: 'Tapa de Jamón', categoria_id: 1, categoria: { nombre: 'Clásicas' }, precio: 350, costo: 150, medida: 'unidad', stock: 50, activo: true, created_at: new Date().toISOString() },
          { id: 2, nombre: 'Tapa de Queso', categoria_id: 1, categoria: { nombre: 'Clásicas' }, precio: 320, costo: 130, medida: 'unidad', stock: 40, activo: true, created_at: new Date().toISOString() },
          { id: 3, nombre: 'Cerveza Artesanal', categoria_id: 2, categoria: { nombre: 'Bebidas' }, precio: 280, costo: 90, medida: 'pinta', stock: 100, activo: true, created_at: new Date().toISOString() },
          { id: 4, nombre: 'Vino Tinto', categoria_id: 2, categoria: { nombre: 'Bebidas' }, precio: 450, costo: 200, medida: 'copa', stock: 30, activo: true, created_at: new Date().toISOString() },
          { id: 5, nombre: 'Papas Fritas', categoria_id: 1, categoria: { nombre: 'Clásicas' }, precio: 250, costo: 80, medida: 'porción', stock: 60, activo: true, created_at: new Date().toISOString() },
          { id: 6, nombre: 'Lomo Saltado', categoria_id: 3, categoria: { nombre: 'Platos' }, precio: 650, costo: 280, medida: 'plato', stock: 20, activo: true, created_at: new Date().toISOString() },
        ]),
      });
    } else if (url.includes('categorias_productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nombre: 'Clásicas', activo: true, orden: 1, sucursal_id: 1 },
          { id: 2, nombre: 'Bebidas', activo: true, orden: 2, sucursal_id: 1 },
          { id: 3, nombre: 'Platos', activo: true, orden: 3, sucursal_id: 1 },
        ]),
      });
    } else if (url.includes('usuarios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id-1', cargo_id: 1, sucursal_id: 1 }]),
      });
    } else if (url.includes('cargos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, nombre: 'Administrador' }]),
      });
    } else if (url.includes('aperturas_caja')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, abierta: true, monto_inicial: 1000, created_at: new Date().toISOString() }]),
      });
    } else if (url.includes('movimientos_caja')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else if (url.includes('count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(5) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });
}

export async function setupAuthenticatedPage(page: Page, user = MOCK_USER) {
  await setTestBypass(page);
  await setAuthCookie(page);
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-jwt-token', token_type: 'Bearer', expires_in: 3600,
        refresh_token: 'fake-refresh', user,
      }),
    });
  });
  await mockSupabaseAuth(page, user);
  await mockSupabaseTables(page);
}
