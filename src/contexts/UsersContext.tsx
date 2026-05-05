import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../services/auth';

interface UsersContextType {
  users: Record<string, User>;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<Record<string, User>>({});

  const refreshUsers = async () => {
    if (!user) return;
    try {
      const fetchedUsers = await StorageService.getUsers();
      const numUsers = fetchedUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, User>);
      setUsers(numUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      refreshUsers();
    } else if (!user && !authLoading) {
      setUsers({});
    }
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
