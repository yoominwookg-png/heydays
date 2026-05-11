import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, UserX, UserCheck, Users, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { UserAvatarDisplay } from './UserAvatarDisplay';
import { cn } from '../lib/utils';

interface UserAccessStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
}

type TabType = 'weekly' | 'inactive';

export const UserAccessStatusModal: React.FC<UserAccessStatusModalProps> = ({ isOpen, onClose, users }) => {
  const [activeTab, setActiveTab] = useState<TabType>('weekly');

  const now = Date.now();
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;
  const inactiveCutoff = now - 30 * 24 * 60 * 60 * 1000;

  const weeklyUsers = users.filter(u => u.lastActiveAt && u.lastActiveAt >= weekStart)
    .sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));

  const inactiveUsers = users.filter(u => !u.lastActiveAt || u.lastActiveAt < inactiveCutoff)
    .sort((a, b) => (b.lastActiveAt || b.createdAt) - (a.lastActiveAt || a.createdAt));

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '기록 없음';
    const date = new Date(timestamp);
    const diff = now - timestamp;
    
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
    
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'weekly': return { 
        title: '주간 접속 회원', 
        count: weeklyUsers.length, 
        list: weeklyUsers,
        icon: <Calendar size={20} />,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      };
      case 'inactive': return { 
        title: '장기 미접속 회원', 
        count: inactiveUsers.length, 
        list: inactiveUsers,
        icon: <UserX size={20} />,
        color: 'text-rose-600',
        bg: 'bg-rose-50'
      };
    }
  };

  const currentData = getTabData();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter dark:text-white">회원 접속 현황</h2>
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">시스템 접근 로그 분석 요약</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs like bookmarks */}
              <div className="flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl">
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-sm transition-all",
                    activeTab === 'weekly' 
                      ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <Calendar size={16} />
                  <span>주간</span>
                  {weeklyUsers.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/10 text-[10px] rounded-md">{weeklyUsers.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-sm transition-all",
                    activeTab === 'inactive' 
                      ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <UserX size={16} />
                  <span>장기 미접속</span>
                  {inactiveUsers.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-rose-500/10 text-[10px] rounded-md">{inactiveUsers.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", currentData.bg, currentData.color)}>
                    {currentData.icon}
                  </div>
                  <h3 className="font-black text-xl dark:text-white">{currentData.title}</h3>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full">
                  <span className="text-sm font-black text-slate-500 dark:text-slate-400">총 {currentData.count}명</span>
                </div>
              </div>

              {currentData.list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700">
                  <Users size={64} strokeWidth={1} className="mb-4 opacity-50" />
                  <p className="font-black">해당하는 회원이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentData.list.map((u) => (
                    <div 
                      key={u.id}
                      className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-transparent rounded-3xl hover:border-slate-200 dark:hover:border-slate-700 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-4">
                        <UserAvatarDisplay userId={u.id} name={u.name} className="w-12 h-12" size={24} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white capitalize">{u.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={10} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                              최종 접속: {formatTime(u.lastActiveAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full">
                          Detail
                        </span>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400">
                헤이데이즈 관리자 전용 데이터 로그
              </p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm shadow-lg shadow-slate-900/10 transition-transform active:scale-95"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
