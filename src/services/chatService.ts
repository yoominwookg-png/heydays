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
import { db, auth } from '../lib/firebase';
import { ChatRoom, ChatMessage } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Permission Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(error.message || "Permission Denied");
}

export const ChatService = {
  async getOrCreateDirectChat(user1Id: string, user1Name: string, user2Id: string, user2Name: string): Promise<string> {
    const participants = [user1Id, user2Id].sort();
    const roomId = `direct_${participants.join('_')}`;
    
    const roomRef = doc(db, 'chatRooms', roomId);
    let roomSnap;
    try {
      roomSnap = await getDoc(roomRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `chatRooms/${roomId}`);
    }
    
    if (roomSnap && !roomSnap.exists()) {
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
      try {
        await setDoc(roomRef, newRoom);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `chatRooms/${roomId}`);
      }
    }
    
    return roomId;
  },

  async enterRoom(roomId: string, userId: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    try {
      await updateDoc(roomRef, {
        activeParticipants: arrayUnion(userId),
        status: 'active',
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chatRooms/${roomId}`);
    }
  },

  async leaveRoom(roomId: string, userId: string, userName: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    let roomSnap;
    try {
      roomSnap = await getDoc(roomRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `chatRooms/${roomId}`);
    }
    
    if (!roomSnap || !roomSnap.exists()) return;
    
    const data = roomSnap.data() as ChatRoom;
    const currentActives = (data.activeParticipants || []).filter(id => id !== userId);
    
    // 1. Send system message
    await this.sendSystemMessage(roomId, `${userName}님이 채팅을 종료했습니다.`);

    // 2. If no one left, delete room immediately
    if (currentActives.length === 0) {
      const batch = writeBatch(db);
      try {
        const messagesSnap = await getDocs(collection(db, `chatRooms/${roomId}/messages`));
        messagesSnap.forEach(m => batch.delete(m.ref));
        batch.delete(roomRef);
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `chatRooms/${roomId}`);
      }
      return;
    }

    // 3. Otherwise update participants
    try {
      await updateDoc(roomRef, {
        activeParticipants: arrayRemove(userId),
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chatRooms/${roomId}`);
    }
  },

  async forceLeaveOfflineUser(roomId: string, userId: string, userName: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    
    const data = roomSnap.data() as ChatRoom;
    if (!data.activeParticipants?.includes(userId)) return;

    // Send system message
    await this.sendSystemMessage(roomId, `${userName}님이 접속 종료로 퇴장하셨습니다.`);

    const currentActives = (data.activeParticipants || []).filter(id => id !== userId);

    if (currentActives.length === 0) {
      const batch = writeBatch(db);
      const messagesSnap = await getDocs(collection(db, `chatRooms/${roomId}/messages`));
      messagesSnap.forEach(m => batch.delete(m.ref));
      batch.delete(roomRef);
      await batch.commit();
    } else {
      await updateDoc(roomRef, {
        activeParticipants: arrayRemove(userId),
        updatedAt: Date.now()
      });
    }
  },

  async sendSystemMessage(roomId: string, content: string) {
    const messageId = `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageRef = doc(db, `chatRooms/${roomId}/messages`, messageId);
    await setDoc(messageRef, {
      id: messageId,
      roomId,
      senderId: 'system',
      senderName: '시스템',
      content,
      type: 'system',
      createdAt: Date.now()
    });
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

  async inviteToChat(roomId: string, userId: string, userName: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    try {
      await updateDoc(roomRef, {
        participants: arrayUnion(userId),
        participantNames: arrayUnion(userName),
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chatRooms/${roomId}`);
    }
  },

  async joinRoomWithSystemMessage(roomId: string, userId: string, userName: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    try {
      // 1. Add to participants if not already (should be handled by inviteToChat but double check)
      await updateDoc(roomRef, {
        participants: arrayUnion(userId),
        participantNames: arrayUnion(userName),
        activeParticipants: arrayUnion(userId),
        updatedAt: Date.now()
      });
      // 2. Send system message
      await this.sendSystemMessage(roomId, `${userName}님이 채팅에 합류했습니다.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chatRooms/${roomId}`);
    }
  },

  async rejectInvitation(roomId: string, userId: string, userName: string, rejectMessage?: string) {
    const roomRef = doc(db, 'chatRooms', roomId);
    
    // Just send a system message to the room if possible, or mark as rejected
    const content = rejectMessage 
      ? `${userName}님이 초대를 거절했습니다: "${rejectMessage}"`
      : `${userName}님이 초대를 거절했습니다.`;
    
    try {
      // 1. Send system message
      await this.sendSystemMessage(roomId, content);
      
      // 2. Remove from participants
      await updateDoc(roomRef, {
        participants: arrayRemove(userId),
        participantNames: arrayRemove(userName),
        updatedAt: Date.now()
      });
    } catch (e) {
      // It's possible the user doesn't have permission to write to this room yet if they rejected
      console.warn('Could not complete rejection logic for room:', e);
    }
  },

  async sendChatInvitation(inviter: { id: string, name: string }, targetUserId: string, roomId: string, targetUserName?: string): Promise<boolean> {
    // Use a deterministic ID for invitations to the same room for the same user
    const inviteId = `invite_${targetUserId}_${roomId}`;
    const inviteRef = doc(db, 'notifications', inviteId);
    
    try {
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        const data = inviteSnap.data();
        if (data && data.type === 'chat_invite' && data.isRead === false) {
          return false; // Already has an unread invite for this room
        }
      }
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        console.warn('Notification check failed with non-permission error:', error);
      }
    }

    // 1. Add user to room's participants list immediately so they have read access
    if (targetUserName) {
      await this.inviteToChat(roomId, targetUserId, targetUserName);
    }

    const inviteNotif: any = {
      id: inviteId,
      userId: targetUserId,
      title: '채팅 초대',
      content: `${inviter.name}님이 채팅에 초대했습니다.`,
      type: 'chat_invite',
      meta: {
        roomId: roomId,
        inviterId: inviter.id,
        inviterName: inviter.name
      },
      createdAt: Date.now(),
      isRead: false
    };
    
    try {
      await setDoc(inviteRef, inviteNotif);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `notifications/${inviteId}`);
    }
    return true;
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
    
    try {
      await setDoc(messageRef, message);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chatRooms/${roomId}/messages/${messageId}`);
    }
    
    let lastMsg = content;
    if (fileUrl) {
      lastMsg = fileType?.startsWith('image/') ? '📷 사진' : `📁 파일: ${fileName || '첨부파일'}`;
    }

    try {
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: lastMsg,
        updatedAt: now
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chatRooms/${roomId}`);
    }
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
    }, (error) => {
      console.error(`Error subscribing to messages for room ${roomId}:`, error);
    });
  },

  subscribeToRoom(roomId: string, callback: (room: ChatRoom) => void) {
    return onSnapshot(doc(db, 'chatRooms', roomId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as ChatRoom);
      }
    }, (error) => {
      console.error(`Error subscribing to room ${roomId}:`, error);
    });
  }
};
