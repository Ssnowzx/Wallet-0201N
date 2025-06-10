import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Interface for the transaction format (should be consistent across frontend/backend)
interface Transaction {
  id: string;
  from: string; // Sender address
  to: string;   // Recipient address
  amount: number;
  timestamp: number; // Use number for Firestore timestamp compatibility
  validates: string[]; // IDs of transactions validated by this one
  // Renomeado de 'validated' para 'isConfirmedForStats' para clareza no frontend,
  // refletindo que eh um status derivado do 'validatedBy' para fins de exibicao/contagem.
  // O campo REAL no Firestore que indica validacao por OUTRAS TXs eh 'validatedBy'.
  isConfirmedForStats: boolean; // Derivado de validatedBy.length >= 2 (ou logica similar)
  hash: string;
  validatedBy: string[]; // Added: Track transactions that validate this one (Array de IDs)
}

interface RealTimeStats {
  totalTransactions: number;
  validatedTransactions: number; // Contagem baseada em isConfirmedForStats
  pendingTransactions: number; // Contagem baseada em !isConfirmedForStats
  totalUsers: number;
}

// The hook will now return both stats and the list of global transactions from Firestore
interface UseRealTimeStatsResult {
    stats: RealTimeStats;
    globalTransactions: Transaction[]; // Lista de todas as transacoes globais do Firestore
}

export const useRealTimeStats = (): UseRealTimeStatsResult => {
  const [stats, setStats] = useState<RealTimeStats>({
    totalTransactions: 0,
    validatedTransactions: 0,
    pendingTransactions: 0,
    totalUsers: 0
  });

  const [globalTransactionList, setGlobalTransactionList] = useState<Transaction[]>([]);

  useEffect(() => {
    // Set up listener for the globalTransactions collection in Firestore
    const transactionsCollection = collection(db, 'globalTransactions');
    const transactionsQuery = query(transactionsCollection);

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions: Transaction[] = snapshot.docs.map(doc => {
        const data = doc.data();
        // Map Firestore data to Transaction interface
        const validatedBy = Array.isArray(data.validatedBy) ? data.validatedBy : [];

        return {
          id: doc.id, // Use the document ID as the transaction ID
          from: data.from,
          to: data.to,
          amount: data.amount,
          timestamp: data.timestamp, // Assuming Firestore timestamp can be treated as number here or converted
          validates: Array.isArray(data.validates) ? data.validates : [], // Ensure validates is an array
          // Calculate 'isConfirmedForStats' based on validatedBy array length
          // A transaction is considered 'validated' in the Tangle if it has been referenced by at least two other transactions.
          isConfirmedForStats: validatedBy.length >= 2, // Lógica: Validada se tem 2+ validadores
          hash: data.hash,
          validatedBy: validatedBy, // Store the actual validatedBy array
        } as Transaction; // Cast to Transaction type
      });

      setGlobalTransactionList(transactions);

      // Calculate transaction stats based on fetched data using the new 'isConfirmedForStats' field
      const validatedCount = transactions.filter(tx => tx.isConfirmedForStats).length;
      const pendingCount = transactions.filter(tx => !tx.isConfirmedForStats).length;

      // Update transaction-related stats
      setStats(currentStats => ({
        ...currentStats,
        totalTransactions: transactions.length,
        validatedTransactions: validatedCount,
        pendingTransactions: pendingCount,
      }));

      console.log("Global transactions updated from Firestore:", transactions.length, "Validated:", validatedCount, "Pending:", pendingCount);

    }, (error) => {
      console.error("Error fetching global transactions:", error);
      // Optionally set globalTransactionList to empty and reset transaction stats on error
      setGlobalTransactionList([]);
      setStats(currentStats => ({
          ...currentStats,
          totalTransactions: 0,
          validatedTransactions: 0,
          pendingTransactions: 0,
      }));
       // You might want to show a user-facing error toast here
    });

    // Set up listener for the users collection to get the total user count
    // NOTE: Fetching all user documents just for a count can become inefficient
    // for a very large number of users. A more scalable approach would be to
    // maintain a user count in a separate document or use Firestore aggregation queries (if available/suitable).
    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
        setStats(currentStats => ({
            ...currentStats,
            totalUsers: snapshot.size // snapshot.size gives the number of documents in the collection
        }));
        console.log("Total users updated from Firestore:", snapshot.size);
    }, (error) => {
        console.error("Error fetching total users count:", error);
         // Optionally set total users to 0 on error
        setStats(currentStats => ({
            ...currentStats,
            totalUsers: 0
        }));
    });

    // Cleanup listeners when the component unmounts
    return () => {
      unsubscribeTransactions();
      unsubscribeUsers();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // The hook now returns both the calculated stats and the list of transactions
  return { stats, globalTransactions: globalTransactionList };
};
