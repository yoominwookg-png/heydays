/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Trash2,
  Bell,
  Send,
  Plus,
  X
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { Message } from '../types';
import { useAuth } from '../services/auth';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import SendMessageModal from '../components/SendMessageModal';
import { AdminCrown } from '../components/AdminCrown';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isProcessingClear, setIsProcessingClear] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'messages'), 
        where('receiverId', '==', user.id)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => doc.data() as Message)
          .sort((a, b) => b.createdAt - a.createdAt);
        setMessages(msgs);
      }, (error) => {
        console.error("Message listener error:", error);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const confirmDeleteMessage = async () => {
    if (messageToDelete) {
      await StorageService.deleteMessage(messageToDelete.id);
      setMessageToDelete(null);
    }
  };

  const handleClearMessages = async () => {
    if (user) {
      setIsProcessingClear(true);
      try {
        await StorageService.clearMessages(user.id);
      } catch (error) {
        console.error("Clear messages failed:", error);
      } finally {
        setIsProcessingClear(false);
        setIsClearingAll(false);
      }
    }
  };

  const receivedMessages = messages; // Already filtered by query

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white leading-none">내 쪽지함</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">관리자 및 회원들로부터 받은 쪽지</p>
        </div>
        <button 
          onClick={() => setIsSendModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          <span>쪽지 보내기</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black flex items-center gap-3">
            <MessageCircle className="text-indigo-600 dark:text-indigo-400" size={24} /> 받은 쪽지
          </h3>
          {receivedMessages.length > 0 && (
            <button 
              onClick={() => setIsClearingAll(true)}
              className="text-xs font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              전체 삭제
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {receivedMessages.map((m) => {
            const isAdmin = m.senderName === '관리자';
            return (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-3xl border relative group/msg transition-all shadow-sm",
                  isAdmin 
                    ? "message-gold"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                      isAdmin 
                        ? "bg-transparent border-0 overflow-visible"
                        : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    )}>
                      {isAdmin ? (
                        <AdminCrown size={20} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
                      ) : (
                        m.senderName.charAt(0)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-sm font-black",
                        isAdmin ? "sender-name" : "text-slate-800 dark:text-slate-100"
                      )}>{m.senderName}</span>
                      {isAdmin && <span className="sender-tag">ADMIN</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[11px] font-bold",
                      isAdmin ? "text-amber-600/60 dark:text-amber-400/50" : "text-slate-400 dark:text-slate-500"
                    )}>{formatDate(m.createdAt)}</span>
                    <button 
                      onClick={() => setMessageToDelete(m)}
                      className={cn(
                        "p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all rounded-xl shadow-sm",
                        isAdmin ? "bg-amber-50 dark:bg-amber-900/40" : "bg-white dark:bg-slate-900"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className={cn(
                  "text-sm font-medium leading-relaxed whitespace-pre-wrap",
                  isAdmin ? "message-content" : "text-slate-700 dark:text-slate-300"
                )}>{m.content}</p>
              </motion.div>
            );
          })}
          
          {receivedMessages.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                <Bell size={24} />
              </div>
              <p className="font-bold text-slate-400">받은 쪽지가 하나도 없네요.</p>
            </div>
          )}
        </div>
      </div>

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
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">쪽지를 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">받은 쪽지함에서 해당 쪽지가<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setMessageToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black"
                >
                  아니요
                </button>
                <button 
                  onClick={confirmDeleteMessage}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 font-black"
                >
                  예
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isClearingAll && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">모든 쪽지를 삭제할까요?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">나에게 도착한 모든 쪽지가<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsClearingAll(false)}
                  disabled={isProcessingClear}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 font-black"
                >
                  아니요
                </button>
                <button 
                  onClick={handleClearMessages}
                  disabled={isProcessingClear}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 font-black"
                >
                  {isProcessingClear ? '삭제 중...' : '예'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SendMessageModal 
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
}
