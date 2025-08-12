# 🚀 Guia para Conectar ao Git e Publicar o Código

Este guia mostra como conectar seu projeto ao Git e publicá-lo no GitHub, GitLab ou outro serviço.

## 📋 **Passo a Passo Completo**

### 1. **Preparar o Repositório Local** ✅

```bash
# Adicionar todos os arquivos ao Git
git add .

# Fazer o primeiro commit
git commit -m "feat: initial commit - AppOperacao sistema completo"

# Verificar status
git status
```

### 2. **Criar Repositório no GitHub** 🌐

#### Opção A: Via Interface Web
1. Acesse [GitHub.com](https://github.com)
2. Clique em **"New repository"**
3. Nome: `AppOperacao` ou `app-operacao`
4. Descrição: `Sistema de Gestão de Equipes e Serviços`
5. **NÃO** marque "Initialize with README"
6. Clique em **"Create repository"**

#### Opção B: Via GitHub CLI (se instalado)
```bash
# Instalar GitHub CLI (se não tiver)
winget install GitHub.cli

# Login no GitHub
gh auth login

# Criar repositório
gh repo create AppOperacao --public --description "Sistema de Gestão de Equipes e Serviços"
```

### 3. **Conectar Repositório Local ao Remoto** 🔗

```bash
# Adicionar origem remota (substitua SEU_USUARIO pelo seu username)
git remote add origin https://github.com/SEU_USUARIO/AppOperacao.git

# Verificar se foi adicionado
git remote -v

# Definir branch principal
git branch -M main
```

### 4. **Publicar o Código** 📤

```bash
# Enviar código para o GitHub
git push -u origin main
```

### 5. **Configurar .gitignore (Recomendado)** 📝

Verificar se o `.gitignore` está adequado:

```bash
# Ver conteúdo atual
cat .gitignore
```

Se necessário, adicionar mais itens:
```gitignore
# Dependências
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
web-build/

# Ambiente
.env
.env.local
.env.production

# Build
build/
*.tgz
*.tar.gz

# Logs
logs
*.log

# Database
*.db
*.sqlite

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## 🔄 **Comandos Úteis para Manutenção**

### Adicionar Mudanças
```bash
# Verificar status
git status

# Adicionar arquivos específicos
git add arquivo.js

# Adicionar todos os arquivos
git add .

# Commit com mensagem
git commit -m "feat: adicionar nova funcionalidade"

# Enviar para o repositório
git push
```

### Padrões de Commit (Recomendado)
```bash
# Novas funcionalidades
git commit -m "feat: adicionar sistema de faturamento"

# Correções de bugs
git commit -m "fix: corrigir erro no login"

# Atualizações de documentação
git commit -m "docs: atualizar README"

# Refatoração de código
git commit -m "refactor: melhorar estrutura de componentes"

# Atualizações de estilo
git commit -m "style: ajustar formatação do código"
```

### Verificar Histórico
```bash
# Ver commits recentes
git log --oneline -10

# Ver status atual
git status

# Ver diferenças
git diff
```

## 🌟 **Configurações Avançadas**

### Configurar Usuário Git (se não configurado)
```bash
# Configurar nome
git config --global user.name "Seu Nome"

# Configurar email
git config --global user.email "seu.email@exemplo.com"

# Verificar configurações
git config --list
```

### Criar Branch para Desenvolvimento
```bash
# Criar e mudar para branch de desenvolvimento
git checkout -b develop

# Enviar branch para o repositório
git push -u origin develop

# Voltar para main
git checkout main
```

### Configurar GitHub Pages (Para Web)
```bash
# Se quiser hospedar a versão web
# 1. Fazer build da versão web
npx expo export --platform web

# 2. Configurar GitHub Pages nas configurações do repositório
# 3. Apontar para a pasta web-build ou criar branch gh-pages
```

## 📱 **Integração com Expo**

### Conectar Projeto Expo ao Git
```bash
# Verificar configuração do Expo
npx expo whoami

# Publicar no Expo (opcional)
npx expo publish
```

## 🔒 **Segurança e Boas Práticas**

### Proteger Informações Sensíveis
1. **NUNCA** commitar arquivos `.env` com dados reais
2. Usar `.env.example` como template
3. Adicionar `.env` no `.gitignore`
4. Usar GitHub Secrets para CI/CD

### Exemplo de .env.example
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Expo Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 🎯 **Próximos Passos Recomendados**

1. **Criar README.md detalhado** (já existe)
2. **Configurar GitHub Actions** para CI/CD
3. **Criar releases** para versões estáveis
4. **Configurar branch protection** na main
5. **Adicionar badges** no README

## 🚨 **Troubleshooting**

### Erro de Autenticação
```bash
# Configurar token de acesso pessoal
# 1. GitHub > Settings > Developer settings > Personal access tokens
# 2. Gerar novo token com permissões de repo
# 3. Usar token como senha
```

### Erro de Push
```bash
# Se der erro de push, fazer pull primeiro
git pull origin main

# Resolver conflitos se houver
# Depois fazer push novamente
git push origin main
```

### Desfazer Último Commit (Local)
```bash
# Desfazer último commit mantendo mudanças
git reset --soft HEAD~1

# Desfazer último commit removendo mudanças
git reset --hard HEAD~1
```

---

**🎉 Pronto! Seu código estará disponível no GitHub e você poderá colaborar, fazer backup e compartilhar seu projeto!**