/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, PostType } from './types';

export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  VERSION: 'app_version',
  USERS: 'band_users',
  POSTS: 'band_posts',
  COMMENTS: 'band_comments',
  SCHEDULES: 'band_schedules',
  SCORES: 'band_scores',
  SCORE_NOTES: 'band_score_notes',
  AUTH: 'band_auth',
  LIKES: 'band_likes',
  VIEWS: 'band_views',
  BPM: 'metronome_bpm',
  METRONOME_SOUND: 'metronome_sound',
  METRONOME_VIBRATION: 'metronome_vibration',
  BACKUP_LOGS: 'band_backup_logs',
  MESSAGES: 'band_messages',
  NOTIFICATIONS: 'band_notifications',
  DARK_MODE: 'app_dark_mode',
};

export const INITIAL_DATA = {
  ADMIN: {
    id: 'admin',
    name: '관리자',
    role: UserRole.ADMIN,
    password: '1234',
    createdAt: Date.now(),
    bio: '헤이데이즈 시스템 관리자입니다.',
  },
  NOTICE: {
    id: 'n1',
    type: PostType.NOTICE,
    title: '헤이데이즈에 오신 것을 환영합니다',
    content: '우리의 가장 뜨거운 순간을 기록하는 헤이데이즈 밴드 클럽입니다.',
    authorId: 'admin',
    authorName: '관리자',
    createdAt: Date.now(),
    likes: 0,
    views: 0,
    isPinned: true,
  },
  SCHEDULE: {
    id: 's1',
    title: '헤이데이즈 첫 정기 공연',
    date: '2026-06-20',
    location: '라이브 클럽 빵',
    description: '우리의 시작을 알리는 기념비적인 날입니다.',
    authorId: 'admin',
    createdAt: Date.now(),
  },
  SCORE: {
    id: 'sc1',
    title: 'HEYDAYS Opening Song',
    fileType: 'jpg' as const,
    authorId: 'admin',
    createdAt: Date.now(),
  }
};
