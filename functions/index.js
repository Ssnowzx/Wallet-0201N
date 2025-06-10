const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa o Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// Cloud Function acionada por chamada HTTPS do cliente
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

  // 2. Validar Dados de Entrada (validacao basica, pode adicionar mais)
  if (typeof toAddress !== "string" || typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados da transacao invalidos (endereco ou valor). Valor precisa ser um numero positivo."
    );
  }

  // 3. Referencias aos Documentos do Remetente e Destinatario
  const senderDocRef = db.collection("users").doc(senderId);

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


  // 8. Criar o Objeto da Nova Transacao
   const newTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Gerar ID no backend
        from: senderData.address, // Endereco do remetente do Firestore
        to: toAddress, // Endereco do destinatario recebido do cliente
        amount: amount,
        timestamp: Date.now(), // Timestamp do backend
        validates: [], // Simulado: precisa integrar logica Tangle real
        validated: false, // Simulado: precisa integrar logica Tangle real
        hash: `hash_${Math.random().toString(16).substr(2, 16)}` // Simulado
   };

   // Adicionar a transacao a colecao global de transacoes
  const globalTransactionsRef = db.collection("globalTransactions");
  batch.set(globalTransactionsRef.doc(newTransaction.id), newTransaction); // Use set com o ID especifico da transacao


  // 9. Preparar Operacoes do Batch
  batch.update(senderDocRef, {
    balance: senderData.balance - amount,
    transactions: admin.firestore.FieldValue.arrayUnion(newTransaction)
  });

  // Adicionar valor ao destinatario e adicionar transacao ao historico dele
   if (recipientId && recipientData) { // Verificar novamente se o destinatario foi encontrado
       const recipientDocRef = db.collection("users").doc(recipientId);
       batch.update(recipientDocRef, {
           balance: recipientData.balance + amount,
           transactions: admin.firestore.FieldValue.arrayUnion(newTransaction)
       });
        console.log(`Atualizacao do destinatario (${recipientId}) adicionada ao batch.`);
   } else {
         throw new functions.https.HttpsError(
            "internal",
            "Erro interno: Dados do destinatario inconsistentes apos a busca."
         );
   }


  // 10. Commitar o Batch
  await batch.commit();

  console.log(`Transacao de ${amount} de ${senderData.address} para ${toAddress} (ID do destinatario: ${recipientId}) processada e adicionada a colecao global.`);

  // 11. Retornar Sucesso (opcionalmente com dados da transacao criada)
  return { success: true, transactionId: newTransaction.id };
});
