import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, UserPlus, Users, MessageSquare, Image as ImageIcon, Loader2, FileText, Download } from 'lucide-react';
import { useAuth } from '../services/auth';
import { useUsersContext } from '../contexts/UsersContext';
import { ChatService } from '../services/chatService';
import { StorageService } from '../services/storage';
import imageCompression from 'browser-image-compression';
import { ChatRoom, ChatMessage } from '../types';
import { FirestoreImage } from './FirestoreImage';
import { UserAvatarDisplay } from './UserAvatarDisplay';
import { cn } from '../lib/utils';

interface ChatModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  activeUsers: { id: string; name: string }[];
  readOnly?: boolean;
}

export const ChatModal: React.FC<ChatModalProps> = ({ roomId, isOpen, onClose, activeUsers, readOnly = false }) => {
  const { user } = useAuth();
  const { users } = useUsersContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showInviteList, setShowInviteList] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [invitingUser, setInvitingUser] = useState<{ id: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !roomId || !user || readOnly) return;
    
    // Track joining
    ChatService.enterRoom(roomId, user.id);
    
    // We don't leave on unmount anymore, only on offline logic
  }, [isOpen, roomId, user?.id, readOnly]);

  useEffect(() => {
    if (!isOpen || !roomId) return;

    const unsubMessages = ChatService.subscribeToMessages(roomId, (msgs) => {
      setMessages(msgs);
    });

    const unsubRoom = ChatService.subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
    });

    return () => {
      unsubMessages();
      unsubRoom();
    };
  }, [isOpen, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const content = newMessage.trim();
    setNewMessage('');
    
    try {
      await ChatService.sendMessage(roomId, user.id, user.name, content);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const msg = error.message || '메시지 전송에 실패했습니다.';
      alert(msg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile || !user || !roomId) return;

    setIsUploading(true);
    try {
      let fileToUpload = originalFile;
      
      // 이미지 처리 로직 (게시판 로직 이식)
      if (originalFile.type.startsWith('image/')) {
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB 제한
        
        if (originalFile.size > MAX_SIZE) {
          console.log("1MB 초과 파일 감지: 압축을 시작합니다...");
          const options = {
            maxSizeMB: 0.9,          // 최종 용량을 0.9MB 이하로 설정
            maxWidthOrHeight: 1200,  // 가로/세로 최대 길이를 1200px로 제한
            useWebWorker: true,
            fileType: originalFile.type
          };
          try {
            const compressedFile = await imageCompression(originalFile, options);
            fileToUpload = new File([compressedFile], originalFile.name, {
              type: originalFile.type,
              lastModified: Date.now(),
            });
            console.log(`압축 완료: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
          } catch (err) {
            console.error("이미지 변환 중 오류 발생:", err);
            // 실패 시 원본 전송 시도
          }
        }
      }

      let previewUrl: string | undefined;
      // 이미지인 경우 저화질 미리보기(Base64) 생성 (UI용 초소형)
      if (fileToUpload.type.startsWith('image/')) {
        previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const size = 40; 
              canvas.width = size;
              canvas.height = size * (img.height / img.width);
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(fileToUpload);
        });
      }

      const path = `chats/${roomId}/${Date.now()}_${fileToUpload.name}`;
      const firestoreUrl = await StorageService.uploadFile(path, fileToUpload);
      
      // Resolve the URL to Base64 for immediate display via imageUrl field
      let imageUrl: string | undefined;
      if (fileToUpload.type.startsWith('image/')) {
        imageUrl = await StorageService.getFileData(firestoreUrl) || undefined;
      }
      
      await ChatService.sendMessage(roomId, user.id, user.name, '', firestoreUrl, fileToUpload.name, fileToUpload.type, previewUrl, imageUrl);
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      const msg = error.message || '파일 전송에 실패했습니다.';
      alert(msg);
    } finally {
      // 업로드 성공/실패와 관계없이 로딩 상태를 무조건 해제하여 화면 멈춤 방지
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      // firestore:// 프로토콜 파일 데이터 가져오기
      const data = await StorageService.getFileData(url);
      if (!data) {
        alert('파일을 찾을 수 없습니다.');
        return;
      }

      // 실제 다운로드 링크 생성 및 실행
      const link = document.createElement('a');
      link.href = data;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  const inviteMember = (targetUser: { id: string, name: string }) => {
    if (!roomId || !user) return;
    setInvitingUser(targetUser);
  };

  const handleConfirmInvite = async () => {
    if (!invitingUser || !roomId || !user) return;

    try {
      const success = await ChatService.sendChatInvitation({ id: user.id, name: user.name }, invitingUser.id, roomId, invitingUser.name);
      if (success) {
        alert('초대 알림을 보냈습니다.');
      } else {
        alert('이미 초대 알림이 전송된 회원입니다. 상대방이 확인하기 전까지 중복 발송되지 않습니다.');
      }
      setInvitingUser(null);
      setShowInviteList(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
      setInvitingUser(null);
    }
  };

  if (!isOpen) return null;

  const participants = room?.participants || [];
  const inviteableUsers = activeUsers.filter(u => !participants.includes(u.id));

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md h-[80vh] flex flex-col rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <MessageSquare size={20} strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight">대화창</h3>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Users size={10} />
                  <span>{participants.length}명 참여 중</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              {!readOnly && (
                <>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                  </button>
                  <button 
                    onClick={() => setShowInviteList(!showInviteList)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showInviteList ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <UserPlus size={20} />
                  </button>
                </>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => {
                if (msg.type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <div className="px-4 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                          {msg.content}
                        </span>
                      </div>
                    </div>
                  );
                }

                const isMine = msg.senderId === user?.id;
                const prevMsg = messages[idx - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                    {showHeader && !isMine && (
                      <span className="text-[10px] font-black text-slate-400 mb-1 ml-11">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={cn("flex gap-2 max-w-[85%]", isMine ? "flex-row-reverse" : "flex-row")}>
                      {!isMine && showHeader ? (
                        <UserAvatarDisplay 
                          userId={msg.senderId} 
                          name={msg.senderName} 
                          className="w-8 h-8 flex-shrink-0" 
                          size={16} 
                        />
                      ) : (
                        !isMine && <div className="w-8 h-8 flex-shrink-0" />
                      )}
                      <div className={cn(
                        "flex flex-col gap-1",
                        isMine ? "items-end" : "items-start"
                      )}>
                        {(msg.fileUrl || msg.imageUrl) && (
                          msg.fileType?.startsWith('image/') ? (
                            <div className={cn(
                              "flex flex-col gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm",
                              isMine ? "rounded-tr-none" : "rounded-tl-none"
                            )}>
                              <p className="text-[10px] font-black text-slate-400 px-2 pt-1 uppercase tracking-tight">Shared Image</p>
                              <div className="relative group/img rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 cursor-zoom-in">
                                {/* 저화질 미리보기 배경 */}
                                {msg.previewUrl && (
                                  <img 
                                    src={msg.previewUrl} 
                                    className="absolute inset-0 w-full h-full object-cover blur-lg opacity-50 scale-110"
                                    alt="preview"
                                  />
                                )}
                                {msg.imageUrl ? (
                                  <img 
                                    src={msg.imageUrl} 
                                    alt={msg.fileName || "Shared"} 
                                    className="relative z-10 max-w-full h-auto object-cover max-h-60 min-w-[120px] min-h-[80px]" 
                                    loading="lazy"
                                  />
                                ) : (
                                  <FirestoreImage 
                                    src={msg.fileUrl} 
                                    alt={msg.fileName || "Shared"} 
                                    className="relative z-10 max-w-full h-auto object-cover max-h-60 min-w-[120px] min-h-[80px]" 
                                    loading="lazy"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={() => handleDownload(msg.fileUrl || msg.imageUrl!, msg.fileName || 'image.jpg')}
                                    className="px-4 py-2 bg-white text-slate-900 rounded-full text-xs font-black shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
                                  >
                                    💾 다운로드
                                  </button>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDownload(msg.fileUrl || msg.imageUrl!, msg.fileName || 'image.jpg')}
                                className="w-full py-2 flex items-center justify-center gap-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-all"
                              >
                                <span>💾 원본 다운로드</span>
                              </button>
                            </div>
                          ) : (
                            <div className={cn(
                              "flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm",
                              isMine ? "rounded-tr-none" : "rounded-tl-none"
                            )}>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">파일 전송됨</p>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-xs font-bold truncate dark:text-white mb-0.5">{msg.fileName || '파일'}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{msg.fileType?.split('/')[1] || 'FILE'}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDownload(msg.fileUrl!, msg.fileName || 'file')}
                                className="w-full mt-1 py-2 bg-white dark:bg-slate-900 flex items-center justify-center gap-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                              >
                                <span>💾 다운로드</span>
                              </button>
                            </div>
                          )
                        )}
                        {msg.content && (
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm font-medium break-all shadow-sm",
                            isMine 
                              ? "bg-indigo-600 text-white rounded-tr-none" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none"
                          )}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Invite List Overlay */}
            <AnimatePresence>
              {showInviteList && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex flex-col p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-lg">회원 초대</h4>
                    <button onClick={() => setShowInviteList(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">현재 접속 중인 회원</p>
                  <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                    {inviteableUsers.length > 0 ? (
                      inviteableUsers.map(u => (
                        <button 
                          key={u.id}
                          onClick={() => inviteMember({ id: u.id, name: u.name })}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group"
                        >
                          <UserAvatarDisplay userId={u.id} name={u.name} className="w-10 h-10" size={20} />
                          <div className="flex-1">
                            <p className="font-bold text-sm dark:text-white">{u.name}</p>
                            <p className="text-[10px] text-emerald-500 font-bold">Online</p>
                          </div>
                          <UserPlus size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users size={32} className="mb-4 opacity-20" />
                        <p className="font-bold">초대할 수 있는 회원이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invitation Request Modal (초대 신청 모달) */}
            <AnimatePresence>
              {invitingUser && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-xs shadow-2xl border border-slate-100 dark:border-slate-700 text-center"
                  >
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
                      <UserPlus size={32} />
                    </div>
                    <h5 className="font-black text-lg mb-2">초대 신청</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{invitingUser.name}</span>님을<br />
                      채팅에 초대하시겠습니까?
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setInvitingUser(null)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                      >
                        아니오
                      </button>
                      <button 
                        onClick={handleConfirmInvite}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                      >
                        예
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            {!readOnly && (
              <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative flex items-center">
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/10 dark:text-white pr-14 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                  >
                    <Send size={18} strokeWidth={3} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
