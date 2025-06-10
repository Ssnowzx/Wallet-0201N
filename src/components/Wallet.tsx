import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Send, LogOut, Wallet as WalletIcon, Activity, Eye, EyeOff, Network } from 'lucide-react';

// Importar db e funções do Firestore
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// Importar funções do Firebase Functions SDK para chamar a função backend
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebaseConfig"; // Importar a instância do app Firebase

// Inicializar Firebase Functions para o cliente
const functions = getFunctions(app);
// Referência para a Cloud Function processTransaction
const processTransactionCallable = httpsCallable(functions, 'processTransaction');


import { useRealTimeStats } from '@/hooks/useRealTimeStats';
// import { validateTwoTransactionsWithPriority } from '@/utils/transactionPriority'; // Removido: Lógica de validação será no backend
import TransactionGraph2D from './TransactionGraph2D';

// Atualizar a interface Transaction para refletir os dados do Firestore/hook
// Deve ser consistente com a interface no useRealTimeStats.ts
interface Transaction {
  id: string;
  from: string; // Endereço do remetente
  to: string;   // Endereço do destinatário
  amount: number;
  timestamp: number; // Timestamp de criação
  validates: string[]; // IDs das transações validadas por esta
  // Este campo vem calculado do hook useRealTimeStats baseado em validatedBy
  isConfirmedForStats: boolean;
  hash: string;
  validatedBy: string[]; // IDs de transações que validaram ESTA transação
}

interface UserData {
  email: string;
  balance: number;
  address: string;
  // O histórico do usuário agora armazena a transação GLOBAL completa ou uma referência a ela.
  // Assumimos que a Cloud Function processTransaction salva o objeto Transaction global no array do usuário.
  transactions: Transaction[];
}

interface WalletProps {
  userId: string;
  onLogout: () => void;
}

// Removidas todas as funções e estados relacionados à simulação local
// (safelyReadTransactionsFromLocalStorage, allTransactions, generatePendingTransactions, checkAndRefillPendingTransactions)


const Wallet: React.FC<WalletProps> = ({ userId, onLogout }) => {
  const [userInfo, setUserInfo] = useState<UserData | null>(null);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  // allTransactions local removido. Agora usamos globalTransactions do hook.
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // O hook useRealTimeStats agora fornece as estatísticas e a lista completa
  // de transações globais do Firestore.
  const { stats, globalTransactions } = useRealTimeStats();


  // --- Lógica de Carregamento e Atualização de Dados do Usuário do Firestore ---
  // Esta lógica busca os dados específicos do usuário logado (saldo, histórico)
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as UserData;
        // Mapear as transações do histórico do usuário para a interface Transaction,
        // garantindo que isConfirmedForStats seja calculado se validatedBy existir.
         const userTransactions = (userData.transactions || []).map(tx => {
           // Garante que validatedBy seja sempre um array para evitar erros
           const validatedBy = Array.isArray(tx.validatedBy) ? tx.validatedBy : [];
           return {
              ...tx,
              validatedBy: validatedBy, // Use o array garantido
              // Recalcular isConfirmedForStats localmente para o histórico do usuário
              isConfirmedForStats: validatedBy.length >= 2,
           } as Transaction;
         });


        setUserInfo({...userData, transactions: userTransactions});
        console.log("Dados do usuário atualizados do Firestore.");
      } else {
        console.error("Documento do usuário não encontrado no Firestore para ID:", userId);
        setUserInfo(null);
      }
    }, (error) => {
      console.error("Erro ao carregar dados do usuário do Firestore:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados do usuário.",
        variant: "destructive"
      });
      setUserInfo(null);
    });

    return () => unsubscribe();
  }, [userId]);

  // Removidos: Todos os useEffects e funções relacionados à simulação local do Tangle/Grafo/Stats

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Endereço copiado para a área de transferência",
    });
  };

  // --- Lógica de Envio de Transação CHAMANDO A CLOUD FUNCTION (REAL) ---
  const handleSendTransaction = async () => {
    if (!userInfo) {
       toast({
        title: "Erro",
        description: "Informações do usuário não carregadas.",
        variant: "destructive"
      });
      return;
    }

    if (!toAddress || !amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    if (toAddress === userInfo.address) {
      toast({
        title: "Erro",
        description: "Não é possível enviar transações para seu próprio endereço",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > userInfo.balance) {
      toast({
        title: "Erro",
        description: "Valor inválido ou saldo insuficiente",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Chamando Cloud Function processTransaction com:", { toAddress, amount: amountNum });

      // --- Chamar a Cloud Function para processar a transação ---
      const result = await processTransactionCallable({ toAddress, amount: amountNum });
      console.log("Resultado da Cloud Function:", result.data);

      // A Cloud Function já atualiza a coleção globalTransactions no Firestore.
      // O hook useRealTimeStats e os listeners onSnapshot (para usuário e globalTransactions)
      // agora tratarão a atualização da UI (saldo, histórico, estatísticas e grafo).

      toast({
        title: "Transação Enviada para Processamento! ✅",
        description: "A transação está sendo processada na rede.", // Modified line
      });

      setToAddress('');
      setAmount('');

    } catch (error: any) {
      console.error("Erro ao chamar Cloud Function ou processar resposta:", error);
      let errorMessage = "Falha ao enviar transação.";

      // Tentar extrair mensagem de erro da Cloud Function
      if (error.code && error.message) {
         errorMessage = `Erro do Backend: ${error.message}`;
         // Você pode adicionar tratamento específico para error.code aqui (e.g., 'failed-precondition', 'not-found')
      } else if (error.message) {
         errorMessage = `Erro: ${error.message}`;
      }

      toast({
        title: "Erro na Transação",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lógica de Filtragem de Transações para o Histórico do Usuário (REAL do Firestore) ---
  const getUserTransactions = () => {
    return userInfo?.transactions || [];
  };

  // Renderiza um estado de carregamento enquanto os dados do usuário não são carregados
  if (!userInfo) {
    // Garante que o retorno condicional seja um JSX válido e completo
    return (
        <div className="min-h-screen flex items-center justify-center">
            Carregando dados do usuário...
        </div>
    );
  }

  // --- Renderização do Componente Wallet ---
  // Início do bloco JSX principal retornado pelo componente
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Orbs flutuantes para efeito visual */}
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>

      {/* Container principal da carteira */}
      <div className="max-w-sm mx-auto min-h-screen wallet-container bg-white/20 backdrop-blur-md shadow-2xl">
        {/* Header da carteira */}
        <div className="bg-white/30 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">CC Wallet</h1>
                <p className="text-xs text-gray-600">{userInfo.email || 'Usuário'}</p>
              </div>
            </div>
            {/* Botão de logout */}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo principal com saldo, tabs e estatísticas */}
        <div className="p-4 space-y-4">
          {/* Card do Saldo */}
          <Card className="glass-effect border-white/30 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                {/* Exibição do Saldo com toggle de privacidade */}
                <div className="flex items-center justify-center space-x-2">
                  <p className="text-xs text-gray-600">Saldo Total</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalance(!showBalance)}
                    className="h-5 w-5 p-0"
                  >
                    {showBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                </div>

                <div className="space-y-1">
                  {showBalance ? (
                    <div className="text-3xl font-bold text-gray-900">
                      {userInfo.balance.toFixed(2)} {/* Exibe o saldo REAL do usuário logado */}
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      ••••••
                    </div>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    0201N Tokens
                  </Badge>
                </div>

                {/* Endereço da Carteira */}
                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                  <Label className="text-xs font-medium text-gray-600 block mb-1">
                    Endereço da Carteira
                  </Label>
                  <div className="flex items-center justify-between">
                    <code className="text-xs text-gray-800 flex-1 truncate">
                      {userInfo.address} {/* Exibe o endereço REAL do usuário logado */}
                    </code>
                    {/* Botão para copiar endereço */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(userInfo.address)}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs para Enviar, Histórico e Grafo */}
          <Tabs defaultValue="send" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="send" className="text-xs">Enviar</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
              <TabsTrigger value="graph" className="text-xs">Grafo 2D</TabsTrigger>
            </TabsList>

            {/* Conteúdo da aba Enviar */}
            <TabsContent value="send" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar 0201N
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Campo Endereço de destino */}
                  <div className="space-y-1">
                    <Label htmlFor="to-address" className="text-xs font-medium">
                      Endereço de destino
                    </Label>
                    <Input
                      id="to-address"
                      placeholder="0x... (Endereço de outra carteira)"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      className="font-mono text-xs h-10"
                    />
                  </div>

                  {/* Campo Quantidade */}
                  <div className="space-y-1">
                    <Label htmlFor="amount" className="text-xs font-medium">
                      Quantidade (0201N)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={userInfo.balance}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10"
                    />
                    <p className="text-xs text-gray-500">
                      Máximo: {userInfo.balance.toFixed(2)} 0201N
                    </p>
                  </div>

                  {/* Botão Enviar Transação */}
                  <Button
                    onClick={handleSendTransaction}
                    disabled={isLoading || !userInfo}
                    className="w-full h-10 iota-gradient text-white font-semibold text-sm"
                  >
                    {isLoading ? "Processando..." : "Enviar Transação"}
                  </Button>

                  {/* Mensagem de processamento */}
                  {isLoading && (
                    <div className="text-center text-xs text-muted-foreground p-2 bg-blue-50 rounded-lg">
                      Processando transação no Tangle (via Cloud Function)...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conteúdo da aba Histórico */}
            <TabsContent value="history" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Transações</CardTitle>
                  <CardDescription className="text-xs">
                    Histórico na rede 0201N Tangle (DAG) - Dados reais do Firestore
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Lista de transações do usuário (REAL do Firestore) */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getUserTransactions().length === 0 ? (
                      <div className="text-center text-muted-foreground py-6 text-xs">
                        Nenhuma transação encontrada para este usuário
                      </div>
                    ) : (
                      getUserTransactions().map((tx) => (
                        <div key={tx.id} className="border border-white/30 rounded-lg p-3 space-y-2 bg-white/40 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium text-xs">
                                {tx.from === userInfo.address ? 'Enviado' : 'Recebido'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(tx.timestamp).toLocaleString('pt-BR')}
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className={`font-bold text-xs ${tx.from === userInfo.address ? 'text-red-600' : 'text-green-600'}`}>
                                {tx.from === userInfo.address ? '-' : '+'}{tx.amount} 0201N
                              </div>
                              {/* Badge Validado/Pendente - Agora usa isConfirmedForStats do hook/Firestore data */}
                              <Badge variant={tx.isConfirmedForStats ? "default" : "secondary"} className="text-xs">
                                {tx.isConfirmedForStats ? 'Validado' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>

                          {/* Detalhes da transação (Hash, Validações - agora do Firestore) */}
                          <div className="text-xs space-y-1 pt-1 border-t border-white/20">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Hash:</span>
                              <code className="bg-white/30 px-1 py-0.5 rounded text-xs">
                                {tx.hash}
                              </code>
                            </div>
                             {/* Mostrar Validou e Validado Por com base nos dados do Firestore */}
                            {tx.validates && tx.validates.length > 0 && (
                              <div className="text-gray-600">
                                Validou: {tx.validates.length} transação(ões)
                              </div>
                            )}
                             {tx.validatedBy && tx.validatedBy.length > 0 && (
                              <div className="text-gray-600">
                                Validado Por: {tx.validatedBy.length} transação(ões)
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conteúdo da aba Grafo 2D */}
            <TabsContent value="graph" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Network className="w-4 h-4 mr-2" />
                    Visualização 2D do Tangle
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Grafo 2D representando transações e validações na rede 0201N (Dados do Firestore)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  {/* Componente do grafo, AGORA USANDO A LISTA GLOBAL DO FIRESTORE */}
                  <div className="h-[520px] w-full">
                    {/* Passa a lista globalTransactions do hook para o componente do grafo */}
                    <TransactionGraph2D transactions={globalTransactions} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Card das Estatísticas em Tempo Real */}
          <Card className="glass-effect border-white/30 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Activity className="w-4 h-4 mr-2" />
                Rede 0201N Tangle (DAG)
              </CardTitle>
              <CardDescription className="text-xs">
                Estatísticas em tempo real (Dados do Firestore)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Exibição das estatísticas - AGORA USANDO stats.propriedade do hook (do Firestore) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  {/* Renderiza stats.totalTransactions, que vem do Firestore */}
                  <div className="text-lg font-bold text-primary">{stats.totalTransactions}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                   {/* Renderiza stats.validatedTransactions, que vem do Firestore */}
                  <div className="text-lg font-bold text-green-600">
                    {stats.validatedTransactions}
                  </div>
                  <div className="text-xs text-muted-foreground">Validadas</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  {/* Renderiza stats.pendingTransactions, que vem do Firestore */}
                  <div className="text-lg font-bold text-orange-600">
                    {stats.pendingTransactions}
                  </div>
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  {/* Renderiza stats.totalUsers, que vem do Firestore */}
                  <div className="text-lg font-bold text-purple-600">
                    {stats.totalUsers}
                  </div>
                  <div className="text-xs text-muted-foreground">Usuários</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
