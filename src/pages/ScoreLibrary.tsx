/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Search, 
  Upload, 
  Maximize2, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Clock,
  FileText,
  StickyNote,
  Trash2,
  Paperclip,
  Plus,
  PenLine,
  MessageCircle,
  MessageSquare,
  Crown,
  Eye,
  Heart,
  Download
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { Score, ScoreNote, UserRole, Comment, User } from '../types';
import { useAuth } from '../services/auth';
import { useUsersContext } from '../contexts/UsersContext';
import { cn, formatDate } from '../lib/utils';

import FileUploadZone from '../components/FileUploadZone';
import UserBioModal from '../components/UserBioModal';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';
import { FirestoreImage } from '../components/FirestoreImage';
import { FirestoreFileLink } from '../components/FirestoreFileLink';
import ImageGallery from '../components/ImageGallery';
import { AdminCrown } from '../components/AdminCrown';

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

const renderLargeFileAttachment = (fileUrl: string, idx: number, allFiles: string[], onImageClick: (images: string[], index: number) => void) => {
  if (isImageFile(fileUrl)) {
    const imageFiles = allFiles.filter(f => isImageFile(f));
    const imageIndex = imageFiles.indexOf(fileUrl);
    
    return (
      <div key={idx} className="flex flex-col items-start gap-4 py-2 w-full text-left">
      <div 
        className="cursor-zoom-in w-full max-w-sm overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700"
        onClick={() => onImageClick(imageFiles, imageIndex >= 0 ? imageIndex : 0)}
      >
        <FirestoreImage 
          src={fileUrl} 
          alt={`Attachment ${idx + 1}`} 
          className="w-full h-auto object-cover aspect-[3/4] hover:scale-105 transition-transform duration-500" 
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
    <div key={idx} className="flex items-center gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-[2rem] transition-all group w-full text-left">
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

export default function ScoreLibrary() {
  const [scores, setScores] = useState<Score[]>([]);
  const [search, setSearch] = useState('');
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<Score | null>(null);
  const [galleryState, setGalleryState] = useState<{ images: string[], index: number } | null>(null);
  const { user } = useAuth();
  const { users } = useUsersContext();

  const [isUploading, setIsUploading] = useState(false);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [newScoreTitle, setNewScoreTitle] = useState('');
  const [newScoreDescription, setNewScoreDescription] = useState('');
  const [scoreFileItems, setScoreFileItems] = useState<{file?: File, url: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    const fetched = await StorageService.getScores();
    setScores(fetched);
  };

  const filteredScores = scores.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  const removeNewFile = (index: number) => {
    const item = scoreFileItems[index];
    if (item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
    setScoreFileItems(scoreFileItems.filter((_, i) => i !== index));
  };

  const handleEdit = (score: Score) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && score.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setEditingScore(score);
    setNewScoreTitle(score.title);
    setNewScoreDescription(score.description || '');
    setScoreFileItems(score.files?.map(url => ({ url })) || []);
    setIsUploading(true);
  };

  const handleShowBio = async (userId: string) => {
    const userToView = await StorageService.getUser(userId);
    if (userToView) {
      setViewingBioUser(userToView);
    }
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newScoreTitle.trim() || scoreFileItems.length === 0) {
      alert('제목과 하나 이상의 파일을 등록해주세요.');
      return;
    }

    setIsSaving(true);
    
    try {
      const scoreId = editingScore?.id || Math.random().toString(36).substring(2, 11);
      
      const newFiles = scoreFileItems.filter(item => item.file).map(item => item.file!);
      const existingUrls = scoreFileItems.filter(item => !item.file).map(item => item.url);
      
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        console.log(`Starting upload of ${newFiles.length} files...`);
        uploadedUrls = await StorageService.uploadFiles('scores', scoreId, newFiles);
        console.log(`Successfully uploaded ${uploadedUrls.length} files.`);
      }
      
      const finalUrls = [...existingUrls, ...uploadedUrls];
        const scoreData: Partial<Score> = {
        title: newScoreTitle.trim(),
        description: newScoreDescription.trim(),
        fileData: finalUrls[0],
        files: finalUrls,
        authorName: editingScore?.authorName || (editingScore?.authorId === 'admin' ? '관리자' : '헤이데이즈')
      };

      if (editingScore) {
        const updatedScore: Score = {
          ...editingScore,
          ...scoreData as Score,
        };
        await StorageService.saveScore(updatedScore);
        setScores(prev => prev.map(s => s.id === updatedScore.id ? updatedScore : s));
      } else {
        const newScore: Score = {
          id: scoreId,
          ...scoreData as Score,
          fileType: 'jpg',
          authorId: user?.id || '',
          authorName: user?.name || '헤이데이즈',
          createdAt: Date.now(),
          likes: 0,
          views: 0,
          commentCount: 0
        } as Score;
        await StorageService.saveScore(newScore);
        setScores(prev => [...prev, newScore]);
      }
      
      // Reset and close
      setIsUploading(false);
      setEditingScore(null);
      setNewScoreTitle('');
      setNewScoreDescription('');
      setScoreFileItems([]);
      await loadScores();
    } catch (err: any) {
      console.error('Save failed:', err);
      let errorMessage = '업로드 중 오류가 발생했습니다. ';
      if (err.message?.includes('timed out')) {
        errorMessage += '네트워크 지연으로 시간이 초과되었습니다.';
      } else {
        errorMessage += '네트워크 상태나 파일 크기를 확인해주세요.';
      }
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteScore = (score: Score) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && score.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setScoreToDelete(score);
  };

  const confirmDelete = async () => {
    if (scoreToDelete) {
      if (scoreToDelete.files && scoreToDelete.files.length > 0) {
        await StorageService.deleteFiles(scoreToDelete.files);
      }
      await StorageService.deleteScore(scoreToDelete.id);
      const updated = scores.filter(s => s.id !== scoreToDelete.id);
      setScores(updated);
      setScoreToDelete(null);
      setIsViewerOpen(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-1">
      <UserBioModal user={viewingBioUser} onClose={() => setViewingBioUser(null)} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-1 text-slate-900 dark:text-white uppercase leading-none">악보 라이브러리</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-base">헤이데이즈 멤버들의 공유 악보 창고</p>
        </div>
        <button 
          onClick={() => setIsUploading(true)}
          className="flex-shrink-0 bg-indigo-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all text-[10px] md:text-xs uppercase tracking-widest"
        >
          <Plus size={16} strokeWidth={3} className="md:w-[18px] md:h-[18px]" />
          <span>악보 등록</span>
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl py-5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 shadow-sm dark:shadow-slate-950/50 transition-all font-semibold dark:text-white"
          placeholder="악보 제목으로 검색..."
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:gap-3">
        {filteredScores.map((score) => (
          <motion.div 
            key={score.id}
            whileHover={{ scale: 1.002 }}
            onClick={() => { setSelectedScore(score); setIsViewerOpen(true); }}
            className="bg-white dark:bg-slate-900 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xs flex-shrink-0">
                {score.authorId === 'admin' ? (
                  <AdminCrown size={18} />
                ) : (
                  <div className="w-full h-full rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-800 overflow-hidden shadow-inner uppercase">
                    <UserAvatarDisplay userId={score.authorId} name="H" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm md:text-base font-bold tracking-tight text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {score.title}
                    <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-400">
                      {score.fileType === 'pdf' ? 'PDF' : 'IMAGE'}
                    </span>
                  </h3>
                  <div className="hidden sm:flex items-center gap-3 text-slate-400 dark:text-slate-600 shrink-0">
                    <div className="flex items-center gap-1">
                      <Eye size={14} className="opacity-50" />
                      <span className="text-[10px] font-bold tabular-nums">{score.views || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={14} className={score.likes > 0 ? "text-pink-500 fill-pink-500" : "opacity-50"} />
                      <span className="text-[10px] font-bold tabular-nums">{score.likes || 0}</span>
                    </div>
                    {score.commentCount > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} className="text-indigo-500 fill-indigo-500/10" />
                        <span className="text-[10px] font-bold tabular-nums">{score.commentCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-0.5 md:mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {users[score.authorId]?.name || score.authorName}
                      {score.authorId === 'admin' && <AdminCrown size={10} />}
                    </span>
                    <span className="text-[8px] text-slate-300 dark:text-slate-700 font-black">•</span>
                    <span className="text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500">{formatDate(score.createdAt)}</span>
                  </div>
                  
                  <div className="sm:hidden flex items-center gap-2 text-slate-400 dark:text-slate-600">
                    <div className="flex items-center gap-0.5">
                      <Heart size={10} className={score.likes > 0 ? "text-pink-500 fill-pink-500" : ""} />
                      <span className="text-[9px] font-bold">{score.likes || 0}</span>
                    </div>
                    {score.commentCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <MessageSquare size={10} className="text-indigo-500" />
                        <span className="text-[9px] font-bold">{score.commentCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredScores.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Music size={40} />
            </div>
            <p className="font-black text-slate-400 text-lg">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Upload Modal (Notice-style) */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight dark:text-white uppercase flex items-center gap-2">
                  <Upload size={24} className="text-indigo-600" />
                  {editingScore ? '악보 수정하기' : '새 악보 등록'}
                </h2>
                <button onClick={() => { setIsUploading(false); setEditingScore(null); setNewScoreTitle(''); setNewScoreDescription(''); setScoreFileItems([]); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSaveScore} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">제목</label>
                  <input 
                    value={newScoreTitle}
                    onChange={(e) => setNewScoreTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-black transition-all dark:text-white"
                    placeholder="곡 제목 또는 악보 제목을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">내용</label>
                  <textarea 
                    value={newScoreDescription}
                    onChange={(e) => setNewScoreDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 min-h-[150px] transition-all font-medium dark:text-white"
                    placeholder="매모나 상세 설명을 입력하세요"
                  />
                </div>

                <FileUploadZone 
                  files={scoreFileItems}
                  onAdd={(newItems) => setScoreFileItems(prev => [...prev, ...newItems])}
                  onRemove={(idx) => removeNewFile(idx)}
                  maxFiles={10}
                  label="악보 이미지"
                />

                <button 
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all text-sm tracking-widest",
                    isSaving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaving ? '업로드 중...' : (editingScore ? '변경사항 저장' : '악보 등록 완료')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewerOpen && selectedScore && (
          <ScoreViewer 
            score={selectedScore} 
            onClose={() => setIsViewerOpen(false)} 
            onEdit={(s) => { setIsViewerOpen(false); handleEdit(s); }}
            onDelete={(s) => { deleteScore(s); }}
            onShowBio={handleShowBio}
            onImageClick={(images, index) => setGalleryState({ images, index })}
          />
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

      <AnimatePresence>
        {scoreToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">악보를 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">관련된 메모와 모든 페이지 데이터가<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setScoreToDelete(null)}
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
    </div>
  );
}

function ScoreViewer({ score, onClose, onEdit, onDelete, onShowBio, onImageClick }: { 
  score: Score; 
  onClose: () => void;
  onEdit: (s: Score) => void;
  onDelete: (s: Score) => void;
  onShowBio: (userId: string) => void;
  onImageClick: (images: string[], index: number) => void;
}) {
  const { user } = useAuth();
  const { users } = useUsersContext();
  const [zoom, setZoom] = useState(1);
  const allImageFiles = score.files?.filter(isImageFile) || [];
  const featuredImage = allImageFiles.length > 0 ? allImageFiles[0] : null;
  const remainingFiles = (score.files || []).filter(f => f !== featuredImage);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation & Metadata Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Plus size={20} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none mb-1">Score Library</p>
              <p className="text-xs font-black text-slate-400 uppercase tracking-tight leading-none">Detail View</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-full text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} />
                {formatDate(score.createdAt)}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 mr-4">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <ZoomOut size={18} />
              </button>
              <span className="text-slate-900 dark:text-white text-[10px] font-black min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <ZoomIn size={18} />
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 md:p-12 space-y-12">
            {/* Title & Author Section */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20">
                  {formatDate(score.createdAt)}
                </div>
                <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">
                  BY {users[score.authorId]?.name || score.authorName}
                </div>
              </div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                {score.title}
              </h2>
              {score.description && (
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4 py-1">상세 설명</h3>
                  <div className="text-slate-600 dark:text-slate-300 leading-[1.8] font-medium whitespace-pre-wrap text-lg bg-slate-50/50 dark:bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                    {score.description}
                  </div>
                </div>
              )}
            </div>

            {/* Interaction Stats */}
            <div className="flex items-center gap-8 py-6 border-y border-slate-100 dark:border-white/5">
              <button 
                onClick={async () => {
                  await StorageService.toggleScoreLike(score.id);
                  // Refreshing local UI for score detail
                  // score.likes could be updated by parent refresh, but for detail view we just show the interaction
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors"
              >
                <Heart size={24} className={cn(score.likes && score.likes > 0 ? "fill-pink-500 text-pink-500" : "")} />
                <span className="font-black tabular-nums">{score.likes || 0}</span>
              </button>
              <div className="flex items-center gap-2 text-slate-400">
                <Eye size={24} />
                <span className="font-black tabular-nums">{score.views || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MessageSquare size={24} />
                <span className="font-black tabular-nums">{score.commentCount || 0}</span>
              </div>
            </div>

            <CommentSection 
              score={score} 
              onEdit={onEdit}
              onDelete={onDelete}
              onShowBio={onShowBio}
            />

            {/* Attachments Section */}
            {score.files && score.files.length > 0 && (
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">첨부 파일</label>
                <div className="grid grid-cols-1 gap-4">
                  {score.files.map((file, idx) => (
                    <div key={idx}>
                      {renderLargeFileAttachment(file, idx, score.files!, onImageClick)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center font-black text-xs overflow-visible">
                  {score.authorId === 'admin' ? (
                    <AdminCrown size={20} />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white overflow-hidden border border-slate-700">
                      <UserAvatarDisplay userId={score.authorId} name="H" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Author</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-none flex items-center gap-1">
                    {users[score.authorId]?.name || score.authorName}
                    {score.authorId === 'admin' && <AdminCrown size={12} />}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose}
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
}

const CommentSection = ({ score, onEdit, onDelete, onShowBio }: { 
  score: Score, 
  onEdit: (s: Score) => void, 
  onDelete: (s: Score) => void,
  onShowBio: (userId: string) => void
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const fetched = await StorageService.getScoreComments(score.id);
      setComments(fetched);
    };
    fetchComments();
  }, [score.id, commentRefreshTrigger]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    await StorageService.addScoreComment(score.id, {
      id: Math.random().toString(36).substr(2, 9),
      postId: score.id, 
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
      await StorageService.deleteScoreComment(score.id, commentToDelete.id);
      setCommentToDelete(null);
      setCommentRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare size={16} /> 댓글 {comments.length}
        </h4>
        
        {(user?.role === UserRole.ADMIN || (user?.id && score.authorId === user.id)) && (
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(score); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <PenLine size={12} />
              수정
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(score); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {comment.authorId === 'admin' ? (
                  <AdminCrown size={14} />
                ) : (
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 w-full h-full flex items-center justify-center">
                    <UserAvatarDisplay userId={comment.authorId} name={comment.authorName} />
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onShowBio(comment.authorId)}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {comment.authorName}
                    {comment.authorId === 'admin' && <AdminCrown size={10} />}
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{comment.content}</p>
              </div>
            </div>
            {(user?.role === UserRole.ADMIN || user?.id === comment.authorId) && (
              <button onClick={() => setCommentToDelete(comment)} className="p-2 text-slate-300 hover:text-red-500 md:opacity-0 group-hover/comment:opacity-100 transition-all font-bold">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-center text-slate-400 dark:text-slate-600 py-4 font-medium text-sm">첫 번째 댓글을 남겨보세요!</p>}
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
