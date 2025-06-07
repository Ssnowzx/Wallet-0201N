
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Send, LogOut, Wallet as WalletIcon, Activity, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>

      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CC Wallet</h1>
              <p className="text-sm text-gray-600">Olá, {username}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-20">
        {/* Card do Saldo - Estilo Mobile */}
        <Card className="glass-effect overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <p className="text-sm text-gray-600">Saldo Total</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="h-6 w-6 p-0"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="space-y-2">
                {showBalance ? (
                  <div className="text-4xl font-bold text-gray-900">
                    {userInfo.balance.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-gray-900">
                    ••••••
                  </div>
                )}
                <Badge variant="secondary" className="text-xs">
                  0201N Tokens
                </Badge>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <Label className="text-xs font-medium text-gray-600 block mb-2">
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
                    className="ml-2 h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs - Estilo Mobile */}
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="send" className="text-sm">Enviar</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4 space-y-4">
            <Card className="glass-effect">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Send className="w-5 h-5 mr-2" />
                  Enviar 0201N
                </CardTitle>
                <CardDescription className="text-sm">
                  Cada transação valida duas transações anteriores no Tangle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to-address" className="text-sm font-medium">
                    Endereço de destino
                  </Label>
                  <Input
                    id="to-address"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="font-mono text-sm h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">
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
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Máximo: {userInfo.balance.toFixed(2)} 0201N
                  </p>
                </div>

                <Button 
                  onClick={handleSendTransaction}
                  disabled={isLoading}
                  className="w-full h-12 iota-gradient text-white font-semibold"
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

          <TabsContent value="history" className="mt-4 space-y-4">
            <Card className="glass-effect">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Transações</CardTitle>
                <CardDescription className="text-sm">
                  Histórico na rede 0201N Tangle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getUserTransactions().length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma transação encontrada
                    </div>
                  ) : (
                    getUserTransactions().map((tx) => (
                      <div key={tx.id} className="border rounded-xl p-4 space-y-3 bg-white/50">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {tx.from === userInfo.address ? 'Enviado' : 'Recebido'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className={`font-bold text-sm ${tx.from === userInfo.address ? 'text-red-600' : 'text-green-600'}`}>
                              {tx.from === userInfo.address ? '-' : '+'}{tx.amount} 0201N
                            </div>
                            <Badge variant={tx.validated ? "default" : "secondary"} className="text-xs">
                              {tx.validated ? 'Validado' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-xs space-y-1 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Hash:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
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
        </Tabs>

        {/* Estatísticas da Rede */}
        <Card className="glass-effect">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Rede 0201N Tangle</CardTitle>
            <CardDescription className="text-sm">
              Estatísticas em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/50 rounded-xl">
                <div className="text-xl font-bold text-primary">{allTransactions.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-xl">
                <div className="text-xl font-bold text-green-600">
                  {allTransactions.filter(tx => tx.validated).length}
                </div>
                <div className="text-xs text-muted-foreground">Validadas</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-xl">
                <div className="text-xl font-bold text-orange-600">
                  {allTransactions.filter(tx => !tx.validated).length}
                </div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-xl">
                <div className="text-xl font-bold text-purple-600">
                  {Object.keys(JSON.parse(localStorage.getItem('iotaUsers') || '{}')).length}
                </div>
                <div className="text-xs text-muted-foreground">Usuários</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
