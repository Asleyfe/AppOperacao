# 🧾 Sistema de Faturamento Implementado

## 📋 Visão Geral

Foi implementada uma **solução simplificada de faturamento** que utiliza VIEWs para detectar automaticamente substituições de transformadores e aplicar os valores corretos, eliminando a necessidade de modificar a estrutura existente da tabela `giservico`.

## 🗂️ Arquivos Criados

### 1. **Migração Principal**
- **Arquivo**: `migrations/45_faturamento_simples_com_views.sql`
- **Conteúdo**: Criação de tabelas e VIEWs do sistema de faturamento

### 2. **API TypeScript**
- **Arquivo**: `services/faturamento-simples.ts`
- **Conteúdo**: Funções para interagir com as VIEWs de faturamento

### 3. **Exemplos de Uso**
- **Arquivo**: `examples/faturamento-views.example.sql`
- **Conteúdo**: Consultas SQL de exemplo para usar o sistema

### 4. **Documentação**
- **Arquivo**: `FATURAMENTO_IMPLEMENTADO.md` (este arquivo)
- **Conteúdo**: Documentação completa da solução

## 🏗️ Estrutura do Sistema

### Tabela Principal: `valores_faturamento_simples`

```sql
CREATE TABLE valores_faturamento_simples (
    id SERIAL PRIMARY KEY,
    grupo text NOT NULL,
    item text NOT NULL DEFAULT 'todos',
    status text NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    valor_normal numeric(10,2) NOT NULL,
    valor_substituicao numeric(10,2), -- NULL para itens sem substituição
    unidade text DEFAULT 'UD',
    ativo boolean DEFAULT true,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### VIEWs Inteligentes

#### 1. `vw_faturamento_automatico`
- **Função**: Detecta automaticamente substituições e aplica valores corretos
- **Lógica**: Se existe instalação E retirada de transformador no mesmo serviço = substituição
- **Resultado**: Cada item com seu valor correto (normal ou substituição)

#### 2. `vw_resumo_faturamento_servico`
- **Função**: Resumo financeiro por serviço
- **Dados**: Total de itens, valores, indicadores de substituição

#### 3. `vw_resumo_faturamento_grupo`
- **Função**: Resumo financeiro por tipo de equipamento
- **Dados**: Totais agrupados por grupo (TRANSFORMADOR, CABOS BT, etc.)

## 💡 Como Funciona

### Detecção Automática de Substituição

```sql
-- A VIEW detecta substituição quando:
-- 1. Grupo = 'TRANSFORMADOR'
-- 2. Existe item 'Instalado' no serviço
-- 3. Existe item 'Retirado' no serviço
-- = Aplicar valor_substituicao
```

### Aplicação de Valores

| Cenário | Valor Aplicado |
|---------|----------------|
| **Transformador - Operação Normal** | `valor_normal` |
| **Transformador - Substituição** | `valor_substituicao` |
| **Outros Equipamentos** | `valor_normal` (sempre) |

## 📊 Dados Iniciais Incluídos

```sql
-- Elos fusíveis (sem substituição)
('Elos fusíveis', 'todos', 'Instalado', 65.49, NULL)
('Elos fusíveis', 'todos', 'Retirado', 55.06, NULL)

-- Transformadores (com valores diferenciados)
('TRANSFORMADOR', 'todos', 'Instalado', 850.00, 450.00)
('TRANSFORMADOR', 'todos', 'Retirado', 650.00, 350.00)

-- Cabos BT, Postes, Chaves (sem substituição)
-- ... outros grupos
```

## 🔧 Como Usar no Aplicativo

### 1. Importar o Serviço

```typescript
import FaturamentoService from '../services/faturamento-simples';
```

### 2. Buscar Faturamento de um Serviço

```typescript
// Faturamento detalhado
const itens = await FaturamentoService.buscarFaturamentoServico(123);

// Resumo do serviço
const resumo = await FaturamentoService.buscarResumoFaturamentoServico(123);
```

### 3. Exibir Dados Formatados

```typescript
// Formatar valor monetário
const valorFormatado = FaturamentoService.formatarValor(1250.50);
// Resultado: "R$ 1.250,50"

// Calcular total
const total = FaturamentoService.calcularTotalFaturamento(itens);
```

## 📱 Exemplo de Tela de Faturamento

```typescript
// Componente React Native
const TelaFaturamento = ({ servicoId }) => {
  const [resumo, setResumo] = useState(null);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    carregarDados();
  }, [servicoId]);

  const carregarDados = async () => {
    try {
      const [resumoData, itensData] = await Promise.all([
        FaturamentoService.buscarResumoFaturamentoServico(servicoId),
        FaturamentoService.buscarFaturamentoServico(servicoId)
      ]);
      
      setResumo(resumoData);
      setItens(itensData);
    } catch (error) {
      console.error('Erro ao carregar faturamento:', error);
    }
  };

  return (
    <View>
      {resumo && (
        <Card>
          <Text>Serviço: {resumo.id_servico}</Text>
          <Text>Equipe: {resumo.equipe_prefixo}</Text>
          <Text>Total: {FaturamentoService.formatarValor(resumo.valor_total_servico)}</Text>
          <Text>Itens: {resumo.total_itens}</Text>
          {resumo.tem_substituicao_trafo && (
            <Badge>Com Substituição de Trafo</Badge>
          )}
        </Card>
      )}
      
      <FlatList
        data={itens}
        renderItem={({ item }) => (
          <ListItem>
            <Text>{item.grupo} - {item.item}</Text>
            <Text>{item.status}</Text>
            <Text>Qtd: {item.quantidade}</Text>
            <Text>{FaturamentoService.formatarValor(item.valor_total)}</Text>
            {item.eh_substituicao && <Badge>Substituição</Badge>}
          </ListItem>
        )}
      />
    </View>
  );
};
```

## 🔍 Consultas Úteis

### Faturamento de uma Equipe no Mês

```sql
SELECT 
    equipe_prefixo,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total_mes
FROM vw_resumo_faturamento_servico 
WHERE data_planejada >= DATE_TRUNC('month', CURRENT_DATE)
  AND equipe_prefixo = 'EQ001'
GROUP BY equipe_prefixo;
```

### Serviços com Substituição

```sql
SELECT 
    id_servico,
    descricao_servico,
    valor_total_servico
FROM vw_resumo_faturamento_servico 
WHERE tem_substituicao_trafo = true;
```

## ⚙️ Configuração e Manutenção

### Adicionar Novo Grupo de Equipamentos

```sql
INSERT INTO valores_faturamento_simples (grupo, item, status, valor_normal, observacoes) VALUES
('NOVO_GRUPO', 'todos', 'Instalado', 200.00, 'Valor para novo tipo de equipamento'),
('NOVO_GRUPO', 'todos', 'Retirado', 150.00, 'Valor para retirada do novo equipamento');
```

### Atualizar Valores Existentes

```sql
UPDATE valores_faturamento_simples 
SET valor_normal = 900.00, 
    valor_substituicao = 500.00
WHERE grupo = 'TRANSFORMADOR' 
  AND status = 'Instalado';
```

## ✅ Vantagens da Solução

1. **🚀 Simplicidade**: Não requer mudanças na tabela `giservico`
2. **🤖 Automática**: Detecta substituições automaticamente
3. **🔧 Flexível**: Fácil de adicionar novos grupos e valores
4. **📊 Completa**: VIEWs prontas para relatórios
5. **⚡ Performance**: Índices otimizados para consultas rápidas
6. **🔄 Retroativa**: Funciona com dados existentes

## 🚀 Próximos Passos

1. **Executar a migração** no banco de dados
2. **Testar as VIEWs** com dados reais
3. **Implementar a tela** de faturamento no app
4. **Adicionar valores** para outros grupos conforme necessário
5. **Criar relatórios** usando as VIEWs disponíveis

## 📞 Suporte

Para dúvidas ou ajustes:
- Consulte os exemplos em `examples/faturamento-views.example.sql`
- Use as funções em `services/faturamento-simples.ts`
- Verifique a documentação das VIEWs na migração

---

**Sistema implementado com sucesso! 🎉**

A solução está pronta para uso e pode ser facilmente expandida conforme necessário.