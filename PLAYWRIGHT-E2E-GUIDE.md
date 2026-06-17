# Guía: Tests E2E con Playwright + Allure + Jenkins

## Índice

1. [Instalación](#1-instalación)
2. [Configuración de Playwright](#2-configuración-de-playwright)
3. [Escribir tests E2E](#3-escribir-tests-e2e)
4. [Reporte HTML de Playwright](#4-reporte-html-de-playwright)
5. [Allure Report (gráficas)](#5-allure-report-gráficas)
6. [Jenkins Pipeline](#6-jenkins-pipeline)
7. .gitignore
8. [Solución de problemas](#8-solución-de-problemas)

---

## 1. Instalación

```bash
# 1. Instalar Playwright
npm install --save-dev @playwright/test

# 2. Instalar navegador (Chromium)
npx playwright install chromium

# 3. Instalar Allure (para reportes con gráficas)
npm install --save-dev allure-playwright
```

---

## 2. Configuración de Playwright

Crear `playwright.config.ts` en la raíz del proyecto:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["allure-playwright", { outputFolder: "allure-results" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_URL: "",
    },
  },
});
```

### Explicación de opciones clave:

| Opción | Descripción |
|--------|-------------|
| `testDir` | Carpeta donde buscar los tests |
| `webServer` | Inicia automáticamente el servidor antes de los tests |
| `reuseExistingServer` | Reusa el servidor si ya está corriendo |
| `reporter` | Array de reporters: HTML y Allure |
| `env` | Variables de entorno para el servidor (vaciar VITE_API_URL para mockear) |

---

## 3. Escribir tests E2E

### Estructura básica de un test:

```typescript
import { test, expect } from '@playwright/test';

// Función para tomar screenshot adjuntándolo al reporte HTML
async function screenshot(page: any, name: string) {
  const buffer = await page.screenshot({ fullPage: true });
  await test.info().attachments.push({
    name,
    contentType: 'image/png',
    body: buffer,
  });
}

// Función para enviar formulario (workaround para motion + React 19)
async function submitForm(page: any) {
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });
}

test.describe('Login Page - Pruebas E2E', () => {
  // Mockear API antes de cada test
  test.beforeEach(async ({ page }) => {
    await page.route(/\/auth\/login/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'fake-jwt-token',
          tokenType: 'Bearer',
          expiresIn: '3600',
          user: {
            id: '1',
            email: 'test@hadassa.com',
            name: 'Test User',
            role: 'USER',
          },
        }),
      });
    });
  });

  test('Formulario vacío', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Bienvenido')).toBeVisible();
    await screenshot(page, 'Formulario vacío');
  });

  test('Login exitoso', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@test.com');
    await page.locator('#password').fill('password123');
    await submitForm(page);
    await expect(page).toHaveURL('/dashboard');
    await screenshot(page, 'Dashboard');
  });
});
```

### Técnicas importantes:

| Técnica | Código |
|---------|--------|
| Navegar a página | `await page.goto('/login')` |
| LLenar input | `await page.locator('#email').fill('valor')` |
| Hacer click | `await page.locator('button').click()` |
| Esperar texto | `await expect(page.getByText('texto')).toBeVisible()` |
| Esperar URL | `await expect(page).toHaveURL('/dashboard')` |
| Tomar screenshot | `await screenshot(page, 'nombre')` |
| Mockear API | `await page.route(/\/api/, handler)` |
| Seleccionar por id | `page.locator('#email')` |
| Seleccionar por label | `page.getByLabel('Correo')` |
| Seleccionar por rol | `page.getByRole('button', { name: 'Enviar' })` |

### Mockear errores del servidor:

```typescript
test('Error 401', async ({ page }) => {
  await page.route(/\/auth\/login/, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Credenciales inválidas' }),
    });
  });
  // ... llenar formulario y enviar
  await expect(page.getByText('Credenciales inválidas')).toBeVisible();
});
```

---

## 4. Reporte HTML de Playwright

### Configuración

En `playwright.config.ts`:
```typescript
reporter: [
  ["html"],
  ["allure-playwright", { outputFolder: "allure-results" }],
],
```

### Ver el reporte

```bash
# Opción 1: Abrir reporte guardado
npx playwright show-report

# Opción 2: UI interactiva
npx playwright test --ui
```

### En Jenkins

```groovy
stage('Publicar reporte HTML') {
    steps {
        publishHTML(target: [
            reportDir: 'playwright-report',
            reportFiles: 'index.html',
            reportName: 'Reporte Playwright'
        ])
    }
}
```

Si no se ve el reporte en Jenkins, ejecutar en **Script Console** de Jenkins:
```groovy
System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
```

---

## 5. Allure Report (gráficas)

### Instalación

```bash
npm install --save-dev allure-playwright
```

### Configuración en playwright.config.ts

```typescript
reporter: [
  ["html"],
  ["allure-playwright", { outputFolder: "allure-results" }],
],
```

### En Jenkins

1. Instalar plugin: **Allure Jenkins Plugin**
2. Configurar tool: **Administrar Jenkins → Tools → Allure installations** → nombre: `allure`
3. En el pipeline:

```groovy
pipeline {
    agent any
    tools {
        nodejs 'Node.js'
        allure 'allure'
    }
    stages {
        stage('Generar reporte Allure') {
            steps {
                allure includeProperties: false,
                    results: [[path: 'allure-results']]
            }
        }
    }
}
```

---

## 6. Jenkins Pipeline

### Pipeline completo (HTML + Allure + screenshots)

```groovy
pipeline {
    agent any
    tools {
        nodejs 'Node.js'
        allure 'allure'
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/TU_USUARIO/TU_REPO.git',
                    credentialsId: 'TU_CREDENCIAL'
            }
        }
        stage('Instalar dependencias') {
            steps { sh 'npm ci' }
        }
        stage('Instalar Playwright') {
            steps { sh 'npx playwright install chromium' }
        }
        stage('Ejecutar tests E2E') {
            steps { sh 'npm run test:e2e' }
        }
        stage('Archivar capturas') {
            steps {
                archiveArtifacts artifacts: 'tests/screenshots/*.png',
                    allowEmptyArchive: true
            }
        }
        stage('Publicar reporte HTML') {
            steps {
                publishHTML(target: [
                    reportDir: 'playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Reporte Playwright'
                ])
            }
        }
        stage('Generar reporte Allure') {
            steps {
                allure includeProperties: false,
                    results: [[path: 'allure-results']]
            }
        }
    }
}
```

### Configurar credenciales en Jenkins

1. **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Generar token con scope `repo`
3. **Jenkins → Administrar Jenkins → Credentials → Global → Add Credentials**
4. Kind: `Username with password`
   - Username: tu usuario de GitHub
   - Password: el token (NO tu contraseña)
   - ID: el que quieras (ej: `github-token`)

---

## 7. .gitignore

Agregar al `.gitignore`:

```gitignore
### Playwright ###
test-results/
tests/screenshots/
playwright-report/

### Allure ###
allure-results/
allure-report/

### Vitest ###
html/
.vitest/
```

---

## 8. Solución de problemas

### Error: `process.env.CI` no encontrado

```
Cannot find name 'process'
```

**Solución:** Agregar `playwright.config.ts` al `tsconfig.node.json`:

```json
{
  "include": ["vite.config.ts", "playwright.config.ts"]
}
```

### Error: Puerto en uso

```
http://localhost:5173 is already used
```

**Solución:** Usar otro puerto en el config:

```typescript
webServer: {
    command: "npm run dev -- --port 5174",
    url: "http://localhost:5174",
}
```

### Error: `submitForm()` no funciona con click normal

Los botones con `motion` + React 19 no disparan el submit correctamente al hacer click programático. Usar `dispatchEvent`:

```typescript
await page.evaluate(() => {
    document.querySelector('form')
        ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
});
```

### Error: El reporte HTML no se ve en Jenkins

Jenkins bloquea CSS/JS por seguridad. Ejecutar en **Script Console**:

```groovy
System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
```

### Error: `npx playwright test` no genera allure-results

No usar `--reporter` en la línea de comandos porque sobreescribe el config. Usar simplemente:

```bash
npx playwright test
```

### Advertencia: `module.register()` is deprecated

```
[DEP0205] DeprecationWarning
```

Es una advertencia de Node.js que no afecta los tests. Se puede ignorar.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run test:e2e` | Ejecutar todos los tests |
| `npx playwright test tests/mi-test.spec.ts` | Ejecutar un archivo específico |
| `npx playwright test --ui` | Modo interactivo |
| `npx playwright show-report` | Ver reporte HTML guardado |
| `npx playwright test --workers=1` | Ejecutar con 1 worker (útil para debugging) |
| `npx playwright test --reporter=list` | Solo salida en terminal |

---

## Resumen de archivos del proyecto

```
/
├── playwright.config.ts      # Configuración de Playwright
├── tests/
│   └── login.spec.ts         # Tests E2E del login
├── tests/screenshots/        # Capturas de pantalla (gitignored)
├── allure-results/           # Datos para Allure (gitignored)
├── playwright-report/        # Reporte HTML (gitignored)
└── Jenkinsfile               # Pipeline de Jenkins
```
