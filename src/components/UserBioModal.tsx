import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, RotateCcw, Send } from 'lucide-react';
import { AdminCrown } from './AdminCrown';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types';
import { useAuth } from '../services/auth';
import { StorageService } from '../services/storage';
import SendMessageModal from './SendMessageModal';

interface UserBioModalProps {
  user: User | null;
  onClose: () => void;
}

export default function UserBioModal({ user: initialUser, onClose }: UserBioModalProps) {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmPermanentDelete, setShowConfirmPermanentDelete] = useState(false);
  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const executeDelete = async () => {
    if (!user) return;
    await StorageService.deleteAccount(user.id);
    // refetch to update local state
    const updated = await StorageService.getUser(user.id);
    if (updated) setUser(updated);
    setShowConfirmDelete(false);
  };

  const executePermanentDelete = async () => {
    if (!user) return;
    if (confirm('바로 진행 하시겠습니까?')) {
      await StorageService.permanentlyDeleteAccount(user.id);
      alert('탈퇴가 완료되었습니다.');
      setShowConfirmPermanentDelete(false);
      onClose(); // Close modal since user is destroyed
    }
  };

  const handleRestore = async () => {

    if (!user) return;
    if (confirm('이 회원의 삭제를 취소하시겠습니까?')) {
      await StorageService.cancelDeleteAccount(user.id);
      const updated = await StorageService.getUser(user.id);
      if (updated) setUser(updated);
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isSelf = currentUser?.id === user?.id;
  const isDeleted = !!user?.deletedAt;
  const isPermanentlyDeleted = isDeleted && (Date.now() - (user?.deletedAt || 0) > 24 * 60 * 60 * 1000);

  return (
    <AnimatePresence>
      {user && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center p-4 md:pt-20 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            initial={{ y: -50, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -50, scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {isPermanentlyDeleted ? (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-6">
                  <Users size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">탈퇴한 회원 입니다</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  해당 회원의 정보는 볼 수 없습니다.
                </p>

                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black tracking-tight flex items-center gap-2 dark:text-white">
                    <Users size={20} className="text-indigo-600" /> 자기소개
                  </h2>
                  <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-6 relative overflow-hidden">
                  {isDeleted && isAdmin && (
                    <div className="absolute inset-0 bg-red-500/10 flex items-center justify-end pr-4 pointer-events-none">
                      <span className="text-red-500 font-bold text-xs uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded">
                        탈퇴 진행중 (24시간 유예)
                      </span>
                    </div>
                  )}
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 overflow-visible shrink-0 transition-all"
                  >
                    {user.role === UserRole.ADMIN ? (
                      <AdminCrown size={24} />
                    ) : user.avatar ? (
                      <div className="w-full h-full rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-900/30">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        {user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`font-black text-lg ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{user.name}</p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {user.role === UserRole.ADMIN ? '관리자' : '일반회원'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl min-h-[120px] border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                    {isDeleted ? '탈퇴한 회원입니다.' : (user.bio || '자기소개가 없습니다.')}
                  </p>
                </div>

                {!isSelf && !isDeleted && (
                  <button 
                    onClick={() => setIsSendMessageModalOpen(true)}
                    className="w-full mt-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-2xl font-black hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} strokeWidth={3} />
                    <span>쪽지 보내기</span>
                  </button>
                )}

                {isAdmin && !isSelf && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    {isDeleted ? (
                      <>
                        <button 
                          onClick={() => setShowConfirmPermanentDelete(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors text-sm"
                        >
                          <Trash2 size={16} />
                          바로 탈퇴
                        </button>
                        <button 
                          onClick={handleRestore}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors text-sm"
                        >
                          <RotateCcw size={16} />
                          삭제 취소
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setShowConfirmDelete(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        회원 탈퇴
                      </button>
                    )}
                  </div>
                )}

                <button 
                  onClick={onClose}
                  className="w-full mt-4 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg"
                >
                  닫기
                </button>
              </>
            )}

            {/* 회원 삭제 확인 모달 (내부 모달) */}
            <AnimatePresence>
              {showConfirmDelete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center p-6 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full text-center shadow-xl border border-red-100 dark:border-red-900/50"
                  >
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">정말 삭제하시겠습니까?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                      회원 삭제 시 해당 회원은 로그인이 불가능하며,<br/>24시간 후 완전히 삭제됩니다.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmDelete(false)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        아니오
                      </button>
                      <button
                        onClick={executeDelete}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                      >
                        예
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* 영구 삭제 확인 모달 (내부 모달) */}
              {showConfirmPermanentDelete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center p-6 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 w-full text-center shadow-xl border border-red-200 dark:border-red-900/50"
                  >
                    <div className="w-16 h-16 bg-red-500/20 dark:bg-red-500/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">정말 영구 삭제하시겠습니까?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                      이 작업은 취소할 수 없으며,<br/>회원 데이터가 즉시 삭제됩니다.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmPermanentDelete(false)}
                        className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        아니오
                      </button>
                      <button
                        onClick={executePermanentDelete}
                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                      >
                        예
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
          
          <SendMessageModal 
            isOpen={isSendMessageModalOpen}
            onClose={() => setIsSendMessageModalOpen(false)}
            onSent={() => setIsSendMessageModalOpen(false)}
            initialRecipientId={user.id}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
