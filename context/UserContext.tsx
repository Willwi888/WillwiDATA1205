import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  deductCredit: () => boolean; // Returns true if successful
  isLoading: boolean;
  isAdmin: boolean; // Global Admin State
  enableAdmin: () => void; // Function to unlock admin
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('willwi_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Check for admin session
    const adminSession = localStorage.getItem('willwi_admin_unlocked');
    if (adminSession === 'true') {
        setIsAdmin(true);
    }

    setIsLoading(false);
  }, []);

  // Update local storage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('willwi_user_session', JSON.stringify(user));
      
      // PERSISTENCE LOGIC:
      // We update the "database" of users to ensure credits are saved for this email
      const userDb = JSON.parse(localStorage.getItem('willwi_users_db') || '{}');
      userDb[user.email] = {
          ...userDb[user.email], // Keep existing data if any
          name: user.name,
          email: user.email,
          credits: user.credits // Save current credits
      };
      localStorage.setItem('willwi_users_db', JSON.stringify(userDb));
    } else {
      localStorage.removeItem('willwi_user_session');
    }
  }, [user]);

  const login = (name: string, email: string) => {
    // 1. Check if user exists in our "DB"
    const userDb = JSON.parse(localStorage.getItem('willwi_users_db') || '{}');
    let existingUser = userDb[email];

    if (!existingUser) {
      // New User: Grant 1 Free Credit (First Time Experience)
      existingUser = {
        email,
        name: name,
        credits: 1, 
        isMember: false
      };
    } else {
        // Returning User: Update name, but KEEP existing credits
        existingUser.name = name;
        // Ensure credits field exists (for migration)
        if (existingUser.credits === undefined) existingUser.credits = 0;
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
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};