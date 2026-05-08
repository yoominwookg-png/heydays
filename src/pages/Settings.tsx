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
import { useTheme } from '../contexts/ThemeContext';
import { Moon } from 'lucide-react';
import { AdminCrown } from '../components/AdminCrown';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useTheme();
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
  const [updatingMessage, setUpdatingMessage] = useState('');
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
      setIsUpdating(true);
      setUpdatingMessage('이미지 압축 중...');
      try {
        const compressedFile = await compressImage(file, { maxWidthOrHeight: 400, maxSizeMB: 0.1, quality: 0.6 });
        setAvatarFile(compressedFile);
        setAvatar(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error('Avatar processing failed:', err);
      } finally {
        setIsUpdating(false);
        setUpdatingMessage('');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const trimmedName = editName.trim();
    if (trimmedName.length === 0) {
      alert('이름을 입력해주세요.');
      return;
    }
    
    setIsUpdating(true);
    setUpdatingMessage('프로필 업데이트 중...');
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        // Delete previous avatar if it exists and is a firestore ref
        if (user.avatar && user.avatar.startsWith('firestore://')) {
          await StorageService.deleteFile(user.avatar);
        }
        const path = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;
        avatarUrl = await StorageService.uploadFile(path, avatarFile, { maxWidthOrHeight: 400, maxSizeMB: 0.1, quality: 0.6 });
      }

      const updatedAvatarUrl = avatarUrl;
      await StorageService.updateUser(user.id, { 
        name: trimmedName, 
        bio: editBio,
        avatar: updatedAvatarUrl
      });
      setAvatar(updatedAvatarUrl);
      setAvatarFile(null);
      await refreshUsers();
      alert('프로필이 수정되었습니다.');
    } catch (error) {
      console.error(error);
      alert('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
      setUpdatingMessage('');
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
        <p className="text-slate-500 dark:text-slate-400 font-medium">프로필 및 화면 테마 설정</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Account Management */}
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
                    <UserAvatarDisplay 
                      userId={user?.id || ''} 
                      name={user?.name || ''} 
                      avatarOverride={avatar}
                      className="w-24 h-24 border-4 border-slate-100 dark:border-slate-800 shadow-xl group-hover:border-indigo-600 transition-all cursor-pointer"
                      size={48}
                    />
                    <label className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform cursor-pointer hover:bg-indigo-700">
                      <Camera size={14} strokeWidth={3} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
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
                    {isUpdating ? (updatingMessage || "처리 중...") : "프로필 수정"}
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
        </div>

        {/* Display Settings */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-full">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Sun className="text-indigo-600 dark:text-indigo-400" size={24} /> 화면 테마
            </h3>
            
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              사용자의 취향에 맞춰 밝은 테마 또는 어두운 테마를 선택할 수 있습니다. 
              기본적으로 시스템 설정과 동기화됩니다.
            </p>

            <button 
              onClick={toggleDarkMode}
              className="w-full group relative overflow-hidden bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-600 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {isDarkMode ? (
                      <Moon className="text-indigo-400" size={24} />
                    ) : (
                      <Sun className="text-amber-500" size={24} />
                    )}
                  </div>
                  <div>
                    <p className="font-black dark:text-white uppercase tracking-tight">
                      {isDarkMode ? '다크 모드 활성화됨' : '라이트 모드 활성화됨'}
                    </p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                      클릭하여 테마 변경
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                  isDarkMode ? "bg-indigo-600" : "bg-slate-300"
                )}>
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform duration-300",
                    isDarkMode ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </div>
            </button>
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
                <UserAvatarDisplay 
                  userId={selectedUser.id} 
                  name={selectedUser.name} 
                  className="w-10 h-10 border-2 border-white dark:border-slate-800 shadow-sm"
                  size={20}
                />
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
