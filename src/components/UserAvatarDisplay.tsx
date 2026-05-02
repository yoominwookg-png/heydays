import React from 'react';
import { Crown } from 'lucide-react';
import { useUsersContext } from '../contexts/UsersContext';

interface UserAvatarDisplayProps {
  userId: string;
  name: string;
}

export const UserAvatarDisplay: React.FC<UserAvatarDisplayProps> = ({ userId, name }) => {
  const { users } = useUsersContext();
  const user = users[userId];

  const avatar = user?.avatar;
  const isAdmin = userId === 'admin' || name === '관리자';

  if (avatar) {
    return <img src={avatar} alt={name} className="w-full h-full object-cover" />;
  }

  if (isAdmin) {
    return <Crown size={18} className="fill-indigo-600/20" />;
  }

  return <>{name.charAt(0)}</>;
};
