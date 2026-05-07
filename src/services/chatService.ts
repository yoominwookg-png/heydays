import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot,
  limit,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatRoom, ChatMessage } from '../types';

export const ChatService = {
  async getOrCreateDirectChat(user1Id: string, user1Name: string, user2Id: string, user2Name: string): Promise<string> {
    const participants = [user1Id, user2Id].sort();
    const roomId = `direct_${participants.join('_')}`;
    
    const roomRef = doc(db, 'chatRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      const now = Date.now();
      const newRoom: ChatRoom = {
        id: roomId,
        participants,
        participantNames: [user1Name, user2Name],
        activeParticipants: [],
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      await setDoc(roomRef, newRoom);
    }
    
    return roomId;
  },

  async enterRoom(roomId: string, userId: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    await updateDoc(roomRef, {
      activeParticipants: arrayUnion(userId),
      status: 'active',
      updatedAt: Date.now()
    });
  },

  async leaveRoom(roomId: string, userId: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    
    const data = roomSnap.data() as ChatRoom;
    const currentActives = (data.activeParticipants || []).filter(id => id !== userId);
    
    const updates: any = {
      activeParticipants: arrayRemove(userId),
      updatedAt: Date.now()
    };

    // If no one left, end the room
    if (currentActives.length === 0) {
      updates.status = 'ended';
      updates.endedAt = Date.now();
    }

    await updateDoc(roomRef, updates);
  },

  async getStoredChats(): Promise<ChatRoom[]> {
    // Also trigger cleanup when viewing stored chats
    this.cleanupOldChats();

    const q = query(
      collection(db, 'chatRooms'),
      where('status', '==', 'ended'),
      orderBy('endedAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as ChatRoom);
  },

  async cleanupOldChats() {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'chatRooms'),
      where('status', '==', 'ended'),
      where('endedAt', '<', threeDaysAgo)
    );
    
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    for (const roomDoc of snap.docs) {
      // Delete messages first
      const messagesSnap = await getDocs(collection(db, `chatRooms/${roomDoc.id}/messages`));
      messagesSnap.forEach(m => batch.delete(m.ref));
      
      // Delete room
      batch.delete(roomDoc.ref);
    }
    await batch.commit();
  },

  async inviteToChat(roomId: string, userId: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    await updateDoc(roomRef, {
      participants: arrayUnion(userId),
      updatedAt: Date.now()
    });
  },

  async sendMessage(roomId: string, senderId: string, senderName: string, content: string, fileUrl?: string, fileName?: string, fileType?: string, previewUrl?: string, imageUrl?: string) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageRef = doc(db, `chatRooms/${roomId}/messages`, messageId);
    const now = Date.now();
    
    const message: any = {
      id: messageId,
      roomId,
      senderId,
      senderName,
      content,
      createdAt: now
    };
    
    if (fileUrl) message.fileUrl = fileUrl;
    if (fileName) message.fileName = fileName;
    if (fileType) message.fileType = fileType;
    if (previewUrl) message.previewUrl = previewUrl;
    if (imageUrl) message.imageUrl = imageUrl;
    
    await setDoc(messageRef, message);
    
    let lastMsg = content;
    if (fileUrl) {
      lastMsg = fileType?.startsWith('image/') ? '📷 사진' : `📁 파일: ${fileName || '첨부파일'}`;
    }

    await updateDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: lastMsg,
      updatedAt: now
    });
  },

  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, `chatRooms/${roomId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
      callback(messages.reverse());
    });
  },

  subscribeToRoom(roomId: string, callback: (room: ChatRoom) => void) {
    return onSnapshot(doc(db, 'chatRooms', roomId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as ChatRoom);
      }
    });
  }
};
