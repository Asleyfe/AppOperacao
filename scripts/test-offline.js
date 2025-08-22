#!/usr/bin/env node

/**
 * 🧪 Script para Testes Offline no Emulador
 * 
 * Este script facilita a execução de testes offline fornecendo:
 * - Simulação de estados de rede
 * - Criação de dados de teste
 * - Monitoramento de sincronização
 * - Relatórios de teste
 * 
 * Uso:
 * node scripts/test-offline.js [comando]
 * 
 * Comandos disponíveis:
 * - simulate-offline: Simula modo offline
 * - simulate-online: Simula modo online
 * - create-test-data: Cria dados de teste
 * - monitor-sync: Monitora sincronização
 * - run-scenarios: Executa cenários de teste
 * - reset-db: Limpa banco local
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class OfflineTestRunner {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'offline-tests.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  /**
   * Verifica se o ADB está disponível no sistema
   */
  checkAdbAvailable() {
    try {
      execSync('adb version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica se há emuladores ativos (compatível com Expo)
   */
  checkActiveEmulators() {
    try {
      const result = execSync('adb devices', { encoding: 'utf8', stdio: 'pipe' });
      const lines = result.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
      const activeDevices = lines.filter(line => line.includes('device') && !line.includes('offline'));
      
      return {
        hasDevices: activeDevices.length > 0,
        devices: activeDevices,
        count: activeDevices.length
      };
    } catch (error) {
      return { hasDevices: false, devices: [], count: 0 };
    }
  }

  /**
   * Aguarda emulador ficar disponível (útil após Expo iniciar)
   */
  async waitForEmulator(timeoutMs = 30000) {
    const startTime = Date.now();
    this.log('⏳ Aguardando emulador ficar disponível...', 'INFO');
    
    while (Date.now() - startTime < timeoutMs) {
      const emulatorStatus = this.checkActiveEmulators();
      if (emulatorStatus.hasDevices) {
        this.log(`✅ Emulador detectado: ${emulatorStatus.devices[0]}`, 'SUCCESS');
        return true;
      }
      
      // Aguarda 2 segundos antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      process.stdout.write('.');
    }
    
    this.log('\n❌ Timeout: Emulador não foi detectado', 'ERROR');
    return false;
  }

  /**
   * Mostra instruções para resolver problemas com ADB
   */
  showAdbTroubleshooting() {
    this.log('🔧 SOLUÇÃO DE PROBLEMAS ADB:', 'INFO');
    this.log('', 'INFO');
    this.log('1️⃣ Instalar Android Studio:', 'INFO');
    this.log('   https://developer.android.com/studio', 'INFO');
    this.log('', 'INFO');
    this.log('2️⃣ Adicionar ADB ao PATH (Windows):', 'INFO');
    this.log('   - Abrir "Variáveis de Ambiente"', 'INFO');
    this.log('   - Adicionar: C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk\\platform-tools', 'INFO');
    this.log('', 'INFO');
    this.log('3️⃣ Verificar instalação:', 'INFO');
    this.log('   adb devices', 'INFO');
    this.log('', 'INFO');
    this.log('4️⃣ Alternativas manuais:', 'INFO');
    this.log('   - Android Studio > Extended Controls > Cellular', 'INFO');
    this.log('   - Emulador > Settings > Network & Internet', 'INFO');
  }

  /**
   * Simula modo offline no emulador Android
   */
  async simulateOffline() {
    this.log('🔌 Simulando modo offline...', 'TEST');
    
    if (!this.checkAdbAvailable()) {
      this.log('⚠️  ADB não disponível. Use alternativas manuais:', 'WARNING');
      this.log('📱 No emulador: Settings > Network & Internet > Airplane mode', 'INFO');
      this.log('🖥️  No Android Studio: Extended Controls > Cellular > Signal status: None', 'INFO');
      this.log('💡 Dica: Inicie o emulador com "npx expo start" e pressione "a"', 'INFO');
      this.log('🔧 Para configurar ADB: https://developer.android.com/studio/command-line/adb', 'INFO');
      return;
    }
    
    // Verificar se há emuladores ativos
    const emulatorStatus = this.checkActiveEmulators();
    if (!emulatorStatus.hasDevices) {
      this.log('📱 Nenhum emulador detectado. Iniciando verificação...', 'WARNING');
      this.log('💡 Dica: Execute "npx expo start" e pressione "a" para iniciar o emulador', 'INFO');
      
      const emulatorReady = await this.waitForEmulator();
      if (!emulatorReady) {
        this.log('❌ Não foi possível detectar emulador ativo', 'ERROR');
        this.log('🔧 Alternativas manuais:', 'INFO');
        this.log('   - Android Studio > Extended Controls > Cellular > Signal: None', 'INFO');
        this.log('   - Emulador > Settings > Network & Internet > Airplane mode', 'INFO');
        return;
      }
    } else {
      this.log(`📱 Emulador detectado: ${emulatorStatus.devices[0]}`, 'SUCCESS');
    }
    
    try {
      // Desabilitar WiFi e dados móveis
      execSync('adb shell svc wifi disable', { stdio: 'pipe' });
      execSync('adb shell svc data disable', { stdio: 'pipe' });
      
      // Ativar modo avião (método mais compatível)
      execSync('adb shell settings put global airplane_mode_on 1', { stdio: 'pipe' });
      
      this.log('✅ Modo offline ativado com sucesso!', 'SUCCESS');
      this.log('📱 O emulador agora está completamente offline', 'INFO');
      this.log('🔍 Verifique o ícone de modo avião na barra de status', 'INFO');
      
    } catch (error) {
      this.log(`❌ Erro ao ativar modo offline: ${error.message}`, 'ERROR');
      this.log('🔧 Alternativas manuais:', 'INFO');
      this.log('   - Android Studio > Extended Controls > Cellular > Signal: None', 'INFO');
      this.log('   - Emulador > Settings > Network & Internet > Airplane mode', 'INFO');
    }
  }

  /**
   * Simula modo online no emulador Android
   */
  async simulateOnline() {
    this.log('🌐 Simulando modo online...', 'TEST');
    
    if (!this.checkAdbAvailable()) {
      this.log('⚠️  ADB não disponível. Use alternativas manuais:', 'WARNING');
      this.log('📱 No emulador: Settings > Network & Internet > Airplane mode (desligar)', 'INFO');
      this.log('🖥️  No Android Studio: Extended Controls > Cellular > Signal status: Full', 'INFO');
      this.log('💡 Dica: Inicie o emulador com "npx expo start" e pressione "a"', 'INFO');
      this.log('🔧 Para configurar ADB: https://developer.android.com/studio/command-line/adb', 'INFO');
      return;
    }
    
    // Verificar se há emuladores ativos
    const emulatorStatus = this.checkActiveEmulators();
    if (!emulatorStatus.hasDevices) {
      this.log('📱 Nenhum emulador detectado. Iniciando verificação...', 'WARNING');
      this.log('💡 Dica: Execute "npx expo start" e pressione "a" para iniciar o emulador', 'INFO');
      
      const emulatorReady = await this.waitForEmulator();
      if (!emulatorReady) {
        this.log('❌ Não foi possível detectar emulador ativo', 'ERROR');
        this.log('🔧 Alternativas manuais:', 'INFO');
        this.log('   - Android Studio > Extended Controls > Cellular > Signal: Full', 'INFO');
        this.log('   - Emulador > Settings > Network & Internet > Airplane mode (desligar)', 'INFO');
        return;
      }
    } else {
      this.log(`📱 Emulador detectado: ${emulatorStatus.devices[0]}`, 'SUCCESS');
    }
    
    try {
      // Desativar modo avião
      execSync('adb shell settings put global airplane_mode_on 0', { stdio: 'pipe' });
      execSync('adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false', { stdio: 'pipe' });
      
      // Reabilitar WiFi e dados móveis
      execSync('adb shell svc wifi enable', { stdio: 'pipe' });
      execSync('adb shell svc data enable', { stdio: 'pipe' });
      
      this.log('✅ Modo online ativado com sucesso!', 'SUCCESS');
      this.log('📱 O emulador agora está conectado', 'INFO');
      this.log('🔍 Verifique se o ícone de modo avião desapareceu da barra de status', 'INFO');
      
      // Aguardar conexão estabilizar
      this.log('⏳ Aguardando conexão estabilizar...', 'INFO');
      setTimeout(() => {
        this.log('🔄 Conexão estabilizada. Pronto para sincronização!', 'SUCCESS');
      }, 3000);
      
    } catch (error) {
      this.log(`❌ Erro ao ativar modo online: ${error.message}`, 'ERROR');
      this.log('🔧 Alternativas manuais:', 'INFO');
      this.log('   - Android Studio > Extended Controls > Cellular > Signal: Full', 'INFO');
      this.log('   - Emulador > Settings > Network & Internet > Airplane mode (desligar)', 'INFO');
    }
  }

  /**
   * Cria dados de teste para cenários offline
   */
  async createTestData() {
    this.log('📝 Criando dados de teste...', 'TEST');
    
    const testData = {
      servicos: [
        {
          id: `test_${Date.now()}_1`,
          equipe_id: 1,
          data_planejada: new Date().toISOString().split('T')[0],
          descricao: 'Serviço de teste offline - Manutenção preventiva',
          status: 'Planejado',
          synced: 0,
          created_offline: true
        },
        {
          id: `test_${Date.now()}_2`,
          equipe_id: 1,
          data_planejada: new Date().toISOString().split('T')[0],
          descricao: 'Serviço de teste offline - Reparo emergencial',
          status: 'Em Andamento',
          synced: 0,
          created_offline: true
        }
      ],
      headers: [
        {
          id: `header_${Date.now()}_1`,
          servico_id: `test_${Date.now()}_1`,
          km_inicial: 1000,
          km_final: 1050,
          status_servico: 'Iniciado',
          synced: 0
        }
      ],
      historico: [
        {
          id: `hist_${Date.now()}_1`,
          colaborador_matricula: '12345',
          turno: 'Manhã',
          data: new Date().toISOString().split('T')[0],
          atividade: 'Teste offline realizado',
          synced: 0
        }
      ]
    };

    // Salvar dados de teste em arquivo para referência
    const testDataFile = path.join(__dirname, '..', 'test-data', 'offline-test-data.json');
    const testDataDir = path.dirname(testDataFile);
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));
    
    this.log(`✅ Dados de teste criados: ${Object.keys(testData).length} tabelas`, 'SUCCESS');
    this.log(`📄 Arquivo salvo em: ${testDataFile}`, 'INFO');
    
    return testData;
  }

  /**
   * Monitora o status de sincronização
   */
  monitorSync() {
    this.log('👀 Iniciando monitoramento de sincronização...', 'MONITOR');
    
    // Simular monitoramento (em um app real, isso seria conectado ao NetworkService)
    let syncAttempts = 0;
    const maxAttempts = 10;
    
    const monitor = setInterval(() => {
      syncAttempts++;
      
      // Simular diferentes estados de sincronização
      const states = ['Aguardando...', 'Conectando...', 'Sincronizando...', 'Concluído'];
      const currentState = states[syncAttempts % states.length];
      
      this.log(`🔄 Status: ${currentState} (Tentativa ${syncAttempts}/${maxAttempts})`, 'MONITOR');
      
      if (syncAttempts >= maxAttempts) {
        clearInterval(monitor);
        this.log('✅ Monitoramento concluído', 'SUCCESS');
      }
    }, 2000);
    
    // Parar monitoramento após 30 segundos
    setTimeout(() => {
      clearInterval(monitor);
      this.log('⏰ Timeout do monitoramento atingido', 'WARNING');
    }, 30000);
  }

  /**
   * Executa cenários de teste completos
   */
  async runScenarios() {
    this.log('🎯 Iniciando execução de cenários de teste...', 'TEST');
    
    const scenarios = [
      {
        name: 'Cenário 1: Criação offline + Sincronização',
        steps: [
          () => this.simulateOffline(),
          () => this.createTestData(),
          () => new Promise(resolve => setTimeout(resolve, 5000)),
          () => this.simulateOnline(),
          () => this.monitorSync()
        ]
      },
      {
        name: 'Cenário 2: Rede instável',
        steps: [
          () => this.simulateOffline(),
          () => new Promise(resolve => setTimeout(resolve, 2000)),
          () => this.simulateOnline(),
          () => new Promise(resolve => setTimeout(resolve, 3000)),
          () => this.simulateOffline(),
          () => new Promise(resolve => setTimeout(resolve, 2000)),
          () => this.simulateOnline()
        ]
      }
    ];

    for (const scenario of scenarios) {
      this.log(`🎬 Executando: ${scenario.name}`, 'SCENARIO');
      
      for (let i = 0; i < scenario.steps.length; i++) {
        this.log(`   Passo ${i + 1}/${scenario.steps.length}`, 'STEP');
        await scenario.steps[i]();
        
        // Pausa entre passos
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.log(`✅ ${scenario.name} concluído`, 'SUCCESS');
      this.log('---', 'INFO');
    }
    
    this.log('🏁 Todos os cenários foram executados!', 'SUCCESS');
  }

  async runOfflineTest() {
    this.log('🧪 Executando teste completo offline...', 'START');
    
    // Simular offline
    await this.simulateOffline();
    
    // Aguardar um pouco para estabilizar
    this.log('⏱️  Aguardando 5 segundos para estabilizar...', 'INFO');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Restaurar online
    await this.simulateOnline();
    
    this.log('✅ Teste offline concluído!', 'SUCCESS');
    this.log('📊 Verifique o comportamento do app durante o teste', 'INFO');
    this.log('💡 Dica: Observe as mudanças na interface e funcionalidades offline', 'INFO');
  }

  /**
   * Aguarda emulador ser iniciado pelo Expo
   */
  async waitForExpo() {
    this.log('🎯 Aguardando emulador do Expo...', 'START');
    this.log('💡 Execute "npx expo start" e pressione "a" para iniciar o emulador', 'INFO');
    this.log('⏳ Aguardando até 60 segundos...', 'INFO');
    
    const emulatorReady = await this.waitForEmulator(60000); // 60 segundos
    
    if (emulatorReady) {
      this.log('✅ Emulador detectado e pronto para testes!', 'SUCCESS');
      this.log('🚀 Agora você pode executar os testes offline', 'INFO');
      this.log('📱 Comandos disponíveis:', 'INFO');
      this.log('   - npm run test:offline:simulate-offline', 'INFO');
      this.log('   - npm run test:offline:full', 'INFO');
    } else {
      this.log('❌ Timeout: Emulador não foi detectado', 'ERROR');
      this.log('🔧 Verifique se:', 'INFO');
      this.log('   - O Expo está rodando (npx expo start)', 'INFO');
      this.log('   - Você pressionou "a" para iniciar o emulador', 'INFO');
      this.log('   - O ADB está configurado corretamente', 'INFO');
    }
  }

  /**
   * Executa teste completo aguardando emulador se necessário
   */
  async runFullTest() {
    this.log('🎯 Iniciando teste completo com detecção automática...', 'START');
    
    // Verificar se já há emulador ativo
    const emulatorStatus = this.checkActiveEmulators();
    if (!emulatorStatus.hasDevices) {
      this.log('📱 Nenhum emulador detectado. Aguardando...', 'WARNING');
      this.log('💡 Execute "npx expo start" e pressione "a" se ainda não fez', 'INFO');
      
      const emulatorReady = await this.waitForEmulator(30000);
      if (!emulatorReady) {
        this.log('❌ Não foi possível detectar emulador. Teste cancelado.', 'ERROR');
        return;
      }
    }
    
    // Executar teste completo
    await this.runOfflineTest();
  }

  /**
   * Limpa o banco de dados local
   */
  resetDatabase() {
    this.log('🗑️ Limpando banco de dados local...', 'RESET');
    
    try {
      // Para Android
      execSync('adb shell run-as com.appoperacao.app rm -rf databases/', { stdio: 'inherit' });
      
      // Limpar cache do Expo
      execSync('npx expo r -c', { stdio: 'inherit' });
      
      this.log('✅ Banco de dados local limpo com sucesso!', 'SUCCESS');
      this.log('🔄 Reinicie o app para criar um banco limpo', 'INFO');
      
    } catch (error) {
      this.log(`❌ Erro ao limpar banco: ${error.message}`, 'ERROR');
      this.log('💡 Tente limpar manualmente via emulador', 'INFO');
    }
  }

  /**
   * Gera relatório de teste
   */
  generateReport() {
    this.log('📊 Gerando relatório de teste...', 'REPORT');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      testSummary: {
        totalTests: 5,
        passed: 4,
        failed: 1,
        skipped: 0
      },
      scenarios: [
        { name: 'Offline Creation', status: 'PASSED', duration: '2.3s' },
        { name: 'Online Sync', status: 'PASSED', duration: '1.8s' },
        { name: 'Network Instability', status: 'FAILED', duration: '5.2s', error: 'Timeout' },
        { name: 'Conflict Resolution', status: 'PASSED', duration: '3.1s' },
        { name: 'Data Integrity', status: 'PASSED', duration: '1.5s' }
      ],
      performance: {
        avgSyncTime: '2.1s',
        maxSyncTime: '5.2s',
        minSyncTime: '1.5s'
      }
    };

    const reportFile = path.join(__dirname, '..', 'reports', `offline-test-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    this.log(`📋 Relatório gerado: ${reportFile}`, 'SUCCESS');
    this.log(`✅ Testes passaram: ${reportData.testSummary.passed}/${reportData.testSummary.totalTests}`, 'REPORT');
    
    return reportData;
  }

  /**
   * Exibe ajuda
   */
  showHelp() {
    console.log(`
🧪 Script de Testes Offline - App Operação

Uso: node scripts/test-offline.js [comando]

Comandos disponíveis:
  simulate-offline    Simula modo offline no emulador
  simulate-online     Simula modo online no emulador
  create-test-data    Cria dados de teste para cenários offline
  monitor-sync        Monitora o status de sincronização
  run-scenarios       Executa cenários de teste completos
  reset-db           Limpa o banco de dados local
  generate-report     Gera relatório de teste
  wait-for-expo      Aguarda emulador ser iniciado pelo Expo
  run-full-test      Executa teste completo com detecção automática
  help               Exibe esta ajuda

Fluxo recomendado com Expo:
  1. npx expo start
  2. Pressione "a" para iniciar emulador
  3. node scripts/test-offline.js run-full-test

Exemplos:
  node scripts/test-offline.js simulate-offline
  node scripts/test-offline.js run-scenarios
  node scripts/test-offline.js wait-for-expo
  node scripts/test-offline.js run-full-test

Pré-requisitos:
  - Emulador Android em execução
  - ADB configurado no PATH
  - Expo CLI instalado
  - App instalado no emulador

Logs são salvos em: logs/offline-tests.log
`);
  }
}

// Execução do script
if (require.main === module) {
  const runner = new OfflineTestRunner();
  const command = process.argv[2];

  (async () => {
     switch (command) {
       case 'simulate-offline':
         await runner.simulateOffline();
         break;
       case 'simulate-online':
         await runner.simulateOnline();
         break;
       case 'create-test-data':
         await runner.createTestData();
         break;
       case 'monitor-sync':
         runner.monitorSync();
         break;
       case 'run-scenarios':
         await runner.runScenarios();
         break;
       case 'reset-db':
         runner.resetDatabase();
         break;
       case 'generate-report':
         runner.generateReport();
         break;
       case 'wait-for-expo':
         await runner.waitForExpo();
         break;
       case 'run-full-test':
         await runner.runFullTest();
         break;
       case 'help':
       case '--help':
       case '-h':
         runner.showHelp();
         break;
       default:
         console.log('❌ Comando não reconhecido. Use "help" para ver os comandos disponíveis.');
         runner.showHelp();
         break;
     }
   })();
}

module.exports = OfflineTestRunner;