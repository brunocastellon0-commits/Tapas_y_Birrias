pipeline {
    agent any

    tools {
        nodejs 'Node.js'
        allure 'allure'
    }

    environment {
        PLAYWRIGHT_BROWSERS_PATH = "${env.HOME}/.cache/ms-playwright"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Instalar dependencias') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Instalar Playwright') {
            steps {
                bat 'npx playwright install chromium'
            }
        }

        stage('Ejecutar tests E2E') {
            steps {
                // Desactivamos telemetría para evitar que Next.js se congele preguntando "Y/n"
                bat 'npx next telemetry disable'
                bat 'npm run test:e2e'
            }
        }
    }

    // El bloque POST se ejecuta siempre al finalizar, sin importar si los tests pasaron o fallaron
    post {
        always {
            // 1. Archivar capturas de pantalla de los errores
            archiveArtifacts artifacts: 'tests/screenshots/*.png', allowEmptyArchive: true
            
            // 2. Publicar reporte HTML de Playwright
            publishHTML(target: [
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Reporte Playwright E2E'
            ])

            // 3. Generar reporte Allure (similar a Serenity)
            allure includeProperties: false, results: [[path: 'allure-results']]
            
            // 4. Limpiar el entorno para que la próxima ejecución empiece fresca
            cleanWs()
        }
        failure {
            echo 'Los tests E2E fallaron. Revisa los reportes visuales en Jenkins para más detalles.'
        }
        success {
            echo 'Todos los tests E2E pasaron exitosamente.'
        }
    }
}