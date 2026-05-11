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
  Users,
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
  Trash2,
  Users2
} from 'lucide-react';
import { useAuth } from '../services/auth';
import { cn, formatDate } from '../lib/utils';
import { UserRole, Notification as AppNotification, User, ChatRoom } from '../types';
import { StorageService } from '../services/storage';
import { AdminCrown } from './AdminCrown';
import { UserAvatarDisplay } from './UserAvatarDisplay';
import UserBioModal from './UserBioModal';
import { ChatModal } from './ChatModal';
import { ChatService } from '../services/chatService';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Layout() {
  const { user, logout } = useAuth();
  const [showDeletionNotice, setShowDeletionNotice] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

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
  }, [user?.id, user?.deletedAt]);

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
  // Store the exact time this session started to filter out old notifications for the modal
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [activeMemberCount, setActiveMemberCount] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Update session start time when user actually logs in
  useEffect(() => {
    if (user?.id) {
      setSessionStartTime(Date.now());
    }
  }, [user?.id]);
  
  // Chat state
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<User | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<AppNotification | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && notifications.length > 0) {
      // Find the most recent unread chat invitation
      // ONLY show as modal if it was created AFTER the user logged in/connected
      // This ensures that "stale" invites from before the login are only shown in the notification list
      const latestInvite = notifications.find(n => 
        n.type === 'chat_invite' && 
        !n.isRead && 
        n.createdAt > sessionStartTime
      );
      
      if (latestInvite && !incomingInvite) {
        setIncomingInvite(latestInvite);
      }
    }
  }, [notifications, user?.id, incomingInvite, sessionStartTime]);

  useEffect(() => {
    if (user) {
      // Powerful real-time listener for notifications
      const q = query(
        collection(db, 'notifications'), 
        where('userId', 'in', [user.id, 'all'])
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs
          .map(doc => doc.data() as AppNotification)
          .sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(notifs);
      }, (error) => {
        console.error("Notification listener error details:", {
          message: error.message,
          code: error.code,
          userId: user?.id,
          query: "notifications where userId in [" + user?.id + ", 'all']"
        });
      });

      return () => unsubscribe();
    }
  }, [user?.id]);

  useEffect(() => {
    // Heartbeat logic
    if (user?.id) {
      // Initial heartbeat
      StorageService.heartbeat(user.id);
      
      // Periodic heartbeat every 2 minutes
      const interval = setInterval(() => {
        StorageService.heartbeat(user.id);
      }, 2 * 60 * 1000); // 2 minutes
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    // Real-time active member count and list
    // We fetch all users but filter for "last seen" within 5 minutes
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      const active = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(data => 
          !data.deletedAt && 
          data.lastActiveAt && 
          data.lastActiveAt > fiveMinutesAgo
        )
        // Sort by admin first, then name
        .sort((a, b) => {
          if (a.role === UserRole.ADMIN && b.role !== UserRole.ADMIN) return -1;
          if (a.role !== UserRole.ADMIN && b.role === UserRole.ADMIN) return 1;
          return a.name.localeCompare(b.name);
        });
      
      setActiveUsers(active);
      setActiveMemberCount(active.length);
    }, (error) => {
      console.error("Error fetching live member count:", error);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Global offline cleanup logic
  useEffect(() => {
    if (!user?.id || activeUsers.length === 0) return;

    // We only clean up rooms if the user is online
    const onlineUserIds = activeUsers.map(u => u.id);

    // Fetch rooms where user is a participant
    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const room = doc.data() as ChatRoom;
        const participants = room.activeParticipants || [];
        
        // Find participants who are listed as active in the room but are NOT in the global activeUsers list
        const offlineParticipants = participants.filter(pid => !onlineUserIds.includes(pid));
        
        if (offlineParticipants.length > 0) {
          // The "lead" participant (alphabetically first active user) performs the cleanup
          const sortedActives = participants.filter(pid => onlineUserIds.includes(pid)).sort();
          const isLead = sortedActives[0] === user.id;
          
          if (isLead) {
            offlineParticipants.forEach(offid => {
              const offName = room.participantNames?.[room.participants.indexOf(offid)] || '회원';
              ChatService.forceLeaveOfflineUser(room.id, offid, offName);
            });
          }
        }
      });
    }, (error) => {
      console.error("Room cleanup listener error:", error);
    });

    return () => unsubscribe();
  }, [user?.id, activeUsers]);

  // Handle sudden unload/offline for current user
  useEffect(() => {
    if (!user?.id) return;

    const handleUnload = () => {
      // Find rooms where user is active and try to leave them
      // This is a "best effort" on tab close
      const q = query(
        collection(db, 'chatRooms'),
        where('participants', 'array-contains', user.id)
      );
      
      getDocs(q).then(snapshot => {
        snapshot.docs.forEach(doc => {
          ChatService.leaveRoom(doc.id, user.id, user.name);
        });
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id, user?.name]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async () => {
    if (user) {
      await StorageService.markNotificationsRead(user.id);
    }
  };

  const openChatWithMember = (targetUserId: string) => {
    if (!user) return;
    const targetUser = activeUsers.find(u => u.id === targetUserId);
    if (!targetUser) return;
    if (targetUser.id === user.id) return;
    
    setInviteTarget(targetUser);
    setIsMembersListOpen(false);
  };

  const handleSendInvite = async () => {
    if (!user || !inviteTarget) return;
    
    try {
      const roomId = await ChatService.getOrCreateDirectChat(user.id, user.name, inviteTarget.id, inviteTarget.name);
      const success = await ChatService.sendChatInvitation({ id: user.id, name: user.name }, inviteTarget.id, roomId, inviteTarget.name);
      
      if (!success) {
        alert('이미 초대 알림이 전송된 회원입니다. 상대방이 확인하기 전까지 중복 발송되지 않습니다.');
      }
      
      setInviteTarget(null);
      
      setActiveChatRoomId(roomId);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Failed to send invite:', error);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !incomingInvite || !incomingInvite.meta?.roomId) return;
    
    try {
      const roomId = incomingInvite.meta.roomId;
      
      // Update notification as read
      await StorageService.deleteNotification(incomingInvite.id);
      
      // Join room with system message
      await ChatService.joinRoomWithSystemMessage(roomId, user.id, user.name);
      
      setActiveChatRoomId(roomId);
      setIsChatOpen(true);
      setIncomingInvite(null);
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDeclineInvite = async () => {
    if (!user || !incomingInvite || !incomingInvite.meta?.roomId) return;
    
    const roomId = incomingInvite.meta.roomId;
    const inviterName = incomingInvite.meta.inviterName;
    
    const rejectMessage = window.prompt(`${inviterName}님의 초대 거부 메시지를 작성할 수 있습니다.\n(빈칸으로 두면 기본 거절 메시지가 전송됩니다)`, '');
    
    // User clicked cancel
    if (rejectMessage === null) return;

    try {
      await ChatService.rejectInvitation(roomId, user.id, user.name, rejectMessage || undefined);
      await StorageService.deleteNotification(incomingInvite.id);
      setIncomingInvite(null);
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }
  };

  const handleDeleteNotifId = async (id: string) => {
    try {
      await StorageService.deleteNotification(id);
    } catch (error) {
      console.error("Single deletion failed:", error);
    }
  };

  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isProcessingClear, setIsProcessingClear] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<any>(null);
  const [pressProgress, setPressProgress] = useState(0);

  const startPress = (id: string) => {
    if (pressTimer) clearInterval(pressTimer);
    setPressingId(id);
    setPressProgress(0);
    
    const startTime = Date.now();
    const duration = 600;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(progress);
      
      if (progress >= 100) {
        clearInterval(timer);
        setLongPressedId(id);
        setPressingId(null);
        setPressTimer(null);
      }
    }, 20);
    
    setPressTimer(timer);
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearInterval(pressTimer);
      setPressTimer(null);
    }
    setPressingId(null);
    setPressProgress(0);
  };

  const handleClearNotifications = async () => {
    if (user) {
      setIsProcessingClear(true);
      try {
        await StorageService.clearNotifications(user.id);
      } catch (error) {
        console.error("Clear failed:", error);
      } finally {
        setIsProcessingClear(false);
        setIsClearingAll(false);
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

  const extraItems = [
    { name: '내 쪽지함', path: '/messages', icon: MessageSquare },
    { name: 'HEYDAYS MEMBERS', path: '/members', icon: Users },
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
    <div className="min-h-screen bg-surface flex font-sans text-on-surface">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-40 flex items-center justify-between px-4">
        <button 
          onClick={() => navigate('/notices')}
          className="flex flex-col ml-1 text-left"
        >
          <motion.span 
            animate={user?.role === UserRole.ADMIN ? {
              scale: [1, 1.02, 1],
              filter: [
                "drop-shadow(0 0 2px #FFD700) drop-shadow(0 0 5px #FF8C00)",
                "drop-shadow(0 0 8px #FFEF00) drop-shadow(0 0 12px #FFA500)",
                "drop-shadow(0 0 2px #FFD700) drop-shadow(0 0 5px #FF8C00)"
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "font-black text-base tracking-tighter leading-none dark:text-white",
              user?.role === UserRole.ADMIN && "text-transparent bg-clip-text bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728]"
            )}
          >HEYDAYS</motion.span>
          <span className="text-[7px] font-bold text-blue-500 tracking-[0.2em] uppercase">Community</span>
        </button>
        <div className="flex items-center gap-0">
          {/* Active Members Counter */}
          <button 
            onClick={() => setIsMembersListOpen(!isMembersListOpen)}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <Users2 size={9} className="mb-0.5" />
              {activeMemberCount}
            </span>
          </button>

          <button 
            onClick={() => { setIsNotifOpen(!isNotifOpen); markRead(); }}
            className="p-1.5 text-slate-500 hover:text-indigo-600 transition-colors relative flex items-center justify-center font-bold"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Active Members Dropdown */}
      <AnimatePresence>
        {isMembersListOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMembersListOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/10 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-14 right-4 w-48 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[70] overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black text-sm tracking-tight">활동 멤버</h3>
                <button onClick={() => setIsMembersListOpen(false)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {activeUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => openChatWithMember(u.id)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                  >
                    <UserAvatarDisplay 
                      userId={u.id} 
                      name={u.name} 
                      className="w-7 h-7 border border-slate-100 dark:border-slate-800 shadow-sm"
                      size={14}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11px] font-bold truncate dark:text-white flex items-center gap-1">
                        {u.name}
                        {u.role === UserRole.ADMIN && <AdminCrown size={8} />}
                        {u.id === user?.id && <span className="text-[8px] bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-400">ME</span>}
                      </p>
                      <p className="text-[9px] text-emerald-500 font-bold leading-none mt-0.5">Online</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                <div className="flex flex-col">
                  <h3 className="font-black text-lg tracking-tight">알림</h3>
                  <p className="text-[10px] font-bold text-slate-400">총 {notifications.length}건의 소식</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsClearingAll(true)}
                    disabled={notifications.length === 0}
                    className="text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} />
                    전체 삭제
                  </button>
                  <button onClick={() => { setIsNotifOpen(false); setLongPressedId(null); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notifications.map(n => {
                  const isAdminNotif = n.type === 'admin';
                  const isDeletable = true; // Powerful deletion: anything visible is deletable
                  const isLongPressed = longPressedId === n.id;
                  const isBeingPressed = pressingId === n.id;
                  
                  return (
                    <div 
                      key={n.id} 
                      onPointerDown={() => isDeletable && startPress(n.id)}
                      onPointerUp={cancelPress}
                      onPointerLeave={cancelPress}
                      onContextMenu={(e) => {
                        if (isDeletable) e.preventDefault();
                      }}
                      className={cn(
                        "p-4 rounded-2xl border transition-all relative group/notif cursor-default select-none overflow-hidden",
                        isAdminNotif 
                          ? "message-gold"
                          : n.isRead 
                            ? "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 opacity-80" 
                            : "bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900 shadow-sm",
                        isLongPressed && "ring-2 ring-red-500/20"
                      )}
                    >
                      {/* Press Progress Indicator */}
                      {isBeingPressed && pressProgress > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-red-500/50 transition-all duration-75 z-10"
                          style={{ width: `${pressProgress}%` }}
                        />
                      )}

                      <AnimatePresence>
                        {isDeletable && isLongPressed && (
                          <motion.button 
                            initial={{ scale: 0.5, opacity: 0, x: 10 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0.5, opacity: 0, x: 10 }}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDeleteNotifId(n.id);
                              setLongPressedId(null);
                            }}
                            className={cn(
                              "absolute top-2 right-2 p-1.5 px-2.5 bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all rounded-xl z-20 flex items-center gap-1.5 active:scale-95",
                              isAdminNotif ? "bg-amber-600" : ""
                            )}
                          >
                            <Trash2 size={10} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">삭제</span>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 mb-1 pr-6">
                        {n.type === 'notice' ? (
                          <Bell size={12} className="text-indigo-600" />
                        ) : isAdminNotif ? (
                          <AdminCrown size={12} className="text-amber-600" />
                        ) : (
                          <MessageSquare size={12} className="text-indigo-600" />
                        )}
                        <span className={cn(
                          "text-xs font-black",
                          isAdminNotif ? "sender-name" : "text-slate-800 dark:text-slate-100"
                        )}>
                          {n.title}
                          {isAdminNotif && <span className="ml-1.5 sender-tag">ADMIN</span>}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs font-medium leading-relaxed",
                        isAdminNotif ? "message-content" : "text-slate-500 dark:text-slate-400"
                      )}>{n.content}</p>
                      <p className={cn(
                        "text-[9px] font-bold mt-2",
                        isAdminNotif ? "text-amber-600/60" : "text-slate-400"
                      )}>{formatDate(n.createdAt)}</p>
                    </div>
                  );
                })}
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

      {/* Invite Confirmation Modal (Sender) */}
      <AnimatePresence>
        {inviteTarget && (
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
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">대화신청을 하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                <span className="text-indigo-600 font-black">{inviteTarget.name}</span>님에게<br />
                채팅 초대 알림을 보냅니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setInviteTarget(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-tighter"
                >
                  아니오
                </button>
                <button 
                  onClick={handleSendInvite}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg font-black uppercase tracking-tighter"
                >
                  예
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Invite Modal (Receiver) */}
      <AnimatePresence>
        {incomingInvite && (
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
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">채팅에 합류 하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                <span className="text-emerald-600 font-black">{incomingInvite.meta?.inviterName}</span>님이<br />
                대화에 초대했습니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleDeclineInvite}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-tighter"
                >
                  거절
                </button>
                <button 
                  onClick={handleAcceptInvite}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg font-black uppercase tracking-tighter"
                >
                  합류하기
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
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">모든 알림을 삭제할까요?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">나에게 도착한 모든 알림이<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsClearingAll(false)}
                  disabled={isProcessingClear}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  아니요
                </button>
                <button 
                  onClick={handleClearNotifications}
                  disabled={isProcessingClear}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingClear ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      삭제 중...
                    </>
                  ) : '예, 모두 삭제'}
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
              <motion.span 
                animate={user?.role === UserRole.ADMIN ? {
                  scale: [1, 1.02, 1],
                  filter: [
                    "drop-shadow(0 0 2px #FFD700) drop-shadow(0 0 5px #FF8C00)",
                    "drop-shadow(0 0 8px #FFEF00) drop-shadow(0 0 12px #FFA500)",
                    "drop-shadow(0 0 2px #FFD700) drop-shadow(0 0 5px #FF8C00)"
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "font-black text-2xl tracking-tighter leading-none dark:text-white",
                  user?.role === UserRole.ADMIN && "text-transparent bg-clip-text bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728]"
                )}
              >HEYDAYS</motion.span>
              <span className="text-[10px] font-bold text-blue-500 tracking-widest mt-1 uppercase">Community</span>
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile - Compact horizontal layout */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-2 flex items-center gap-3 border border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => { navigate('/settings'); setIsSidebarOpen(false); }}
                className="relative group/avatar"
              >
                <UserAvatarDisplay 
                  userId={user?.id || ''} 
                  name={user?.name || ''} 
                  className="w-10 h-10 border-2 border-white dark:border-slate-700 shadow-sm transition-transform hover:scale-105 active:scale-95"
                  size={20}
                />
                <div className="absolute inset-0 bg-black/10 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                  <SettingsIcon size={12} className="text-white" />
                </div>
              </button>
              
              <button 
                onClick={() => setIsBioModalOpen(true)}
                className="flex-1 min-w-0 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-colors"
              >
                <div className="font-bold text-sm truncate dark:text-white flex items-center gap-1">
                  {user?.name}
                  {user?.role === UserRole.ADMIN && <AdminCrown size={12} />}
                </div>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  HEYDAYS MEMBERS
                </p>
              </button>

              <button 
                onClick={handleLogout}
                title="로그아웃"
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            <div className="mb-4">
              <p className="px-4 mb-2 text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">메인 메뉴</p>
              {navItems.map(item => (
                <div key={item.path}>
                  <NavItem item={item} />
                </div>
              ))}
            </div>

            <div className="px-4 py-2">
              <div className="h-px bg-slate-100 dark:bg-slate-800 w-full mb-4" />
            </div>

            <div className="mb-8">
              {extraItems.map(item => (
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
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">탈퇴가 진행중입니다</h3>
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

      <AnimatePresence>
        {isBioModalOpen && user && (
          <UserBioModal 
            user={user} 
            onClose={() => setIsBioModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && activeChatRoomId && (
          <ChatModal 
            roomId={activeChatRoomId}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            activeUsers={activeUsers.map(u => ({ id: u.id, name: u.name }))}
          />
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
