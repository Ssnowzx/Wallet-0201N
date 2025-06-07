
import { useState, useEffect } from 'react';

interface RealTimeStats {
  totalTransactions: number;
  validatedTransactions: number;
  pendingTransactions: number;
  totalUsers: number;
}

export const useRealTimeStats = () => {
  const [stats, setStats] = useState<RealTimeStats>({
    totalTransactions: 0,
    validatedTransactions: 0,
    pendingTransactions: 0,
    totalUsers: 0
  });

  const updateStats = () => {
    const transactions = JSON.parse(localStorage.getItem('iotaTransactions') || '[]');
    const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');

    setStats({
      totalTransactions: transactions.length,
      validatedTransactions: transactions.filter((tx: any) => tx.validated).length,
      pendingTransactions: transactions.filter((tx: any) => !tx.validated).length,
      totalUsers: Object.keys(users).length
    });
  };

  useEffect(() => {
    // Atualiza imediatamente
    updateStats();

    // Atualiza a cada segundo
    const interval = setInterval(updateStats, 1000);

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'iotaTransactions' || e.key === 'iotaUsers') {
        updateStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return stats;
};
