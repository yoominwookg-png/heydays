/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  Sun, 
  Send, 
  Shield, 
  X,
  Crown,
  ChevronRight,
  Search,
  MessageCircle,
  Trash2,
  UserMinus,
  Camera,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { User, Message, Notification, UserRole } from '../types';
import { useAuth } from '../services/auth';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import UserBioModal from '../components/UserBioModal';
import { useUsersContext } from '../contexts/UsersContext';

export default function Settings() {
  const { user } = useAuth();
  const { refreshUsers } = useUsersContext();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditBio(user.bio || '');
      setAvatar(user.avatar);
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { compressImage } = await import('../lib/imageCompression');
      try {
        const compressedFile = await compressImage(file);
        setAvatarFile(compressedFile);
        setAvatar(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error('Avatar processing failed:', err);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        const path = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;
        avatarUrl = await StorageService.uploadFile(path, avatarFile);
      }

      await StorageService.updateUser(user.id, { 
        name: editName, 
        bio: editBio,
        avatar: avatarUrl
      });
      await refreshUsers();
      alert('프로필이 수정되었습니다.');
    } catch (error) {
      console.error(error);
      alert('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await StorageService.deleteAccount(user.id);
      setIsDeleting(false);
      alert('계정 삭제가 요청되었습니다. 24시간 이내에 로그인하여 취소할 수 있습니다.');
      window.location.reload(); // Refresh to show deletion state or handle it
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    try {
      await StorageService.cancelDeleteAccount(user.id);
      alert('계정 삭제 요청이 취소되었습니다.');
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      const allUsers = await StorageService.getUsers();
      setUsers(allUsers);
      if (user) {
        const userMessages = await StorageService.getMessages(user.id);
        setMessages(userMessages);
      }
    };
    fetchData();
  }, [user]);

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
    
    // Add a notification for the receiver
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

  const confirmDeleteMessage = async () => {
    if (messageToDelete) {
      await StorageService.deleteMessage(messageToDelete.id);
      setMessageToDelete(null);
      if (user) {
        const userMessages = await StorageService.getMessages(user.id);
        setMessages(userMessages);
      }
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white">환경설정</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">환경 설정 및 회원 관리</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Account Management & Messages */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Shield className="text-indigo-600 dark:text-indigo-400" size={24} /> 계정 관리
            </h3>
            
            {user?.deletedAt ? (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-4">
                  탈퇴 요청 중입니다. (요청 시각: {formatDate(user.deletedAt)})<br />
                  24시간 이내에 취소하지 않으면 계정이 영구 삭제됩니다.
                </p>
                <button 
                  onClick={handleCancelDeletion}
                  className="w-full py-3 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-xl font-black border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                >
                  탈퇴 취소하기
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-600 group-hover:shadow-xl group-hover:shadow-indigo-600/10">
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={32} className="text-slate-300 dark:text-slate-500" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                      <Camera size={14} strokeWidth={3} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">프로필 사진 변경</p>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase ml-1">이름</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase ml-1">소개</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white mt-1 min-h-[80px]"
                    placeholder="자기소개를 입력하세요..."
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    disabled={isUpdating}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                  >
                    프로필 수정
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsDeleting(true)}
                    className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl font-black border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                  >
                    탈퇴
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <MessageCircle className="text-green-500" size={24} /> 내 쪽지함
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {messages.filter(m => m.receiverId === user?.id).map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 relative group/msg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{m.senderName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(m.createdAt)}</span>
                      <button 
                        onClick={() => setMessageToDelete(m)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.content}</p>
                </div>
              ))}
              {messages.filter(m => m.receiverId === user?.id).length === 0 && (
                <p className="text-center py-8 text-slate-400 font-bold text-sm">받은 쪽지가 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        {/* Member List */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 
                onClick={() => user?.role === UserRole.ADMIN ? setActiveTab('active') : undefined}
                className={cn(
                  "text-xl font-black flex items-center gap-3 transition-colors",
                  user?.role === UserRole.ADMIN ? "cursor-pointer select-none" : "",
                  (user?.role !== UserRole.ADMIN || activeTab === 'active') ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <Users className={cn((user?.role !== UserRole.ADMIN || activeTab === 'active') ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} size={24} /> 회원 리스트
              </h3>
              {user?.role === UserRole.ADMIN && (
                <>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                  <h3 
                    onClick={() => setActiveTab('deleted')}
                    className={cn(
                      "text-xl font-black flex items-center gap-3 cursor-pointer select-none transition-colors",
                      activeTab === 'deleted' ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >
                    <UserMinus className={cn(activeTab === 'deleted' ? "text-red-500" : "text-slate-400")} size={24} /> 탈퇴 회원
                  </h3>
                </>
              )}
            </div>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="회원 검색..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white"
            />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
            {filteredUsers.map((u) => {
              const isDeleted = !!u.deletedAt;
              const isPermanentlyDeleted = isDeleted && (Date.now() - (u.deletedAt || 0) > 24 * 60 * 60 * 1000);
              
              if (isPermanentlyDeleted && user?.role !== UserRole.ADMIN) return null;

              return (
              <div 
                key={u.id} 
                onDoubleClick={() => setViewingBioUser(u)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl group transition-all cursor-pointer relative overflow-hidden",
                  isDeleted ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-70" : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                title="더블 클릭하여 자기소개 보기"
              >
                {isDeleted && user?.role === UserRole.ADMIN && (
                  <div className="absolute right-0 top-0 bottom-0 bg-red-100 dark:bg-red-900/30 flex items-center px-3 border-l border-red-200 dark:border-red-900/50">
                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                      {isPermanentlyDeleted ? '영구 삭제됨' : '삭제 진행중'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    ) : u.role === UserRole.ADMIN ? (
                      <Crown size={18} className="fill-indigo-600/20" />
                    ) : (
                      u.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={cn("font-bold text-slate-800 dark:text-slate-100", isDeleted && "line-through text-slate-500")}>{u.name}</p>
                      {u.role === UserRole.ADMIN && (
                        <Crown size={12} className="text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
                      )}
                    </div>
                  </div>
                </div>
                {u.id !== user?.id && !isPermanentlyDeleted && (
                  <button 
                    onClick={() => { setSelectedUser(u); setIsMessageOpen(true); }}
                    className={cn(
                      "p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10",
                      isDeleted ? "bg-white/50 dark:bg-slate-900/50 text-red-400 hover:text-red-600" : "bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 hover:shadow-md"
                    )}
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            )})}
          </div>
        </div>
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2 dark:text-white">
                  <Send size={20} className="text-indigo-600" /> 쪽지 보내기
                </h2>
                <button onClick={() => { setIsMessageOpen(false); setSelectedUser(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl mb-6">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 overflow-hidden">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : selectedUser.role === UserRole.ADMIN ? (
                    <Crown size={18} className="fill-indigo-600/20" />
                  ) : (
                    selectedUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-400">받는 사람</p>
                  <p className="font-black text-indigo-900 dark:text-white">{selectedUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 min-h-[150px] font-medium dark:text-white"
                  placeholder="쪽지 내용을 입력하세요..."
                  required
                />
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all">
                  보내기
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">정말 탈퇴하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">탈퇴 후 24시간 동안 유예 기간이 주어지며,<br />그 이후에는 모든 데이터가 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all"
                >
                  탈퇴하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {messageToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">쪽지를 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">받은 쪽지함에서 해당 쪽지가<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setMessageToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  아니요
                </button>
                <button 
                  onClick={confirmDeleteMessage}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all"
                >
                  예
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
