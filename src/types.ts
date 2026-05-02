/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}

export interface User {
  id: string; // login id
  name: string;
  avatar?: string; // base64
  bio?: string;
  role: UserRole;
  password?: string;
  createdAt: number;
  deletedAt?: number;
}

export enum PostType {
  NOTICE = 'notice',
  REVIEW = 'review'
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  fileData?: string; // Base64 image (keeping for compatibility)
  files?: string[]; // Multiple Base64 images/files
  createdAt: number;
  likes: number;
  views: number;
  commentCount?: number;
  isPinned?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface Schedule {
  id: string;
  title: string;
  date: string;
  location: string;
  mapQuery?: string;
  description: string;
  files?: string[];
  likes?: number;
  views?: number;
  commentCount?: number;
  authorId: string;
  createdAt: number;
}

export interface Score {
  id: string;
  title: string;
  description?: string;
  fileData?: string; // base64 or placeholder
  files?: string[]; // Multiple Base64 images/files
  fileType: 'pdf' | 'jpg' | 'png';
  likes?: number;
  views?: number;
  commentCount?: number;
  authorId: string;
  createdAt: number;
}

export interface ScoreNote {
  id: string;
  scoreId: string;
  content: string;
  authorId: string;
  updatedAt: number;
}

export interface MetronomeState {
  bpm: number;
  sound: 'drum' | 'wood' | 'clap';
  vibration: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: number;
  isRead: boolean;
}

export interface Notification {
  id: string;
  userId: string; // 'all' for broadcast
  title: string;
  content: string;
  type: 'notice' | 'admin' | 'message';
  createdAt: number;
  isRead: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  type?: 'vocal' | 'inst' | 'gear';
}

export interface StorageSchema {
  app_version: string;
  band_users: User[];
  band_posts: Post[];
  band_comments: Comment[];
  band_schedules: Schedule[];
  band_scores: Score[];
  band_score_notes: ScoreNote[];
  band_auth: User | null;
  band_likes: string[]; // postId_userId
  band_views: string[]; // postId_userId (simple unique views tracking)
  metronome_bpm: number;
  metronome_sound: string;
  metronome_vibration: boolean;
  band_backup_logs: string[];
  band_messages: Message[];
  band_notifications: Notification[];
  app_dark_mode: boolean;
}
