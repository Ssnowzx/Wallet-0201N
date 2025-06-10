const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PubSub } = require('@google-cloud/pubsub'); // Adicionado o import para PubSub

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

const PENDING_THRESHOLD = 20; // Minimum number of pending transactions before replenishment
const TARGET_PENDING = 100; // Target number of pending transactions
const DUMMY_ADDRESS_PREFIX = 'dummy_address_'; // Prefix used for dummy addresses

// Helper function to generate a simulated hash
const generateSimulatedHash = (id, timestamp) => {
    return `hash_${id.substring(0, 8)}_${timestamp}`; // Simulated hash
};

// Helper function to generate a unique dummy address
const generateDummyAddress = () => {
    return `${DUMMY_ADDRESS_PREFIX}${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Function to manage the pool of pending transactions and simulate validations
// Alterado de functions.https.onCall para functions.pubsub.schedule
exports.managePendingTransactionsPool = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    console.log("Starting managePendingTransactionsPool (Scheduled) execution...");

    const globalTransactionsRef = db.collection("globalTransactions");

    // 1. Fetch all global transactions
    const allTxsSnapshot = await globalTransactionsRef.get();
    let allTransactions = allTxsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter for truly pending transactions (those with less than 2 validaters)
    // Sort by timestamp initially, but will select randomly from this pool
    const pendingTransactions = allTransactions.filter(tx =>
        Array.isArray(tx.validatedBy) && tx.validatedBy.length < 2
    );

    const currentPendingCount = pendingTransactions.length;
    console.log(`Current pending transactions (validatedBy.length < 2): ${currentPendingCount}`);

    const batch = db.batch();
    let dummyTransactionsCreated = 0;
    let validationsApplied = 0; // Count how many times validatedBy is updated

    // 2. Create new dummy transactions if below the target pending count
    const numToCreate = Math.max(0, TARGET_PENDING - currentPendingCount); 
    console.log(`Need to create ${numToCreate} dummy transactions to reach target ${TARGET_PENDING}.`);

    const newlyCreatedDummyIds = [];

    // Get the current pending transactions to be potentially validated by new dummies
    // Shuffle this list for a more random tip selection
    // Dummies will validate any pending transaction (both real and other dummies)
    let tipsForNewDummies = shuffleArray([...pendingTransactions]); 
    let tipsIndex = 0;

    if (numToCreate > 0) {
        console.log(`Creating ${numToCreate} dummy transactions...`);

        for (let i = 0; i < numToCreate; i++) {
             const newTransactionId = globalTransactionsRef.doc().id; // Auto-generated ID
             // Ensure timestamps are newer than existing to not mess up sorting/selection later
             const timestamp = Date.now() + i + 1000000; // Add a large offset

             const validatesIdsForDummy = [];
             // --- Select 2 tips randomly from the shuffled pending list (Simplified TSA for Dummies) ---
             for(let j = 0; j < 2; j++) {
                 if (tipsIndex < tipsForNewDummies.length) {
                     validatesIdsForDummy.push(tipsForNewDummies[tipsIndex].id);
                     tipsIndex++;
                 } else {
                     // If we run out of unique pending tips, recycle from the beginning of the shuffled list
                     tipsIndex = 0; 
                      if (tipsIndex < tipsForNewDummies.length) {
                           validatesIdsForDummy.push(tipsForNewDummies[tipsIndex].id);
                           tipsIndex++;
                      }
                 }
             }
             // Ensure unique tips are selected even if recycling
             const uniqueValidatesIdsForDummy = Array.from(new Set(validatesIdsForDummy));


             const dummyTransaction = {
                id: newTransactionId, // Use the document ID
                from: generateDummyAddress(),
                to: generateDummyAddress(),
                amount: Math.floor(Math.random() * 10) + 1,
                timestamp: timestamp,
                validates: uniqueValidatesIdsForDummy, // Dummy validates these randomly selected tips
                validatedBy: [], // Initially not validated by others
                hash: generateSimulatedHash(newTransactionId, timestamp),
            };
            batch.set(globalTransactionsRef.doc(dummyTransaction.id), dummyTransaction);
            newlyCreatedDummyIds.push(newTransactionId);
            dummyTransactionsCreated++;

            // Update the validatedBy array of the tips this dummy transaction validated
            uniqueValidatesIdsForDummy.forEach(tipId => {
                const tipRef = globalTransactionsRef.doc(tipId);
                 batch.update(tipRef, {
                     validatedBy: admin.firestore.FieldValue.arrayUnion(newTransactionId)
                 });
                 validationsApplied++;
                 console.log(`Tip ${tipId.substring(0,6)} validated by NEW dummy ${newTransactionId.substring(0,6)}`);
            });
        }
         console.log(`Created ${dummyTransactionsCreated} dummy transactions.`);
    }


    // 4. Commit the batch
    if (dummyTransactionsCreated > 0 || validationsApplied > 0) {
       console.log(`Committing batch with ${dummyTransactionsCreated} new transactions and ${validationsApplied} validatedBy updates.`);
       await batch.commit();
       console.log("Batch committed successfully.");
    } else {
       console.log("No dummy transactions to create or validations to apply. Batch not committed.");
    }

    console.log("managePendingTransactionsPool (Backend Simulation) finished.");
    // Return stats about the execution (Note: Return value for scheduled functions is not directly used like with Callable)
    return null; // Scheduled functions don't return data to a caller
});

// The main transaction processing function, now including Tangle validation logic
exports.processTransaction = functions.https.onCall(async (data, context) => {
  // 1. Verificar Autenticacao
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A funcao requer autenticacao."
    );
  }

  const senderId = context.auth.uid; // ID do usuario autenticado (remetente)

  // Dados recebidos do cliente
  const { toAddress, amount } = data;

  // 2. Validar Dados de Entrada (validacao basica)
  if (typeof toAddress !== "string" || typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados da transacao invalidos (endereco ou valor). Valor precisa ser um numero positivo."
    );
  }

  // 3. Referencias aos Documentos do Remetente e Destinatario
  const senderDocRef = db.collection("users").doc(senderId);
  const globalTransactionsRef = db.collection("globalTransactions");

  const batch = db.batch();

  // 4. Obter Dados do Remetente
  const senderDoc = await senderDocRef.get();

  if (!senderDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Documento do usuario remetente nao encontrado."
    );
  }

  const senderData = senderDoc.data();

  // 5. Verificar Saldo do Remetente
  if (senderData.balance < amount) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Saldo insuficiente para realizar a transacao."
    );
  }

   // 6. Verificar se o destinatario e o proprio remetente
   if (senderData.address === toAddress) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Nao e possivel enviar transacoes para seu proprio endereco."
      );
   }

  // 7. Obter Dados do Destinatario (Busca por Endereco)
  const usersRef = db.collection("users");
  const recipientQuery = usersRef.where("address", "==", toAddress).limit(1);
  const recipientSnapshot = await recipientQuery.get();

  let recipientDoc;
  let recipientData;
  let recipientId;

  if (!recipientSnapshot.empty) {
      recipientDoc = recipientSnapshot.docs[0];
      recipientId = recipientDoc.id;
      recipientData = recipientDoc.data();
      console.log(`Destinatario (${toAddress}) encontrado no Firestore com ID: ${recipientId}.`);
  } else {
      console.log(`Endereco de destinatario (${toAddress}) nao encontrado entre os usuarios registrados.`);
      throw new functions.https.HttpsError(
          "not-found",
          "Endereco de destinatario nao encontrado entre os usuarios registrados."
      );
  }


  // --- TANGLE VALIDATION LOGIC (for real transactions) --- START

  // Select 2 pending transactions to validate (Prioritized TSA)
  // Query transactions that have less than 2 validators (validatedBy.length < 2)
  const potentialTipsSnapshot = await globalTransactionsRef
    .orderBy('timestamp', 'desc') // Get recent ones first
    .limit(200) // Increase limit to have a larger pool to pick from
    .get();

  const recentPendingTips = potentialTipsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(tx => Array.isArray(tx.validatedBy) && tx.validatedBy.length < 2);

  // Separate pending tips into real and dummy based on address prefix
  const realPendingTips = recentPendingTips.filter(tx => !tx.from.startsWith(DUMMY_ADDRESS_PREFIX));
  const dummyPendingTips = recentPendingTips.filter(tx => tx.from.startsWith(DUMMY_ADDRESS_PREFIX));

  // Shuffle both lists independently
  const shuffledRealTips = shuffleArray(realPendingTips);
  const shuffledDummyTips = shuffleArray(dummyPendingTips);

  const validatesIds = [];

  // Prioritize selecting 2 tips from the real pending tips
  for(let i = 0; i < 2; i++) {
      if (shuffledRealTips.length > 0) {
          validatesIds.push(shuffledRealTips.pop().id); // Take from the end after shuffling
      } else if (shuffledDummyTips.length > 0) {
           // If not enough real tips, take from dummy tips
           validatesIds.push(shuffledDummyTips.pop().id);
      } else {
          // No pending tips available at all
          console.warn(`Less than 2 pending transactions available for validation by real tx. Found ${validatesIds.length} after checking real and dummy.`);
          break; // Exit loop if no tips are available
      }
  }

   // Ensure unique tips are selected (important if there were less than 2 total tips)
   const uniqueValidatesIds = Array.from(new Set(validatesIds));

   if (uniqueValidatesIds.length < 2) {
        console.warn(`Could only select ${uniqueValidatesIds.length} unique tips for real transaction validation.`);
   }

  // --- TANGLE VALIDATION LOGIC (for real transactions) --- END


  // 9. Criar o Objeto da Nova Transacao Global
   const newTransactionId = globalTransactionsRef.doc().id; // Gera um ID automático para o documento
   const timestamp = Date.now(); // Timestamp do backend
   const hash = generateSimulatedHash(newTransactionId, timestamp); // Simulated hash

   const newTransaction = {
        id: newTransactionId, // Usar o ID gerado para o documento
        from: senderData.address, // Endereco do remetente do Firestore
        to: toAddress, // Endereco do destinatario recebido do cliente
        amount: amount,
        timestamp: timestamp,
        validates: uniqueValidatesIds, // IDs das transacoes que esta transacao valida (prioritized selection)
        validatedBy: [], // Initially not validated by others
        hash: hash,
   };

   // Adicionar a nova transacao a colecao global de transacoes
  batch.set(globalTransactionsRef.doc(newTransactionId), newTransaction); // Use set com o ID especifico da transacao

  // --- UPDATE VALIDATED TRANSACTIONS (for real transactions) --- START

  // 10. Atualizar as transacoes que foram validadas por esta esta nova transacao
  for (const validatedId of uniqueValidatesIds) {
      const validatedTxRef = globalTransactionsRef.doc(validatedId);
      // Add the ID of the new transaction to the 'validatedBy' array of the validated transactions
      // Use arrayUnion to avoid duplicates
      batch.update(validatedTxRef, {
          validatedBy: admin.firestore.FieldValue.arrayUnion(newTransactionId)
      });
       console.log(`Tip ${validatedId.substring(0,6)} validated by real transaction ${newTransactionId.substring(0,6)}`);
  }

  // --- UPDATE VALIDATED TRANSACTIONS (for real transactions) --- END


  // 11. Preparar Operacoes do Batch (atualizar remetente e destinatario)
  batch.update(senderDocRef, {
    balance: senderData.balance - amount,
    // Add the GLOBAL transaction object to the user's history array
    // Ensure the object saved here is consistent, ideally includes validatedBy
    transactions: admin.firestore.FieldValue.arrayUnion({...newTransaction, validatedBy: []}) // Save with empty validatedBy initially in user history
  });

  // Add amount to recipient and add transaction to their history
   if (recipientId && recipientData) { // Check again if recipient was found
       const recipientDocRef = db.collection("users").doc(recipientId);
       batch.update(recipientDocRef, {
           balance: recipientData.balance + amount,
           // Add the GLOBAL transaction object to the user's history array
            // Ensure the object saved here is consistent, ideally includes validatedBy
           transactions: admin.firestore.FieldValue.arrayUnion({...newTransaction, validatedBy: []}) // Save with empty validatedBy initially in user history
       });
        console.log(`Recipient (${recipientId}) update added to batch.`);
   } else {
         // This should not happen due to prior check, but is a fallback
         throw new functions.https.HttpsError(
            "internal",
            "Internal error: Recipient data inconsistent after lookup."
         );
   }


  // 12. Commitar o Batch
  await batch.commit();

  console.log(`Transaction of ${amount} from ${senderData.address} to ${toAddress} (recipient ID: ${recipientId}) processed.`);
  console.log(`New global transaction ID: ${newTransactionId}. Validated transactions: ${uniqueValidatesIds.join(', ') || 'none'}.`);

  // 13. Return Success
  return { success: true, transactionId: newTransactionId, validates: uniqueValidatesIds };
});
