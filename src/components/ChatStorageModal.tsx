import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Clock, Users, ChevronRight, Database, FolderClock } from 'lucide-react';
import { ChatService } from '../services/chatService';
import { ChatRoom } from '../types';
import { formatDate } from '../lib/utils';
import { ChatModal } from './ChatModal';

interface ChatStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatStorageModal: React.FC<ChatStorageModalProps> = ({ isOpen, onClose }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await ChatService.getStoredChats();
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch historic chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const names = room.participantNames?.join(' ') || '';
    return names.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] flex flex-col rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-2xl"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <FolderClock size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight dark:text-white">대화창 저장소</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">3일간 보관된 종료된 대화 목록</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Search & Stats */}
          <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="참여 회원 이름으로 검색..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
              />
            </div>
            <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-600/10">
              <Database size={16} />
              <span className="text-xs font-black uppercase tracking-widest leading-none">Total: {rooms.length}</span>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-black text-xs uppercase tracking-[0.2em]">데이터 불러오는 중...</p>
              </div>
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className="w-full flex items-center gap-6 p-5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-indigo-600 group transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 -rotate-45 translate-x-12 -translate-y-12 group-hover:bg-indigo-600/10 transition-colors" />
                  
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-inner flex-shrink-0">
                    <Clock size={28} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-tighter">
                        {room.endedAt ? formatDate(room.endedAt) : '시간 정보 없음'}
                      </span>
                    </div>
                    <p className="text-sm font-black dark:text-white truncate flex items-center gap-2">
                       <Users size={14} className="text-slate-400" />
                       {room.participantNames?.join(', ') || '알 수 없는 참여자'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 truncate">
                      마지막 대화: {room.lastMessage || '내용 없음'}
                    </p>
                  </div>

                  <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FolderClock size={64} className="mb-6 opacity-10" />
                <h4 className="text-lg font-black dark:text-white">대화 기록이 없습니다.</h4>
                <p className="text-sm font-medium mt-1">최근 3일 이내에 종료된 대화가 없습니다.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Historic Chat Viewer */}
        {selectedRoomId && (
          <ChatModal 
            roomId={selectedRoomId}
            isOpen={!!selectedRoomId}
            onClose={() => setSelectedRoomId(null)}
            activeUsers={[]} // Not needed for read-only
            readOnly={true}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
