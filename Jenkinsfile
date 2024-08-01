

pipeline {
    agent any

    stages {
        stage('Clone or Pull') {
            steps {
                script {
                    if (fileExists('whatsapp_gateway')) {
                        dir('whatsapp_gateway') {
                            sh 'git fetch'
                            sh 'git checkout main'
                            sh 'git pull origin main'
                        }
                    } else {
                        sh 'git clone -b main https://github.com/Forber-Technology-Indonesia/whatsapp_gateway.git'
                    }
                }
            }
        }
        stage('Container Renewal') {
            steps {
                script {
                    try {
                        sh 'docker stop node4'
                        sh 'docker rm node4'
                    } catch (Exception e) {
                        echo "Container node4 was not running or could not be stopped/removed: ${e}"
                    }
                }
            }
        }
        stage('Image Renewal') {
            steps {
                script {
                    try {
                        sh 'docker rmi wawebApi-free'
                    } catch (Exception e) {
                        echo "Image wawebApi-free could not be removed: ${e}"
                    }
                }
            }
        }
        stage('Build Docker New Image') {
            steps {
                dir('whatsapp_gateway') {
                    sh 'docker build -t wawebApi-free .'
                }
            }
        }
        stage('Run New Container') {
            steps {
                sh 'docker run -d --name node4  -p 3001:3001 wawebApi-free'
            }
        }
    }
    post {
        always {
            echo 'This will always run'
        }
        success {
            echo 'This will run only if successful'
        }
        failure {
            echo 'This will run only if failed'
        }
    }
}
