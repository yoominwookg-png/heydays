import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../services/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UsersContextType {
  users: Record<string, User>;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<Record<string, User>>({});

  const refreshUsers = async () => {
    // Manual refresh fallback
    const fetchedUsers = await StorageService.getUsers();
    const mapped = fetchedUsers.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, User>);
    setUsers(mapped);
  };

  useEffect(() => {
    if (!user || authLoading) {
      setUsers({});
      return;
    }

    // Real-time listener for all users
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data() as User;
        acc[data.id] = data;
        return acc;
      }, {} as Record<string, User>);
      setUsers(mapped);
    }, (error) => {
      console.error('Real-time users fetch failed:', error);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  return (
    <UsersContext.Provider value={{ users, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsersContext must be used within a UsersProvider');
  }
  return context;
};
