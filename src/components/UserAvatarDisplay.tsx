import React from 'react';
import { Crown } from 'lucide-react';
import { useUsersContext } from '../contexts/UsersContext';
import { FirestoreImage } from './FirestoreImage';

import { AdminCrown } from './AdminCrown';

interface UserAvatarDisplayProps {
  userId: string;
  name: string;
}

export const UserAvatarDisplay: React.FC<UserAvatarDisplayProps> = ({ userId, name }) => {
  const { users } = useUsersContext();
  const user = users[userId];

  const avatar = user?.avatar;
  const isAdmin = userId === 'admin' || name === '관리자' || user?.role === 'admin';

  if (isAdmin) {
    return <AdminCrown size={18} />;
  }

  if (avatar) {
    return <FirestoreImage src={avatar} alt={name} className="w-full h-full object-cover" />;
  }

  return <>{name.charAt(0)}</>;
};
