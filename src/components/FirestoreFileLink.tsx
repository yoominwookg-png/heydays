import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { Download, Loader2 } from 'lucide-react';

interface FirestoreFileLinkProps {
  url: string;
  filename: string;
  children: React.ReactNode;
  className?: string;
}

export const FirestoreFileLink: React.FC<FirestoreFileLinkProps> = ({ url, filename, children, className }) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    if (!url.startsWith('firestore://')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      const data = await StorageService.getFileData(url);
      if (data) {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('파일 다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (url.startsWith('firestore://')) {
    return (
      <div onClick={handleDownload} className={`cursor-pointer relative ${className}`}>
        {children}
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        )}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </a>
  );
};
