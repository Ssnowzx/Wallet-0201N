
# CC Wallet - Simulador 0201N Tangle (DAG)

## Visão Geral

CC Wallet é uma aplicação web que simula o funcionamento de uma rede blockchain baseada no conceito Tangle (DAG - Directed Acyclic Graph), similar ao protocolo IOTA, mas usando tokens "0201N".

## Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Bundler:** Vite
- **Storage:** localStorage (simulação local)
- **Icons:** Lucide React

## Arquitetura da Aplicação

### 1. Estrutura de Componentes

```
src/
├── components/
│   ├── LoginForm.tsx    # Formulário de login/cadastro
│   ├── Wallet.tsx       # Interface principal da carteira
│   └── ui/              # Componentes UI do shadcn
├── pages/
│   └── Index.tsx        # Página principal que gerencia estado de auth
└── App.tsx              # Root component com roteamento
```

### 2. Lógica do Tangle (DAG)

#### Conceito Implementado
O Tangle é um DAG onde cada nova transação deve validar duas transações anteriores, criando uma rede descentralizada sem mineradores.

#### Estrutura de Dados
```typescript
interface Transaction {
  id: string;           // Identificador único
  from: string;         // Endereço remetente
  to: string;           // Endereço destinatário
  amount: number;       // Quantidade de tokens
  timestamp: number;    // Momento da criação
  validates: string[];  // IDs das transações validadas (sempre 2)
  validated: boolean;   // Se foi validada por outra transação
  hash: string;         // Hash simulado da transação
}
```

#### Algoritmo de Validação
1. **Criação de Transação:**
   - Usuário insere destinatário e valor
   - Sistema executa "Proof of Work" simulado (delay de 1s)
   - Seleciona 2 transações não validadas aleatoriamente
   - Cria nova transação validando as 2 selecionadas
   - Marca as 2 transações como validadas

2. **Priorização (Nova Funcionalidade):**
   - Prioriza transações de usuários reais cadastrados
   - Fallback para transações pendentes simuladas
   - Mantém pool de 100+ transações pendentes

### 3. Sistema de Usuários

#### Estrutura de Dados do Usuário
```typescript
interface User {
  password: string;     // Senha (armazenada localmente)
  balance: number;      // Saldo em tokens 0201N
  address: string;      // Endereço único da carteira
  transactions: any[];  // Histórico de transações
}
```

#### Funcionalidades
- **Cadastro:** Cria usuário com 100 tokens iniciais
- **Login:** Validação de credenciais
- **Endereço:** Gerado automaticamente (simulado)

### 4. Interface Mobile-First

Design inspirado no MetaMask com layout responsivo:
- **Cards translúcidos** com efeito glass
- **Orbs flutuantes** para decoração
- **Gradientes** e animações CSS
- **Tabs** para navegação entre Enviar/Histórico

## Fluxo de Funcionamento

### 1. Inicialização
```
Usuário acessa → LoginForm → Cadastro/Login → Wallet Dashboard
```

### 2. Envio de Transação
```
Input dados → Validação saldo → PoW simulado → 
Seleciona 2 tx para validar → Cria nova tx → 
Atualiza saldos → Persiste no localStorage
```

### 3. Estatísticas em Tempo Real
- **Polling:** Atualização automática a cada segundo
- **Métricas:** Total de transações, validadas, pendentes, usuários
- **Auto-reposição:** Gera mais transações quando pool fica baixo

## Características Técnicas

### Simulação do Tangle
- **DAG Structure:** Cada transação aponta para 2 anteriores
- **No Miners:** Validação distribuída entre usuários
- **Feeless:** Sem taxas de transação
- **Scalable:** Performance melhora com mais transações

### Limitações da Simulação
- **Local Storage:** Dados apenas no navegador
- **Simplified PoW:** Delay simulado, não cálculo real
- **No Network:** Não há comunicação entre usuários
- **Deterministic:** Algoritmos simplificados

## Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Funcionalidades Principais

### 🔐 Autenticação
- Cadastro com senha
- Login persistente
- Logout seguro

### 💰 Carteira Digital
- Visualização de saldo
- Histórico de transações
- Envio de tokens
- Endereço único

### 🕸️ Simulação Tangle
- Validação de 2 transações por envio
- Pool de transações pendentes
- Atualização em tempo real
- Priorização de usuários reais

### 📱 Interface Moderna
- Design mobile-first
- Animações fluidas
- Efeitos visuais
- UX intuitiva

## Próximas Melhorias

- [ ] Integração com backend real
- [ ] Visualização gráfica do DAG
- [ ] Criptografia de senhas
- [ ] Export/Import de carteiras
- [ ] Múltiplas moedas
- [ ] Notificações push

## Contribuição

Este é um projeto educacional para demonstrar conceitos de blockchain e DAG. Contribuições são bem-vindas!
