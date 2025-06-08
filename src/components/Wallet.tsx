import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Send, LogOut, Wallet as WalletIcon, Activity, Eye, EyeOff, Network } from 'lucide-react';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import { validateTwoTransactionsWithPriority } from '@/utils/transactionPriority';
import TransactionGraph2D from './TransactionGraph2D';

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

interface WalletProps {
  username: string;
  onLogout: () => void;
}

const Wallet: React.FC<WalletProps> = ({ username, onLogout }) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const stats = useRealTimeStats();

  useEffect(() => {
    initializePendingTransactions();
    loadUserData();
    loadAllTransactions();
  }, [username]);

  useEffect(() => {
    checkAndRefillPendingTransactions();
  }, [allTransactions]);

  const initializePendingTransactions = () => {
    const existingTransactions = JSON.parse(localStorage.getItem('iotaTransactions') || '[]');
    if (existingTransactions.length === 0) {
      generatePendingTransactions(100);
    }
  };

  const generatePendingTransactions = (count: number) => {
    const transactions: Transaction[] = [];
    const baseTime = Date.now() - (count * 60000);

    for (let i = 0; i < count; i++) {
      const transaction: Transaction = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        to: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: Math.round((Math.random() * 50 + 1) * 100) / 100,
        timestamp: baseTime + (i * 60000),
        validates: [],
        validated: false,
        hash: `pending_hash_${Math.random().toString(16).substr(2, 16)}`
      };
      transactions.push(transaction);
    }

    const existingTransactions = JSON.parse(localStorage.getItem('iotaTransactions') || '[]');
    const updatedTransactions = [...existingTransactions, ...transactions];
    localStorage.setItem('iotaTransactions', JSON.stringify(updatedTransactions));
    setAllTransactions(updatedTransactions);
  };

  const checkAndRefillPendingTransactions = () => {
    const pendingCount = allTransactions.filter(tx => !tx.validated).length;
    if (pendingCount <= 20 && pendingCount > 0) {
      console.log(`Transações pendentes baixas (${pendingCount}), gerando mais 100...`);
      generatePendingTransactions(100);
      toast({
        title: "Rede atualizada",
        description: "100 novas transações pendentes foram adicionadas ao Tangle"
      });
    }
  };

  const loadUserData = () => {
    const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
    setUserInfo(users[username]);
  };

  const loadAllTransactions = () => {
    const transactions = JSON.parse(localStorage.getItem('iotaTransactions') || '[]');
    setAllTransactions(transactions);
  };

  const generateTransactionId = () => {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateHash = (transaction: any) => {
    const data = `${transaction.from}${transaction.to}${transaction.amount}${transaction.timestamp}`;
    return `hash_${btoa(data).slice(0, 16)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Endereço copiado para a área de transferência"
    });
  };

  const handleSendTransaction = async () => {
    if (!toAddress || !amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      // Auto-dismiss after 1 second
      setTimeout(() => {
        // The toast will be auto-dismissed by the timeout in use-toast
      }, 1000);
      return;
    }

    // Check if trying to send to own address
    if (toAddress === userInfo.address) {
      toast({
        title: "Erro",
        description: "Não é possível enviar transações para seu próprio endereço",
        variant: "destructive"
      });
      // Auto-dismiss after 1 second
      setTimeout(() => {
        // The toast will be auto-dismissed by the timeout in use-toast
      }, 1000);
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > userInfo.balance) {
      toast({
        title: "Erro",
        description: "Valor inválido ou saldo insuficiente",
        variant: "destructive"
      });
      // Auto-dismiss after 1 second
      setTimeout(() => {
        // The toast will be auto-dismissed by the timeout in use-toast
      }, 1000);
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const validatedTxs = validateTwoTransactionsWithPriority(allTransactions);

      const newTransaction: Transaction = {
        id: generateTransactionId(),
        from: userInfo.address,
        to: toAddress,
        amount: amountNum,
        timestamp: Date.now(),
        validates: validatedTxs,
        validated: false,
        hash: ''
      };

      newTransaction.hash = generateHash(newTransaction);

      const updatedTransactions = allTransactions.map(tx => 
        validatedTxs.includes(tx.id) ? { ...tx, validated: true } : tx
      );

      const finalTransactions = [...updatedTransactions, newTransaction];

      const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
      users[username].balance -= amountNum;
      
      const recipient = Object.keys(users).find(user => users[user].address === toAddress);
      if (recipient) {
        users[recipient].balance += amountNum;
      }

      localStorage.setItem('iotaUsers', JSON.stringify(users));
      localStorage.setItem('iotaTransactions', JSON.stringify(finalTransactions));

      loadUserData();
      loadAllTransactions();

      const successToast = toast({
        title: "Transação enviada! ✅",
        description: `${validatedTxs.length} transações validadas (priorizando usuários reais)`
      });

      // Auto-dismiss success toast after 1 second
      setTimeout(() => {
        successToast.dismiss();
      }, 1000);

      setToAddress('');
      setAmount('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar transação",
        variant: "destructive"
      });
      // Auto-dismiss after 1 second
      setTimeout(() => {
        // The toast will be auto-dismissed by the timeout in use-toast
      }, 1000);
    }

    setIsLoading(false);
  };

  const getUserTransactions = () => {
    return allTransactions.filter(tx => 
      tx.from === userInfo?.address || tx.to === userInfo?.address
    );
  };

  if (!userInfo) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>

      <div className="max-w-sm mx-auto min-h-screen wallet-container bg-white/20 backdrop-blur-md shadow-2xl">
        <div className="bg-white/30 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">CC Wallet</h1>
                <p className="text-xs text-gray-600">{username}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card className="glass-effect border-white/30 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
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
                      {userInfo.balance.toFixed(2)}
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

                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                  <Label className="text-xs font-medium text-gray-600 block mb-1">
                    Endereço da Carteira
                  </Label>
                  <div className="flex items-center justify-between">
                    <code className="text-xs text-gray-800 flex-1 truncate">
                      {userInfo.address}
                    </code>
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

          <Tabs defaultValue="send" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="send" className="text-xs">Enviar</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
              <TabsTrigger value="graph" className="text-xs">Grafo 2D</TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar 0201N
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="to-address" className="text-xs font-medium">
                      Endereço de destino
                    </Label>
                    <Input
                      id="to-address"
                      placeholder="0x..."
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      className="font-mono text-xs h-10"
                    />
                  </div>
                  
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

                  <Button 
                    onClick={handleSendTransaction}
                    disabled={isLoading}
                    className="w-full h-10 iota-gradient text-white font-semibold text-sm"
                  >
                    {isLoading ? "Processando..." : "Enviar Transação"}
                  </Button>

                  {isLoading && (
                    <div className="text-center text-xs text-muted-foreground p-2 bg-blue-50 rounded-lg">
                      Executando Proof of Work e validando transações no Tangle...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Transações</CardTitle>
                  <CardDescription className="text-xs">
                    Histórico na rede 0201N Tangle (DAG)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getUserTransactions().length === 0 ? (
                      <div className="text-center text-muted-foreground py-6 text-xs">
                        Nenhuma transação encontrada
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
                              <Badge variant={tx.validated ? "default" : "secondary"} className="text-xs">
                                {tx.validated ? 'Validado' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-xs space-y-1 pt-1 border-t border-white/20">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Hash:</span>
                              <code className="bg-white/30 px-1 py-0.5 rounded text-xs">
                                {tx.hash}
                              </code>
                            </div>
                            {tx.validates.length > 0 && (
                              <div className="text-gray-600">
                                Validou: {tx.validates.length} transação(ões)
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

            <TabsContent value="graph" className="mt-4">
              <Card className="glass-effect border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Network className="w-4 h-4 mr-2" />
                    Visualização 2D do Tangle
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Grafo 2D representando transações e validações na rede 0201N
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[520px] w-full">
                    <TransactionGraph2D transactions={allTransactions} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="glass-effect border-white/30 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Activity className="w-4 h-4 mr-2" />
                Rede 0201N Tangle (DAG)
              </CardTitle>
              <CardDescription className="text-xs">
                Estatísticas em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  <div className="text-lg font-bold text-primary">{stats.totalTransactions}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  <div className="text-lg font-bold text-green-600">
                    {stats.validatedTransactions}
                  </div>
                  <div className="text-xs text-muted-foreground">Validadas</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
                  <div className="text-lg font-bold text-orange-600">
                    {stats.pendingTransactions}
                  </div>
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
                <div className="text-center p-3 bg-white/40 rounded-lg shadow-sm">
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
