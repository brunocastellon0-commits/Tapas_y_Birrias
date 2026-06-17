pipeline {
    agent any

    tools {
        nodejs 'Node.js'
        allure 'allure'
    }

    stages {
        stage('Limpieza previa') {
            steps {
                // En vez de borrar todo el proyecto, solo borramos los reportes viejos
                bat 'if exist playwright-report rmdir /s /q playwright-report'
                bat 'if exist allure-results rmdir /s /q allure-results'
                bat 'if exist test-results rmdir /s /q test-results'
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Instalar dependencias') {
            steps {
                // Cambiamos "npm ci" por "npm install". 
                // Esto reusará la carpeta node_modules si ya existe, tardando solo un par de segundos.
                bat 'npm install'
            }
        }

        stage('Instalar Playwright') {
            steps {
                // Al quitar la variable de entorno, Playwright guardará el navegador en la caché global de Windows.
                // La próxima vez que corra, dirá "Chromium ya está instalado" y saltará este paso al instante.
                bat 'npx playwright install chromium'
            }
        }

        stage('Ejecutar tests E2E') {
            steps {
                bat 'npx next telemetry disable'
                bat 'npm run test:e2e'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'tests/screenshots/*.png', allowEmptyArchive: true
            
            publishHTML(target: [
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Reporte Playwright E2E'
            ])

            allure includeProperties: false, results: [[path: 'allure-results']]
            
            // Ya NO usamos cleanWs() aquí para conservar los node_modules
        }
        failure {
            echo 'Los tests E2E fallaron. Revisa los reportes visuales en Jenkins para más detalles.'
        }
        success {
            echo 'Todos los tests E2E pasaron exitosamente.'
        }
    }
}