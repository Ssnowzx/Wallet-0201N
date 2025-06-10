# CC Wallet - Simulador 0201N Tangle (DAG) 🚀

## Visão Geral

CC Wallet é uma aplicação web avançada que simula o funcionamento de uma rede blockchain baseada no conceito Tangle (DAG - Directed Acyclic Graph), similar ao protocolo IOTA, mas usando tokens "0201N". Com as recentes atualizações, a aplicação agora utiliza **Firebase** para gerenciar a autenticação de usuários e persistir os dados da carteira (saldo e histórico de transações). Atualmente, a simulação da rede Tangle global, incluindo a lógica de validação e o pool de transações pendentes, e a visualização 2D ainda operam localmente no frontend, mas a migração dessas funcionalidades para o backend (Firestore) é o próximo grande passo.

O projeto continua em evolução, com melhorias visuais e funcionais contínuas.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Bundler:** Vite
- **Backend as a Service (BaaS):** Firebase (Authentication, Firestore, Cloud Functions)
- **Storage (Dados do Usuário):** Firestore
- **Storage (Simulação Global Atual):** localStorage (a ser migrado para Firestore)
- **Icons:** Lucide React
- **Visualização:** D3.js para grafos 2D
- **Animations:** CSS3 + Keyframes

## 📊 Arquitetura da Aplicação

### 1. Estrutura de Componentes Atualizada

```
src/
├── components/
│   ├── LoginForm.tsx              # Formulário de login/cadastro (agora com Firebase Auth)
│   ├── Wallet.tsx                 # Interface principal da carteira (agora com Firestore e chamadas a Cloud Function)
│   ├── TransactionGraph2D.tsx     # Visualização 2D do Tangle (usa allTransactions local - a ser migrado)
│   ├── TransactionGraph3D.tsx     # Visualização 3D (Three.js) - Não modificada
│   └── ui/                        # Componentes UI do shadcn
├── hooks/
│   ├── useRealTimeStats.ts        # Estatísticas em tempo real (ainda usa localStorage para simulação global - a ser migrado)
│   └── use-toast.ts               # Sistema de notificações - Não modificada
├── utils/
│   └── transactionPriority.ts     # Lógica de priorização (ainda usa allTransactions local - a ser migrado)
├── pages/
│   └── Index.tsx                  # Página principal com gerenciamento de auth (agora com Firebase Auth listener e criação de doc no Firestore)
└── App.tsx                        # Root component com roteamento - Não modificada

functions/
└── src/
    └── index.ts                   # Firebase Cloud Function para processar transações (backend)
```

### 2. Lógica do Tangle (DAG) e Integração com Firebase - Implementação Híbrida

#### Conceito Implementado ✅
O Tangle é um DAG onde cada nova transação deve validar duas transações anteriores. O processamento de transações **entre usuários** (dedução/adição de saldo, atualização de histórico) agora é feito de forma segura no backend (Cloud Function), enquanto a simulação global do pool de transações, incluindo a lógica de validação e gerenciamento do pool (como manter 100 pendentes e gerar 80 ao chegar a 20), e a visualização 2D ainda operam **localmente no frontend**. A migração dessa lógica e dados globais para o Firestore é o foco atual.

#### Estrutura de Dados do Usuário (Firestore)
```typescript
interface UserData { // Salvo no Firestore na coleção 'users'/{userId}
  email: string;     // Email do Firebase Auth (ou placeholder)
  balance: number;   // Saldo em tokens 0201N
  address: string;   // Endereço único da carteira (gerado no cadastro)
  transactions: Transaction[];  // Histórico de transações (array no documento do usuário)
}
```

#### Estrutura de Dados da Transação
```typescript
interface Transaction { // Usado no frontend e backend (Firestore array)
  id: string;           // Identificador único
  from: string;         // Endereço remetente
  to: string;           // Endereço destinatário
  amount: number;       // Quantidade de tokens
  timestamp: number;    // Momento da criação
  validates: string[];  // IDs das transações validadas (simulado no frontend/backend)
  validated: boolean;   // Se foi validada por outra transação (simulado no frontend/backend)
  hash: string;         // Hash simulado da transação
}
```

#### Algoritmo de Transação com Backend ✅
1. **Envio de Transação (Frontend - Wallet.tsx):**
   - Usuário insere destinatário e valor
   - Validação básica no frontend (campos preenchidos, auto-envio, saldo)
   - **Chama a Cloud Function `processTransaction` com os dados da transação (`toAddress`, `amount`)**

2. **Processamento da Transação (Cloud Function - functions/src/index.ts):**
   - **Verifica autenticação do usuário (remetente) via `context.auth`**
   - **Valida dados de entrada recebidos (`data: { toAddress, amount }`)**
   - Obtém o documento do remetente no Firestore
   - **Verifica saldo do remetente no backend**
   - **Busca o documento do destinatário no Firestore pelo endereço**
   - Cria o objeto da nova transação (gerando ID, timestamp, hash - simulação)
   - **Executa uma escrita em lote (batch) no Firestore:**
     - **Deduz saldo do remetente e adiciona a transação ao histórico dele**
     - **Adiciona valor ao destinatário e adiciona a transação ao histórico dele (SE encontrado)**
   - Retorna sucesso ou erro para o frontend.

3. **Atualização do Frontend:**
   - O listener `onSnapshot` no componente `Wallet` detecta as mudanças no documento do usuário logado (remetente) no Firestore e atualiza o saldo e histórico na interface.
   - A visualização 2D e as estatísticas globais **ainda usam a simulação local** (`allTransactions` no estado local e `localStorage`) para manter a funcionalidade independente da rede real de usuários no Firestore. **Nota:** A migração da simulação de rede global e seus dados para o Firestore é o próximo foco de desenvolvimento.

### 3. Sistema de Usuários Aprimorado (Agora com Firebase)

#### Funcionalidades Implementadas ✅
- [x] **Cadastro:** Cria usuário no Firebase Authentication e um documento inicial no Firestore com 100 tokens (via LoginForm e lógica em Index.tsx).
- [x] **Login:** Autenticação via Firebase Authentication. Se o documento do usuário não existir no Firestore, ele é criado ao logar (via Index.tsx listener).
- [x] **Logout:** Desloga via Firebase Authentication (chamado de Wallet.tsx).
- [x] **Sessão Persistente:** Gerenciada automaticamente pelo Firebase Auth (`onAuthStateChanged` em Index.tsx).
- [x] **Endereço:** Gerado automaticamente (simulado) e salvo no Firestore no documento do usuário.
- [x] **Proteção:** Prevenção de auto-envio (verificada tanto no frontend quanto no backend - Cloud Function).

### 4. Interface Mobile-First com Efeitos Visuais ✨

Design inspirado no MetaMask com melhorias visuais (mantido):
- **Cards translúcidos** com efeito glass
- **Orbs flutuantes** para decoração animada
- **Gradientes** e animações CSS avançadas
- **Tabs** para navegação entre Enviar/Histórico/Grafo 2D
- **Efeito de luz neon azul** rotativo na carteira
- **Toasts auto-dismiss** após 1 segundo

## 🎯 Funcionalidades Implementadas (Atualizado)

### ✅ Autenticação (via Firebase)
- [x] Cadastro com Nome/Email e senha
- [x] Login persistente
- [x] Logout seguro
- [x] Sessão automática

### ✅ Carteira Digital (Dados no Firestore)
- [x] Visualização de saldo (com toggle privacy)
- [x] Histórico de transações detalhado
- [x] Envio de tokens (processado por Cloud Function)
- [x] Endereço único copiável (salvo no Firestore)
- [x] Prevenção de auto-envio

### ✅ Simulação Tangle (Híbrida: Global local no momento, Processamento Backend para transações de usuário)
- [x] Validação de 2 transações por envio (lógica *local* no frontend para visualização)
- [x] Pool de transações pendentes (auto-gestão *local* via localStorage para simulação global, **mantendo ~100 pendentes e gerando ~80 ao cair para 20**)
- [x] Atualização em tempo real do saldo e histórico *do usuário logado* (via Firestore listener)
- [x] Priorização de usuários reais (lógica *local* para simulação)
- [x] Sistema de PoW simulado (local)
- [x] **Processamento de Transação Real (dedução/adição de saldo, histórico) feito por Cloud Function no backend.**

### ✅ Interface Moderna (Mantido)
- [x] Design mobile-first responsivo
- [x] Animações fluidas e suaves
- [x] Efeitos visuais sofisticados
- [x] UX intuitiva e acessível
- [x] Toast notifications inteligentes

### ✅ Visualização 2D do Tangle (Usa dados locais no momento)
- [x] Grafo interativo com D3.js
- [x] Nós clicáveis para detalhes
- [x] Arrastar e reposicionar
- [x] Setas vermelhas indicando validações (DAG)
- [x] Legenda explicativa na parte inferior

## 📈 Evolução e Melhorias Recentes (Atualizado)

### Versão 1.0 - Base
- Implementação básica do Tangle
- Login/cadastro simples (localStorage)
- Envio de transações (localStorage)

### Versão 1.1 - Priorização
- Algoritmo de priorização de transações
- Pool inteligente de transações
- Auto-reposição de transações pendentes

### Versão 1.2 - UX/UI
- Toast notifications com auto-dismiss
- Prevenção de auto-envio
- Melhorias visuais na interface

### Versão 1.3 - Visualização
- Grafo 2D dobrado em tamanho
- Efeito de luz neon azul rotativo
- Melhor legibilidade das conexões no grafo
- Documentação completa atualizada

### Versão 1.4 - Integração Firebase ✨ (ATUAL)
- **Login/Cadastro/Logout via Firebase Authentication**
- **Persistência de Saldo e Histórico de Transações no Firestore Database**
- **Processamento Seguro de Transações via Firebase Cloud Function**
- Criação automática do documento do usuário no Firestore ao logar/cadastrar
- Tratamento de erros de permissão na transação no backend (Cloud Function).
- Refatoração na leitura de localStorage para segurança.
- **Chamada à Cloud Function processTransaction no frontend (Wallet.tsx).**

## 🚧 Dificuldades Encontradas e Soluções (Atualizado)

### 1. **Performance do Grafo 2D**
- **Problema:** Muitos nós causavam lag na renderização
- **Solução:** Otimização do D3.js com forças balanceadas
- **Resultado:** Renderização suave até 100+ transações

### 2. **Gestão do Estado de Transações Globais (Simulação Local)**
- **Problema:** Sincronização da simulação global e persistência do usuário.
- **Solução:** Separação: dados do usuário no Firestore (real-time via onSnapshot), simulação global no localStorage (local only) com leitura segura. **Próximo passo é migrar para Firestore.**
- **Resultado:** Dados do usuário persistidos online, simulação global funcional localmente, preparando para migração.

### 3. **Auto-reposição de Transações Pendentes (Simulação Local)**
- **Problema:** Pool de transações se esgotava rapidamente na simulação local.
- **Solução:** Sistema inteligente no frontend que monitora e repõe automaticamente (ex: mantendo ~100, gerando ~80 ao cair para 20).
- **Resultado:** Rede simulada localmente sempre ativa com transações pendentes. **Esta lógica será migrada para o backend.**

### 4. **Segurança e Permissões de Transação (Dados de Usuário)**
- **Problema:** Regras de segurança do Firestore impediam atualização de múltiplos usuários pelo cliente para transações de saldo.
- **Solução:** **Implementação de Firebase Cloud Function para processar transações no backend**, garantindo permissões adequadas e lógica de negócio segura. Frontend chama a Cloud Function.
- **Resultado:** Transações entre usuários agora atualizam saldos e históricos corretamente no Firestore, processadas no backend.

### 5. **Erros de Sintaxe/Tipagem/Configuração**
- **Problema:** Erros durante a compilação/deploy das Cloud Functions e no frontend (sintaxe, tipagem, configuração do ESLint, configuração do Firebase).
- **Solução:** Correção de sintaxe (backslashes), ajuste de tipagens TypeScript na Cloud Function, correção do script de linting no package.json das funções, e verificação das configurações iniciais do Firebase.
- **Resultado:** Projeto agora compila e implanta corretamente, e o app frontend roda sem erros de sintaxe ou tipagem nos arquivos modificados.

## 🔮 Próximos Passos Sugeridos (Refinado)

### Curto Prazo (1-2 semanas)
- [ ] **Refatoração de código Frontend:** Quebrar `Wallet.tsx` em componentes menores e mais gerenciáveis (`WalletHeader`, `BalanceCard`, `SendTransactionForm`, `TransactionHistory`, `StatsCard`).
- [ ] Implementar testes unitários para funções críticas (frontend e backend - Cloud Function).
- [ ] Otimizar re-renderizações com React.memo.
- [ ] Melhorar a gestão de erros na chamada da Cloud Function no frontend.

### Médio Prazo (1-2 meses)
- [ ] **Migrar Simulação Global do Tangle para Firestore:** Mover o pool global de transações (`allTransactions`) para uma nova coleção global no Firestore.
- [ ] **Adaptar Lógica Tangle para o Backend:** Mover a lógica de validação de 2 transações e o gerenciamento do pool de pendentes (incluindo a regra de manter 100/gerar 80) para a Cloud Function ou outra função backend para operar com os dados globais do Firestore.
- [ ] **Salvar Dados do Grafo 2D no Firestore:** Persistir as informações necessárias para renderizar o grafo 2D (nós e links derivados das transações globais) no Firestore para que a visualização seja global e persistente.
- [ ] **Indexar Endereços no Firestore:** Criar um índice para a propriedade `address` na coleção `users` para otimizar a busca por destinatário na Cloud Function.
- [ ] Implementar Dark mode completo.
- [ ] Suporte a múltiplos idiomas.

### Longo Prazo (3-6 meses)
- [ ] **WebSocket:** Implementar comunicação em tempo real (talvez via Cloud Functions ou outro serviço) para que as carteiras recebam atualizações instantâneas de transações globais.
- [ ] **Visualização 3D Interativa:** Desenvolver ou integrar uma visualização 3D do Tangle usando os dados do Firestore.
- [ ] **Criptografia Real:** (Opcional, se o objetivo for simulação mais aprofundada) Implementar SHA-256 para hashes e assinaturas digitais.
- [ ] Desenvolver Mobile app (React Native) ou PWA.
- [ ] Implementar sistema de backup/restore de carteiras.

## 🎨 Melhorias Visuais Implementadas (Mantido)

### Efeito de Luz Neon Azul ✨
```css
.wallet-container::before {
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(59, 130, 246, 0.4) 90deg,
    rgba(147, 197, 253, 0.6) 180deg,
    rgba(59, 130, 246, 0.4) 270deg,
    transparent 360deg
  );
  animation: rotate-glow 3s linear infinite;
}
```

### Grafo 2D Expandido
- **Dimensões:** 800x600px (dobrado do original)
- **Viewbox:** Ajustado para melhor visualização
- **Forças:** Rebalanceadas para espaçamento otimizado
- **Interatividade:** Mantida com melhor responsividade

## 🔧 Como Executar (Atualizado)

```bash
# Instalar dependências do frontend
npm install

# Navegar para a pasta das funções
cd functions

# Instalar dependências das funções (se não fez durante o init)
npm install

# Voltar para a raiz do projeto
cd ..

# Implantar as Cloud Functions no Firebase
firebase deploy --only functions

# Executar o frontend em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📱 Funcionalidades Principais Detalhadas (Atualizado)

### 🔐 Sistema de Autenticação (Firebase)
- Cadastro instantâneo com Nome/Email e senha (cria usuário Auth e documento no Firestore)
- Login com sessão gerenciada pelo Firebase Auth
- Logout com limpeza de sessão Firebase
- Segurança básica (Firebase Auth + Regras Firestore)

### 💰 Gestão de Carteira (Firestore)
- Saldo inicial: 100 tokens 0201N (salvo no Firestore)
- Visualização com toggle de privacidade
- Endereço único gerado automaticamente (salvo no Firestore)
- Histórico completo de transações (array no documento Firestore)

### 🕸️ Simulação Tangle (Híbrida: Global local no momento, Processamento Backend para transações de usuário)
- Cada transação desencadeia lógica de validação simulada (frontend para visualização)
- Pool de transações pendentes (auto-gestão local via localStorage, **mantendo ~100 pendentes e gerando ~80 ao cair para 20**)
- Atualização em tempo real do saldo e histórico *do usuário logado* (via Firestore listener)
- Priorização de usuários reais (lógica local para simulação)
- PoW simulado com feedback visual (local)
- **Processamento de Transação Real (dedução/adição de saldo, histórico) feito por Cloud Function no backend.**

### 📊 Estatísticas em Tempo Real (Parcialmente Local)
- Total de transações na rede (ainda baseado no localStorage simulado)
- Transações validadas vs pendentes (ainda baseado no localStorage simulado)
- Número de usuários ativos (ainda baseado no localStorage simulado ou estimativa)
- Atualização automática a cada segundo (baseado em listeners locais)

### 🎮 Visualização Interativa 2D (Usa dados locais no momento)
- Grafo expandido (800x600px) para melhor visibilidade
- Nós clicáveis com detalhes completos
- Arrastar e soltar para reposicionamento
- Setas vermelhas indicando validações (DAG)
- Legenda explicativa na parte inferior

## 📋 Limitações Conhecidas (Atualizado)

### Técnicas
- **Armazenamento Global Tangle:** Simulação global ainda usa localStorage (não persistente entre usuários/sessões). **Será migrado para Firestore.**
- **Rede:** Simulação de rede global ainda local (sem comunicação real entre usuários). **A migração para Firestore permitirá isso.**
- **Criptografia:** Hash simulado (não criptograficamente seguro).
- **Escalabilidade da Busca por Endereço:** Buscar destinatário por endereço na Cloud Function pode ser ineficiente para muitos usuários sem um índice. **Índice no Firestore é o plano.**
- **Simulação Tangle no Backend:** A lógica de validação e priorização do Tangle (incluindo a regra do pool de pendentes) ainda está no frontend; idealmente seria movida para o backend para consistência global. **Esta é a próxima prioridade.**
- **Dados do Grafo 2D:** Os dados para a visualização 2D são gerados localmente. **Serão salvos no Firestore.**
- ⚠️  Wallet.tsx ainda grande (~500 linhas) - Refatoração planejada.

### Funcionais
- **Transações para Endereços Não Registrados:** A Cloud Function atualmente exige que o destinatário seja um usuário registrado.
- **Backup/Recuperação:** Sem funcionalidade integrada (apenas dados no Firestore).

## 🎯 Sugestões de Melhorias Futuras (Refinado)

### Curto Prazo (1-2 semanas)
- [ ] **Refatoração de código Frontend:** Quebrar `Wallet.tsx` em componentes menores e mais gerenciáveis (`WalletHeader`, `BalanceCard`, `SendTransactionForm`, `TransactionHistory`, `StatsCard`).
- [ ] Implementar testes unitários para funções críticas (frontend e backend - Cloud Function).
- [ ] Otimizar re-renderizações com React.memo.
- [ ] Melhorar a gestão de erros na chamada da Cloud Function no frontend.

### Médio Prazo (1-2 meses)
- [ ] **Migrar Simulação Global do Tangle para Firestore:** Mover o pool global de transações (`allTransactions`) para uma nova coleção global no Firestore.
- [ ] **Adaptar Lógica Tangle para o Backend:** Mover a lógica de validação de 2 transações e o gerenciamento do pool de pendentes (incluindo a regra de manter 100/gerar 80) para a Cloud Function ou outra função backend para operar com os dados globais do Firestore, garantindo consistência global.
- [ ] **Salvar Dados do Grafo 2D no Firestore:** Persistir as informações necessárias para renderizar o grafo 2D (nós e links derivados das transações globais) no Firestore para que a visualização seja global, persistente e sincronizada entre usuários.
- [ ] **Indexar Endereços no Firestore:** Criar um índice para a propriedade `address` na coleção `users` para otimizar a busca por destinatário na Cloud Function.
- [ ] Implementar Dark mode completo.
- [ ] Suporte a múltiplos idiomas.

### Longo Prazo (3-6 meses)
- [ ] **WebSocket:** Implementar comunicação em tempo real (talvez via Cloud Functions ou outro serviço) para que as carteiras recebam atualizações instantâneas de transações globais do Tangle.
- [ ] **Visualização 3D Interativa:** Desenvolver ou integrar uma visualização 3D do Tangle usando os dados do Firestore.
- [ ] **Criptografia Real:** (Opcional, se o objetivo for simulação mais aprofundada) Implementar SHA-256 para hashes e assinaturas digitais.
- [ ] Desenvolver Mobile app (React Native) ou PWA.
- [ ] Implementar sistema de backup/restore de carteiras.

## 🏆 Conclusão (Atualizado)

O CC Wallet deu um passo significativo com a **integração do Firebase**, movendo a autenticação e os dados essenciais da carteira (saldo, histórico pessoal) para uma plataforma persistente e escalável. O processamento de transações entre usuários agora é tratado de forma segura no backend via Cloud Function, resolvendo as limitações de segurança do cliente.

Embora a simulação global da rede Tangle, incluindo a lógica de validação DAG e o gerenciamento do pool de pendentes, ainda opere localmente no frontend, a **próxima grande fase** é migrar essa lógica e os dados necessários para a visualização global do Tangle para o backend (Firestore e Cloud Functions), buscando uma simulação de rede mais consistente e persistente.

O projeto continua sendo uma ferramenta valiosa para educação, demonstrando conceitos de blockchain DAG, desenvolvimento web moderno com React e integração com serviços backend (BaaS) como o Firebase.

**Desenvolvido com 💙 e tecnologias modernas para demonstrar o futuro das redes blockchain.**

---

*Última atualização: Junho 2025 - Versão 1.4 com Integração Firebase (Auth, Firestore, Functions) e Próximos Passos Definidos para Migração Global do Tangle*
