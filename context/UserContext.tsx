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
  deductCredit: () => boolean; // Returns true if successful
  isLoading: boolean;
  isAdmin: boolean; // Global Admin State
  enableAdmin: () => void; // Function to unlock admin
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_SESSION_KEY = 'willwi_user_session';
const USERS_DB_KEY = 'willwi_users_db';
const ADMIN_SESSION_KEY = 'willwi_admin_unlocked';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from local storage on mount
  const loadUser = useCallback(() => {
    try {
        const storedUser = localStorage.getItem(USER_SESSION_KEY);
        if (storedUser) {
           setUser(JSON.parse(storedUser));
        } else {
           setUser(null);
        }
        
        // Check for admin session
        const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
        if (adminSession === 'true') {
            setIsAdmin(true);
        }
    } catch(e) {
        console.error("Failed to load user session", e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
      loadUser();
  }, [loadUser]);

  // Sync across tabs
  useEffect(() => {
      const handleStorageChange = (e: StorageEvent) => {
          if (e.key === USER_SESSION_KEY || e.key === ADMIN_SESSION_KEY) {
              loadUser();
          }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUser]);

  // Update local storage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      
      // PERSISTENCE LOGIC:
      // We update the "database" of users to ensure credits are saved for this email
      const userDb = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
      userDb[user.email] = {
          ...userDb[user.email], // Keep existing data if any
          name: user.name,
          email: user.email,
          credits: user.credits // Save current credits
      };
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(userDb));
    } else if (!isLoading) {
       // Only clear if not loading (to avoid clearing on init before load)
       // But wait, if user is null, we should clear session key, but NOT the DB.
       const currentStored = localStorage.getItem(USER_SESSION_KEY);
       if (currentStored) {
           localStorage.removeItem(USER_SESSION_KEY);
       }
    }
  }, [user, isLoading]);

  const login = (name: string, email: string) => {
    // 1. Check if user exists in our "DB"
    const userDb = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
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
    localStorage.removeItem(USER_SESSION_KEY);
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
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
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