# AppOperacao - Sistema de Gestão de Equipes e Serviços

Um aplicativo móvel desenvolvido em React Native com Expo para gestão de equipes de trabalho, acompanhamento de serviços em campo e sistema de faturamento, com hierarquia organizacional completa e políticas de segurança avançadas.

## 📱 Sobre o Aplicativo

Este aplicativo foi desenvolvido para facilitar a gestão de equipes de trabalho e o acompanhamento de serviços em campo. Permite criar equipes, gerenciar composições, acompanhar serviços, preencher checklists de forma digital e gerar relatórios de faturamento, com controle hierárquico e permissões baseadas em funções.

## 🏗️ Estrutura do Projeto

```
app/
├── (tabs)/          # Navegação por abas
│   ├── equipes.tsx  # Tela de gestão de equipes
│   ├── servicos.tsx # Tela de acompanhamento de serviços
│   └── relatorios.tsx # Tela de relatórios e faturamento
├── _layout.tsx      # Layout principal com autenticação
└── login.tsx        # Tela de login

assets/              # Recursos estáticos
├── images/          # Imagens
└── fonts/           # Fontes

components/          # Componentes reutilizáveis
├── ui/              # Componentes de interface
└── forms/           # Componentes de formulário

hooks/               # Hooks customizados
├── useAuth.ts       # Hook de autenticação com Supabase
├── useFrameworkReady.ts # Hook de inicialização
└── useColorScheme.ts # Hook de tema

schema.supabase/     # Scripts de banco de dados atualizados
├── 01_schema_tabelas.sql    # Estrutura completa das tabelas
├── 02_schema_policies.sql   # Políticas RLS atualizadas
├── 46_populate_faturamento_dados_reais.sql # Dados de faturamento
├── faturamento-real-examples.sql # Exemplos de faturamento
├── faturamento-views.example.sql # Views de faturamento
└── test_data_856011A.sql    # Dados de teste para equipe 856011A

services/            # Serviços e APIs
├── api.ts           # API principal com Supabase
└── supabase.ts      # Cliente Supabase configurado

types/               # Definições de tipos TypeScript
└── types.ts         # Interfaces e tipos

# ARQUIVOS DE CONFIGURAÇÃO
.env                 # Variáveis de ambiente
package.json         # Dependências e scripts
tsconfig.json        # Configuração TypeScript
README.md           # Documentação do projeto
```

## 🚀 Tecnologias Utilizadas

### Frontend
- **React Native 0.79.1** - Framework para desenvolvimento mobile
- **Expo 53.0.0** - Plataforma de desenvolvimento
- **TypeScript** - Linguagem de programação
- **Expo Router 5.0.2** - Navegação baseada em arquivos
- **React Hook Form 7.54.2** - Gerenciamento de formulários
- **Lucide React Native 0.475.0** - Ícones
- **Date-fns 4.1.0** - Manipulação de datas
- **React Native Reanimated 3.17.4** - Animações
- **React Native Modal 13.0.1** - Modais

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Row Level Security (RLS)** - Segurança a nível de linha
- **Supabase Auth** - Autenticação

### Desenvolvimento
- **Cross-env** - Variáveis de ambiente
- **Concurrently** - Execução paralela de scripts
- **Dotenv** - Configuração de ambiente

## 📋 Funcionalidades Principais

### Sistema Hierárquico
- **Admin**: Acesso total ao sistema
- **Coordenador**: Gerencia todas as equipes e serviços
- **Supervisor**: Gerencia equipes de sua hierarquia
- **Encarregado**: Gerencia apenas suas próprias equipes
- **Operacionais**: Eletricistas, Auxiliares, Motoristas (não acessam o app)

### Gestão de Equipes
- Criação e edição de equipes com controle hierárquico
- Composição de equipes com colaboradores
- Sistema de aprovação com auditoria
- Aprovação cruzada entre supervisores
- Visualização baseada em permissões

### Serviços
- Acompanhamento de serviços em campo
- Controle de status (Planejado, Em Deslocamento, Em Execução, Finalizado)
- Registro de timestamps para cada etapa
- Associação com equipes e itens GI
- Controle de acesso baseado na equipe
- Sistema de faturamento integrado
- **Validações de Fluxo Operacional**:
  - Validação de status da equipe (deve estar "Aprovada") antes do início do turno
  - Validação de turno confirmado antes do início de qualquer serviço
  - Controle sequencial das operações de campo

### Sistema de Faturamento
- **Cálculo automático** baseado em valores reais de mercado
- **Relatórios detalhados** por equipe e período
- **Views otimizadas** para consultas de faturamento
- **Integração com serviços** para rastreamento de custos
- **Filtros avançados** por equipe, data e tipo de serviço

### Itens GI (Grupo de Itens)
- **Estrutura Hierárquica**: Grupo → Item → Execução → Faturamento
- Templates configuráveis com grupos organizados (Postes, Isoladores, Cabos, etc.)
- Itens detalhados com unidade e código de material
- Preenchimento digital com status (Instalado/Retirado) e quantidade
- Validação de conformidade e campos de observação
- Histórico completo de preenchimentos

### Autenticação e Segurança
- Login via Supabase Auth
- Políticas de segurança (RLS) granulares
- Controle de acesso baseado em funções
- Auditoria automática de alterações

## 📊 Modelos de Dados

### Colaborador
```typescript
interface Colaborador {
  id: number;
  matricula: string;     // Matrícula única (5 dígitos)
  nome: string;
  user_id?: string;      // ID do usuário no Supabase Auth
  funcao: 'Admin' | 'Coordenador' | 'Supervisor' | 'Encarregado' | 'Eletricista' | 'Auxiliar' | 'Motorista';
  supervisor_id?: number; // Referência ao supervisor
  coordenador_id?: number; // Referência ao coordenador
  created_at: string;
  updated_at: string;
}
```

### Equipe
```typescript
interface Equipe {
  id: number;
  prefixo: string;       // Identificador único (ex: "856011A")
  data: string;          // Data da equipe
  encarregado_matricula: string; // Matrícula do encarregado
  status_composicao: 'Pendente' | 'Aprovada' | 'Rejeitada';
  tipo_equipe: 'Operacional' | 'Manutenção' | 'Emergência';
  composicao: ComposicaoEquipe[];
  created_at: string;
  updated_at: string;
}
```

### Composição de Equipe
```typescript
interface ComposicaoEquipe {
  id: number;
  equipe_id: number;
  colaborador_id: number;
  hora_inicio: string;   // Horário de início
  aprovado_por?: number; // ID do aprovador
  data_aprovacao?: string;
  created_at: string;
  updated_at: string;
}
```

### Serviço
```typescript
interface Servico {
  id: number;
  nota?: string;         // Número da nota/ordem
  equipe_id: number;
  equipe_prefixo: string; // Prefixo da equipe
  data_planejada: string;
  descricao: string;
  status: 'Planejado' | 'Em Deslocamento' | 'Aguardando Execução' | 'Em Execução' | 'Finalizado';
  inicio_deslocamento?: string;
  fim_deslocamento?: string;
  inicio_execucao?: string;
  fim_execucao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}
```

### Item GI (Grupo de Itens)
```typescript
interface GIServico {
  id: number;
  id_servico: number;    // Referência ao serviço
  prefixo: string;       // Prefixo da equipe
  grupo: string;         // Grupo do item (ex: "Isoladores")
  item: string;          // Nome do item
  unidade: string;       // Unidade de medida
  quantidade: number;    // Quantidade executada
  valor_unitario: number; // Valor unitário para faturamento
  valor_total: number;   // Valor total calculado
  data_execucao: string; // Data da execução
  created_at: string;
  updated_at: string;
}
```

### Valores de Faturamento
```typescript
interface ValoresFaturamentoReal {
  id: number;
  grupo: string;         // Grupo do item
  item: string;          // Nome do item
  unidade: string;       // Unidade de medida
  valor_unitario: number; // Valor unitário em reais
  data_vigencia: string; // Data de vigência do valor
  ativo: boolean;        // Se o valor está ativo
  created_at: string;
  updated_at: string;
}
```

### Execuções de Colaborador
```typescript
interface ExecucaoColaborador {
  id: number;
  colaborador_id: number; // Referência ao colaborador
  equipe_id: number;     // Referência à equipe
  data_execucao: string; // Data da execução
  horas_trabalhadas: number; // Horas trabalhadas
  observacoes?: string;  // Observações da execução
  created_at: string;
  updated_at: string;
}
```

### Histórico de Turno
```typescript
interface HistoricoTurno {
  id: number;
  colaborador_matricula: string; // Matrícula do colaborador
  equipe_prefixo: string;       // Prefixo da equipe
  data_turno: string;           // Data do turno
  hora_inicio: string;          // Hora de início
  hora_fim?: string;            // Hora de fim
  tipo_turno: string;           // Tipo do turno
  observacoes?: string;         // Observações
  created_at: string;
  updated_at: string;
}
```

### Cabeçalho de Serviço
```typescript
interface ServicoHeader {
  id: number;
  equipe_prefixo: string;       // Prefixo da equipe
  data_servico: string;         // Data do serviço
  tipo_servico: string;         // Tipo de serviço
  descricao: string;            // Descrição do serviço
  status: 'Planejado' | 'Em Execução' | 'Finalizado';
  observacoes?: string;         // Observações
  created_at: string;
  updated_at: string;
}
```

## 🔐 Sistema de Permissões

### Hierarquia Organizacional
```
Admin
├── Coordenador
│   ├── Supervisor
│   │   ├── Encarregado
│   │   │   ├── Eletricista
│   │   │   ├── Auxiliar
│   │   │   └── Motorista
```

### Permissões por Função

| Função | Colaboradores | Equipes | Serviços | Templates |
|--------|---------------|---------|----------|-----------||
| **Admin** | CRUD Total | CRUD Total | CRUD Total | CRUD Total |
| **Coordenador** | Visualizar Todos | CRUD Total | CRUD Total | Visualizar |
| **Supervisor** | Visualizar Hierarquia | CRUD Hierarquia | CRUD Hierarquia | Visualizar |
| **Encarregado** | Visualizar Operacionais | CRUD Próprias | CRUD Próprias | Visualizar |

### Funcionalidades Especiais
- **Aprovação Cruzada**: Supervisores podem aprovar colaboradores de outros supervisores
- **Visibilidade Operacional**: Encarregados podem ver todos os operacionais para composição
- **Auditoria Automática**: Campos de aprovação e timestamps automáticos
- **Views Analíticas**: Views SQL para análise de composições e hierarquia

## 🚀 Como Executar o Projeto

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Conta Supabase** (para backend)
- **Dispositivo móvel** ou **emulador**

### Instalação

1. **Clone o repositório:**
```bash
git clone [url-do-repositorio]
cd AppOperacao
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_anonima_do_supabase
```

4. **Configure o banco de dados:**
```bash
# Execute o schema consolidado no Supabase
# Copie o conteúdo de schema.sql e execute no SQL Editor

# Execute as políticas de segurança
# Copie o conteúdo de security_policies.sql e execute no SQL Editor
```

5. **Inicie o servidor de desenvolvimento:**
```bash
npm start
```

6. **Execute no dispositivo:**
   - Use o aplicativo **Expo Go** no seu dispositivo móvel
   - Escaneie o QR code exibido no terminal
   - Ou execute `npm run android` / `npm run ios` para emuladores

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm start          # Inicia o servidor Expo
npm run android    # Executa no emulador Android
npm run ios        # Executa no simulador iOS
npm run web        # Executa no navegador web

# Build e Deploy
npm run build      # Build para produção
npm run preview    # Preview do build

# Utilitários
npm run reset-project  # Reset do cache do projeto
npm run lint       # Verificação de código
npm run type-check # Verificação de tipos TypeScript
```

## 🗄️ Configuração do Banco de Dados

### Supabase Setup

1. **Crie um projeto no Supabase**
2. **Execute os scripts SQL na seguinte ordem:**
   ```sql
   -- 1. Schema principal
   \i schema.sql
   
   -- 2. Políticas de segurança
   \i security_policies.sql
   ```

3. **Configure a autenticação:**
   - Habilite **Email/Password** no painel de autenticação
   - Configure **Row Level Security (RLS)** (já incluído nos scripts)

4. **Crie usuários de teste:**
   ```sql
   -- Consulte o arquivo schema.supabase/05_test_profiles.sql
   -- para instruções de criação de perfis de teste
   ```

### Estrutura do Banco

```sql
-- Tabelas principais
colaboradores        -- Usuários e hierarquia organizacional
equipes             -- Equipes de trabalho
composicao_equipe   -- Composição das equipes
servicos            -- Ordens de serviço
giservico           -- Itens GI associados aos serviços

-- Sistema de Grupos e Itens
grupo_itens         -- Catálogo de grupos e itens disponíveis

-- Controle de Execução
execucoes_colaborador -- Execuções de colaboradores
historico_turno     -- Histórico de turnos trabalhados
servico_header      -- Cabeçalhos de serviços

-- Sistema de Faturamento
valores_faturamento_real -- Valores reais para faturamento

-- Views de Faturamento
vw_faturamento_real        -- View principal de faturamento
vw_resumo_faturamento_real -- Resumo de faturamento por equipe

-- Funções de Autorização
is_admin()           -- Verifica se é administrador
is_coordenador()     -- Verifica se é coordenador
is_supervisor()      -- Verifica se é supervisor
is_encarregado()     -- Verifica se é encarregado
is_authenticated()   -- Verifica se está autenticado
```

### Nova Estrutura de Checklist

A aplicação agora suporta uma estrutura hierárquica de checklist baseada na imagem fornecida:

```
Template: "Acompanhamento de Serviço"
├── Grupo: "Postes"
│   ├── Item: "Poste de Concreto 9m" (UD, PC-9M-001)
│   ├── Item: "Poste de Concreto 11m" (UD, PC-11M-001)
│   └── Item: "Poste de Madeira 9m" (UD, PM-9M-001)
├── Grupo: "Isoladores"
│   ├── Item: "Isolador Tipo Pino 15kV" (UD, IP-15KV-001)
│   ├── Item: "Isolador de Suspensão" (UD, IS-001)
│   └── Item: "Isolador Polimérico" (UD, IPOL-001)
├── Grupo: "Cabos MT"
│   ├── Item: "Cabo 3x35mm² XLPE" (M, C35-XLPE-001)
│   ├── Item: "Cabo 3x70mm² XLPE" (M, C70-XLPE-001)
│   └── Item: "Cabo 3x120mm² XLPE" (M, C120-XLPE-001)
└── ... (15 grupos no total)
```

**Grupos Disponíveis:**
- Postes
- Estruturas Primárias Convencional
- Estruturas para Equipamento
- Estruturas Primárias Compacta
- Estruturas Secundárias RD Multiplexada
- Estruturas Secundárias RD Nua
- Isoladores
- Chaves
- Elos Fusíveis
- Medição Blindada
- Para-raio
- Transformador
- Cabos MT
- Cabos BT
- Atividades Diversas

### Campos de Cabeçalho do Checklist

Cada checklist "Acompanhamento de Serviço" possui um cabeçalho com informações essenciais:

**Campos Obrigatórios:**
- `data_preenchimento`: Data do preenchimento (automática)
- `equipe_prefixo`: Prefixo da equipe responsável
- `projeto`: Notas do projeto

**Campos de Localização:**
- `km_inicial`: Quilometragem inicial do serviço
- `km_final`: Quilometragem final do serviço

**Campos de Tempo:**
- `hora_inicial`: Hora de início da execução do serviço
- `hora_final`: Hora de fim do preenchimento do checklist

**Campos de Controle:**
- `tipo_servico`: Tipo de serviço executado
- `status_servico`: Status atual (Pendente, Em Andamento, Concluído, Cancelado, Pausado)
- `equipamento`: Equipamento utilizado no serviço
- `si`: Sistema de Informação
- `ptp`: Permissão de Trabalho Programado
- `ocorrencia`: Descrição de ocorrências durante o serviço

**Exemplo de Uso:**
```typescript
const checklistData = {
  checklistTemplateId: 1,
  preenchidoPor: 123,
  dataPreenchimento: '2024-01-15',
  kmInicial: 125.5,
  kmFinal: 127.8,
  equipePrefixo: 'EQ001',
  horaInicial: '08:00',
  horaFinal: '12:30',
  tipoServico: 'Manutenção Preventiva',
  statusServico: 'Em Andamento',
  equipamento: 'Caminhão Munck',
  si: 'SI-2024-001',
  ptp: 'PTP-2024-015',
  ocorrencia: 'Substituição de isoladores danificados',
  projeto: 'Modernização da rede elétrica - Setor Norte'
};
```

## 🔧 Configuração de Desenvolvimento

### Variáveis de Ambiente

```env
# .env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_anonima
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sua_chave_anonima
```

### Estrutura de Autenticação

```typescript
// hooks/useAuth.ts
const { user, colaborador, loading, isAuthenticated } = useAuth();

// Verificação de permissões
if (colaborador?.funcao === 'Admin') {
  // Acesso total
} else if (colaborador?.funcao === 'Supervisor') {
  // Acesso à hierarquia
}
```

## 📱 Funcionalidades por Tela

### 🏠 Dashboard (Equipes)
- Listagem de equipes com filtros
- Criação/edição de equipes
- Composição de equipes
- Sistema de aprovação

### 🔧 Serviços
- Acompanhamento de ordens de serviço
- Controle de status e timestamps
- Associação com equipes
- Preenchimento de checklists

### 📊 Relatórios
- Relatórios de produtividade
- Análise de performance
- Exportação de dados
- Dashboards analíticos

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature:
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```
3. **Commit** suas mudanças:
   ```bash
   git commit -m 'feat: adiciona nova funcionalidade'
   ```
4. **Push** para a branch:
   ```bash
   git push origin feature/nova-funcionalidade
   ```
5. **Abra** um Pull Request

### Padrões de Commit

```bash
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
style: formatação de código
refactor: refatoração
test: adição de testes
chore: tarefas de manutenção
```

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:
- 📧 Email: [seu-email@empresa.com]
- 📱 WhatsApp: [seu-numero]
- 🐛 Issues: [link-para-issues]

## 🔄 Implementações Recentes

### Validações de Fluxo Operacional (Janeiro 2025)

Foram implementadas validações críticas para garantir o fluxo correto das operações:

#### 1. Validação de Status da Equipe para Início de Turno
- **Localização**: `app/(tabs)/index.tsx` - função `confirmarInicioTurno`
- **Regra**: Apenas equipes com status "Aprovada" podem iniciar turno
- **Comportamento**: Exibe alerta informativo caso a equipe não esteja aprovada
- **Impacto**: Garante que apenas equipes validadas operem em campo

#### 2. Validação de Turno Confirmado para Início de Serviços
- **Localização**: `app/(tabs)/servicos.tsx` - função `updateServiceStatus`
- **Regra**: Serviços só podem ser iniciados após confirmação do turno da equipe
- **Verificação**: Consulta a tabela `historico_turno` para validar turno ativo
- **Comportamento**: Bloqueia ações de "Iniciar Deslocamento" e transições pós "Fim Deslocamento" sem turno confirmado
- **Impacto**: Assegura rastreabilidade completa das operações

#### 3. Controle Sequencial de Operações
- **Fluxo Validado**:
  1. Equipe deve estar "Aprovada"
  2. Turno deve ser confirmado pelo encarregado
  3. Apenas então serviços podem ser iniciados
- **Benefícios**:
  - Maior controle operacional
  - Rastreabilidade completa
  - Conformidade com procedimentos
  - Redução de erros operacionais

### Arquivos Modificados
- `app/(tabs)/index.tsx`: Adicionada validação de status da equipe
- `app/(tabs)/servicos.tsx`: Adicionada validação de turno confirmado
- Ambas validações integradas com sistema de alertas existente

## 📋 Próximas Implementações

### 🎯 Roadmap de Desenvolvimento

#### 1. **Adição de Serviço pelo Encarregado**
- **Descrição**: Permitir que encarregados adicionem novos serviços diretamente pelo aplicativo
- **Funcionalidades**:
  - Formulário de criação de serviço
  - Associação automática com a equipe do encarregado
  - Validação de campos obrigatórios
  - Integração com sistema de notificações
- **Prioridade**: Alta
- **Estimativa**: 2-3 dias

#### 2. **Modal de Adição de Serviço**
- **Descrição**: Interface intuitiva para criação rápida de serviços
- **Funcionalidades**:
  - Modal responsivo com campos organizados
  - Seleção de tipo de serviço
  - Campo de descrição com sugestões
  - Seleção de data e horário
  - Validação em tempo real
- **Prioridade**: Alta
- **Estimativa**: 1-2 dias

#### 3. **Exclusão de Item do Checklist Durante Preenchimento**
- **Descrição**: Permitir remoção de itens desnecessários durante o preenchimento
- **Funcionalidades**:
  - Botão de exclusão em cada item do checklist
  - Confirmação de exclusão
  - Histórico de itens removidos
  - Validação de permissões
- **Prioridade**: Média
- **Estimativa**: 1 dia

#### 4. **Melhoria da Scrollbar do Checklist**
- **Descrição**: Otimizar a experiência de navegação em checklists longos
- **Funcionalidades**:
  - Scrollbar customizada mais visível
  - Indicador de progresso do checklist
  - Navegação rápida por seções
  - Scroll suave entre itens
- **Prioridade**: Baixa
- **Estimativa**: 0.5 dia

#### 5. **Viabilização da Aplicação Web para Acompanhamento**
- **Descrição**: Criar versão web para supervisores e coordenadores acompanharem operações
- **Funcionalidades**:
  - Dashboard web responsivo
  - Visualização em tempo real dos serviços
  - Relatórios interativos
  - Mapas de localização das equipes
  - Sistema de notificações web
  - Exportação de relatórios
- **Prioridade**: Alta
- **Estimativa**: 1-2 semanas

### 🔧 Melhorias Técnicas Planejadas

- **Performance**: Otimização de consultas e cache local
- **Offline**: Melhorias no modo offline e sincronização
- **UI/UX**: Refinamentos na interface e experiência do usuário
- **Testes**: Implementação de testes automatizados
- **Documentação**: Expansão da documentação técnica

### 📊 Métricas de Sucesso

- **Redução de 90%** nos erros de fluxo operacional
- **Aumento de 50%** na produtividade das equipes
- **100% de rastreabilidade** das operações de campo
- **Tempo de resposta < 2s** para todas as operações

---

**Desenvolvido com ❤️ para otimizar a gestão de equipes em campo**