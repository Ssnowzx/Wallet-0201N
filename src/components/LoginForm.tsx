import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Importar auth e db do nosso arquivo de configuração
import { auth, db } from "@/firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface LoginFormProps {
  onLogin: (userId: string) => void; // Mudamos para passar o userId do Firebase
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState(''); // Mudamos para email
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent, isSignup: boolean = false) => {
    e.preventDefault();

    // Usaremos o campo "Nome" (email) e Senha
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos (Nome/Email e Senha)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        // Lógica de Cadastro com Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Criar documento do usuário no Firestore com saldo inicial
        await setDoc(doc(db, "users", user.uid), {
          email: user.email, // Salva o email no Firestore
          balance: 100,
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          transactions: []
        });

        toast({
          title: "Conta criada!",
          description: "Você ganhou 100 tokens 0201N iniciais!"
        });

        onLogin(user.uid);

      } else {
        // Lógica de Login com Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        toast({
          title: "Sucesso!",
          description: "Login realizado com sucesso."
        });

        onLogin(user.uid);
      }
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro interno";

      // Tratamento de erros específicos do Firebase Authentication
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "O nome/email fornecido já está em uso.";
          break;
        case 'auth/invalid-email':
          errorMessage = "O formato do nome/email é inválido.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "Operação não permitida. Contate o administrador.";
          break;
        case 'auth/weak-password':
          errorMessage = "A senha é muito fraca.";
          break;
        case 'auth/user-disabled':
          errorMessage = "Este usuário foi desativado.";
          break;
        case 'auth/user-not-found':
          errorMessage = "Nome/email não encontrado.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Senha incorreta.";
          break;
        default:
          console.error("Firebase Auth Error:", error.message);
          errorMessage = `Erro: ${error.message}`; // Exibe a mensagem de erro padrão do Firebase
      }

      toast({
        title: "Erro de Autenticação",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
            Sistema de simulação 0201N Tangle (DAG)
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
                  <Label htmlFor="email">Nome/Email</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Digite seu nome ou email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  <Label htmlFor="new-email">Nome/Email</Label>
                  <Input
                    id="new-email"
                    type="text"
                    placeholder="Escolha um nome ou email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  {isLoading ? "Criando..." : "Criar Conta (+100 tokens 0201N!)"}
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
