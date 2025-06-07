
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent, isSignup: boolean = false) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem('iotaUsers') || '{}');
      
      if (isSignup) {
        if (users[username]) {
          toast({
            title: "Erro",
            description: "Usuário já existe",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        
        // Criar novo usuário com 100 tokens iniciais
        users[username] = {
          password,
          balance: 100,
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          transactions: []
        };
        
        localStorage.setItem('iotaUsers', JSON.stringify(users));
        
        toast({
          title: "Conta criada!",
          description: "Você ganhou 100 tokens 0201N iniciais!"
        });
        
        onLogin(username);
      } else {
        if (!users[username] || users[username].password !== password) {
          toast({
            title: "Erro",
            description: "Usuário ou senha incorretos",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        
        onLogin(username);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro interno",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      
      <Card className="w-full max-w-md glass-effect">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <div className="text-2xl font-bold text-white">CC</div>
          </div>
          <CardTitle className="text-2xl font-bold">CC Wallet</CardTitle>
          <CardDescription>
            Sistema de simulação IOTA Tangle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu nome"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 iota-gradient text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Nome de usuário</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="Escolha um nome"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Escolha uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 iota-gradient text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Criar Conta (+100 tokens!)"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
