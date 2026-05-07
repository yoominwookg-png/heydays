/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Users, 
  Database, 
  Shield, 
  ChevronRight,
  Send,
  AlertTriangle,
  Settings as SettingsIcon,
  UserCheck
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { useAuth } from '../services/auth';
import { User, Notification, UserRole } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatStorageModal } from '../components/ChatStorageModal';
import { FolderClock } from 'lucide-react';

export default function AdminCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [pushTitle, setPushTitle] = useState('');
  const [pushContent, setPushContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isChatStorageOpen, setIsChatStorageOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) {
      if (user) navigate('/');
      return;
    }
    
    // Real-time listener for users to sync active member count
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => doc.data() as User);
      setUsers(allUsers);
    }, (error) => {
      console.error("Error fetching real-time users:", error);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const allActiveUsers = users.filter(u => !u.deletedAt);
  const onlineCount = allActiveUsers.filter(u => {
    if (!u.lastActiveAt) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return u.lastActiveAt > fiveMinutesAgo;
  }).length;

  const handleSyncCommentCounts = async () => {
    if (confirm('모든 게시글의 댓글 수를 실제 데이터와 대조하여 동기화하시겠습니까? 데이터가 많을 경우 시간이 걸릴 수 있습니다.')) {
      setIsSyncing(true);
      try {
        const allPosts = await StorageService.getPosts();
        let updatedCount = 0;
        
        for (const post of allPosts) {
          const comments = await StorageService.getComments(post.id);
          if (post.commentCount !== comments.length) {
            await StorageService.syncCommentCount(post.id, comments.length);
            updatedCount++;
          }
        }
        
        alert(`동기화 완료! 총 ${allPosts.length}개의 글 중 ${updatedCount}개의 댓글 수가 수정되었습니다.`);
      } catch (error) {
        console.error('Sync failed:', error);
        alert('동기화 중 오류가 발생했습니다.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushContent.trim()) return;

    setIsLoading(true);
    
    await StorageService.addNotification({
      id: Math.random().toString(36).substr(2, 9),
      userId: 'all',
      title: `[HEAYDAYS 알림] ${pushTitle}`,
      content: pushContent,
      type: 'admin',
      createdAt: Date.now(),
      isRead: false
    });

    setPushTitle('');
    setPushContent('');
    setIsLoading(false);
    alert('모든 회원에게 성공적으로 푸시 알람을 보냈습니다.');
  };

  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white">관리자 센터</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">헤이데이즈 시스템 관리 및 대시보드</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 dark:text-white">
              <Shield className="text-indigo-600" size={24} /> 관리 요약
            </h3>
            
            <div className="space-y-4">
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">접속 중인 회원</p>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{onlineCount}</p>
                  <p className="text-sm font-bold text-emerald-600/60 mb-1">명 (실시간 접속)</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">전체 회원 수</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{allActiveUsers.length}</p>
                  <p className="text-sm font-bold text-slate-400 mb-1">명 (전체 활동 멤버)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleSyncCommentCounts}
                  disabled={isSyncing}
                  className={cn(
                    "p-6 rounded-3xl group transition-all text-left flex flex-col",
                    isSyncing ? "bg-slate-100 opacity-50" : "bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100"
                  )}
                >
                  <motion.div
                    animate={isSyncing ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Database className="text-teal-600 dark:text-teal-400 mb-3" size={20} />
                  </motion.div>
                  <p className="font-black text-teal-950 dark:text-white text-sm">댓글 수 동기화</p>
                  <p className="text-[10px] font-bold text-teal-600/60 mt-1 uppercase tracking-tight">Data Sync</p>
                </button>
                <button 
                  onClick={() => navigate('/admin/data')}
                  className="p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl group hover:bg-indigo-100 transition-colors text-left"
                >
                  <Database className="text-indigo-600 dark:text-indigo-400 mb-3" size={20} />
                  <p className="font-black text-indigo-950 dark:text-white text-sm">데이터 관리</p>
                </button>
                <button 
                  onClick={() => setIsChatStorageOpen(true)}
                  className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl group hover:bg-slate-100 transition-colors text-left"
                >
                  <FolderClock className="text-indigo-600 dark:text-indigo-400 mb-3" size={20} />
                  <p className="font-black text-slate-800 dark:text-white text-sm">대화창 저장</p>
                </button>
                <button 
                  onClick={() => navigate('/settings')}
                  className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl group hover:bg-slate-100 transition-colors text-left"
                >
                  <Users className="text-slate-400 mb-3" size={20} />
                  <p className="font-black text-slate-800 dark:text-white text-sm">회원 리스트</p>
                </button>
              </div>
            </div>
          </div>

          <ChatStorageModal 
            isOpen={isChatStorageOpen} 
            onClose={() => setIsChatStorageOpen(false)} 
          />

          <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-black mb-4">
              <AlertTriangle size={20} /> 주의사항
            </div>
            <p className="text-sm font-bold text-red-600/70 dark:text-red-400/70 leading-relaxed">
              푸시 알람은 모든 사용자에게 즉시 발송됩니다. 내용 작성 시 신중을 기해 주시기 바랍니다. 남용 시 서비스 이용에 불편을 줄 수 있습니다.
            </p>
          </div>
        </div>

        {/* Global Push Notification */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 px-8 py-3 bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase rounded-bl-[2rem]">
              방송 시스템
            </div>
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-[2rem] flex items-center justify-center text-red-600">
                <Bell size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-black dark:text-white">관리자 전용 푸시</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium font-sm">모든 멤버의 기기에 메시지를 전송합니다.</p>
              </div>
            </div>

            <form onSubmit={handleSendPush} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">푸시 알림 제목</label>
                <input 
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] py-5 px-8 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 font-black text-lg dark:text-white transition-all"
                  placeholder="강렬한 한 마디로 주의를 집중시키세요"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">메시지 내용</label>
                <textarea 
                  value={pushContent}
                  onChange={(e) => setPushContent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] py-6 px-8 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 min-h-[220px] font-semibold text-slate-700 dark:text-slate-200 transition-all"
                  placeholder="회원들에게 전달할 상세 내용을 입력하세요..."
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full py-6 rounded-[2rem] font-black transition-all flex items-center justify-center gap-4 text-xl",
                  isLoading 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isLoading ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <SettingsIcon size={28} />
                  </motion.div>
                ) : (
                  <>
                    <Send size={24} />
                    전체 푸시 알람 전송하기
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black mb-3">
                <ChevronRight size={20} /> 활용 팁
              </div>
              <ul className="space-y-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                <li className="flex gap-2">
                  <span className="text-indigo-600">01</span>
                  특별 공연이나 합주 시간 변경 등 긴급 공지에 사용하세요.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600">02</span>
                  [헤이데이즈 소식] 게시판 글은 자동으로 푸시가 발송되므로 중복되지 않게 주의하세요.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
