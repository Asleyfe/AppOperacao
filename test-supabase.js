// test-supabase.js
// Script para testar conectividade com Supabase

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zzwfyttukbvgwonjsxic.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d2Z5dHR1a2J2Z3dvbmpzeGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NjI4ODQsImV4cCI6MjA2OTIzODg4NH0.K4Zxlt8NBkGfbOVppqxt8MAomE4CLw9husGGrieCkwo';

console.log('🔧 Testando conectividade com Supabase...');
console.log('URL:', SUPABASE_URL);
console.log('Key (primeiros 20 chars):', SUPABASE_KEY.substring(0, 20) + '...');

// Função para fazer requisição HTTP nativa
function makeRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: headers
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testConnection() {
  try {
    console.log('\n📡 Testando conexão básica com HTTP nativo...');
    
    // Teste 1: Verificar se conseguimos acessar a API REST
    const apiUrl = `${SUPABASE_URL}/rest/v1/colaboradores?select=count&limit=1`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const response = await makeRequest(apiUrl, headers);
    
    if (response.status !== 200) {
      console.error('❌ Erro na conexão. Status:', response.status);
      console.error('Resposta:', response.data);
      return false;
    }
    
    console.log('✅ Conexão bem-sucedida!');
    console.log('Status:', response.status);
    console.log('Dados retornados:', response.data.substring(0, 200) + '...');
    
    // Teste 2: Testar query de serviços
    console.log('\n📊 Testando query de serviços...');
    const servicosUrl = `${SUPABASE_URL}/rest/v1/servicos?select=id,status&limit=5`;
    
    const servicosResponse = await makeRequest(servicosUrl, headers);
    
    if (servicosResponse.status !== 200) {
      console.error('❌ Erro ao buscar serviços. Status:', servicosResponse.status);
      console.error('Resposta:', servicosResponse.data);
      return false;
    }
    
    console.log('✅ Query de serviços bem-sucedida!');
    console.log('Status:', servicosResponse.status);
    
    try {
      const servicosData = JSON.parse(servicosResponse.data);
      console.log('Serviços encontrados:', servicosData.length);
    } catch (e) {
      console.log('Resposta (primeiros 200 chars):', servicosResponse.data.substring(0, 200));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Todos os testes passaram! A conectividade está OK.');
  } else {
    console.log('\n💥 Falha nos testes. Verifique a configuração.');
  }
  process.exit(success ? 0 : 1);
});