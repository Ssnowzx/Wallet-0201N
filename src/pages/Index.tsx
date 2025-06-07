
import React, { useState, useEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import Wallet from '@/components/Wallet';

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Verifica se há um usuário logado
    const loggedUser = localStorage.getItem('currentUser');
    if (loggedUser) {
      setCurrentUser(loggedUser);
    }
  }, []);

  const handleLogin = (username: string) => {
    localStorage.setItem('currentUser', username);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen">
      {currentUser ? (
        <Wallet username={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
};

export default Index;
