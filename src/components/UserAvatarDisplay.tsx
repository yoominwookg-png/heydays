import React from 'react';
import { useUsersContext } from '../contexts/UsersContext';
import { FirestoreImage } from './FirestoreImage';
import { AdminCrown } from './AdminCrown';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface UserAvatarDisplayProps {
  userId: string;
  name: string;
  className?: string;
  size?: number;
  avatarOverride?: string;
}

export const UserAvatarDisplay: React.FC<UserAvatarDisplayProps> = ({ 
  userId, 
  name, 
  className, 
  size = 18,
  avatarOverride
}) => {
  const { users } = useUsersContext();
  const user = users[userId];

  const avatar = avatarOverride !== undefined ? avatarOverride : user?.avatar;
  const isAdmin = user?.role === UserRole.ADMIN || userId === 'admin' || name === '관리자';

  return (
    <div className={cn(
      "flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-sm ring-1 ring-slate-100 dark:ring-slate-800",
      className || "w-10 h-10"
    )}>
      {isAdmin && !avatar ? (
        <AdminCrown size={size + 6} className="drop-shadow-sm" />
      ) : avatar ? (
        <FirestoreImage 
          src={avatar} 
          alt={name} 
          className="w-full h-full object-cover" 
          fallback={<span className="font-black text-indigo-600/30" style={{ fontSize: `${size * 0.6}px` }}>{name.charAt(0)}</span>}
        />
      ) : (
        <span className="font-black text-indigo-600 dark:text-indigo-400" style={{ fontSize: `${size * 0.6}px` }}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
};
