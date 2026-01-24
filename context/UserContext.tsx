import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
  email: string;
  name: string;
  credits: number;
  isMember: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'production' | 'donation';
  amount: number;
  userEmail: string;
  details?: string;
}

interface UserContextType {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  addCredits: (amount: number, isPurchase?: boolean, pricePaid?: number) => void;
  recordDonation: (amount: number) => void;
  deductCredit: () => boolean; 
  isLoading: boolean;
  isAdmin: boolean; 
  enableAdmin: () => void;
  logoutAdmin: () => void;
  getAllUsers: () => User[];
  getAllTransactions: () => Transaction[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_SESSION_KEY = 'willwi_user_v3';
const USERS_DB_KEY = 'willwi_users_v3';
const ADMIN_SESSION_KEY = 'willwi_admin_session';
const TRANSACTIONS_KEY = 'willwi_transactions_v1';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    try {
        const storedUser = localStorage.getItem(USER_SESSION_KEY);
        if (storedUser) setUser(JSON.parse(storedUser));
        
        if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
            setIsAdmin(true);
        }
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

  const recordTransaction = (type: 'production' | 'donation', amount: number, details?: string) => {
      const db = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      const newTx: Transaction = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type,
          amount,
          userEmail: user?.email || 'anonymous',
          details
      };
      db.push(newTx);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(db));
  };

  const login = (name: string, email: string) => {
    const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
    let existing = db[email];
    if (!existing) {
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

  const enableAdmin = () => {
      setIsAdmin(true);
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  };

  const logoutAdmin = () => {
      setIsAdmin(false);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
  };

  const addCredits = (count: number, isPurchase = true, pricePaid = 0) => {
    if (user) {
      setUser(prev => prev ? { ...prev, credits: prev.credits + count } : null);
      if (isPurchase && pricePaid > 0) {
          recordTransaction('production', pricePaid, `Purchased ${count} credits`);
      }
    }
  };

  const recordDonation = (amount: number) => {
      recordTransaction('donation', amount, 'Thermal Support');
  };

  const deductCredit = () => {
    if (user && user.credits > 0) {
      setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      return true;
    }
    return false;
  };

  const getAllUsers = () => {
      const db = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
      return Object.values(db) as User[];
  };

  const getAllTransactions = () => {
      return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]') as Transaction[];
  };

  return (
    <UserContext.Provider value={{ user, login, logout, addCredits, recordDonation, deductCredit, isLoading, isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser error');
  return context;
};