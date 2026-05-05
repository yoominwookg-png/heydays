import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { Loader2 } from 'lucide-react';

interface FirestoreImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
  loadingClassName?: string;
}

export const FirestoreImage: React.FC<FirestoreImageProps> = ({ 
  src, 
  fallback, 
  className, 
  loadingClassName,
  ...props 
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!src) {
      setDataUrl(null);
      return;
    }

    if (!src.startsWith('firestore://')) {
      setDataUrl(src);
      return;
    }

    const fetchImage = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getFileData(src);
        setDataUrl(data);
      } catch (err) {
        console.error('Failed to load firestore image:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl ${className} ${loadingClassName || ''}`} style={props.style}>
        <Loader2 className="animate-spin text-indigo-600" size={24} />
      </div>
    );
  }

  if (!dataUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return <img src={dataUrl} className={className} {...props} />;
};
