# Testing E2E — Tapas y Birrias

Este documento describe la estrategia de tests end-to-end (E2E) del sistema **Tapas y Birrias** (LILA Management), implementados con **Playwright** + **Allure** + **Jenkins**.

---

## Índice

1. [Arquitectura de Tests](#1-arquitectura-de-tests)
2. [Test Coverage por Módulo](#2-test-coverage-por-módulo)
   - [Login](#login)
   - [Dashboard](#dashboard)
   - [Órdenes / Servicio](#órdenes--servicio)
   - [Productos](#productos)
   - [Empleados](#empleados)
   - [Middleware (Redirecciones)](#middleware-redirecciones)
   - [Sidebar (Navegación Global)](#sidebar-navegación-global)
3. [Cómo Ejecutar los Tests](#3-cómo-ejecutar-los-tests)
4. [Estrategia de Mocking](#4-estrategia-de-mocking)
5. [Reportes](#5-reportes)
6. [Integración con Jenkins](#6-integración-con-jenkins)
7. [Solución de Problemas](#7-solución-de-problemas)

---

## 1. Arquitectura de Tests

```
/
├── playwright.config.ts          # Configuración global de Playwright
├── Jenkinsfile                   # Pipeline de CI/CD
├── tests/
│   ├── helpers.ts                # Utilidades compartidas (screenshot, mocks)
│   ├── login.spec.ts             # Tests de la página de login
│   ├── middleware.spec.ts        # Tests de redirecciones por autenticación
│   ├── dashboard.spec.ts         # Tests del dashboard con KPIs
│   ├── ordenes.spec.ts           # Tests del módulo de órdenes/servicio
│   ├── productos.spec.ts         # Tests del módulo de productos (admin)
│   ├── empleados.spec.ts         # Tests del formulario de registro
│   └── sidebar.spec.ts           # Tests del sidebar de navegación
├── playwright-report/            # Reporte HTML (generado)
├── allure-results/               # Resultados para Allure (generado)
└── test-results/                 # Resultados JUnit (generado en CI)
```

Cada archivo `.spec.ts` cubre una página o funcionalidad completa del sistema.

---

## 2. Test Coverage por Módulo

### Login

**Archivo:** `tests/login.spec.ts` (5 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Renderiza formulario con todos los elementos | Verifica que todos los inputs, labels y botones están presentes |
| 2 | Formulario vacío muestra error | Al hacer submit sin datos, muestra "Todos los campos son obligatorios" |
| 3 | Login exitoso redirige a dashboard | Mockea Supabase Auth, llena credenciales y verifica redirect a `/dashboard` |
| 4 | Error de credenciales muestra mensaje | Mockea error 401 de Supabase y verifica mensaje "Credenciales inválidas" |
| 5 | Botones de OAuth se renderizan | Verifica que los botones de Google, Microsoft y Apple están presentes |
| 6 | Input con icono cambia valor | Verifica que los inputs de identifier y password aceptan y mantienen valores |

**Técnicas usadas:**
- `page.route()` para interceptar llamadas a `**/auth/v1/token*`
- `submitForm()` mediante `dispatchEvent` (workaround para motion + React 19)
- `screenshot()` para capturar evidencia visual

---

### Dashboard

**Archivo:** `tests/dashboard.spec.ts` (7 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Renderiza título y fecha | Verifica "Dashboard" y "Resumen del día" |
| 2 | Renderiza los 4 KPIs | Mesas Ocupadas, Comandas Activas, Total del Día, Cubiertos Hoy |
| 3 | KPIs muestran valores correctos | Verifica que los valores numéricos se renderizan |
| 4 | Enlaces rápidos a Órdenes e Historial | Verifica textos "Ir a Mesas", "Ver Historial", etc. |
| 5 | Click en "Ir a Mesas" navega | Verifica redirect a `/ordenes` |
| 6 | Click en "Ver Historial" navega | Verifica redirect a `/ordenes?tab=historial` |
| 7 | Sidebar se renderiza | Dashboard, Mesas, Cerrar Sesión visibles |

**Técnicas usadas:**
- `page.context().addCookies()` para setear cookie de sesión de Supabase
- `page.route()` para mockear REST API de Supabase (mesas, comandas, pagos)
- `page.route()` para mockear `**/auth/v1/user`

---

### Órdenes / Servicio

**Archivo:** `tests/ordenes.spec.ts` (6 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Renderiza tabs correctos | Operación en Vivo, Historial de Comandas, Caja |
| 2 | Tab Operación activo por defecto | Al navegar a `/ordenes`, el tab de operación está activo |
| 3 | Navegación a Historial vía URL | `/ordenes?tab=historial` carga el historial |
| 4 | Navegación a Caja vía URL | `/ordenes?tab=caja` carga el panel de caja |
| 5 | Sin mesa seleccionada muestra placeholder | El panel derecho muestra "Selecciona una mesa" |
| 6 | Caja muestra botón Abrir/Cerrar | Botón visible según estado de apertura |

---

### Productos

**Archivo:** `tests/productos.spec.ts` (10 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Renderiza título y tabs | Productos, Inventario, Categorías, Reportes |
| 2 | Tab Inventario activo por defecto | "Inventario de Productos" visible |
| 3 | Muestra tabla de productos | Datos mockeados se renderizan en la tabla |
| 4 | Búsqueda filtra productos | Buscar "Cerveza" muestra solo resultados relevantes |
| 5 | Cambio entre vista tabla y tarjetas | Alterna entre `List` y `LayoutGrid` |
| 6 | Navegación a Categorías | Click en tab Categorías carga el contenido |
| 7 | Navegación a Reportes | Click en tab Reportes carga el contenido |
| 8 | Botón Agregar abre modal | Verifica que el modal de nuevo producto se abre |
| 9 | Usuario sin admin es redirigido | Usuario con rol "Mesero" es redirigido a `/dashboard` |

**Técnicas usadas:**
- Mock de `cargos` para simular rol administrador
- Mock de `usuarios` con `cargo_id` específico
- Verificación de redirect con `page.waitForTimeout()` + URL check

---

### Empleados

**Archivo:** `tests/empleados.spec.ts` (7 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Formulario completo visible | Todos los fieldsets y campos se renderizan |
| 2 | Select de Cargo con opciones | 4 opciones (3 cargos + placeholder) |
| 3 | Select de Sucursal con opciones | 3 opciones (2 sucursales + placeholder) |
| 4 | Checkbox salario fijo funciona | Se puede checkear y uncheckear |
| 5 | Campos de fecha se renderizan | Fecha ingreso y fecha salida |
| 6 | Campos de nómina se renderizan | Tarifa por hora y checkbox |
| 7 | Header y sidebar visibles | "Registrar Empleado" en header |

---

### Middleware (Redirecciones)

**Archivo:** `tests/middleware.spec.ts` (5 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | `/dashboard` sin sesión → `/login` | Redirección automática |
| 2 | `/ordenes` sin sesión → `/login` | Redirección automática |
| 3 | `/productos` sin sesión → `/login` | Redirección automática |
| 4 | `/empleados/registrar` sin sesión → `/login` | Redirección automática |
| 5 | Ruta raíz `/` sin sesión → `/login` | Redirección automática |

**Nota:** Estos tests validan el comportamiento del middleware de Next.js en el servidor. No requieren mocking porque el middleware intenta obtener la sesión de Supabase y al no encontrarla, redirige.

---

### Sidebar (Navegación Global)

**Archivo:** `tests/sidebar.spec.ts` (4 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | Sidebar muestra enlaces para usuario normal | Dashboard, Mesas, Registrar — SIN Productos |
| 2 | Sidebar muestra Productos para admin | Dashboard, Mesas, Productos, Registrar |
| 3 | Botón Cerrar Sesión presente | Botón de logout visible en todos los roles |
| 4 | Link activo tiene estilo diferente | Dashboard link resaltado cuando está en `/dashboard` |

---

## 3. Cómo Ejecutar los Tests

### Localmente

```bash
# 1. Asegúrate de tener las dependencias instaladas
npm install

# 2. Ejecutar todos los tests
npm run test:e2e

# 3. Ejecutar un archivo específico
npx playwright test tests/login.spec.ts

# 4. Ejecutar con 1 worker (útil para debugging)
npx playwright test --workers=1

# 5. Ver reporte HTML
npx playwright show-report

# 6. Modo UI interactivo
npx playwright test --ui
```

### En CI (Jenkins)

El pipeline se ejecuta automáticamente con cada push a `main`. Ver sección [Integración con Jenkins](#6-integración-con-jenkins).

---

## 4. Estrategia de Mocking

### ¿Por qué mockear?

El sistema depende de **Supabase** (autenticación y base de datos). Para hacer tests deterministas y rápidos, se mockean todas las llamadas a la API de Supabase.

### Niveles de mocking

| Nivel | Qué se mockea | Cómo |
|-------|---------------|------|
| **Auth** | `POST /auth/v1/token*` | `page.route()` en login |
| **Auth** | `GET /auth/v1/user` | `page.route()` para simular usuario autenticado |
| **Auth (Middleware)** | Cookie de sesión | `page.context().addCookies()` para pasar el middleware |
| **Base de datos** | `GET /rest/v1/{tabla}*` | `page.route()` con datos mockeados por tabla |

### Datos mockeados

| Tabla | Datos |
|-------|-------|
| `mesas` | 5 mesas (Interior, Terraza, VIP) |
| `comandas` | 2 comandas activas (mesas 1 y 3) |
| `pagos` | 2 pagos de hoy |
| `productos` | 6 productos en 3 categorías |
| `categorias_productos` | 3 categorías |
| `usuarios` | 1 usuario con cargo_id |
| `cargos` | 1 cargo (Administrador) o (Mesero) según test |
| `aperturas_caja` | 1 apertura activa |

### Helpers compartidos (`tests/helpers.ts`)

| Función | Propósito |
|---------|-----------|
| `screenshot(page, name)` | Toma screenshot y lo adjunta al reporte |
| `submitForm(page)` | Dispara evento submit del formulario (workaround motion) |
| `setupAuthenticatedPage(page, user)` | Configura todos los mocks de auth + tablas |
| `setAuthCookie(page)` | Agrega cookie de sesión para el middleware |
| `mockSupabaseAuth(page, user)` | Mockea `GET /auth/v1/user` |
| `mockSupabaseTables(page)` | Mockea todas las tablas de Supabase REST |

---

## 5. Reportes

### Reporte HTML de Playwright

Se genera automáticamente en `playwright-report/index.html`.

```bash
npx playwright show-report
```

### Allure Report

Se genera en `allure-results/` con datos estructurados para gráficas.

```bash
allure generate allure-results --clean
allure open allure-report
```

### En Jenkins

- **Playwright HTML:** Disponible como "Reporte Playwright E2E" en la navegación del build
- **Allure:** Disponible como pestaña "Allure Report" con gráficas de tendencias
- **Capturas:** Archivadas como artifacts del build
- **JUnit XML:** Para integración con métricas de Jenkins

---

## 6. Integración con Jenkins

### Pipeline (`Jenkinsfile`)

```groovy
Stages:
1. Checkout              → Obtiene el código del repositorio
2. Instalar dependencias → `npm ci`
3. Instalar Playwright   → `npx playwright install chromium`
4. Ejecutar tests E2E    → `npm run test:e2e` + JUnit
5. Archivar capturas     → screenshots como artifacts
6. Publicar HTML         → Reporte HTML de Playwright
7. Generar Allure        → Reporte gráfico de Allure

Post:
- always: clean workspace
- failure: mensaje de error
- success: mensaje de éxito
```

### Plugins requeridos en Jenkins

| Plugin | Propósito |
|--------|-----------|
| **NodeJS Plugin** | Ejecutar Node.js |
| **HTML Publisher Plugin** | Publicar reporte HTML de Playwright |
| **Allure Jenkins Plugin** | Generar reporte Allure |
| **JUnit Plugin** | Publicar resultados JUnit |

### Configurar credenciales

1. **GitHub:** Generar Personal Access Token con scope `repo`
2. **Jenkins:** Agregar credencial de tipo "Username with password" (username: GitHub user, password: el token)
3. **Allure:** Instalar Allure en Admin Jenkins → Tools → Allure installations (nombre: `allure`)

### CSP para ver reporte HTML

Si el reporte HTML no se visualiza correctamente en Jenkins, ejecutar en **Script Console**:

```groovy
System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
```

---

## 7. Solución de Problemas

| Problema | Solución |
|----------|----------|
| `npm run test:e2e` no encuentra el comando | Verificar que `@playwright/test` está en `devDependencies` y ejecutar `npm install` |
| Tests fallan con error de conexión | Asegurar que `webServer` en `playwright.config.ts` tiene el puerto correcto (5173) |
| El servidor no se inicia automáticamente | Si ya hay un servidor corriendo, Playwright lo reusa con `reuseExistingServer: true` |
| Middleware redirects no funcionan en tests | Los tests de middleware no requieren mocking — navegar sin cookie provoca redirect automático |
| Reporte Allure no se genera | No usar `--reporter` en línea de comandos porque sobreescribe el config |
| Error `submitForm()` no funciona | Los botones con `motion` + React 19 requieren `dispatchEvent`. Ver `helpers.ts` |

---

## Resumen de cobertura

| Módulo | Tests | Cubre |
|--------|-------|-------|
| Login | 6 | Formulario, validación, auth, OAuth |
| Middleware | 5 | Redirecciones de autenticación |
| Dashboard | 7 | KPIs, enlaces, sidebar |
| Órdenes | 6 | Tabs, selección de mesa, caja |
| Productos | 10 | Inventario, búsqueda, roles admin |
| Empleados | 7 | Formulario, selects, validación |
| Sidebar | 4 | Enlaces por rol, logout, activo |

**Total: 45 tests** cubriendo todas las rutas y funcionalidades principales del sistema.
