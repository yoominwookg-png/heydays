/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  getDocsFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  increment,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { STORAGE_KEYS, APP_VERSION } from '../constants';
import { User, Post, Schedule, Score, Comment, Message, Notification, OperationType, FirestoreErrorInfo, ListItem, ScoreNote } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export const StorageService = {
  init() {
    // Local theme persistence is still fine
    const isDark = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Users
  async getUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  async saveUser(user: User) {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
  },

  async updateUser(userId: string, data: Partial<User>) {
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async getUser(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  },

  async deleteAccount(userId: string) {
    try {
      await updateDoc(doc(db, 'users', userId), { deletedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async cancelDeleteAccount(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.deletedAt) {
          // In Firestore, to remove a field we can use deleteField() but updateDoc with undefined might works or just setting to null
          // However, our rules check if deletedAt is number. So we might need to handle presence.
          // Wait, the rules: (!('deletedAt' in data) || data.deletedAt is number)
          // Removing the field is best.
          const { deleteField } = await import('firebase/firestore');
          await updateDoc(userRef, { deletedAt: deleteField() });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async permanentlyDeleteAccount(userId: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  },

  async heartbeat(userId: string) {
    try {
      // Use direct updateDoc for efficiency
      await updateDoc(doc(db, 'users', userId), { lastActiveAt: Date.now() });
    } catch (error) {
      // Slently fail to avoid UI noise during heartbeats
      console.warn("Heartbeat update failed:", error);
    }
  },

  // Auth - Handled by AuthProvider and Firebase Auth directly
  getAuth(): User | null {
    return null; // AuthProvider handles this
  },

  setAuth(user: User | null) {
    // No-op, managed by Firebase Auth
  },

  // Posts
  async getPosts(): Promise<Post[]> {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Post);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      return [];
    }
  },

  async savePost(post: Post) {
    try {
      await setDoc(doc(db, 'posts', post.id), post);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${post.id}`);
    }
  },

  async updatePost(updatedPost: Post) {
    try {
      await updateDoc(doc(db, 'posts', updatedPost.id), { ...updatedPost });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${updatedPost.id}`);
    }
  },

  async deletePost(id: string) {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  },

  async syncCommentCount(postId: string, count: number) {
    try {
      await updateDoc(doc(db, 'posts', postId), { commentCount: count });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  },

  async incrementViews(postId: string) {
    try {
      await updateDoc(doc(db, 'posts', postId), { views: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  },

  async togglePostLike(postId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
      const likeRef = doc(db, `posts/${postId}/likes`, userId);
      const likeSnap = await getDoc(likeRef);
      
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
      } else {
        await setDoc(likeRef, { at: Date.now() });
        await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  },

  async checkIfLikedPost(postId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;
    try {
      const likeSnap = await getDoc(doc(db, `posts/${postId}/likes`, userId));
      return likeSnap.exists();
    } catch (error) {
      return false;
    }
  },

  // Comments
  async getComments(postId?: string): Promise<Comment[]> {
    if (!postId) return [];
    try {
      const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Comment);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
      return [];
    }
  },

  async addComment(comment: Comment) {
    try {
      await setDoc(doc(db, `posts/${comment.postId}/comments`, comment.id), comment);
      await updateDoc(doc(db, 'posts', comment.postId), { commentCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${comment.postId}/comments/${comment.id}`);
    }
  },

  async deleteComment(postId: string, id: string) {
    try {
      await deleteDoc(doc(db, `posts/${postId}/comments`, id));
      await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${id}`);
    }
  },

  // Messages
  async getMessages(userId: string): Promise<Message[]> {
    try {
      // Simple fetch-all for this app context, rules will filter if needed
      // Or two queries combined
      const q1 = query(collection(db, 'messages'), where('senderId', '==', userId));
      const q2 = query(collection(db, 'messages'), where('receiverId', '==', userId));
      
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const all = [...s1.docs, ...s2.docs].map(doc => doc.data() as Message);
      return all.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'messages');
      return [];
    }
  },

  async sendMessage(message: Message) {
    try {
      await setDoc(doc(db, 'messages', message.id), message);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${message.id}`);
    }
  },

  async deleteMessage(id: string) {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
    }
  },

  async clearMessages(userId: string) {
    try {
      const q = query(collection(db, 'messages'), where('receiverId', '==', userId));
      const snapshot = await getDocsFromServer(q);
      
      if (snapshot.empty) return;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'messages');
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', 'in', [userId, 'all']));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Notification).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      return [];
    }
  },

  async addNotification(notification: Notification) {
    try {
      await setDoc(doc(db, 'notifications', notification.id), notification);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${notification.id}`);
    }
  },

  async deleteNotification(id: string) {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  },

  async clearNotifications(userId: string) {
    try {
      // Only clear private notifications to avoid deleting global announcements for others
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      
      const snapshot = await getDocsFromServer(q);
      
      if (snapshot.empty) return;

      // Batch delete up to 500 docs at a time (Firestore limit)
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  },

  async markNotificationsRead(userId: string) {
    try {
      // Only mark private notifications as read. Global notifications (status 'all') 
      // should probably not be marked for everyone by one user.
      const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => updateDoc(d.ref, { isRead: true }));
      await Promise.all(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  },

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    try {
      const q = query(collection(db, 'schedules'), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Schedule);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'schedules');
      return [];
    }
  },

  async saveSchedule(schedule: Schedule) {
    try {
      await setDoc(doc(db, 'schedules', schedule.id), {
        ...schedule,
        likes: schedule.likes || 0,
        views: schedule.views || 0,
        commentCount: schedule.commentCount || 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schedules/${schedule.id}`);
    }
  },

  async deleteSchedule(id: string) {
    try {
      await deleteDoc(doc(db, 'schedules', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${id}`);
    }
  },

  async updateSchedule(updated: Schedule) {
    try {
      await updateDoc(doc(db, 'schedules', updated.id), { ...updated });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${updated.id}`);
    }
  },

  async incrementScheduleViews(id: string) {
    try {
      await updateDoc(doc(db, 'schedules', id), { views: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${id}`);
    }
  },

  async toggleScheduleLike(id: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
      const likeRef = doc(db, `schedules/${id}/likes`, userId);
      const likeSnap = await getDoc(likeRef);
      
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'schedules', id), { likes: increment(-1) });
      } else {
        await setDoc(likeRef, { at: Date.now() });
        await updateDoc(doc(db, 'schedules', id), { likes: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${id}`);
    }
  },

  async checkIfLikedSchedule(id: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;
    try {
      const likeSnap = await getDoc(doc(db, `schedules/${id}/likes`, userId));
      return likeSnap.exists();
    } catch (error) {
      return false;
    }
  },

  async getScheduleComments(id: string): Promise<Comment[]> {
    try {
      const q = query(collection(db, `schedules/${id}/comments`), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Comment);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `schedules/${id}/comments`);
      return [];
    }
  },

  async addScheduleComment(id: string, comment: Comment) {
    try {
      await setDoc(doc(db, `schedules/${id}/comments`, comment.id), comment);
      await updateDoc(doc(db, 'schedules', id), { commentCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schedules/${id}/comments/${comment.id}`);
    }
  },

  async deleteScheduleComment(scheduleId: string, commentId: string) {
    try {
      await deleteDoc(doc(db, `schedules/${scheduleId}/comments`, commentId));
      await updateDoc(doc(db, 'schedules', scheduleId), { commentCount: increment(-1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${scheduleId}/comments/${commentId}`);
    }
  },

  async getChecklist(): Promise<ListItem[]> {
    const path = 'checklists/band_checklist';
    try {
      const docSnap = await getDoc(doc(db, 'checklists', 'band_checklist'));
      if (docSnap.exists()) {
        return docSnap.data().items as ListItem[];
      }
      return [
        { id: '1', text: '앰프 케이블 챙기기', completed: false, type: 'gear' },
        { id: '2', text: '오프닝 곡 브릿지 파트 확인', completed: true, type: 'inst' },
        { id: '3', text: '마이크 테이핑', completed: false, type: 'vocal' },
      ];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async saveChecklist(items: ListItem[]) {
    const path = 'checklists/band_checklist';
    try {
      await setDoc(doc(db, 'checklists', 'band_checklist'), { items });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Theme
  isDarkMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
  },

  setDarkMode(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, enabled.toString());
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Firestore Storage (Direct)
  async uploadFile(path: string, file: File | Blob, compressionOptions?: { maxWidthOrHeight?: number; maxSizeMB?: number; quality?: number }): Promise<string> {
    const { compressImage } = await import('../lib/imageCompression');
    
    // Hard limit for any file before processing to prevent browser crashes (e.g., 50MB)
    const ABSOLUTE_MAX_BEFORE_PROCESSING = 50 * 1024 * 1024;
    if (file.size > ABSOLUTE_MAX_BEFORE_PROCESSING) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`파일 용량이 너무 큽니다 (${sizeMB}MB). 이 시스템은 한 파일당 최대 1MB까지만 저장 가능합니다. 50MB 이상의 파일은 브라우저 성능을 위해 업로드 전 직접 압축해주셔야 합니다.`);
    }

    // Create a timeout promise
    const timeout = (ms: number) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('업로드 시간이 초과되었습니다 (20초). 네트워크 상태를 확인해주세요.')), ms)
    );

    const uploadLogic = async () => {
      let uploadFile = file;
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        try {
          // Mandatory high-efficiency compression for ALL images
          const options = compressionOptions || { 
            maxWidthOrHeight: 1200, 
            maxSizeMB: 0.8, // Aim for 0.8MB to be safe for 1MB Firestore limit
            quality: 0.75 
          };
          const compressed = await compressImage(file as File, options);
          if (compressed) uploadFile = compressed;
        } catch (err) {
          console.warn('Compression failed:', err);
        }
      }

      const LIMIT = 1024 * 1024; // 1MB STRICT LIMIT
      if (uploadFile.size > LIMIT) {
        throw new Error(`파일 용량이 1MB를 초과합니다 (${(uploadFile.size / 1024).toFixed(0)}KB). 악보/이미지는 자동 압축되지만, 원본이 너무 크면 실패할 수 있습니다. 이미지를 더 작게 줄여주세요.`);
      }

      try {
        // Convert to Base64
        const base64Data = await fileToBase64(uploadFile);
        
        // Final sanity check for Firestore Document limit (1MB)
        if (base64Data.length > 1024 * 1024) {
          throw new Error('전송 데이터가 1MB를 초과했습니다. 더 작은 파일을 선택해주세요.');
        }

        // Store in attachments collection
        const attachmentId = path.replace(/\//g, '_').replace(/[^a-zA-Z0-9._-]/g, '_') + '_' + Date.now();
        
        await setDoc(doc(db, 'attachments', attachmentId), {
          data: base64Data,
          contentType: uploadFile.type,
          size: uploadFile.size,
          userId: auth.currentUser?.uid || null,
          createdAt: Date.now()
        });

        return `firestore://attachments/${attachmentId}`;
      } catch (error: any) {
        if (error.message && (error.message.includes('압축') || error.message.includes('데이터') || error.message.includes('용량'))) throw error;
        
        // Improved error detection for ProgressEvent (FileReader)
        if (error && (error instanceof ProgressEvent || (error as any).toString().includes('ProgressEvent'))) {
          throw new Error('파일을 읽는 중 오류가 발생했습니다. 브라우저의 파일 접근 제한이나 메모리 부족이 원인일 수 있습니다.');
        }
        handleFirestoreError(error, OperationType.WRITE, `attachments/${path}`);
        throw error;
      }
    };

    // Race the upload logic against the 20s timeout
    return Promise.race([uploadLogic(), timeout(20000)]) as Promise<string>;
  },

  async getFileData(ref: string): Promise<string | null> {
    if (!ref.startsWith('firestore://')) return ref;
    
    try {
      const path = ref.replace('firestore://', '');
      const [collectionName, id] = path.split('/');
      const docSnap = await getDoc(doc(db, collectionName, id));
      if (docSnap.exists()) {
        return docSnap.data().data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching file data:', error);
      return null;
    }
  },

  async uploadFiles(folder: string, id: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
      const path = `${folder}/${id}/${fileName}`;
      const url = await this.uploadFile(path, file);
      urls.push(url);
    }
    return urls;
  },

  async deleteFiles(urls: string[]) {
    if (!urls || urls.length === 0) return;
    
    for (const url of urls) {
      if (url.startsWith('firestore://')) {
        await this.deleteFile(url);
      }
    }
  },

  async deleteFile(url: string) {
    if (!url.startsWith('firestore://')) return;
    
    try {
      const path = url.replace('firestore://', '');
      const [collectionName, id] = path.split('/');
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      // We don't necessarily want to throw here as it's a cleanup operation
    }
  },

  // Scores (Adding these as they were in types but missing in basic storage.ts implementation logic sometimes)
  async getScores(): Promise<Score[]> {
    try {
      const q = query(collection(db, 'scores'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Score);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'scores');
      return [];
    }
  },

  async saveScore(score: Score): Promise<void> {
    const path = `scores/${score.id}`;
    try {
      await setDoc(doc(db, 'scores', score.id), {
        ...score,
        likes: score.likes || 0,
        views: score.views || 0,
        commentCount: score.commentCount || 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteScore(id: string): Promise<void> {
    const path = `scores/${id}`;
    try {
      await deleteDoc(doc(db, 'scores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async incrementScoreViews(id: string) {
    try {
      await updateDoc(doc(db, 'scores', id), { views: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scores/${id}`);
    }
  },

  async toggleScoreLike(id: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
      const likeRef = doc(db, `scores/${id}/likes`, userId);
      const likeSnap = await getDoc(likeRef);
      
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'scores', id), { likes: increment(-1) });
      } else {
        await setDoc(likeRef, { at: Date.now() });
        await updateDoc(doc(db, 'scores', id), { likes: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scores/${id}`);
    }
  },

  async checkIfLikedScore(id: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;
    try {
      const likeSnap = await getDoc(doc(db, `scores/${id}/likes`, userId));
      return likeSnap.exists();
    } catch (error) {
      return false;
    }
  },

  async getScoreComments(id: string): Promise<Comment[]> {
    try {
      const q = query(collection(db, `scores/${id}/comments`), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Comment);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `scores/${id}/comments`);
      return [];
    }
  },

  async addScoreComment(id: string, comment: Comment) {
    try {
      await setDoc(doc(db, `scores/${id}/comments`, comment.id), comment);
      await updateDoc(doc(db, 'scores', id), { commentCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `scores/${id}/comments/${comment.id}`);
    }
  },

  async deleteScoreComment(scoreId: string, commentId: string) {
    try {
      await deleteDoc(doc(db, `scores/${scoreId}/comments`, commentId));
      await updateDoc(doc(db, 'scores', scoreId), { commentCount: increment(-1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scores/${scoreId}/comments/${commentId}`);
    }
  },

  async getScoreNotes(scoreId: string): Promise<ScoreNote[]> {
    const path = `scores/${scoreId}/notes`;
    try {
      const q = query(collection(db, 'scores', scoreId, 'notes'), orderBy('updatedAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ScoreNote);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveScoreNote(note: ScoreNote): Promise<void> {
    const path = `scores/${note.scoreId}/notes/${note.id}`;
    try {
      await setDoc(doc(db, 'scores', note.scoreId, 'notes', note.id), note);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
};
