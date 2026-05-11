/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Send, 
  X,
  UserMinus,
  User as UserIcon
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { User, Message, UserRole } from '../types';
import { useAuth } from '../services/auth';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import UserBioModal from '../components/UserBioModal';
import { AdminCrown } from '../components/AdminCrown';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Members() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  useEffect(() => {
    // Use real-time listener for users
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => doc.data() as User);
      setUsers(allUsers);
    }, (error) => {
      console.error("Error fetching live members:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !messageContent.trim()) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      senderName: user.name,
      receiverId: selectedUser.id,
      receiverName: selectedUser.name,
      content: messageContent,
      createdAt: Date.now(),
      isRead: false
    };

    await StorageService.sendMessage(newMessage);
    
    await StorageService.addNotification({
      id: Math.random().toString(36).substr(2, 9),
      userId: selectedUser.id,
      title: `${user.name}님의 메시지`,
      content: messageContent.substring(0, 50),
      type: 'message',
      createdAt: Date.now(),
      isRead: false
    });

    setMessageContent('');
    setIsMessageOpen(false);
    setSelectedUser(null);
    alert('메시지를 보냈습니다.');
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const isDeleted = !!u.deletedAt;

    if (user?.role === UserRole.ADMIN) {
      if (activeTab === 'active') {
        return !isDeleted;
      } else {
        return isDeleted;
      }
    } else {
      const isPermanentlyDeleted = isDeleted && (Date.now() - (u.deletedAt || 0) > 24 * 60 * 60 * 1000);
      return !isPermanentlyDeleted; 
    }
  });

  const getIsOnline = (u: User) => {
    if (!u.lastActiveAt) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return u.lastActiveAt > fiveMinutesAgo;
  };

  const onlineCount = users.filter(u => !u.deletedAt && getIsOnline(u)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white uppercase">HayDays Members</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">헤이데이즈를 함께 만들어가는 멤버들</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all",
              activeTab === 'active' 
                ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            활동 중
          </button>
          {user?.role === UserRole.ADMIN && (
            <button 
              onClick={() => setActiveTab('deleted')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all",
                activeTab === 'deleted' 
                  ? "bg-red-500 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              탈퇴 회원
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="멤버의 이름이나 아이디로 검색하세요..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold dark:text-white transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.map((u) => {
            const isDeleted = !!u.deletedAt;
            const isPermanentlyDeleted = isDeleted && (Date.now() - (u.deletedAt || 0) > 24 * 60 * 60 * 1000);
            
            if (isPermanentlyDeleted && user?.role !== UserRole.ADMIN) return null;

            return (
              <motion.div 
                key={u.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onDoubleClick={() => setViewingBioUser(u)}
                className={cn(
                  "flex items-center justify-between p-5 rounded-3xl group transition-all cursor-pointer relative overflow-hidden border",
                  isDeleted 
                    ? "bg-red-50/30 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 opacity-75" 
                    : "bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-lg hover:shadow-indigo-600/5"
                )}
                title="더블 클릭하여 자기소개 보기"
              >
                <div className="flex items-center gap-4">
                  {u.role !== UserRole.ADMIN ? (
                    <div className="relative">
                      <UserAvatarDisplay 
                        userId={u.id} 
                        name={u.name} 
                        className="w-12 h-12 border-2 border-white dark:border-slate-800 shadow-sm"
                        size={24}
                      />
                      {isDeleted && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                          <UserMinus size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center">
                      <AdminCrown size={32} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={cn("font-black tracking-tight dark:text-white", isDeleted && "line-through text-slate-500", u.role === UserRole.ADMIN && "text-indigo-600 dark:text-indigo-400")}>{u.name}</p>
                      {getIsOnline(u) && !isDeleted && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      )}
                    </div>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      (isDeleted && user?.role === UserRole.ADMIN) 
                        ? "text-red-500 dark:text-red-400 animate-pulse" 
                        : "text-slate-400 dark:text-slate-500"
                    )}>
                      {isDeleted && user?.role === UserRole.ADMIN 
                        ? '탈퇴 진행중' 
                        : (u.role === UserRole.ADMIN ? 'ADMINISTRATOR' : 'MEMBER')}
                    </p>
                  </div>
                </div>
                
                {u.id !== user?.id && !isDeleted && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setIsMessageOpen(true); }}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all md:opacity-0 group-hover:opacity-100 border border-slate-100 dark:border-slate-700"
                  >
                    <Send size={18} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
              <Users size={40} />
            </div>
            <p className="font-bold text-slate-400 text-lg">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      <UserBioModal user={viewingBioUser} onClose={() => setViewingBioUser(null)} />

      {/* Message Modal */}
      <AnimatePresence>
        {isMessageOpen && selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 dark:text-white">
                  <Send size={24} className="text-indigo-600" /> 메시지 보내기
                </h2>
                <button onClick={() => { setIsMessageOpen(false); setSelectedUser(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4 p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl mb-8 border border-indigo-100 dark:border-indigo-900/50">
                <div className="w-12 h-12 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : selectedUser.role === UserRole.ADMIN ? (
                    <AdminCrown size={24} />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center">
                      {selectedUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">To</p>
                  <p className="text-lg font-black text-indigo-900 dark:text-white leading-none">{selectedUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="relative">
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl py-5 px-6 pr-14 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 min-h-[180px] font-medium dark:text-white text-sm"
                  placeholder="보내고 싶은 내용을 입력해 주세요..."
                  required
                />
                <button 
                  type="submit"
                  className="absolute bottom-6 right-6 p-2 text-indigo-600 hover:text-indigo-700 transition-colors bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
                >
                  <Send size={20} />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
