/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Bell, 
  Calendar, 
  Layers, 
  Music, 
  Database,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  ListMusic,
  CheckCircle2,
  Settings as SettingsIcon,
  ChevronRight,
  Crown,
  Timer,
  Shield,
  MessageSquare,
  Sun,
  Moon,
  Trash2
} from 'lucide-react';
import { useAuth } from '../services/auth';
import { cn, formatDate } from '../lib/utils';
import { UserRole, Notification as AppNotification } from '../types';
import { StorageService } from '../services/storage';

export default function Layout() {
  const { user, logout } = useAuth();
  const [showDeletionNotice, setShowDeletionNotice] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.deletedAt) {
      // Show notice if the account is marked for delete in the last 24 hours
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - user.deletedAt < twentyFourHours) {
        // If not already dismissed in this session
        const dismissed = sessionStorage.getItem(`deletion_notice_dismissed_${user.id}`);
        if (!dismissed) {
          setShowDeletionNotice(true);
        }
      }
    }
  }, [user]);

  const handleCancelDeletion = async () => {
    if (user) {
      await StorageService.cancelDeleteAccount(user.id);
      setShowDeletionNotice(false);
      window.location.reload();
    }
  };

  const handleDismissDeletionNotice = () => {
    if (user) {
      sessionStorage.setItem(`deletion_notice_dismissed_${user.id}`, 'true');
    }
    setShowDeletionNotice(false);
  };
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<AppNotification | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const fetchNotifs = async () => {
        const data = await StorageService.getNotifications(user.id);
        setNotifications(data);
      };
      fetchNotifs();
    }
  }, [user]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async () => {
    if (user) {
      await StorageService.markNotificationsRead(user.id);
      const data = await StorageService.getNotifications(user.id);
      setNotifications(data);
    }
  };

  const handleDeleteNotif = async () => {
    if (notifToDelete) {
      await StorageService.deleteNotification(notifToDelete.id);
      setNotifToDelete(null);
      if (user) {
        const data = await StorageService.getNotifications(user.id);
        setNotifications(data);
      }
    }
  };

  const navItems = [
    { name: '헤이데이즈 공지', path: '/notices', icon: Bell },
    { name: '공연 일정', path: '/schedules', icon: Calendar },
    { name: '공연 후기', path: '/reviews', icon: Layers },
    { name: '악보 라이브러리', path: '/scores', icon: Music },
    { name: 'METRONOME', path: '/metronome', icon: Timer },
    { name: '환경 설정', path: '/settings', icon: SettingsIcon },
  ];

  const adminItems = [
    { name: '관리자 센터', path: '/admin', icon: SettingsIcon },
    { name: '데이터 관리', path: '/admin/data', icon: Database },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        to={item.path}
        onClick={() => setIsSidebarOpen(false)}
        className={({ isActive }) => cn(
          "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold tracking-tight my-1",
          isActive 
            ? "bg-indigo-600 text-white" 
            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
        )}
      >
        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        <span className="flex-1 whitespace-nowrap">{item.name}</span>
        {isActive && <ChevronRight size={16} />}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-40 flex items-center justify-between px-4">
        <button 
          onClick={() => navigate('/notices')}
          className="flex flex-col ml-2 mt-3 text-left"
        >
          <span className="font-black text-lg tracking-tighter leading-none dark:text-white">HEYDAYS</span>
          <span className="text-[8px] font-bold text-blue-500 tracking-[0.2em] mt-0.5 uppercase">Community</span>
        </button>
        <div className="flex items-center gap-1 mt-1">
          <button 
            onClick={() => { setIsNotifOpen(!isNotifOpen); markRead(); }}
            className="p-3 text-slate-500 hover:text-indigo-600 transition-colors relative flex items-center justify-center font-bold"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 pr-3 flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden transition-all group-hover:ring-2 group-hover:ring-indigo-600/30">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-indigo-600 dark:text-indigo-400" size={16} />
              )}
            </div>
            <Menu size={24} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
          </button>
        </div>
      </header>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isNotifOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotifOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/10 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-20 right-4 w-[calc(100vw-32px)] sm:w-96 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[70] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black text-lg tracking-tight">알림</h3>
                <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  총 {notifications.length}건
                </span>
                <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "p-4 rounded-2xl border transition-all relative group/notif",
                      n.isRead 
                        ? "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 opacity-60" 
                        : "bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900 shadow-sm"
                    )}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setNotifToDelete(n); }}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/notif:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      {n.type === 'notice' ? <Bell size={12} className="text-indigo-600" /> : <MessageSquare size={12} className="text-indigo-600" />}
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{n.title}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{n.content}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2">{formatDate(n.createdAt)}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                      <Bell size={24} />
                    </div>
                    <p className="font-bold text-slate-400 text-sm">알림이 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifToDelete && (
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
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">알림을 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">기록에서 해당 알림이<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setNotifToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  아니요
                </button>
                <button 
                  onClick={handleDeleteNotif}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all"
                >
                  예
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 px-4 flex items-end justify-center pb-8"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 flex items-center justify-between">
            <button 
              onClick={() => { navigate('/notices'); setIsSidebarOpen(false); }}
              className="flex flex-col text-left"
            >
              <span className="font-black text-2xl tracking-tighter leading-none dark:text-white">HEYDAYS</span>
              <span className="text-[10px] font-bold text-blue-500 tracking-widest mt-1 uppercase">Community</span>
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile - Moved to top as per user request */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.role === UserRole.ADMIN ? (
                      <Crown className="text-indigo-600 dark:text-indigo-400 fill-indigo-600/10" size={20} />
                    ) : (
                      <UserIcon className="text-indigo-600 dark:text-indigo-400" size={20} />
                    )
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate dark:text-white flex items-center gap-1">
                    {user?.name}
                    {user?.role === UserRole.ADMIN && <Crown size={12} className="text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user?.role === UserRole.ADMIN ? '관리자' : '밴드 멤버'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-[10px]"
              >
                <LogOut size={12} />
                로그아웃
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            <div className="mb-8">
              <p className="px-4 mb-2 text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">메인 메뉴</p>
              {navItems.map(item => (
                <div key={item.path}>
                  <NavItem item={item} />
                </div>
              ))}
            </div>

            {user?.role === UserRole.ADMIN && (
              <div className="mb-8">
                <p className="px-4 mb-2 text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">관리</p>
                {adminItems.map(item => (
                  <div key={item.path}>
                    <NavItem item={item} />
                  </div>
                ))}
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Delete Recovery Modal */}
      <AnimatePresence>
        {showDeletionNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">탈퇴 요청 취소 안내</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">현재 계정 탈퇴가 신청된 상태입니다.<br />삭제 요청을 취소하시겠습니까?</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCancelDeletion}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg"
                >
                  네, 탈퇴를 취소합니다
                </button>
                <button 
                  onClick={handleDismissDeletionNotice}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  아니오 (로그인 유지)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-none mx-auto w-full p-4 md:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
