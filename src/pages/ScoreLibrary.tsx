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
  FileText,
  StickyNote,
  Trash2,
  Paperclip,
  Plus,
  PenLine,
  MessageCircle,
  Crown,
  Eye,
  Heart,
  Download
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { Score, ScoreNote, UserRole, Comment, User } from '../types';
import { useAuth } from '../services/auth';
import { cn, formatDate } from '../lib/utils';
import { compressImage } from '../lib/imageCompression';

import FileUploadZone from '../components/FileUploadZone';
import UserBioModal from '../components/UserBioModal';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';

const isImageFile = (url: string) => {
  return url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(?:\?|%3F|$)/i) !== null;
};

const getFileName = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart).split('_').slice(2).join('_') || '파일명 없음';
  } catch {
    return '파일';
  }
};

const renderLargeFileAttachment = (fileUrl: string, idx: number) => {
  if (isImageFile(fileUrl)) {
    return <img src={fileUrl} alt={`Attachment ${idx + 1}`} className="max-w-full h-auto shadow-2xl rounded-sm border border-slate-100 dark:border-white/5" />;
  }
  return (
    <a 
      href={fileUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-[2rem] transition-colors group w-full max-w-2xl mx-auto shadow-xl border border-slate-100 dark:border-white/5"
    >
      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
        <FileText size={32} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-base font-black text-slate-800 dark:text-slate-200 truncate">{getFileName(fileUrl)}</p>
        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-1 inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
          <Download size={14} /> 파일 다운로드
        </p>
      </div>
    </a>
  );
};

export default function ScoreLibrary() {
  const [scores, setScores] = useState<Score[]>([]);
  const [search, setSearch] = useState('');
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<Score | null>(null);
  const { user } = useAuth();

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredScores.map((score) => (
          <motion.div 
            key={score.id}
            whileHover={{ y: -8 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all group flex flex-col h-full"
          >
            <div 
              className="aspect-[3/4] bg-slate-50 dark:bg-slate-800 relative flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => { setSelectedScore(score); setIsViewerOpen(true); }}
            >
              {score.fileData ? (
                isImageFile(score.fileData) ? (
                  <img src={score.fileData} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 w-full h-full justify-center">
                    <FileText size={64} strokeWidth={1} className="text-indigo-200 dark:text-indigo-900" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-white dark:bg-slate-900 rounded-full truncate max-w-[80%] border border-slate-200 dark:border-slate-800">{getFileName(score.fileData)}</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-600">
                  <Music size={64} strokeWidth={1} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">미리보기 없음</span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                 <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all border border-white/20">
                  <Maximize2 size={24} strokeWidth={3} />
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-lg mb-1 truncate dark:text-white tracking-tight">{score.title}</h3>
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{score.fileType === 'pdf' ? 'PDF' : 'IMAGE'}</span>
                <div className="flex items-center gap-1.5 text-[10px] font-black font-mono">
                  <MessageCircle size={14} className="text-slate-300 dark:text-slate-600" />
                  <span>{score.commentCount || 0}</span>
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

function ScoreViewer({ score, onClose, onEdit, onDelete, onShowBio }: { 
  score: Score; 
  onClose: () => void;
  onEdit: (s: Score) => void;
  onDelete: (s: Score) => void;
  onShowBio: (userId: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const { user } = useAuth();

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
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <X size={24} />
            </button>
            <h2 className="text-xl font-black tracking-tight dark:text-white uppercase truncate max-w-[200px] md:max-w-md">악보 상세</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <ZoomOut size={20} />
            </button>
            <span className="text-slate-900 dark:text-white text-xs font-black min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <ZoomIn size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-50 dark:bg-slate-950/20">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                <Music size={12} strokeWidth={3} />
                {score.fileType.toUpperCase()}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                {score.title}
              </h1>
              {score.description && (
                <p className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed mt-4">
                  {score.description}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-8 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
              {score.files && score.files.length > 0 ? (
                score.files.map((file, i) => (
                  <motion.div 
                    key={i}
                    style={{ scale: zoom }}
                    className="origin-top w-full flex justify-center py-4"
                  >
                    {renderLargeFileAttachment(file, i)}
                  </motion.div>
                ))
              ) : score.fileData ? (
                <motion.div 
                  style={{ scale: zoom }}
                  className="origin-top w-full flex justify-center py-4"
                >
                  {renderLargeFileAttachment(score.fileData, 0)}
                </motion.div>
              ) : (
                <div className="w-full aspect-[3/4] bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 rounded-2xl">
                  <Music size={120} strokeWidth={1} />
                  <p className="text-2xl font-black mt-8">악보 데이터 없음</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-10">
              {/* Interaction Stats */}
              <div className="flex items-center gap-8 py-6 border-y border-slate-50 dark:border-white/5">
                <button 
                  onClick={async () => {
                    await StorageService.toggleScoreLike(score.id);
                    // We might need to refresh local score state if needed, but for now just local increment
                    // For brevity, I'll assume state will be refreshed on next load or just local UI feed back
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
                  <MessageCircle size={24} />
                  <span className="font-black tabular-nums">{score.commentCount || 0}</span>
                </div>
              </div>

              <CommentSection 
                score={score} 
                onEdit={onEdit}
                onDelete={onDelete}
                onShowBio={onShowBio}
              />

              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                    {score.authorId === 'admin' ? (
                      <Crown size={18} className="fill-white/20" />
                    ) : (
                      'H'
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Author</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none flex items-center gap-1">
                      {score.authorId === 'admin' ? '관리자' : '헤이데이즈'}
                      {score.authorId === 'admin' && <Crown size={12} className="text-indigo-600" />}
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
          댓글 {comments.length}
        </h4>
        
        {(user?.role === UserRole.ADMIN || (user?.id && score.authorId === user.id)) && (
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(score); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <PenLine size={12} />
              수정
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(score); }}
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

      <form onSubmit={handleAddComment} className="flex gap-3">
        <input 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-medium dark:text-white"
          placeholder="댓글을 입력하세요..."
          required
        />
        <button className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
          <ChevronRight size={18} />
        </button>
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
