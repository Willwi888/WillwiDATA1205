import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
  email: string;
  name: string;
  credits: number;
  isMember: boolean;
}

interface UserContextType {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  addCredits: (amount: number) => void;
  deductCredit: () => boolean; 
  isLoading: boolean;
  isAdmin: boolean; 
  enableAdmin: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_SESSION_KEY = 'willwi_user_v3';
const USERS_DB_KEY = 'willwi_users_v3';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    try {
        const storedUser = localStorage.getItem(USER_SESSION_KEY);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (localStorage.getItem('willwi_admin_unlocked') === 'true') setIsAdmin(true);
    } catch(e) {}
    setIsLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
      db[user.email] = user;
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
    }
  }, [user]);

  const login = (name: string, email: string) => {
    const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
    let existing = db[email];
    if (!existing) {
      // STRICT: 0 credits for new users. No free trial.
      existing = { email, name, credits: 0, isMember: false };
    } else {
        existing.name = name;
    }
    setUser(existing);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
  };

  const addCredits = (amount: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, credits: prev.credits + amount } : null);
  };

  const deductCredit = (): boolean => {
    if (!user) return false;
    if (user.credits > 0) {
      setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      return true;
    }
    return false;
  };

  const enableAdmin = () => {
      setIsAdmin(true);
      localStorage.setItem('willwi_admin_unlocked', 'true');
  };

  return (
    <UserContext.Provider value={{ user, login, logout, addCredits, deductCredit, isLoading, isAdmin, enableAdmin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser error');
  return context;
};
