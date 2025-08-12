# 🚀 Guia de Deploy na Netlify

## ✅ Pré-requisitos
- Conta no GitHub/GitLab/Bitbucket
- Conta na Netlify (gratuita)
- Projeto já buildado (pasta `dist` criada)

## 📋 Passo a Passo

### 1. Preparação do Repositório
```bash
# Se ainda não tem um repositório Git
git init
git add .
git commit -m "Initial commit"

# Conecte com seu repositório remoto
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git push -u origin main
```

### 2. Deploy na Netlify

#### Opção A: Deploy via Git (Recomendado)
1. Acesse [netlify.com](https://netlify.com) e faça login
2. Clique em "New site from Git"
3. Conecte seu repositório GitHub/GitLab/Bitbucket
4. Selecione seu repositório
5. Configure:
   - **Build command**: `npm run build:web`
   - **Publish directory**: `dist`
6. Clique em "Deploy site"

#### Opção B: Deploy Manual
1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta `dist` para a área de deploy
3. Aguarde o upload

### 3. Configurar Variáveis de Ambiente
1. No painel da Netlify, vá em **Site settings**
2. Clique em **Environment variables**
3. Adicione as variáveis:
   - `SUPABASE_URL`: sua URL do Supabase
   - `SUPABASE_KEY`: sua chave anônima do Supabase

### 4. Configurar Domínio (Opcional)
1. Em **Site settings > Domain management**
2. Clique em "Add custom domain"
3. Configure seu domínio personalizado

## 🔧 Arquivos de Configuração Criados

- ✅ `netlify.toml` - Configurações de build e redirects
- ✅ `.env.production` - Template das variáveis de ambiente

## 🌐 Testando o Deploy

Após o deploy:
1. Acesse a URL fornecida pela Netlify
2. Teste o login e funcionalidades principais
3. Verifique se as APIs do Supabase estão funcionando

## 🔄 Atualizações Automáticas

Com o deploy via Git configurado:
- Cada push para a branch principal triggera um novo deploy
- Builds automáticos a cada commit
- Preview deploys para pull requests

## 🚨 Troubleshooting

### Erro de CORS
- Configure as URLs permitidas no Supabase
- Adicione sua URL da Netlify nas configurações do Supabase

### Erro 404 em rotas
- Verifique se o `netlify.toml` está configurado corretamente
- O redirect `/* -> /index.html` deve estar ativo

### Variáveis de ambiente não funcionam
- Verifique se estão configuradas no painel da Netlify
- Faça um novo deploy após configurar as variáveis

## 📱 Limitações Web vs Mobile

**Funcionalidades que podem ter limitações na web:**
- Câmera (funciona com permissões do navegador)
- Notificações push (requer service worker)
- Alguns gestos nativos

**Funcionalidades que funcionam perfeitamente:**
- Autenticação
- CRUD de dados
- Relatórios e gráficos
- Interface responsiva

---

🎉 **Pronto!** Seu app está no ar na Netlify!