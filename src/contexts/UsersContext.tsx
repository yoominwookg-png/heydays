import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface UsersContextType {
  users: Record<string, User>;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<Record<string, User>>({});

  const refreshUsers = async () => {
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
    refreshUsers();
  }, []);

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
