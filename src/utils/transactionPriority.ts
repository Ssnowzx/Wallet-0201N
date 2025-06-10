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

// Função auxiliar para ler de localStorage de forma segura (adaptada para este contexto)
const safelyReadUsersFromLocalStorage = (): Record<string, any> => {
  const item = localStorage.getItem('iotaUsers');
  // Verifica se o item é null, undefined, ou a string literal "undefined"
  if (item === null || item === undefined || item === "undefined") {
    // console.warn(`LocalStorage key 'iotaUsers' was null, undefined, or 'undefined'. Returning default value.`);
    // Opcional: Limpar a chave inválida se for a string "undefined"
    if (item === "undefined") {
         localStorage.removeItem('iotaUsers');
    }
    return {};
  }
  try {
    const parsedItem = JSON.parse(item);
    // Verifica se o resultado é um objeto (não um array)
    if (typeof parsedItem !== 'object' || parsedItem === null || Array.isArray(parsedItem)) {
        console.warn("LocalStorage key 'iotaUsers' did not contain a valid object. Returning default object.");
        localStorage.removeItem('iotaUsers');
        return {};
     }

    return parsedItem;
  } catch (error) {
    console.error("Error parsing JSON from localStorage key 'iotaUsers':", error);
    // Limpa o item inválido do localStorage em caso de erro de parsing
    localStorage.removeItem('iotaUsers');
    return {}; // Retorna valor padrão em caso de erro de parsing
  }
};

export const validateTwoTransactionsWithPriority = (allTransactions: Transaction[]): string[] => {
  const unvalidatedTxs = allTransactions.filter(tx => !tx.validated);

  if (unvalidatedTxs.length === 0) {
    return [];
  }

  // Usando a nova função de leitura segura para users
  const users = safelyReadUsersFromLocalStorage();
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
