import React, { useState, useRef } from 'react';
import { Plus, X, Image as ImageIcon, Paperclip, Loader2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageCompression';
import { FirestoreImage } from './FirestoreImage';

interface FileUploadZoneProps {
  files: { file?: File, url: string, status?: 'pending' | 'uploading' | 'error' }[];
  onAdd: (newFiles: { file: File, url: string }[]) => void;
  onRemove: (index: number) => void;
  maxFiles?: number;
  label?: string;
}

export default function FileUploadZone({ 
  files, 
  onAdd, 
  onRemove, 
  maxFiles = 10,
  label = "파일 업로드"
}: FileUploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`최대 ${maxFiles}개까지 첨부할 수 있습니다.`);
      return;
    }

    setIsProcessing(true);
    try {
      const MAX_PRE_PROCESS_SIZE = 50 * 1024 * 1024; // 50MB
      
      const processedFiles = await Promise.all(
        (selectedFiles as File[]).map(async (file) => {
          if (file.size > MAX_PRE_PROCESS_SIZE) {
            throw new Error(`파일 '${file.name}'이 너무 큽니다 (${(file.size / (1024 * 1024)).toFixed(1)}MB). 50MB 이하의 파일만 업로드할 수 있습니다.`);
          }
          
          let processedFile = file;
          // 압축은 이미지 파일에만 적용
          if (file.type.startsWith('image/')) {
            processedFile = await compressImage(file);
          }
          return {
            file: processedFile,
            url: URL.createObjectURL(processedFile)
          };
        })
      );
      onAdd(processedFiles);
    } catch (error: any) {
      console.error('File processing failed:', error);
      alert(error.message || '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  const isImageFile = (item: { file?: File, url: string }) => {
    if (item.file) {
      return item.file.type.startsWith('image/');
    }
    return item.url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(?:\?|%3F|$)/i) !== null;
  };

  const getFileName = (item: { file?: File, url: string }) => {
    if (item.file) return item.file.name;
    try {
      if (item.url.startsWith('firestore://')) {
          const id = item.url.split('/').pop() || '';
          return id.split('_').slice(2, -1).join('_') || '파일명 없음';
      }
      const urlObj = new URL(item.url);
      const parts = urlObj.pathname.split('/');
      const lastPart = parts[parts.length - 1];
      return decodeURIComponent(lastPart).split('_').slice(2).join('_') || '파일명 없음';
    } catch {
      return '파일';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Paperclip size={14} /> {label} ({files.length}/{maxFiles})
        </label>
        {files.length < maxFiles && !isProcessing && (
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={12} strokeWidth={3} /> 추가하기
          </button>
        )}
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {files.map((item, idx) => {
          const isImage = isImageFile(item);
          return (
          <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shadow-sm transition-all hover:shadow-md flex flex-col items-center justify-center">
            {isImage ? (
              <FirestoreImage src={item.url} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center w-full h-full">
                <FileText size={32} className="text-indigo-400 mb-2" />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate w-full px-2" title={getFileName(item)}>
                  {getFileName(item)}
                </span>
              </div>
            )}
            
            {/* Overlay for status */}
            {item.status === 'uploading' && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
            
            {item.status === 'error' && (
              <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
            )}

            <button 
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 dark:bg-slate-900/90 text-red-500 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </div>
          );
        })}
        
        {isProcessing && (
          <div className="aspect-square rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-800/50">
            <Loader2 size={20} className="text-indigo-600 animate-spin" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Processing...</span>
          </div>
        )}
        
        {files.length === 0 && !isProcessing && (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="col-span-full py-12 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all group group-hover:border-indigo-300 dark:group-hover:border-indigo-900"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">여러 개의 파일 첨부 가능</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">최대 {maxFiles}개의 파일을 한 번에 선택할 수 있습니다.</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
