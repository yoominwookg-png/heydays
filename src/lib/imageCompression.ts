import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Firestore document limit is 1MB. Base64 encoding adds ~33% overhead.
  // To support multiple files, we aim for a smaller size per file.
  // Target raw size: 0.3MB -> Base64 size: ~0.4MB
  const targetSizeMB = 0.3;
  
  if (file.size <= targetSizeMB * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: targetSizeMB,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: file.type,
    alwaysKeepResolution: false,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Original size: ${file.size / 1024 / 1024} MB`);
    console.log(`Compressed size: ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original if compression fails
  }
}
