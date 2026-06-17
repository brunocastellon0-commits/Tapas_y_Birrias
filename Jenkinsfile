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
                bat 'npm run test:e2e'
            }
            post {
                always {
                    junit 'test-results/**/*.xml'
                }
            }
        }

        stage('Archivar capturas') {
            steps {
                archiveArtifacts artifacts: 'tests/screenshots/*.png',
                    allowEmptyArchive: true
            }
        }

        stage('Publicar reporte HTML Playwright') {
            steps {
                publishHTML(target: [
                    reportDir: 'playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Reporte Playwright E2E'
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

    post {
        always {
            cleanWs()
        }
        failure {
            echo 'Los tests E2E fallaron. Revisa los reportes para más detalles.'
        }
        success {
            echo 'Todos los tests E2E pasaron exitosamente.'
        }
    }
}
