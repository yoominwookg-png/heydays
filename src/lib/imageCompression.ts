/**
 * Client-side image compression using Canvas API.
 * This approach is lightweight and avoids external dependencies.
 */

interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  quality?: number;
}

export async function compressImage(file: File, customOptions?: CompressionOptions): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Target size for Firestore (1MB limit per document)
  // Base64 encoding adds ~33% overhead. 0.6MB raw file -> ~0.8MB Base64 (Safe)
  const targetSizeMB = customOptions?.maxSizeMB || 0.6;
  const targetSizeBytes = targetSizeMB * 1024 * 1024;

  // If already small enough and not exceeding resolution defaults, skip.
  if (file.size < targetSizeBytes && !customOptions?.maxWidthOrHeight) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    
    img.onload = () => {
      // Clean up the URL object after image is loaded
      URL.revokeObjectURL(url);
      
      const startMaxWidthOrHeight = customOptions?.maxWidthOrHeight || 1200;
        
        const performCompression = async (maxSize: number, q: number): Promise<File> => {
          let width = img.width;
          let height = img.height;

          // Calculate dimensions
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context failed');
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', q));
          if (!blob) throw new Error('Blob conversion failed');

          // If still too large and we can reduce quality further
          if (blob.size > targetSizeBytes && q > 0.2) {
            return performCompression(maxSize, q - 0.2);
          } 
          // If quality is already low (0.2) but still too large, reduce resolution
          else if (blob.size > targetSizeBytes && maxSize > 200) {
            return performCompression(maxSize * 0.7, 0.5); // Reduce resolution by 30% and reset quality
          }

          return new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
        };

        performCompression(startMaxWidthOrHeight, customOptions?.quality || 0.8)
          .then(result => {
            img.src = ''; // Memory cleanup
            resolve(result);
          })
          .catch(() => {
            img.src = '';
            resolve(file); // Final fallback to original
          });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
  });
}
