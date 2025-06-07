
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Send, LogOut, Wallet as WalletIcon, Activity } from 'lucide-react';

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

  useEffect(() => {
    loadUserData();
    loadAllTransactions();
  }, [username]);

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

  const validateTwoTransactions = () => {
    // Pega duas transações não validadas aleatoriamente
    const unvalidatedTxs = allTransactions.filter(tx => !tx.validated);
    const selected = [];
    
    for (let i = 0; i < Math.min(2, unvalidatedTxs.length); i++) {
      const randomIndex = Math.floor(Math.random() * unvalidatedTxs.length);
      if (!selected.includes(unvalidatedTxs[randomIndex].id)) {
        selected.push(unvalidatedTxs[randomIndex].id);
      }
    }
    
    return selected;
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
      // Simula Proof of Work (pequeno delay)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Valida duas transações anteriores
      const validatedTxs = validateTwoTransactions();

      // Cria nova transação
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

      // Atualiza transações validadas
      const updatedTransactions = allTransactions.map(tx => 
        validatedTxs.includes(tx.id) ? { ...tx, validated: true } : tx
      );

      // Adiciona nova transação
      const finalTransactions = [...updatedTransactions, newTransaction];

      // Atualiza saldos
      const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
      users[username].balance -= amountNum;
      
      // Simula encontrar o destinatário e atualizar seu saldo
      const recipient = Object.keys(users).find(user => users[user].address === toAddress);
      if (recipient) {
        users[recipient].balance += amountNum;
      }

      // Salva tudo
      localStorage.setItem('iotaUsers', JSON.stringify(users));
      localStorage.setItem('iotaTransactions', JSON.stringify(finalTransactions));

      loadUserData();
      loadAllTransactions();

      toast({
        title: "Transação enviada!",
        description: `${validatedTxs.length} transações validadas no processo`
      });

      setToAddress('');
      setAmount('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar transação",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">CC Wallet</CardTitle>
                  <CardDescription>Bem-vindo, {username}</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Saldo */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold iota-gradient bg-clip-text text-transparent mb-2">
                {userInfo.balance.toFixed(2)} 0201N
              </div>
              <Badge variant="secondary" className="mb-4">
                Tokens IOTA Simulados
              </Badge>
              
              <div className="mt-6">
                <Label className="text-sm font-medium">Seu endereço da carteira:</Label>
                <div className="flex items-center mt-2 p-3 bg-gray-100 rounded-lg">
                  <code className="flex-1 text-sm break-all">{userInfo.address}</code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(userInfo.address)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Enviar Tokens</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Enviar Tokens
                </CardTitle>
                <CardDescription>
                  Cada transação valida duas transações anteriores (IOTA Tangle)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to-address">Endereço de destino</Label>
                  <Input
                    id="to-address"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Quantidade (0201N)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={userInfo.balance}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleSendTransaction}
                  disabled={isLoading}
                  className="w-full iota-gradient text-white"
                >
                  {isLoading ? "Processando..." : "Enviar Transação"}
                </Button>

                {isLoading && (
                  <div className="text-center text-sm text-muted-foreground">
                    Executando Proof of Work e validando transações...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Suas transações na rede IOTA Tangle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getUserTransactions().length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma transação encontrada
                    </div>
                  ) : (
                    getUserTransactions().map((tx) => (
                      <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {tx.from === userInfo.address ? 'Enviado' : 'Recebido'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${tx.from === userInfo.address ? 'text-red-600' : 'text-green-600'}`}>
                              {tx.from === userInfo.address ? '-' : '+'}{tx.amount} 0201N
                            </div>
                            <Badge variant={tx.validated ? "default" : "secondary"}>
                              {tx.validated ? 'Validado' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-xs space-y-1">
                          <div>Hash: <code className="bg-gray-100 px-1 rounded">{tx.hash}</code></div>
                          {tx.validates.length > 0 && (
                            <div>
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
        </Tabs>

        {/* Estatísticas da Rede */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Estatísticas da Rede Tangle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{allTransactions.length}</div>
                <div className="text-sm text-muted-foreground">Total de Transações</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {allTransactions.filter(tx => tx.validated).length}
                </div>
                <div className="text-sm text-muted-foreground">Validadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {allTransactions.filter(tx => !tx.validated).length}
                </div>
                <div className="text-sm text-muted-foreground">Pendentes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(JSON.parse(localStorage.getItem('iotaUsers') || '{}')).length}
                </div>
                <div className="text-sm text-muted-foreground">Usuários</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
