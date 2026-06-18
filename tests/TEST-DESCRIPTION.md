# Tests E2E — Tapas y Birrias

Documentación detallada de los 40 tests E2E del sistema. Cada entrada describe qué prueba, cómo lo hace (con referencias a líneas de código) y cuál es su objetivo.

---

## 1. Login Page — `tests/login.spec.ts` (6 tests)

**Setup (`beforeEach`, línea 5-7)**: Navega a `/login` sin mocks — la página se renderiza real.

---

### 1.1 Renderiza formulario de login con todos los elementos
- **Líneas**: 9-18
- **Descripción**: Verifica que el formulario de login contiene todos los elementos visuales esperados.
- **Cómo lo hace**:
  1. Navega a `/login` (beforeEach, línea 6)
  2. `getByText('Iniciar Sesión')` — verifica el título del formulario
  3. `getByText('Bienvenido de nuevo')` — verifica el mensaje de bienvenida
  4. `getByPlaceholder('Usuario o Correo')` — verifica input de usuario
  5. `getByPlaceholder('Contraseña')` — verifica input de contraseña
  6. `getByText('Recordarme')` — verifica checkbox de "Recordarme"
  7. `getByText('¿Olvidaste tu contraseña?')` — verifica enlace de recuperación
  8. `getByRole('button', { name: 'Ingresar al Sistema' })` — verifica botón de submit
  9. `screenshot(page, 'Login - formulario completo')` — captura para el reporte
- **Objetivo**: Validar que la interfaz de login se renderiza completa y correctamente.

---

### 1.2 Formulario vacío muestra error
- **Líneas**: 20-26
- **Descripción**: Verifica que al enviar el formulario vacío se muestra un mensaje de error.
- **Cómo lo hace**:
  1. `page.locator('#identifier').fill('')` — limpia input de usuario (línea 21)
  2. `page.locator('#password').fill('')` — limpia input de contraseña (línea 22)
  3. `submitForm(page)` — dispara `dispatchEvent(new Event('submit'))` en el `<form>`, que React captura y ejecuta `handleSubmit` (línea 23)
  4. `handleSubmit` en `login/page.tsx:19` ejecuta `e.preventDefault()` y valida `!identifier || !password` → `setError("Todos los campos son obligatorios")` (línea 21-22 del page)
  5. `getByText('Todos los campos son obligatorios')` → `toBeVisible()` (línea 24)
- **Objetivo**: Validar la validación client-side de campos requeridos.

---

### 1.3 Login exitoso redirige a dashboard
- **Líneas**: 28-37
- **Descripción**: Verifica que al enviar credenciales válidas (mockeadas) el sistema redirige a `/dashboard`.
- **Cómo lo hace**:
  1. `setupAuthenticatedPage(page)` (línea 29) — registra mocks:
     - `mockSupabaseAuth()`: Intercepta `POST /auth/v1/token` y retorna 200 con `{ access_token: 'fake-jwt-token', ... }`
     - `mockSupabaseTables()`: Intercepta `**/rest/v1/**` para todas las tablas
  2. Rellena inputs (líneas 31-32)
  3. `submitForm(page)` (línea 33) — dispara submit del form
  4. `handleSubmit` llama a `supabase.auth.signInWithPassword({ email, password })` (login/page.tsx:31)
  5. SignIn hace POST a `https://*.supabase.co/auth/v1/token?grant_type=password` → interceptado por mock → retorna fake JWT
  6. Supabase cliente almacena la sesión (access_token, refresh_token, user) en cookies
  7. `signInWithPassword` resuelve → `router.push("/dashboard")` (login/page.tsx:43)
  8. `expect(page).toHaveURL('/dashboard', { timeout: 15000 })` (línea 35) — espera que la URL cambie a /dashboard (no espera evento 'load', solo verifica URL polling)
- **Objetivo**: Validar el flujo completo de autenticación: signInWithPassword + almacenamiento de sesión + redirección post-login.

---

### 1.4 Error de credenciales muestra mensaje
- **Líneas**: 39-56
- **Descripción**: Verifica que al enviar credenciales incorrectas (mockeadas con 401) se muestra el mensaje de error correspondiente.
- **Cómo lo hace**:
  1. `page.route('**/auth/v1/token*', ...)` (línea 40-49) — registra mock ANTES de la request (FIFO: este handler se prueba primero), retorna status 401 con error `invalid_grant`
  2. Rellena inputs con credenciales que no importan porque el mock siempre devuelve 401
  3. `submitForm(page)` (línea 53) — dispara submit
  4. `signInWithPassword` → POST a `/auth/v1/token` → mock retorna 401
  5. `signInWithPassword` rechaza con `authError` → `setError("Credenciales inválidas...")` (login/page.tsx:39)
  6. `getByText('Credenciales inválidas')` → `toBeVisible()` (línea 54)
- **Objetivo**: Validar el manejo de errores de autenticación (credenciales inválidas).

---

### 1.5 Botones de OAuth se renderizan
- **Líneas**: 58-62
- **Descripción**: Verifica que los botones de inicio de sesión social (Google, Microsoft, Apple) están presentes.
- **Cómo lo hace**:
  1. `page.locator('button[type="button"]')` (línea 59) — selecciona todos los botones que no son de tipo submit (los botones OAuth usan `type="button"`)
  2. `.first().toBeVisible()` (línea 60) — verifica que al menos el primer botón social es visible
- **Objetivo**: Validar que los botones de login con terceros se renderizan en la UI.

---

### 1.6 Input con icono cambia valor correctamente
- **Líneas**: 64-72
- **Descripción**: Verifica que los inputs del formulario actualizan su valor al escribir.
- **Cómo lo hace**:
  1. `page.locator('#identifier').fill('usuario@test.com')` (línea 66)
  2. `expect(identifierInput).toHaveValue('usuario@test.com')` (línea 67)
  3. `page.locator('#password').fill('mypassword')` (línea 69)
  4. `expect(passwordInput).toHaveValue('mypassword')` (línea 71)
- **Objetivo**: Validar que los inputs controlados por React state se actualizan correctamente (two-way binding).

---

## 2. Middleware — `tests/middleware.spec.ts` (5 tests)

**Setup**: Ninguno — estos tests NO usan `x-test-bypass`, el middleware real de Next.js se ejecuta.

---

### 2.1-2.4 Sin sesión: rutas protegidas redirigen a /login
- **Líneas**: 5-24
- **Descripción**: Verifica que las rutas protegidas redirigen a `/login` cuando no hay sesión.
- **Cómo lo hace**:
  1. `page.goto('/dashboard')` (línea 6) — navegación directa SIN `x-test-bypass`
  2. Next.js ejecuta el middleware `middleware.ts` — detecta falta de cookie de sesión Supabase
  3. Middleware ejecuta `NextResponse.redirect(new URL('/login', request.url))`
  4. `expect(page).toHaveURL('/login')` (línea 7) — verifica la redirección
  5. Mismo patrón para: `/ordenes` (línea 11-13), `/productos` (línea 15-18), `/empleados/registrar` (línea 20-23)
- **Objetivo**: Validar que el middleware de autenticación protege todas las rutas del sistema que requieren sesión.

---

### 2.5 Ruta raíz redirige a /login sin sesión
- **Líneas**: 26-29
- **Descripción**: Verifica que incluso la ruta raíz redirige a login cuando no hay sesión.
- **Cómo lo hace**:
  1. `page.goto('/')` (línea 27)
  2. Middleware intercepta → detecta falta de sesión → redirige a `/login`
  3. `expect(page).toHaveURL('/login')` (línea 28)
- **Objetivo**: Validar que la ruta raíz no es pública y requiere autenticación.

---

## 3. Dashboard — `tests/dashboard.spec.ts` (6 tests)

**Setup (`beforeEach`, líneas 5-9)**:
1. `setupAuthenticatedPage(page)` — setea `x-test-bypass: 1` y registra mocks de Supabase (auth + REST)
2. `page.goto('/dashboard')` — navega al dashboard (middleware permite por el bypass)
3. `page.waitForTimeout(2000)` — espera 2 segundos para carga de datos asíncronos

---

### 3.1 Renderiza título y fecha del dashboard
- **Líneas**: 11-16
- **Descripción**: Verifica que el dashboard muestra el título principal y el resumen del día.
- **Cómo lo hace**:
  1. `getByRole('heading', { name: 'Dashboard' })` → `toBeVisible()` (línea 12) — busca un `<h1>` o `<h2>` con texto exacto "Dashboard"
  2. `getByText('Resumen del día')` → `toBeVisible()` (línea 13) — verifica el subtítulo
- **Objetivo**: Validar la estructura básica del dashboard se renderiza correctamente.

---

### 3.2 Renderiza los 4 KPIs principales
- **Líneas**: 17-23
- **Descripción**: Verifica que los 4 indicadores clave de rendimiento se muestran con sus etiquetas.
- **Cómo lo hace**:
  1. `getByText('Mesas Ocupadas')` → `toBeVisible()` (línea 18)
  2. `getByText('Comandas Activas')` → `toBeVisible()` (línea 19)
  3. `getByText('Total del Día')` → `toBeVisible()` (línea 20)
  4. `getByText('Cubiertos Hoy')` → `toBeVisible()` (línea 21)
  - Los KPIs se alimentan de `mockSupabaseTables` que retorna: 5 mesas, 2 comandas activas, 2 pagos (total $770), cubiertos de las comandas (2+4=6)
- **Objetivo**: Validar que los indicadores del dashboard cargan y muestran datos provenientes de Supabase.

---

### 3.3 Enlaces rápidos a Órdenes e Historial
- **Líneas**: 25-31
- **Descripción**: Verifica que las tarjetas de navegación rápida están presentes con sus descripciones.
- **Cómo lo hace**:
  1. `getByText('Ir a Mesas')` → `toBeVisible()` (línea 26) — enlace a /ordenes
  2. `getByText('Ver Historial')` → `toBeVisible()` (línea 27) — enlace a /ordenes?tab=historial
  3. `getByText('Gestionar pedidos y comandas')` → `toBeVisible()` (línea 28) — descripción del card
  4. `getByText('Comandas cerradas y pagos')` → `toBeVisible()` (línea 29) — descripción del card
- **Objetivo**: Validar que los accesos directos a funcionalidades están visibles.

---

### 3.4 Click en "Ir a Mesas" navega a /ordenes
- **Líneas**: 33-36
- **Descripción**: Verifica que hacer click en "Ir a Mesas" navega correctamente a la página de órdenes.
- **Cómo lo hace**:
  1. `page.getByText('Ir a Mesas').click()` (línea 34) — hace click en el enlace
  2. El enlace es un `<Link href="/ordenes">` de Next.js → navegación client-side
  3. `expect(page).toHaveURL('/ordenes')` (línea 35) — verifica la URL destino
- **Objetivo**: Validar la navegación funcional desde dashboard hacia órdenes.

---

### 3.5 Click en "Ver Historial" navega a /ordenes?tab=historial
- **Líneas**: 38-41
- **Descripción**: Verifica que hacer click en "Ver Historial" navega a /ordenes con el parámetro de tab.
- **Cómo lo hace**:
  1. `page.getByText('Ver Historial').click()` (línea 39)
  2. El enlace apunta a `/ordenes?tab=historial`
  3. `expect(page).toHaveURL(/.*historial/)` (línea 40) — verifica que la URL contiene "historial"
- **Objetivo**: Validar navegación con query parameters desde dashboard.

---

### 3.6 Sidebar se renderiza con enlaces correctos
- **Líneas**: 43-48
- **Descripción**: Verifica que el sidebar de navegación se renderiza dentro del dashboard con sus elementos básicos.
- **Cómo lo hace**:
  1. `getByRole('link', { name: 'Dashboard' })` → `toBeVisible()` (línea 44)
  2. `getByRole('link', { name: 'Mesas', exact: true })` → `toBeVisible()` (línea 45) — `exact: true` evita match con el link "Ir a Mesas" del dashboard
  3. `getByText('Cerrar Sesión')` → `toBeVisible()` (línea 46) — verifica botón de logout
- **Objetivo**: Validar que el sidebar de navegación se renderiza en la página de dashboard.

---

## 4. Órdenes / Servicio — `tests/ordenes.spec.ts` (5 tests)

---

### 4.1 Renderiza página con tabs correctos
- **Líneas**: 9-16
- **Descripción**: Verifica que la página de órdenes muestra los 3 tabs principales.
- **Cómo lo hace**:
  1. `setupAuthenticatedPage(page)` (beforeEach, línea 6) — mocks + bypass
  2. `page.goto('/ordenes')` (línea 10) — navega a órdenes
  3. `page.waitForTimeout(2000)` (línea 11) — espera carga
  4. `getByText('Operación en Vivo')` → `toBeVisible()` (línea 12)
  5. `getByText('Historial de Comandas')` → `toBeVisible()` (línea 13)
  6. `getByText('Caja')` → `toBeVisible()` (línea 14)
- **Objetivo**: Validar la estructura de navegación por tabs del módulo de órdenes.

---

### 4.2 Navegación a tab Historial vía URL
- **Líneas**: 18-23
- **Descripción**: Verifica que navegar a `/ordenes?tab=historial` activa el tab de Historial.
- **Cómo lo hace**:
  1. `page.goto('/ordenes?tab=historial')` (línea 19)
  2. El componente `<OrdenesContent>` lee `searchParams.get('tab')` y setea `activeTab = 'historial'`
  3. Renderiza el contenido del tab Historial
  4. `getByText('Historial de Comandas')` → `toBeVisible()` (línea 21)
- **Objetivo**: Validar navegación directa a tabs mediante query parameters.

---

### 4.3 Navegación a tab Caja vía URL
- **Líneas**: 25-30
- **Descripción**: Verifica que navegar a `/ordenes?tab=caja` activa el tab de Caja.
- **Cómo lo hace**:
  1. `page.goto('/ordenes?tab=caja')` (línea 26)
  2. `activeTab = 'caja'` → renderiza panel de caja
  3. `getByRole('button', { name: 'Caja', exact: true })` → `toBeVisible()` (línea 28) — el botón de caja está dentro del panel
- **Objetivo**: Validar navegación directa a tabs mediante query parameters.

---

### 4.4 Sin mesa seleccionada, panel derecho muestra placeholder
- **Líneas**: 32-38
- **Descripción**: Verifica que cuando no hay ninguna mesa seleccionada, el panel derecho muestra un mensaje placeholder.
- **Cómo lo hace**:
  1. `page.goto('/ordenes')` (línea 33) — navega sin seleccionar mesa
  2. `page.locator('body')` (línea 35) — selecciona el body
  3. `toContainText(/Selecciona una mesa|selecciona/i)` (línea 36) — verifica que el body contiene texto de placeholder
- **Objetivo**: Validar el estado inicial vacío del panel de detalle de mesa.

---

### 4.5 Tab de Caja muestra botón Abrir/Cerrar Caja
- **Líneas**: 40-46
- **Descripción**: Verifica que el tab de Caja muestra el botón para abrir o cerrar caja.
- **Cómo lo hace**:
  1. `page.goto('/ordenes?tab=caja')` (línea 40)
  2. El panel de caja se renderiza con datos de `aperturas_caja` mockeados (abierta: true)
  3. `getByText(/Abrir Caja|Cerrar Caja/i)` (línea 43) — busca el botón con texto que coincida (regex, case-insensitive)
  4. `toBeVisible()` (línea 44)
- **Objetivo**: Validar que los controles de apertura/cierre de caja están presentes.

---

## 5. Productos — `tests/productos.spec.ts` (9 tests)

**Setup (primer `describe`, `beforeEach` líneas 5-9)**:
1. `loginAsAdmin(page)` — login completo + sesión almacenada en cookies
2. `page.goto('/productos')` — navega a productos
3. `page.waitForTimeout(3000)` — espera carga de datos asíncronos (productos + categorías desde Supabase mock)

---

### 5.1 Renderiza página con título y tabs
- **Líneas**: 11-17
- **Descripción**: Verifica que la página de productos muestra el header "Productos" y los 3 tabs de navegación.
- **Cómo lo hace**:
  1. `getByText('Productos', { exact: true }).first()` (línea 12) — busca el `<span>Productos</span>` del header exacto. `{ exact: true }` evita match con "Inventario de Productos" y "6 productos". `.first()` resuelve strict mode si hay múltiples matches exactos
  2. `getByRole('button', { name: 'Inventario' })` (línea 13) — busca el tab como botón (evita match con el `<h2>Inventario de Productos</h2>`)
  3. `getByText('Categorías')` (línea 14) — verifica tab
  4. `getByText('Reportes')` (línea 15) — verifica tab
- **Objetivo**: Validar la estructura principal del panel de productos (admin).

---

### 5.2 Tab Inventario activo por defecto
- **Líneas**: 19-22
- **Descripción**: Verifica que al cargar la página, el tab de Inventario está activo por defecto.
- **Cómo lo hace**:
  1. `getByText('Inventario de Productos')` (línea 20) — busca el título `<h2>` que solo se renderiza cuando `activeTab === 'inventario'`
  2. `toBeVisible()` — confirma que el tab por defecto está activo
- **Objetivo**: Validar que el estado inicial del tab sea Inventario.

---

### 5.3 Muestra la tabla de productos
- **Líneas**: 24-27
- **Descripción**: Verifica que los productos mockeados se renderizan en la tabla.
- **Cómo lo hace**:
  1. `getByText('Tapa de Jamón')` (línea 25) — busca un producto específico en la tabla
  2. `toBeVisible()` — el producto existe en los datos mockeados por `mockSupabaseTables` (handler `url.includes('productos')` retorna array de 6 productos)
- **Objetivo**: Validar que los datos de productos se cargan y renderizan correctamente.

---

### 5.4 Búsqueda filtra productos
- **Líneas**: 29-37
- **Descripción**: Verifica que el input de búsqueda filtra los productos en tiempo real.
- **Cómo lo hace**:
  1. `getByPlaceholder(/Buscar producto/i)` (línea 30) — encuentra el input de búsqueda por placeholder regex
  2. `.fill('Cerveza')` (línea 32) — escribe el filtro
  3. `waitForTimeout(600)` (línea 33) — espera el debounce del filtro (600ms)
  4. `getByText('Cerveza Artesanal').toBeVisible()` (línea 34) — producto filtrado visible
  5. `getByText('Tapa de Jamón').not.toBeVisible()` (línea 35) — producto no filtrado oculto
- **Objetivo**: Validar la funcionalidad de búsqueda/filtro client-side.

---

### 5.5 Cambio entre vista tabla y tarjetas
- **Líneas**: 39-49
- **Descripción**: Verifica que se puede alternar entre las vistas de tabla y tarjetas.
- **Cómo lo hace**:
  1. `button[title="Vista tarjetas"]` (línea 40) — busca botón de toggle por atributo title
  2. `.click()` (línea 42) — cambia a vista tarjetas (setea estado `vista = 'tarjetas'`)
  3. `screenshot` (línea 44) — captura vista tarjetas
  4. `button[title="Vista tabla"]` (línea 45) — busca botón de toggle a tabla
  5. `.click()` (línea 46) — revierte a vista tabla
  6. `screenshot` (línea 48) — captura vista tabla
- **Objetivo**: Validar el toggle de visualización entre tabla y tarjetas.

---

### 5.6 Navegación a tab Categorías
- **Líneas**: 51-55
- **Descripción**: Verifica que al hacer click en el tab Categorías se navega correctamente.
- **Cómo lo hace**:
  1. `getByRole('button', { name: 'Categorías' })` (línea 52) — busca el tab como botón (evita match con `<option>Todas las categorías</option>`)
  2. `.click()` — cambia `activeTab = 'categorias'`
  3. Renderiza `<CategoriasTab>` (componente de gestión de categorías)
- **Objetivo**: Validar navegación entre tabs del panel de productos.

---

### 5.7 Navegación a tab Reportes
- **Líneas**: 57-61
- **Descripción**: Verifica que al hacer click en el tab Reportes se navega correctamente.
- **Cómo lo hace**:
  1. `getByText('Reportes').click()` (línea 58) — cambia `activeTab = 'reportes'`
  2. Renderiza `<ReportesTab>` (componente de reportes)
- **Objetivo**: Validar navegación entre tabs del panel de productos.

---

### 5.8 Botón Agregar producto abre modal
- **Líneas**: 63-66
- **Descripción**: Verifica que el botón para agregar producto está visible.
- **Cómo lo hace**:
  1. `getByText('Agregar')` (línea 64) — busca el botón "Agregar" (debería abrir un modal al hacer click)
  2. `toBeVisible()` (línea 65) — verifica que está presente en la UI
- **Objetivo**: Validar que el botón de alta de productos existe en la interfaz.

---

### 5.9 Usuario sin rol admin es redirigido a dashboard
- **Líneas**: 70-87
- **Setup**: Este test NO usa el `beforeEach` del primer describe. Hace su propio setup manual.
- **Descripción**: Verifica que un usuario con rol no-admin (Mesero) es redirigido al dashboard al intentar acceder a /productos.
- **Cómo lo hace**:
  1. `setTestBypass(page)` (línea 71) — setea `x-test-bypass: 1` para que el middleware permita el paso
  2. `mockSupabaseAuth(page)` (línea 72) — mockea GET /auth/v1/user y POST /auth/v1/token
  3. `mockSupabaseTables(page, { usuarios: [cargo_id: 2], cargos: [nombre: 'Mesero'] })` (líneas 73-76) — mockea todas las tablas, pero con datos custom para `usuarios` y `cargos`. El parámetro `customData` se pasa al closure del handler de rutas `**/rest/v1/**`. Como Playwright usa FIFO (first matching route wins), este handler es el ÚNICO que maneja todas las requests REST, incluyendo las de usuarios y cargos. Así se evita el problema de overrides separados que nunca se ejecutan
  4. Login manual (líneas 77-80): no usa `loginAsAdmin()` porque necesitamos que los mocks con customData estén activos desde el inicio. Navega a `/login`, completa formulario, submit, espera URL /dashboard
  5. `page.goto('/productos')` (línea 82) — navega a productos con sesión almacenada
  6. `page.waitForTimeout(3000)` (línea 83) — espera a que el useEffect se ejecute
  7. El `useEffect` en `productos/page.tsx:47` llama a `verificarAdmin()`:
     - `supabase.auth.getUser()` — la sesión está en cookies (del login paso 4), `getUser()` hace GET a `/auth/v1/user` con el JWT, el mock retorna el usuario
     - `supabase.from('usuarios').select('cargo_id').eq('id', user.id)` — el handler `**/rest/v1/**` captura, detecta `url.includes('usuarios')`, retorna `customData?.usuarios` = `[{ cargo_id: 2 }]`
     - `supabase.from('cargos').select('nombre').eq('id', 2)` — el mismo handler detecta `url.includes('cargos')`, retorna `customData?.cargos` = `[{ nombre: 'Mesero' }]`
     - `cargo?.nombre !== 'Administrador'` → `true` → `router.push('/dashboard')` (productos/page.tsx:63)
  8. `expect(page).toHaveURL(/dashboard/)` (línea 84) — verifica la redirección
- **Objetivo**: Validar el control de acceso basado en roles — un usuario sin rol Administrador no puede acceder a /productos y es redirigido al dashboard.

---

## 6. Empleados — `tests/empleados.spec.ts` (6 tests)

**Setup (`beforeEach`, líneas 5-9)**:
1. `setupAuthenticatedPage(page)` — bypass + mocks
2. `page.goto('/empleados/registrar')` — navega al formulario de registro
3. `page.waitForTimeout(1500)` — espera carga

---

### 6.1 Renderiza formulario completo con todos los campos
- **Líneas**: 11-22
- **Descripción**: Verifica que el formulario de registro de empleados contiene todos los campos y secciones esperadas.
- **Cómo lo hace**:
  1. `getByText('Registrar Empleado')` → `toBeVisible()` (línea 12)
  2. `getByText('Nuevo Registro')` → `toBeVisible()` (línea 13)
  3. `getByText('Datos Básicos')` → `toBeVisible()` (línea 14)
  4. `getByText('Asignación y Fechas')` → `toBeVisible()` (línea 15)
  5. `getByText('Datos de Nómina')` → `toBeVisible()` (línea 16)
  6. `getByPlaceholder('Ej. Juan')` → `toBeVisible()` (línea 17) — input nombre
  7. `getByPlaceholder('Ej. Pérez')` → `toBeVisible()` (línea 18) — input apellido
  8. `getByPlaceholder('ejemplo@correo.com')` → `toBeVisible()` (línea 19) — input email
  9. `getByText('Registrar Nuevo Empleado')` → `toBeVisible()` (línea 20) — botón submit
- **Objetivo**: Validar la estructura completa del formulario de registro.

---

### 6.2 Select de Cargo tiene opciones
- **Líneas**: 24-30
- **Descripción**: Verifica que el select de cargos contiene opciones.
- **Cómo lo hace**:
  1. `select[name="cargo_id"]` (línea 25) — selecciona el elemento `<select>` por su atributo name
  2. `toBeVisible()` (línea 26)
  3. `.locator('option')` (línea 27) — obtiene todas las opciones del select
  4. `toHaveCount(4)` (línea 28) — verifica que hay 4 opciones (1 default placeholder + datos de cargos mockeados)
- **Objetivo**: Validar que el select de cargos se llena con datos del servidor.

---

### 6.3 Select de Sucursal tiene opciones
- **Líneas**: 32-38
- **Descripción**: Verifica que el select de sucursales contiene opciones.
- **Cómo lo hace**:
  1. `select[name="sucursal_id"]` (línea 33)
  2. `toBeVisible()` (línea 34)
  3. `.locator('option')` (línea 35)
  4. `toHaveCount(3)` (línea 36) — 3 opciones (1 default + datos de sucursales)
- **Objetivo**: Validar que el select de sucursales se llena con datos del servidor.

---

### 6.4 Checkbox de salario fijo funciona
- **Líneas**: 40-47
- **Descripción**: Verifica que el checkbox de "salario fijo" puede ser marcado y desmarcado.
- **Cómo lo hace**:
  1. `input[name="es_salario_fijo"]` (línea 41)
  2. `not.toBeChecked()` (línea 42) — estado inicial unchecked
  3. `.check()` (línea 43) — marca el checkbox
  4. `toBeChecked()` (línea 44) — verifica checked
  5. `.uncheck()` (línea 45) — desmarca
  6. `not.toBeChecked()` (línea 46) — verifica unchecked
- **Objetivo**: Validar el comportamiento del checkbox de salario fijo (toggle correcto del estado).

---

### 6.5 Campos de fecha se renderizan
- **Líneas**: 49-52
- **Descripción**: Verifica que los inputs de tipo fecha están presentes.
- **Cómo lo hace**:
  1. `input[name="fechaIngreso"]` → `toBeVisible()` (línea 50)
  2. `input[name="fechaSalida"]` → `toBeVisible()` (línea 51)
- **Objetivo**: Validar que los campos de fecha del formulario existen.

---

### 6.6 Campos de nómina se renderizan
- **Líneas**: 54-58
- **Descripción**: Verifica que los campos de la sección de nómina están presentes.
- **Cómo lo hace**:
  1. `input[name="tarifa_hora"]` → `toBeVisible()` (línea 55) — input de tarifa por hora
  2. `getByText('Tiene salario fijo')` → `toBeVisible()` (línea 56) — label del checkbox
- **Objetivo**: Validar la sección de datos de nómina del formulario.

---

## 7. Sidebar — `tests/sidebar.spec.ts` (3 tests)

---

### 7.1 Sidebar muestra enlaces para usuario normal
- **Líneas**: 5-13
- **Descripción**: Verifica que un usuario sin privilegios admin ve los enlaces básicos del sidebar (Dashboard, Mesas, Registrar) pero NO Productos.
- **Cómo lo hace**:
  1. `setupAuthenticatedPage(page)` (línea 6) — bypass + mocks, pero NO almacena sesión
  2. `page.goto('/dashboard')` (línea 7) — navega al dashboard
  3. `waitForTimeout(2000)` (línea 8) — espera renderizado
  4. El sidebar monta → `useEffect` (sidebar.tsx:14) → `supabase.auth.getUser()`:
     - Sin sesión almacenada en cookies → `getUser()` retorna `{ data: { user: null }, error: null }` inmediatamente (sin request HTTP)
     - `if (!user) return;` (sidebar.tsx:15) → `isAdmin` queda `false`
  5. `visibleNavItems` en sidebar.tsx:39-41 filtra items — `item.id === 'productos' ? isAdmin : true` → Productos NO se incluye
  6. `getByRole('link', { name: 'Dashboard' })` → `toBeVisible()` (línea 10)
  7. `getByRole('link', { name: 'Mesas', exact: true })` → `toBeVisible()` (línea 11)
  8. `getByRole('link', { name: 'Registrar' })` → `toBeVisible()` (línea 12)
  - NOTA: No se verifica que Productos NO esté visible (se asume que si no está en la lista, el test de admin lo confirmará)
- **Objetivo**: Validar que el sidebar se renderiza correctamente para usuarios sin rol admin (sin enlace a Productos).

---

### 7.2 Sidebar muestra Productos solo para admin
- **Líneas**: 16-26
- **Descripción**: Verifica que un usuario administrador ve el enlace a Productos en el sidebar.
- **Cómo lo hace**:
  1. `loginAsAdmin(page)` (línea 17) — login completo con sesión almacenada en cookies (vía POST /auth/v1/token mockeado)
  2. `page.goto('/dashboard')` (línea 18) — navega al dashboard (recarga completa, la cookie de sesión persiste)
  3. `waitForTimeout(2000)` (línea 19) — espera renderizado
  4. El sidebar monta → `useEffect` (sidebar.tsx:14) → `supabase.auth.getUser()`:
     - La sesión está en cookies (del paso 1) → `getUser()` lee cookies, encuentra access_token → hace GET a `/auth/v1/user` con el JWT
     - `mockSupabaseAuth` intercepta (línea 130 de helpers.ts) y retorna `{ id: MOCK_ADMIN_USER.id, ... }`
     - `user` no es null → continúa
     - `supabase.from('usuarios').select('cargo_id')` → handler `**/rest/v1/**` → retorna `[{ cargo_id: 1 }]`
     - `supabase.from('cargos').select('nombre')` → handler → retorna `[{ nombre: 'Administrador' }]`
     - `cargo?.nombre === 'Administrador'` → `true` → `setIsAdmin(true)`
  5. `visibleNavItems` incluye Productos porque `isAdmin = true`
  6. `getByRole('link', { name: 'Dashboard' })` → `toBeVisible()` (línea 21)
  7. `getByRole('link', { name: 'Mesas', exact: true })` → `toBeVisible()` (línea 22)
  8. `getByText('Productos', { exact: true }).first()` → `toBeVisible()` (línea 23) — busca el label "Productos" de forma exacta y toma el primero por si hay múltiples
  9. `getByRole('link', { name: 'Registrar' })` → `toBeVisible()` (línea 24)
- **Objetivo**: Validar que el enlace a Productos aparece en el sidebar solo cuando el usuario autenticado tiene rol de Administrador.

---

### 7.3 Botón Cerrar Sesión está presente
- **Líneas**: 28-35
- **Descripción**: Verifica que el botón de cerrar sesión está siempre visible en el sidebar.
- **Cómo lo hace**:
  1. `setupAuthenticatedPage(page)` (línea 29) — bypass + mocks
  2. `page.goto('/dashboard')` (línea 30)
  3. `waitForTimeout(2000)` (línea 31)
  4. `getByText('Cerrar Sesión')` → `toBeVisible()` (línea 33) — el botón de logout siempre se renderiza, independientemente del rol
- **Objetivo**: Validar que el botón de cierre de sesión está presente en el sidebar para cualquier usuario.

---

## Resumen

| Archivo | Tests | ¿Qué cubre? |
|---|---|---|
| `login.spec.ts` | 6 | UI del login, validación de campos, flujo exitoso, error de credenciales, OAuth, bindeo de inputs |
| `middleware.spec.ts` | 5 | Redirección a /login sin sesión para todas las rutas protegidas (dashboard, ordenes, productos, empleados, raíz) |
| `dashboard.spec.ts` | 6 | Título, KPIs, enlaces rápidos, navegación por click, sidebar en dashboard |
| `ordenes.spec.ts` | 5 | Tabs (Operación, Historial, Caja), navegación por URL, placeholder sin selección, botón de caja |
| `productos.spec.ts` | 9 | Título y tabs, tabla de datos, búsqueda, toggle vista, navegación tabs, botón agregar, control de acceso por rol |
| `empleados.spec.ts` | 6 | Formulario completo, selects con opciones, checkbox, campos de fecha, sección nómina |
| `sidebar.spec.ts` | 3 | Sidebar sin admin (sin Productos), sidebar con admin (con Productos), botón cerrar sesión |

**Total: 40 tests**
