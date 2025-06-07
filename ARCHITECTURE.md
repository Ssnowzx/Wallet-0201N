
# Arquitetura CC Wallet - Diagrama e Explicações

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CC WALLET FRONTEND                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐  │
│  │ LoginForm   │    │   Wallet    │    │        useRealTimeStats        │  │
│  │             │    │             │    │                                 │  │
│  │ - Cadastro  │◄───┤ - Saldo     │◄───┤ - Polling 1s                   │  │
│  │ - Login     │    │ - Enviar    │    │ - localStorage listener         │  │
│  │ - Validação │    │ - Histórico │    │ - Auto update stats             │  │
│  └─────────────┘    │ - Stats     │    └─────────────────────────────────┘  │
│                     └─────────────┘                                        │
│                            │                                               │
│                            ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                TRANSACTION PRIORITY LOGIC                          │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │ Real User TXs   │    │ Pending Pool    │    │ Validation      │  │   │
│  │  │                 │    │                 │    │                 │  │   │
│  │  │ Priority: HIGH  │────┤ Priority: LOW   │────┤ Always picks 2  │  │   │
│  │  │ From: users DB  │    │ From: simulated │    │ Available TXs   │  │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                            LOCAL STORAGE LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐              ┌─────────────────────────────────────┐   │
│  │   iotaUsers     │              │         iotaTransactions            │   │
│  │                 │              │                                     │   │
│  │ username: {     │              │ [                                   │   │
│  │   password,     │              │   {                                 │   │
│  │   balance,      │              │     id, from, to, amount,           │   │
│  │   address,      │              │     timestamp, validates[],         │   │
│  │   transactions  │              │     validated: boolean,             │   │
│  │ }               │              │     hash                            │   │
│  └─────────────────┘              │   }                                 │   │
│                                   │ ]                                   │   │
│                                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados - Tangle (DAG) Simulation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TANGLE DAG WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER CREATES TRANSACTION
   │
   ▼
┌─────────────────────────────┐
│  Input: to, amount          │
│  Validate: balance >= amount│
└─────────────┬───────────────┘
              │
              ▼
2. PROOF OF WORK SIMULATION
┌─────────────────────────────┐
│  setTimeout(1000ms)         │
│  Simulate mining/consensus  │
└─────────────┬───────────────┘
              │
              ▼
3. TRANSACTION VALIDATION PRIORITY
┌─────────────────────────────┐
│  Get unvalidated TXs        │
│  Filter real user TXs       │
│  Priority: real > simulated │
│  Select 2 TXs to validate   │
└─────────────┬───────────────┘
              │
              ▼
4. CREATE NEW TRANSACTION
┌─────────────────────────────┐
│  newTX = {                  │
│    id: generated,           │
│    from: user.address,      │
│    to: input.address,       │
│    amount: input.amount,    │
│    validates: [tx1, tx2],   │
│    validated: false,        │
│    hash: generated          │
│  }                          │
└─────────────┬───────────────┘
              │
              ▼
5. UPDATE NETWORK STATE
┌─────────────────────────────┐
│  Mark validated TXs = true  │
│  Add new TX to pool         │
│  Update user balances       │
│  Persist to localStorage    │
└─────────────┬───────────────┘
              │
              ▼
6. REAL-TIME STATS UPDATE
┌─────────────────────────────┐
│  Hook detects change        │
│  Recalculate stats          │
│  Update UI components       │
│  Trigger re-render          │
└─────────────────────────────┘
```

## Conceitos do Tangle Implementados

### 1. **DAG (Directed Acyclic Graph)**
- Cada transação aponta para exatamente 2 transações anteriores
- Não há ciclos (acyclic)
- Estrutura: TX_new → [TX_a, TX_b]

### 2. **Distributed Validation**
- Não há mineradores centralizados
- Cada usuário valida 2 transações ao enviar 1
- Consensus emergente da validação distribuída

### 3. **No Fees**
- Custo = Computational work (PoW simulado)
- Não há taxas monetárias
- Escalabilidade: +usuários = +velocidade

### 4. **Real User Priority**
- Algoritmo prioriza transações de usuários cadastrados
- Fallback para pool de transações simuladas
- Melhora realismo da rede

## Tecnologias e Padrões

### **React Hooks Utilizados**
```typescript
// Estado local
useState<T>()           // Component state
useEffect()             // Side effects, subscriptions

// Custom hooks
useRealTimeStats()      // Polling + localStorage listener
```

### **Padrões de Design**
- **Observer Pattern**: localStorage events
- **Strategy Pattern**: Transaction priority
- **Factory Pattern**: Transaction generation
- **Singleton Pattern**: LocalStorage as data layer

### **Performance Optimizations**
- Polling interval: 1000ms (não sobrecarrega)
- Event listeners para mudanças instantâneas
- Memoização implícita do React
- Cleanup em useEffect

## Limitações e Melhorias Futuras

### **Limitações Atuais**
- ❌ Dados apenas locais (localStorage)
- ❌ PoW simulado (não criptográfico)
- ❌ Sem comunicação entre usuários
- ❌ Validação de endereços simplificada

### **Roadmap Técnico**
- ✅ Implementar WebSocket para rede real
- ✅ Adicionar criptografia SHA-256
- ✅ Visualização gráfica do DAG
- ✅ Integração com blockchain real
- ✅ Mobile app nativo
