## Progresso da Migração da Lógica Tangle para o Backend

**Última Atualização:** [Data Atual]

**Resumo do Processo:**

Este documento rastreia as etapas de migração da lógica de simulação global do Tangle (validação, gerenciamento do pool de pendentes, dados do grafo) do frontend (localStorage) para o backend (Firestore e Cloud Functions).

---

### Etapas Concluídas:

1.  **Migração Inicial do Processamento de Transações Reais e Sincronização Frontend-Firestore (Base):**
    *   A Cloud Function `processTransaction` (`functions/src/index.js`) foi modificada para processar transações reais de usuário no backend.
    *   Esta função busca 2 transações recentes na coleção `globalTransactions` do Firestore para validar.
    *   Cria a nova transação na coleção `globalTransactions` com o campo `validates` preenchido e atualiza o campo `validatedBy` das transações validadas.
    *   A transação completa é salva no histórico (`transactions` array) dos documentos de usuário (remetente e destinatário) no Firestore.
    *   O hook `useRealTimeStats` (`src/hooks/useRealTimeStats.ts`) foi atualizado para ler todas as transações da coleção `globalTransactions` em tempo real via `onSnapshot`.
    *   O cálculo das estatísticas de 'Validadas' e 'Pendentes' no `useRealTimeStats` foi ajustado para usar o campo `validatedBy.length` (`validatedBy.length >= 2` indica validada).
    *   O componente `Wallet.tsx` foi limpo, removendo a simulação local (`localStorage`, `allTransactions` estaduais e funções relacionadas) e adaptado para usar os dados e estatísticas fornecidos pelo `useRealTimeStats` (do Firestore).

2.  **Implementação Inicial da Simulação Contínua de Validação no Backend:**
    *   A Cloud Function `managePendingTransactionsPool` (`functions/src/index.js`) foi modificada.
    *   Agora, ela lê o estado global do Tangle no Firestore (contagem de pendentes via `validatedBy.length`).
    *   Implementa a regra de manter o pool de pendentes: cria novas transações dummy se a contagem de pendentes for baixa (`< TARGET_PENDING`).
    *   Simula validações: faz com que as novas transações dummy 'validem' transações pendentes existentes (as mais antigas com `< 2` validadores).
    *   Atualiza o campo `validatedBy` das transações validadas pelas dummies usando batch writes.

3.  **Adaptação do Componente de Grafo 2D para Dados do Firestore:**
    *   O componente `TransactionGraph2D.tsx` foi modificado para receber a lista `globalTransactions` (com `validates` e `validatedBy`) diretamente do hook `useRealTimeStats`.
    *   A lógica interna do grafo foi ajustada para criar nós e links com base nos dados do Firestore.
    *   A cor dos nós agora reflete o status 'Validada'/'Pendente' com base no campo `isConfirmedForStats` (derivado de `validatedBy.length >= 2`).
    *   O tooltip de detalhes do nó foi atualizado para exibir informações baseadas nos dados do Firestore, incluindo contagens de `validates.length` e `validatedBy.length`.

---

### Estado Atual:

*   As transações de usuário são processadas e registradas globalmente no Firestore, com validação DAG inicial.
*   Uma função de backend (`managePendingTransactionsPool`) existe para simular a validação contínua e manter o pool de pendentes, operando sobre os dados globais no Firestore.
*   O frontend lê as transações globais e estatísticas diretamente do Firestore em tempo real, refletindo o campo `validatedBy` para o status validado/pendente.
*   O componente do grafo 2D agora recebe e tenta renderizar o grafo com base nos dados globais do Firestore, usando `validates` para as conexões e `isConfirmedForStats` (baseado em `validatedBy`) para as cores.
*   **A função `managePendingTransactionsPool` no backend precisa ser testada para confirmar se a simulação de validação está funcionando e atualizando os dados corretamente no Firestore, o que, por sua vez, deve fazer as estatísticas e o grafo no frontend se atualizarem dinamicamente.**

---

### Próximos Passos Planejados:

1.  **Testar a Cloud Function `managePendingTransactionsPool`:** Acionar a função manualmente e verificar logs e Firestore para confirmar que dummies são criados e `validatedBy` é atualizado, e observar se as estatísticas e o grafo no frontend se atualizam dinamicamente.
2.  **Configurar o Gatilho para `managePendingTransactionsPool`:** Implementar um mecanismo para acionar a função `managePendingTransactionsPool` periodicamente (ex: Firebase Scheduled Functions) para manter a simulação do Tangle viva automaticamente.
3.  Refinar a lógica de Tip Selection Algorithm (TSA) e gerenciamento do pool em `managePendingTransactionsPool` para uma simulação mais robusta, se necessário.

---