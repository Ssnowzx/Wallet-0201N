
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
  const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
  const userAddresses = Object.values(users).map((user: any) => user.address);

  // Prioriza transações de usuários reais
  const realUserTransactions = unvalidatedTxs.filter(tx => 
    userAddresses.includes(tx.from)
  );

  // Prioriza transações de usuários reais se existirem
  const priorityPool = realUserTransactions.length >= 2 ? realUserTransactions : unvalidatedTxs;
  
  const selected: string[] = [];
  const availableTransactions = [...priorityPool];

  // Seleciona até 2 transações
  for (let i = 0; i < Math.min(2, availableTransactions.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableTransactions.length);
    const selectedTx = availableTransactions[randomIndex];
    
    if (!selected.includes(selectedTx.id)) {
      selected.push(selectedTx.id);
      availableTransactions.splice(randomIndex, 1);
    }
  }

  console.log(`Transações validadas: ${selected.length} (${realUserTransactions.length} de usuários reais disponíveis)`);
  
  return selected;
};
