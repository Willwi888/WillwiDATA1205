import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
  credits: number;
  isMember: boolean;
}

interface UserContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  addCredits: (amount: number) => void;
  deductCredit: () => boolean; // Returns true if successful
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('willwi_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Update local storage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('willwi_user_session', JSON.stringify(user));
      // Also update the "database" of users to persist credits across logins
      const userDb = JSON.parse(localStorage.getItem('willwi_users_db') || '{}');
      userDb[user.email] = user;
      localStorage.setItem('willwi_users_db', JSON.stringify(userDb));
    } else {
      localStorage.removeItem('willwi_user_session');
    }
  }, [user]);

  const login = (email: string) => {
    const userDb = JSON.parse(localStorage.getItem('willwi_users_db') || '{}');
    let existingUser = userDb[email];

    if (!existingUser) {
      // New User: Grant 1 Free Credit
      existingUser = {
        email,
        name: email.split('@')[0],
        credits: 1,
        isMember: false
      };
    }

    setUser(existingUser);
  };

  const logout = () => {
    setUser(null);
  };

  const addCredits = (amount: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, credits: prev.credits + amount } : null);
    alert(`儲值成功！已增加 ${amount} 點額度。`);
  };

  const deductCredit = (): boolean => {
    if (!user) return false;
    if (user.credits > 0) {
      setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      return true;
    }
    return false;
  };

  return (
    <UserContext.Provider value={{ user, login, logout, addCredits, deductCredit, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
