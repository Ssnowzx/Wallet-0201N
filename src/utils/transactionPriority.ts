
interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  validates: string[];
  validated: boolean;
  hash: string;
}

export const validateTwoTransactionsWithPriority = (allTransactions: Transaction[]): string[] => {
  const unvalidatedTxs = allTransactions.filter(tx => !tx.validated);
  
  if (unvalidatedTxs.length === 0) {
    return [];
  }

  const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
  const userAddresses = Object.values(users).map((user: any) => user.address);

  // Prioriza transações de usuários reais
  const realUserTransactions = unvalidatedTxs.filter(tx => 
    userAddresses.includes(tx.from)
  );

  const selected: string[] = [];
  
  // Se há pelo menos 2 transações de usuários reais, prioriza elas
  if (realUserTransactions.length >= 2) {
    const availableReal = [...realUserTransactions];
    for (let i = 0; i < 2; i++) {
      const randomIndex = Math.floor(Math.random() * availableReal.length);
      const selectedTx = availableReal[randomIndex];
      selected.push(selectedTx.id);
      availableReal.splice(randomIndex, 1);
    }
  } else {
    // Se há apenas 1 transação de usuário real, seleciona ela + uma qualquer
    if (realUserTransactions.length === 1) {
      selected.push(realUserTransactions[0].id);
      
      // Seleciona uma transação que não seja de usuário real
      const otherTransactions = unvalidatedTxs.filter(tx => 
        !userAddresses.includes(tx.from) && tx.id !== realUserTransactions[0].id
      );
      
      if (otherTransactions.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherTransactions.length);
        selected.push(otherTransactions[randomIndex].id);
      }
    } else {
      // Se não há transações de usuários reais, seleciona 2 quaisquer
      const availableTransactions = [...unvalidatedTxs];
      for (let i = 0; i < Math.min(2, availableTransactions.length); i++) {
        const randomIndex = Math.floor(Math.random() * availableTransactions.length);
        const selectedTx = availableTransactions[randomIndex];
        selected.push(selectedTx.id);
        availableTransactions.splice(randomIndex, 1);
      }
    }
  }

  console.log(`Transações validadas: ${selected.length} (${realUserTransactions.length} de usuários reais disponíveis)`);
  
  return selected;
};
