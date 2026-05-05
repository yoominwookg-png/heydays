/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Music,
  Trash2,
  CheckCircle2,
  PenLine,
  Check,
  X,
  Image as ImageIcon,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Crown,
  FileText,
  Download,
  Heart
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { useAuth } from '../services/auth';
import { Schedule, UserRole, Comment, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import FileUploadZone from '../components/FileUploadZone';
import UserBioModal from '../components/UserBioModal';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';
import { FirestoreImage } from '../components/FirestoreImage';
import { FirestoreFileLink } from '../components/FirestoreFileLink';
import ImageGallery from '../components/ImageGallery';
import { AdminCrown } from '../components/AdminCrown';

export default function Schedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [galleryState, setGalleryState] = useState<{ images: string[], index: number } | null>(null);
  
  // New schedule form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [description, setDescription] = useState('');
  const [fileItems, setFileItems] = useState<{file?: File, url: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      const data = await StorageService.getSchedules();
      setSchedules(data);
    };
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      StorageService.checkIfLikedSchedule(selectedSchedule.id).then(setIsLiked);
    } else {
      setIsLiked(false);
    }
  }, [selectedSchedule]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const removeFile = (index: number) => {
    const item = fileItems[index];
    if (item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
    setFileItems(fileItems.filter((_, i) => i !== index));
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isUploading) return;
    
    if (!title.trim() || !date || !location.trim()) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      const scheduleId = editingSchedule?.id || Math.random().toString(36).substring(2, 11);
      
      const newFiles = fileItems.filter(item => item.file).map(item => item.file!);
      const existingUrls = fileItems.filter(item => !item.file).map(item => item.url);
      
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        console.log(`Starting upload of ${newFiles.length} files...`);
        uploadedUrls = await StorageService.uploadFiles('schedules', scheduleId, newFiles);
        console.log(`Successfully uploaded ${uploadedUrls.length} files.`);
      }
      
      const filteredUrls = [...existingUrls, ...uploadedUrls];
      const scheduleData: Partial<Schedule> = {
        title: title.trim(),
        date,
        time,
        location: location.trim(),
        mapQuery: mapQuery.trim() || location.trim(),
        description: description.trim(),
        files: filteredUrls,
      };

      if (editingSchedule) {
        const updated: Schedule = {
          ...editingSchedule,
          ...scheduleData as Schedule,
        };
        await StorageService.updateSchedule(updated);
        setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const newSchedule: Schedule = {
          id: scheduleId,
          ...scheduleData as Schedule,
          authorId: user.id,
          createdAt: Date.now(),
          likes: 0,
          views: 0,
          commentCount: 0
        } as Schedule;
        await StorageService.saveSchedule(newSchedule);
        setSchedules(prev => [newSchedule, ...prev]);
      }

      setIsAdding(false);
      setEditingSchedule(null);
      setTitle('');
      setDate('');
      setLocation('');
      setMapQuery('');
      setDescription('');
      setFileItems([]);
    } catch (err: any) {
      console.error('Submit failed:', err);
      let errorMessage = '저장에 실패했습니다. ';
      if (err.message?.includes('timed out')) {
        errorMessage += '네트워크 지연으로 시간이 초과되었습니다.';
      } else {
        errorMessage += '네트워크 상태를 확인해주세요.';
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && schedule.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setDate(schedule.date);
    setTime(schedule.time || '');
    setLocation(schedule.location);
    setMapQuery(schedule.mapQuery || '');
    setDescription(schedule.description);
    setFileItems(schedule.files?.map(url => ({ url })) || []);
    setSelectedSchedule(null); // Close detail view when editing
    setIsAdding(true);
  };

  const handleDelete = (schedule: Schedule) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && schedule.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setScheduleToDelete(schedule);
  };

  const confirmDelete = async () => {
    if (scheduleToDelete) {
      if (scheduleToDelete.files && scheduleToDelete.files.length > 0) {
        await StorageService.deleteFiles(scheduleToDelete.files);
      }
      await StorageService.deleteSchedule(scheduleToDelete.id);
      setSchedules(schedules.filter(s => s.id !== scheduleToDelete.id));
      setScheduleToDelete(null);
      setSelectedSchedule(null);
    }
  };

  const handleShowBio = async (userId: string) => {
    const userToView = await StorageService.getUser(userId);
    if (userToView) {
      setViewingBioUser(userToView);
    }
  };

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= days; i++) calendarDays.push(i);

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter(s => s.date === dateStr);
  };

  const isPublicHoliday = (day: number, month: number) => {
    const holidays = [
      { m: 1, d: 1 },   // New Year
      { m: 3, d: 1 },   // Independence Day
      { m: 5, d: 5 },   // Children's Day
      { m: 6, d: 6 },   // Memorial Day
      { m: 8, d: 15 },  // Liberation Day
      { m: 10, d: 3 },  // National Foundation Day
      { m: 10, d: 9 },  // Hangeul Day
      { m: 12, d: 25 }, // Christmas
    ];
    return holidays.some(h => h.m === month + 1 && h.d === day);
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  
  const stickers = ['🎸', '🎹', '✨', '🎤', '🎺', '🥁', '🎶', '🌟'];
  const getSticker = (day: number) => stickers[day % stickers.length];

  const sortedUpcoming = [...schedules]
    .filter(s => {
      // Filter by current month/year shown on calendar
      const eventDate = new Date(s.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isImageFile = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp)(?:_|\?|%3F|$)/i) !== null;
  };

  const getFileName = (url: string) => {
    try {
      if (url.startsWith('firestore://')) {
        const id = url.split('/').pop() || '';
        return id.split('_').slice(2, -1).join('_') || '파일명 없음';
      }
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const lastPart = parts[parts.length - 1];
      return decodeURIComponent(lastPart).split('_').slice(2).join('_') || '파일명 없음';
    } catch {
      return '파일';
    }
  };

  const renderLargeFileAttachment = (fileUrl: string, idx: number, allFiles: string[]) => {
    if (isImageFile(fileUrl)) {
      const imageFiles = allFiles.filter(f => isImageFile(f));
      const imageIndex = imageFiles.indexOf(fileUrl);
      
      return (
        <div key={idx} className="flex flex-col items-start gap-4 py-2 w-full">
          <div 
            className="cursor-zoom-in w-full max-w-sm overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700"
            onClick={() => setGalleryState({ images: imageFiles, index: imageIndex >= 0 ? imageIndex : 0 })}
          >
            <FirestoreImage 
              src={fileUrl} 
              alt={`Attachment ${idx + 1}`} 
              className="w-full h-auto object-cover aspect-video hover:scale-105 transition-transform duration-500" 
            />
          </div>
          <FirestoreFileLink 
            url={fileUrl} 
            filename={getFileName(fileUrl)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Download size={14} />
            <span>이미지 원본 다운로드</span>
          </FirestoreFileLink>
        </div>
      );
    }

    return (
      <div key={idx} className="flex items-center gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-[2rem] transition-all group w-full">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0">
          <FileText size={28} />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-base font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {getFileName(fileUrl)}
          </p>
          <FirestoreFileLink 
            url={fileUrl} 
            filename={getFileName(fileUrl)}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Download size={14} /> 파일 다운로드
          </FirestoreFileLink>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-none space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-1">
      <UserBioModal user={viewingBioUser} onClose={() => setViewingBioUser(null)} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            <span className="text-indigo-600 block text-[10px] md:text-sm tracking-[0.3em] font-black mb-1">CALENDAR</span>
            공연일정
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-base mt-2">주요 공연 및 행사 일정</p>
        </div>
        {user?.role === UserRole.ADMIN && (
          <button 
            onClick={() => {
              setEditingSchedule(null);
              setTitle('');
              setDate('');
              setTime('');
              setLocation('');
              setMapQuery('');
              setDescription('');
              setFileItems([]);
              setIsAdding(true);
            }}
            className="flex-shrink-0 bg-indigo-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all text-[10px] md:text-xs uppercase tracking-widest"
          >
            <Plus size={16} strokeWidth={3} className="md:w-[18px] md:h-[18px]" />
            <span>일정 등록</span>
          </button>
        )}
      </div>

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Calendar Section - narrowed and more spacious cells */}
        <div className="bg-white dark:bg-slate-900 py-4 px-4 md:py-6 md:px-8 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4 px-4">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tighter whitespace-nowrap">
              {year}년 {month + 1}월
            </h2>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={cn(
                "py-1 text-center text-xs font-black tracking-[0.2em] uppercase",
                i === 0 ? "text-red-500/60" : i === 6 ? "text-blue-500/60" : "text-slate-300 dark:text-slate-600"
              )}>
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarDays.map((day, i) => {
              const daySchedules = day ? getSchedulesForDay(day) : [];
              const hasPerformance = daySchedules.length > 0;
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const isSelected = selectedDay === day;
              const isSunday = i % 7 === 0;
              const isSaturday = i % 7 === 6;
              const isHoliday = day ? isPublicHoliday(day, month) : false;
              const hasPerformanceInFuture = day && hasPerformance;

              return (
                <div key={i} className="flex flex-col items-center justify-center relative min-h-[32px] md:min-h-[40px]">
                  {day && (
                    <button 
                      onClick={() => setSelectedDay(day)}
                      className="flex flex-col items-center group transition-all w-full h-full justify-start pt-1"
                    >
                      <div className={cn(
                        "w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all relative z-10",
                        isSelected ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-110" : (isToday ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"),
                        !isSelected && (isSunday || isHoliday) && "text-red-500",
                        !isSelected && isSaturday && !isToday && !isHoliday && "text-blue-500",
                        !isSelected && hasPerformance && "ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10"
                      )}>
                        <span>{day}</span>
                        {hasPerformance && (
                          <div className={cn(
                            "absolute bottom-[2px] md:bottom-[4px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 animate-pulse",
                            isSelected && "bg-white"
                          )} />
                        )}
                        {isSelected && !hasPerformance && (
                          <motion.div layoutId="selection" className="absolute inset-0 border-2 border-indigo-600 rounded-lg md:rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                        )}
                        {hasPerformance && !isSelected && (
                          <div className="absolute inset-0 bg-indigo-400/10 rounded-lg md:rounded-xl blur-sm -z-10" />
                        )}
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule List Section - Scaled down */}
        <div className="space-y-3">
          {sortedUpcoming.length > 0 ? (
            sortedUpcoming.map((s) => {
              const eventDate = new Date(s.date);
              const eventDay = eventDate.getDate();
              const isSelected = selectedDay === eventDay;

              return (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedDay(eventDay)}
                  className={cn(
                    "px-4 py-3 rounded-2xl border transition-all flex items-center gap-4 group relative cursor-pointer overflow-hidden",
                    isSelected 
                      ? "bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-600/5 shadow-xl scale-[1.02]" 
                      : "bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-slate-100 dark:border-white/5 hover:border-indigo-500/50 hover:bg-white/60 dark:hover:bg-slate-900/60"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] -z-10 rounded-full" />
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 transition-all duration-300",
                    isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 rotate-3" : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600"
                  )}>
                    <span className="text-xl font-black leading-none">{eventDay}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[7px] font-black uppercase tracking-widest flex-shrink-0">공연</span>
                        <h4 
                          onClick={(e) => { e.stopPropagation(); setSelectedSchedule(s); }}
                          className="text-sm font-black text-slate-900 dark:text-white truncate hover:text-indigo-600 transition-colors uppercase tracking-tight"
                        >
                          {s.title}
                        </h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1 text-[9px] font-bold">
                          <MapPin size={10} className="text-indigo-500" />
                          <span className="truncate">{s.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold">
                          <Clock size={10} className="text-indigo-500" />
                          <span>{s.time || '시간 미지정'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 dark:text-slate-600 ml-auto">
                        <div className="flex items-center gap-1">
                          <Heart size={14} className={s.likes > 0 ? "text-pink-500 fill-pink-500" : "opacity-50"} />
                          <span className="text-[10px] font-bold tabular-nums">{s.likes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare size={14} className={s.commentCount > 0 ? "text-indigo-500 fill-indigo-500/10" : "opacity-50"} />
                          <span className="text-[10px] font-bold tabular-nums">{s.commentCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
              <div className="bg-slate-50/50 dark:bg-slate-800/30 p-20 rounded-[3rem] border border-dashed border-slate-100 dark:border-slate-800 text-center">
                <CalendarIcon size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="font-black text-slate-400 text-lg uppercase tracking-widest">등록된 공연 일정이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

      {/* Add Schedule Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight dark:text-white">{editingSchedule ? '공연 일정 수정' : '공연 일정 등록'}</h2>
                <button onClick={() => { setIsAdding(false); setEditingSchedule(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddSchedule} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">공연 제목</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold transition-all dark:text-white"
                    placeholder="공연 제목을 입력하세요"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">일자</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">시간</label>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">장소</label>
                  <input 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold dark:text-white"
                    placeholder="공연 장소"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상세 설명</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-medium min-h-[150px] dark:text-white"
                    placeholder="공연에 대한 상세 설명을 입력하세요"
                  />
                </div>

                <FileUploadZone 
                  files={fileItems}
                  onAdd={(newItems) => setFileItems(prev => [...prev, ...newItems])}
                  onRemove={(idx) => removeFile(idx)}
                  maxFiles={10}
                  label="사진 첨부"
                />

                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all mt-4 disabled:bg-slate-400"
                >
                  {isUploading ? '업로드 및 저장 중...' : (editingSchedule ? '일정 수정 완료' : '공연 일정 등록 완료')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSchedule && (() => {
          const allScheduleFiles = selectedSchedule.files || [];
          const allImageFiles = allScheduleFiles.filter(isImageFile);
          const featuredImage = allImageFiles.length > 0 ? allImageFiles[0] : null;
          const remainingFiles = allScheduleFiles.filter(f => f !== featuredImage);

          return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Navigation & Metadata Header */}
              <div className="px-8 py-6 flex items-center justify-between sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <CalendarIcon size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none mb-1">Performance</p>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight leading-none">Detail Schedule</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedSchedule(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 md:p-10 space-y-8">
                  {/* Title Section */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">공연 제목</label>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                      {selectedSchedule.title}
                    </h1>
                  </div>

                  {/* Date, Time & Location Section */}
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 shadow-sm group hover:border-indigo-500/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">일시</span>
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base leading-tight">
                          <span>{selectedSchedule.date}</span>
                          {selectedSchedule.time && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span className="text-indigo-600 dark:text-indigo-400">{selectedSchedule.time}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 shadow-sm group hover:border-indigo-500/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                        <MapPin size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">장소</span>
                        <span className="text-slate-900 dark:text-white font-black text-base leading-tight">
                          {selectedSchedule.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  {selectedSchedule.description && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상세 설명</label>
                      <div className="relative group/content">
                        <div className="text-slate-600 dark:text-slate-300 leading-[1.8] font-medium whitespace-pre-wrap text-base min-h-[100px]">
                          {selectedSchedule.description}
                        </div>

                        {/* Interaction Stats */}
                        <div className="flex justify-end mt-6">
                          <button 
                            onClick={async () => {
                              if (!selectedSchedule) return;
                              await StorageService.toggleScheduleLike(selectedSchedule.id);
                              const liked = await StorageService.checkIfLikedSchedule(selectedSchedule.id);
                              setIsLiked(liked);
                              
                              const updated = await StorageService.getSchedules();
                              setSchedules(updated);
                              const found = updated.find(s => s.id === selectedSchedule!.id);
                              if (found) setSelectedSchedule(found);
                            }}
                            className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors bg-slate-50 dark:bg-white/5 py-2 px-4 rounded-full"
                          >
                            <Heart size={20} className={cn(isLiked ? "fill-pink-500 text-pink-500" : "")} />
                            <span className="font-black tabular-nums text-base">{selectedSchedule.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <CommentSection 
                      schedule={selectedSchedule} 
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onShowBio={handleShowBio}
                    />
                  </div>

                  {/* Attachments Section */}
                  {allScheduleFiles.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">첨부 파일</label>
                      <div className="grid grid-cols-1 gap-4">
                        {allScheduleFiles.map((file, idx) => (
                          <div key={idx}>
                            {renderLargeFileAttachment(file, idx, allScheduleFiles)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-12 pt-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center font-black text-xs overflow-visible">
                        {selectedSchedule.authorId === 'admin' ? (
                          <AdminCrown size={20} />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white overflow-hidden">
                            H
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Author</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none flex items-center gap-1">
                          {selectedSchedule.authorId === 'admin' ? '관리자' : '헤이데이즈'}
                          {selectedSchedule.authorId === 'admin' && <AdminCrown size={12} />}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedSchedule(null)}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {scheduleToDelete && (
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
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">일정을 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">관련된 지도 정보와 이미지를 포함한<br />모든 데이터가 영구 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setScheduleToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  아니요
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all"
                >
                  예
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {galleryState && (
          <ImageGallery 
            images={galleryState.images}
            initialIndex={galleryState.index}
            onClose={() => setGalleryState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const CommentSection = ({ schedule, onEdit, onDelete, onShowBio }: { 
  schedule: Schedule, 
  onEdit: (s: Schedule) => void, 
  onDelete: (s: Schedule) => void,
  onShowBio: (userId: string) => void
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const fetched = await StorageService.getScheduleComments(schedule.id);
      setComments(fetched);
    };
    fetchComments();
  }, [schedule.id, commentRefreshTrigger]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    await StorageService.addScheduleComment(schedule.id, {
      id: Math.random().toString(36).substr(2, 9),
      postId: schedule.id, 
      authorId: user.id,
      authorName: user.name,
      content: newComment,
      createdAt: Date.now()
    });

    setNewComment('');
    setCommentRefreshTrigger(prev => prev + 1);
  };

  const confirmDeleteComment = async () => {
    if (commentToDelete) {
      await StorageService.deleteScheduleComment(schedule.id, commentToDelete.id);
      setCommentToDelete(null);
      setCommentRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="mt-8 pt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          댓글 {comments.length}
        </h4>
        
        {(user?.role === UserRole.ADMIN || (user?.id && schedule.authorId === user.id)) && (
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(schedule); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <PenLine size={12} />
              수정
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(schedule); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={12} />
              삭제
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex justify-between items-start group/comment bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl text-left">
            <div className="flex gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0 overflow-hidden font-black text-indigo-600 dark:text-indigo-400 text-[10px]">
                <UserAvatarDisplay userId={comment.authorId} name={comment.authorName} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onShowBio(comment.authorId)}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {comment.authorName}
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{comment.content}</p>
              </div>
            </div>
            {(user?.role === UserRole.ADMIN || user?.id === comment.authorId) && (
              <button onClick={() => setCommentToDelete(comment)} className="p-2 text-slate-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddComment}>
        <input 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-medium dark:text-white"
          placeholder="댓글을 입력하세요..."
          required
        />
      </form>

      <AnimatePresence>
        {commentToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 text-center border border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black mb-4 dark:text-white">댓글을 삭제하시겠습니까?</h3>
              <div className="flex gap-3">
                <button onClick={() => setCommentToDelete(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black">취소</button>
                <button onClick={confirmDeleteComment} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black">삭제</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
