/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User as UserIcon, Search } from 'lucide-react';
import { User, Message, Notification } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../services/auth';
import { cn } from '../lib/utils';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
  initialRecipientId?: string;
}

export default function SendMessageModal({ isOpen, onClose, onSent, initialRecipientId }: SendMessageModalProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await StorageService.getUsers();
      // Filter out deleted users and current user
      const activeUsers = allUsers.filter(u => !u.deletedAt && u.id !== currentUser?.id);
      setUsers(activeUsers);
      
      if (initialRecipientId) {
        const recipient = activeUsers.find(u => u.id === initialRecipientId);
        if (recipient) setSelectedRecipient(recipient);
      }
    };
    if (isOpen) fetchUsers();
  }, [isOpen, currentUser, initialRecipientId]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!currentUser || !selectedRecipient || !content.trim()) return;

    setIsSending(true);
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: Message = {
        id: messageId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: selectedRecipient.id,
        receiverName: selectedRecipient.name,
        content: content.trim(),
        createdAt: Date.now(),
        isRead: false
      };

      await StorageService.sendMessage(newMessage);

      // Add notification for recipient
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        id: notifId,
        userId: selectedRecipient.id,
        title: '새로운 쪽지',
        content: `${currentUser.name}님으로부터 쪽지가 도착했습니다.`,
        type: currentUser.role === 'admin' ? 'admin' : 'message',
        createdAt: Date.now(),
        isRead: false
      };
      await StorageService.addNotification(newNotification);

      onSent();
      setContent('');
      setSelectedRecipient(null);
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Send className="text-indigo-600 dark:text-indigo-400" size={24} /> 쪽지 보내기
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Recipient Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">받는 사람</label>
                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                        {selectedRecipient.avatar ? (
                          <img src={selectedRecipient.avatar} className="w-full h-full object-cover rounded-xl" alt="" />
                        ) : selectedRecipient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{selectedRecipient.name}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase">Selected</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedRecipient(null)}
                      className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors text-indigo-600 dark:text-indigo-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="이름으로 회원 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 outline-none rounded-2xl font-medium transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredUsers.length > 0 ? filteredUsers.map(u => (
                        <button 
                          key={u.id}
                          onClick={() => setSelectedRecipient(u)}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700 text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} className="w-full h-full object-cover rounded-xl" alt="" />
                            ) : u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-slate-100">{u.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Member</p>
                          </div>
                        </button>
                      )) : (
                        <p className="text-center py-6 text-slate-400 text-sm font-medium">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">쪽지 내용</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="보낼 내용을 입력하세요..."
                  className="w-full h-40 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 outline-none rounded-3xl font-medium transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                취소
              </button>
              <button 
                onClick={handleSend}
                disabled={!selectedRecipient || !content.trim() || isSending}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} strokeWidth={3} />
                    <span>전송하기</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
