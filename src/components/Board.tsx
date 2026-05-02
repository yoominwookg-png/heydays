/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Crown,
  Heart, 
  Eye, 
  MessageSquare, 
  Pin, 
  X,
  Edit,
  Trash2,
  PenLine,
  ChevronRight,
  Paperclip,
  Send,
  Image as ImageIcon,
  FileText,
  Download
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { Post, PostType, UserRole, Comment, User } from '../types';
import { useAuth } from '../services/auth';
import { formatDate, cn } from '../lib/utils';
import { compressImage } from '../lib/imageCompression';

import FileUploadZone from './FileUploadZone';
import UserBioModal from './UserBioModal';
import { UserAvatarDisplay } from './UserAvatarDisplay';

interface BoardProps {
  type: PostType;
  title: string;
}

export default function Board({ type, title }: BoardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [viewingBioUser, setViewingBioUser] = useState<User | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{comment: Comment, postId: string} | null>(null);
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadPosts();
  }, [type]);

  const loadPosts = async () => {
    const allPosts = await StorageService.getPosts();
    const filtered = allPosts.filter(p => p.type === type);
    setPosts(filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    }));
  };

  const handleDelete = (post: Post) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && post.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setPostToDelete(post);
  };

  const confirmDelete = async () => {
    if (postToDelete) {
      // Delete associated files first
      if (postToDelete.files && postToDelete.files.length > 0) {
        await StorageService.deleteFiles(postToDelete.files);
      }
      
      await StorageService.deletePost(postToDelete.id);
      setPostToDelete(null);
      setSelectedPost(null);
      loadPosts();
    }
  };

  const confirmDeleteComment = async () => {
    if (commentToDelete) {
      const { comment, postId } = commentToDelete;
      await StorageService.deleteComment(postId, comment.id);
      setCommentToDelete(null);
      
      // Trigger refresh
      setCommentRefreshTrigger(prev => prev + 1);
      
      if (selectedPost && selectedPost.id === postId) {
        loadPosts();
        setSelectedPost({ ...selectedPost, commentCount: (selectedPost.commentCount || 1) - 1 });
      }
    }
  };

  const handleEdit = (post: Post) => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isAuthor = user?.id && post.authorId === user.id;
    if (!isAdmin && !isAuthor) return;
    setEditingPost(post);
    setSelectedPost(null); // Close detail view when editing
    setIsEditorOpen(true);
  };

  const handleShowBio = async (userId: string) => {
    const userToView = await StorageService.getUser(userId);
    if (userToView) {
      setViewingBioUser(userToView);
    }
  };

  const CommentSection = ({ post }: { post: Post }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const postId = post.id;

    useEffect(() => {
      const fetchComments = async () => {
        const fetched = await StorageService.getComments(postId);
        setComments(fetched);
        
        // Data integrity check: if stored count differs from actual count, sync it
        if (post.commentCount !== fetched.length) {
          await StorageService.syncCommentCount(postId, fetched.length);
          // Update the list viewed in background if possible
          loadPosts();
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost({ ...selectedPost, commentCount: fetched.length });
          }
        }
      };
      fetchComments();
    }, [postId, commentRefreshTrigger]);

    const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      await StorageService.addComment({
        id: Math.random().toString(36).substr(2, 9),
        postId,
        authorId: user?.id || '',
        authorName: user?.name || '익명',
        content: newComment,
        createdAt: Date.now()
      });

      setNewComment('');
      
      // Update local state and trigger post list refresh
      const updated = await StorageService.getComments(postId);
      setComments(updated);
      
      // Sync UI
      loadPosts();
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({ ...selectedPost, commentCount: (selectedPost.commentCount || 0) + 1 });
      }
    };

    const handleDeleteCommentClick = (comment: Comment) => {
      const isAdmin = user?.role === UserRole.ADMIN;
      const isAuthor = user?.id && comment.authorId === user.id;
      if (!isAdmin && !isAuthor) return;
      setCommentToDelete({ comment, postId });
    };

    return (
      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare size={16} /> 댓글 {comments.length}
          </h4>
          
          {(user?.role === UserRole.ADMIN || (user?.id && post.authorId === user.id)) && (
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <Edit size={12} />
                수정
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(post); }}
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
            <div key={comment.id} className="flex justify-between items-start group/comment bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl">
              <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                      {comment.authorId === 'admin' || comment.authorName === '관리자' ? (
                        <Crown size={12} className="text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
                      ) : (
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 w-full h-full flex items-center justify-center">
                          <UserAvatarDisplay userId={comment.authorId} name={comment.authorName} />
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleShowBio(comment.authorId)}
                          className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {comment.authorName}
                          {(comment.authorId === 'admin' || comment.authorName === '관리자') && <Crown size={10} className="fill-indigo-600/20" />}
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
              {(user?.role === UserRole.ADMIN || (user?.id && comment.authorId === user.id)) && (
                <button 
                  onClick={() => handleDeleteCommentClick(comment)}
                  className="p-2 text-slate-300 hover:text-red-500 md:opacity-0 group-hover/comment:opacity-100 transition-all font-bold"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-center text-slate-400 dark:text-slate-600 py-4 font-medium text-sm">첫 번째 댓글을 남겨보세요!</p>}
        </div>

        <form onSubmit={handleAddComment} className="space-y-3">
          <div className="flex gap-3">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-medium dark:text-white"
              placeholder="댓글을 입력하세요..."
              required
            />
            <button className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center">
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    );
  };

  const PostForm = () => {
    const [titleStr, setTitleStr] = useState(editingPost?.title || '');
    const [content, setContent] = useState(editingPost?.content || '');
    const [isPinned, setIsPinned] = useState(editingPost?.isPinned || false);
    const [fileItems, setFileItems] = useState<{file?: File, url: string}[]>(
      editingPost?.files ? editingPost.files.map(url => ({ url })) : 
      editingPost?.fileData ? [{ url: editingPost.fileData }] : []
    );
    const [isUploading, setIsUploading] = useState(false);

    const removeFile = (index: number) => {
      const item = fileItems[index];
      if (item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      setFileItems(fileItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isUploading) return;
      
      // Basic validation
      if (!titleStr.trim() || !content.trim()) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
      }

      setIsUploading(true);
      
      try {
        const postId = editingPost?.id || Math.random().toString(36).substring(2, 11);
        
        // Multi-file upload using consolidated service method
        const newFiles = fileItems.filter(item => item.file).map(item => item.file!);
        const existingUrls = fileItems.filter(item => !item.file).map(item => item.url);
        
        let uploadedUrls: string[] = [];
        if (newFiles.length > 0) {
          console.log(`Starting upload of ${newFiles.length} files...`);
          uploadedUrls = await StorageService.uploadFiles('posts', postId, newFiles);
          console.log(`Successfully uploaded ${uploadedUrls.length} files.`);
        }
        
        const finalUrls = [...existingUrls, ...uploadedUrls];
        const firstFileData = finalUrls.length > 0 ? finalUrls[0] : '';
        
        const postData = {
          title: titleStr.trim(),
          content: content.trim(),
          isPinned,
          fileData: firstFileData,
          files: finalUrls,
          authorId: user?.id || '',
          authorName: user?.name || '익명',
          createdAt: editingPost?.createdAt || Date.now(),
          likes: editingPost?.likes || 0,
          views: editingPost?.views || 0,
          commentCount: editingPost?.commentCount || 0
        };

        if (editingPost) {
          await StorageService.updatePost({
            ...editingPost,
            ...postData
          } as Post);
        } else {
          const newPost = {
            id: postId,
            type,
            ...postData,
            likes: 0,
            views: 0,
            commentCount: 0
          } as Post;
          await StorageService.savePost(newPost);

          if (type === PostType.NOTICE) {
            await StorageService.addNotification({
              id: Math.random().toString(36).substring(2, 11),
              userId: 'all',
              title: `[공지] ${titleStr}`,
              content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
              type: 'notice',
              createdAt: Date.now(),
              isRead: false
            });
          }
        }
        
        setIsEditorOpen(false);
        setEditingPost(null);
        await loadPosts();
        
      } catch (err: any) {
        console.error('Submit failed:', err);
        let errorMessage = '업로드 중 오류가 발생했습니다. ';
        
        if (err.message?.includes('timed out')) {
          errorMessage += '네트워크 연결이 지연되어 업로드 시간이 초과되었습니다.';
        } else if (err.message?.includes('permission-denied') || err.message?.includes('insufficient permissions')) {
          errorMessage += '권한이 없습니다.';
        } else {
          errorMessage += '네트워크 상태나 파일 크기(각 파일당 0.3MB 권장)를 확인해주세요.';
        }
        
        alert(errorMessage);
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{editingPost ? '글 수정하기' : '새 글 작성'}</h2>
            <button onClick={() => { setIsEditorOpen(false); setEditingPost(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar pb-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">제목</label>
              <input 
                value={titleStr}
                onChange={(e) => setTitleStr(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 font-bold transition-all dark:text-white"
                placeholder="글 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">내용</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 min-h-[200px] transition-all font-medium dark:text-white"
                placeholder="내용을 자유롭게 입력하세요"
                required
              />
            </div>

            <FileUploadZone 
              files={fileItems}
              onAdd={(newItems) => setFileItems(prev => [...prev, ...newItems])}
              onRemove={(idx) => removeFile(idx)}
              maxFiles={10}
            />

            {user?.role === UserRole.ADMIN && type === PostType.NOTICE && (
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="pin" 
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600"
                />
                <label htmlFor="pin" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <Pin size={14} className="text-indigo-600" /> 공지 상단 고정
                </label>
              </div>
            )}

            <button 
              disabled={isUploading}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:bg-slate-400"
            >
              {isUploading ? '업로드 중...' : (editingPost ? '변경사항 저장' : '작성 완료')}
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

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

  const renderFileAttachment = (fileUrl: string, idx: number) => {
    if (isImageFile(fileUrl)) {
      return <img src={fileUrl} className="w-full object-contain max-h-[500px] rounded-2xl" alt={`Attachment ${idx}`} />;
    }
    return (
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-3 p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors group"
      >
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
          <FileText size={24} />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{getFileName(fileUrl)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
            <Download size={12} /> 다운로드
          </p>
        </div>
      </a>
    );
  };

  const renderLargeFileAttachment = (fileUrl: string, idx: number) => {
    if (isImageFile(fileUrl)) {
      return <img src={fileUrl} alt={`Attachment ${idx + 1}`} className="w-full h-auto object-contain max-h-[800px] rounded-[2rem]" />;
    }
    return (
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-6 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-[2rem] transition-colors group"
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-1">
      <div className="flex items-center justify-between gap-4">
        <div className="border-l-8 border-indigo-600 pl-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-1 text-slate-900 dark:text-white uppercase leading-none">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-base">{type === PostType.NOTICE ? '헤이데이즈 소식 및 공지사항' : '우리의 합주와 공연을 기록하는 공간'}</p>
        </div>
        {(user?.role === UserRole.ADMIN || type === PostType.REVIEW) && (
          <button 
            onClick={() => setIsEditorOpen(true)}
            className="flex-shrink-0 bg-indigo-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all text-[10px] md:text-xs uppercase tracking-widest"
          >
            <Plus size={16} strokeWidth={3} className="md:w-[18px] md:h-[18px]" />
            <span>글쓰기</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={async () => {
              await StorageService.incrementViews(post.id);
              setSelectedPost(post);
            }}
            className={cn(
              "bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[3rem] border shadow-sm group hover:shadow-xl transition-all relative overflow-hidden cursor-pointer",
              post.isPinned ? "border-indigo-200 bg-indigo-50/10 dark:bg-indigo-900/10 dark:border-indigo-900" : "border-slate-100 dark:border-slate-800"
            )}
          >
            {post.isPinned && (
              <div className="absolute top-0 left-0 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-br-2xl flex items-center gap-1 z-10">
                <Pin size={10} fill="white" /> PINNED
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm overflow-hidden shadow-inner border border-indigo-100 dark:border-indigo-800">
                    {post.authorId === 'admin' || post.authorName === '관리자' ? (
                      <Crown size={18} className="fill-indigo-600/20" />
                    ) : (
                      <UserAvatarDisplay userId={post.authorId} name={post.authorName} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        {post.authorName}
                        {(post.authorId === 'admin' || post.authorName === '관리자') && <Crown size={12} className="fill-indigo-600/20" />}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{formatDate(post.createdAt)}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-black mb-4 tracking-tight leading-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.title}</h3>
                
                {post.files && post.files.length > 0 ? (
                  <div className={cn(
                    "mb-6 grid gap-2",
                    post.files.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {post.files.map((file, i) => (
                      <div key={i} className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2">
                        {renderFileAttachment(file, i)}
                      </div>
                    ))}
                  </div>
                ) : post.fileData ? (
                  <div className="mb-6 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2">
                    {renderFileAttachment(post.fileData, 0)}
                  </div>
                ) : null}
                
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap line-clamp-2">
                  {post.content}
                </p>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await StorageService.togglePostLike(post.id);
                        loadPosts();
                      }}
                      className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 hover:text-pink-500 transition-colors"
                    >
                      <Heart size={18} />
                      <span className="text-xs font-bold tabular-nums">{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600">
                      <Eye size={18} />
                      <span className="text-xs font-bold tabular-nums">{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600">
                      <MessageSquare size={18} />
                      <span className="text-xs font-bold tabular-nums">
                        {post.commentCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="ml-auto w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <UserBioModal 
        user={viewingBioUser} 
        onClose={() => setViewingBioUser(null)} 
      />

      <AnimatePresence>
        {isEditorOpen && <PostForm />}
      </AnimatePresence>

      <AnimatePresence>
        {postToDelete && (
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
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">정말 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">이미지 및 모든 댓글을 포함한<br />데이터가 영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPostToDelete(null)}
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
        {commentToDelete && (
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
              <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">댓글을 삭제하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">해당 댓글이 데이터베이스에서<br />영구적으로 삭제됩니다.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCommentToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  아니요
                </button>
                <button 
                  onClick={confirmDeleteComment}
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
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Minimal Header */}
              <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <Pin size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">{title.substring(0, 10)}</p>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight leading-none">Detail View</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10">
                <div className="space-y-10">
                  {/* Title & Author Section */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                        {formatDate(selectedPost.createdAt)}
                      </div>
                      <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                        By {selectedPost.authorName}
                      </div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                      {selectedPost.title}
                    </h2>
                  </div>

                  {/* Interaction Stats */}
                  <div className="flex items-center gap-8 py-6 border-y border-slate-100 dark:border-white/5">
                    <button 
                      onClick={async () => {
                        await StorageService.togglePostLike(selectedPost.id);
                        loadPosts();
                        setSelectedPost({...selectedPost, likes: (selectedPost.likes || 0) + 1});
                      }}
                      className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors"
                    >
                      <Heart size={24} className={cn(selectedPost.likes && selectedPost.likes > 0 ? "fill-pink-500 text-pink-500" : "")} />
                      <span className="font-black tabular-nums">{selectedPost.likes || 0}</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Eye size={24} />
                      <span className="font-black tabular-nums">{selectedPost.views || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare size={24} />
                      <span className="font-black tabular-nums">{selectedPost.commentCount || 0}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold whitespace-pre-wrap text-xl">
                      {selectedPost.content}
                    </div>
                  </div>

                  {/* Files / Images */}
                  {((selectedPost.files && selectedPost.files.length > 0) || selectedPost.fileData) && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Attachments</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {(selectedPost.files && selectedPost.files.length > 0) ? (
                          selectedPost.files.map((file, idx) => (
                             <div key={idx} className="rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-lg bg-slate-50 dark:bg-slate-800 p-2">
                               {renderLargeFileAttachment(file, idx)}
                             </div>
                          ))
                        ) : selectedPost.fileData ? (
                          <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-lg bg-slate-50 dark:bg-slate-800 p-2">
                            {renderLargeFileAttachment(selectedPost.fileData, 0)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Comments Section in Modal */}
                  <div className="border-t border-slate-100 dark:border-white/5 pt-10">
                    <CommentSection post={selectedPost} />
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                      {selectedPost.authorId === 'admin' || selectedPost.authorName === '관리자' ? (
                        <Crown size={18} className="fill-white/20" />
                      ) : (
                        <UserAvatarDisplay userId={selectedPost.authorId} name={selectedPost.authorName} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Author</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-none flex items-center gap-1">
                        {selectedPost.authorName}
                        {(selectedPost.authorId === 'admin' || selectedPost.authorName === '관리자') && <Crown size={12} className="text-indigo-600" />}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg"
                  >
                    Close Post
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
