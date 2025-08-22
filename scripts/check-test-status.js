#!/usr/bin/env node

/**
 * 🔍 Script de Verificação do Status dos Testes Offline
 * 
 * Este script verifica rapidamente se o ambiente de testes está configurado corretamente
 * e executa uma validação básica dos componentes principais.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestStatusChecker {
  constructor() {
    this.results = {
      adb: false,
      scripts: false,
      testData: false,
      logs: false,
      components: false
    };
  }

  log(message, status = '📋') {
    console.log(`${status} ${message}`);
  }

  checkAdb() {
    this.log('Verificando ADB...', '🔧');
    
    try {
      execSync('adb version', { stdio: 'pipe' });
      this.results.adb = true;
      this.log('ADB disponível e funcionando', '✅');
      
      try {
        const devices = execSync('adb devices', { encoding: 'utf8' });
        if (devices.includes('emulator') || devices.includes('device')) {
          this.log('Dispositivos/emuladores conectados encontrados', '📱');
        } else {
          this.log('Nenhum dispositivo conectado (normal se emulador não estiver rodando)', '⚠️');
        }
      } catch (error) {
        this.log('Erro ao listar dispositivos', '⚠️');
      }
      
    } catch (error) {
      this.results.adb = false;
      this.log('ADB não configurado (testes manuais disponíveis)', '⚠️');
      this.log('Para configurar: ver CONFIGURACAO_ADB_WINDOWS.md', '💡');
    }
  }

  checkScripts() {
    this.log('Verificando scripts NPM...', '📦');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const testScripts = Object.keys(packageJson.scripts || {})
        .filter(script => script.includes('test:offline'));
      
      if (testScripts.length > 0) {
        this.results.scripts = true;
        this.log(`${testScripts.length} scripts de teste offline encontrados`, '✅');
        testScripts.forEach(script => {
          this.log(`  - npm run ${script}`, '📝');
        });
      } else {
        this.log('Scripts de teste offline não encontrados', '❌');
      }
    } catch (error) {
      this.log('Erro ao verificar package.json', '❌');
    }
  }

  checkTestData() {
    this.log('Verificando estrutura de dados de teste...', '📊');
    
    const testDataDir = path.join(__dirname, '..', 'test-data');
    const logsDir = path.join(__dirname, '..', 'logs');
    
    // Verificar diretório de dados de teste
    if (fs.existsSync(testDataDir)) {
      this.log('Diretório test-data/ existe', '✅');
      
      const testDataFile = path.join(testDataDir, 'offline-test-data.json');
      if (fs.existsSync(testDataFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
          this.log(`Dados de teste carregados: ${Object.keys(data).length} tabelas`, '📋');
        } catch (error) {
          this.log('Arquivo de dados de teste corrompido', '⚠️');
        }
      } else {
        this.log('Arquivo de dados de teste não existe (será criado no primeiro teste)', '📝');
      }
    } else {
      this.log('Diretório test-data/ não existe (será criado automaticamente)', '📝');
    }
    
    this.results.testData = true;
  }

  checkLogs() {
    this.log('Verificando sistema de logs...', '📄');
    
    const logsDir = path.join(__dirname, '..', 'logs');
    
    if (fs.existsSync(logsDir)) {
      this.log('Diretório logs/ existe', '✅');
      
      const logFile = path.join(logsDir, 'offline-tests.log');
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        const size = (stats.size / 1024).toFixed(2);
        this.log(`Log de testes existe (${size} KB)`, '📋');
        
        // Mostrar últimas linhas do log
        try {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            this.log(`Última entrada: ${lines[lines.length - 1].substring(0, 80)}...`, '🕐');
          }
        } catch (error) {
          this.log('Erro ao ler log', '⚠️');
        }
      } else {
        this.log('Arquivo de log não existe (será criado no primeiro teste)', '📝');
      }
    } else {
      this.log('Diretório logs/ não existe (será criado automaticamente)', '📝');
    }
    
    this.results.logs = true;
  }

  checkComponents() {
    this.log('Verificando componentes de teste...', '🧩');
    
    const componentsToCheck = [
      'scripts/test-offline.js',
      'components/debug/OfflineTestPanel.tsx',
      'screens/DebugScreen.tsx',
      'services/offline/syncService.ts'
    ];
    
    let foundComponents = 0;
    
    componentsToCheck.forEach(component => {
      if (fs.existsSync(component)) {
        this.log(`${component} ✅`, '📁');
        foundComponents++;
      } else {
        this.log(`${component} ❌`, '📁');
      }
    });
    
    if (foundComponents === componentsToCheck.length) {
      this.results.components = true;
      this.log('Todos os componentes de teste encontrados', '✅');
    } else {
      this.log(`${foundComponents}/${componentsToCheck.length} componentes encontrados`, '⚠️');
    }
  }

  runQuickTest() {
    this.log('Executando teste rápido...', '🚀');
    
    try {
      // Executar teste de criação de dados
      execSync('node scripts/test-offline.js create-test-data', { stdio: 'pipe' });
      this.log('Teste de criação de dados: OK', '✅');
      
      // Verificar se arquivo foi criado
      const testDataFile = path.join(__dirname, '..', 'test-data', 'offline-test-data.json');
      if (fs.existsSync(testDataFile)) {
        this.log('Arquivo de dados de teste criado com sucesso', '✅');
      }
      
    } catch (error) {
      this.log('Erro no teste rápido', '❌');
      this.log(error.message, '🔍');
    }
  }

  generateReport() {
    this.log('\n' + '='.repeat(50), '📊');
    this.log('RELATÓRIO DE STATUS DOS TESTES OFFLINE', '📊');
    this.log('='.repeat(50), '📊');
    
    const checks = [
      { name: 'ADB Configurado', status: this.results.adb, required: false },
      { name: 'Scripts NPM', status: this.results.scripts, required: true },
      { name: 'Estrutura de Dados', status: this.results.testData, required: true },
      { name: 'Sistema de Logs', status: this.results.logs, required: true },
      { name: 'Componentes', status: this.results.components, required: true }
    ];
    
    let allRequired = true;
    
    checks.forEach(check => {
      const icon = check.status ? '✅' : (check.required ? '❌' : '⚠️');
      const req = check.required ? '(obrigatório)' : '(opcional)';
      this.log(`${check.name}: ${icon} ${req}`, '📋');
      
      if (check.required && !check.status) {
        allRequired = false;
      }
    });
    
    this.log('\n' + '-'.repeat(50), '📊');
    
    if (allRequired) {
      this.log('STATUS GERAL: ✅ PRONTO PARA TESTES', '🎯');
      this.log('\nCOMO USAR:', '💡');
      
      if (this.results.adb) {
        this.log('• npm run test:offline (automático com ADB)', '🤖');
      } else {
        this.log('• npm run test:offline (manual, seguir instruções)', '👤');
      }
      
      this.log('• Usar painel visual no app (tela Debug)', '📱');
      this.log('• Verificar logs em logs/offline-tests.log', '📄');
      
    } else {
      this.log('STATUS GERAL: ❌ CONFIGURAÇÃO INCOMPLETA', '⚠️');
      this.log('\nACÕES NECESSÁRIAS:', '🔧');
      this.log('• Verificar arquivos em falta', '📁');
      this.log('• Executar npm install', '📦');
      this.log('• Consultar documentação', '📚');
    }
    
    this.log('\nDOCUMENTAÇÃO:', '📚');
    this.log('• CONFIGURACAO_ADB_WINDOWS.md - Configurar ADB', '🔧');
    this.log('• README_TESTES_OFFLINE.md - Guia completo', '📖');
    this.log('• RELATORIO_TESTES_OFFLINE.md - Status atual', '📊');
  }

  run() {
    this.log('🔍 VERIFICAÇÃO DO AMBIENTE DE TESTES OFFLINE', '🎯');
    this.log('\n');
    
    this.checkAdb();
    this.checkScripts();
    this.checkTestData();
    this.checkLogs();
    this.checkComponents();
    this.runQuickTest();
    this.generateReport();
  }
}

// Executar verificação se chamado diretamente
if (require.main === module) {
  const checker = new TestStatusChecker();
  checker.run();
}

module.exports = TestStatusChecker;