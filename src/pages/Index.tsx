import React, { useState, useEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import Wallet from '@/components/Wallet';
import { toast } from "@/hooks/use-toast";

// Importar auth e onAuthStateChanged do Firebase Authentication
import { auth } from "@/firebaseConfig";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

// Importar db e funções do Firestore
import { db } from "@/firebaseConfig"; // db já importado aqui do firebaseConfig
import { doc, getDoc, setDoc } from "firebase/firestore";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Subscrever mudanças no estado de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Alterado para async
      if (user) {
        // Usuário está logado via Firebase Auth
        console.log("Usuário Firebase Auth logado:", user.uid);

        // --- Verificar e Criar Documento do Usuário no Firestore se não existir ---
        const userDocRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            // Documento do usuário NÃO encontrado no Firestore, vamos criá-lo
            console.log("Documento do usuário não encontrado no Firestore. Criando...");
            await setDoc(userDocRef, {
              email: user.email || 'Sem Email', // Usa o email do Auth ou um placeholder
              balance: 100, // Saldo inicial
              address: `0x${Math.random().toString(16).substr(2, 40)}`, // Endereço simulado
              transactions: [] // Histórico de transações vazio
            });
            console.log("Documento do usuário criado no Firestore.");
            toast({
              title: "Bem-vindo!",
              description: "Sua conta foi configurada no banco de dados."
            });
          } else {
            // Documento do usuário encontrado
            console.log("Documento do usuário encontrado no Firestore.");
          }
          // --- Fim da verificação e criação ---

          setCurrentUser(user); // Define o usuário logado no estado
        } catch (error: any) {
          console.error("Erro ao verificar/criar documento do usuário no Firestore:", error);
          toast({
            title: "Erro",
            description: `Falha ao carregar ou criar dados do usuário: ${error.message}`,
            variant: "destructive"
          });
          // Em caso de erro grave no Firestore, talvez seja melhor deslogar o usuário
          await signOut(auth); // Desloga se não conseguir carregar/criar dados
          setCurrentUser(null); // Garante que o estado local reflita que ninguém está logado
        }

      } else {
        // Usuário não está logado
        console.log("Nenhum usuário Firebase Auth logado.");
        setCurrentUser(null);
      }
      // O estado de autenticação inicial foi verificado
      setLoadingAuth(false);
    });

    // Limpar a subscrição ao desmontar o componente
    return () => unsubscribe();
  }, []); // Array de dependências vazio

  // Mantido, esta função é chamada PÓS login bem-sucedido no LoginForm
  const handleLoginSuccess = (userId: string) => {
    console.log("Processo de login bem-sucedido no LoginForm para:", userId);
    // O onAuthStateChanged listener agora lida com a atualização do estado e criação do doc.
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sucesso!",
        description: "Logout realizado com sucesso.",
      });
      // onAuthStateChanged listener irá definir currentUser como null
    } catch (error: any) {
      console.error("Firebase Logout Error:", error.message);
      toast({
        title: "Erro ao fazer Logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Carregando autenticação e dados do usuário...</div>;
  }

  return (
    <div className="min-h-screen">
      {currentUser ? (
        <Wallet userId={currentUser.uid} onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLoginSuccess} />
      )}
    </div>
  );
};

export default Index;
