/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';
import { StorageService } from './storage';

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithId: (id: string, pass: string) => Promise<void>;
  signupWithId: (id: string, pass: string, name: string, bio: string, avatar?: string | File | Blob) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    StorageService.init();
    
    // 세션 체크: 일주일(7일)이 지났는지 확인
    const checkSessionExpiry = async () => {
      const loginTimestamp = localStorage.getItem('heydays_login_timestamp');
      if (loginTimestamp) {
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        if (now - parseInt(loginTimestamp) > weekInMs) {
          console.log('Session expired (1 week). Logging out...');
          localStorage.removeItem('heydays_login_timestamp');
          await signOut(auth);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await checkSessionExpiry();
      }
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    setIsLoading(true);
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        if (userData.deletedAt) {
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (now > userData.deletedAt + twentyFourHours) {
            signOut(auth);
            setUser(null);
            setIsLoading(false);
            alert('탈퇴 처리가 완료된 계정입니다.');
            return;
          }
        }
        
        setUser(userData);
      } else {
        const isAdmin = firebaseUser.email === 'admin@heydays.com';
        const newUser: User = {
          id: firebaseUser.uid,
          name: isAdmin ? '관리자' : (firebaseUser.displayName || 'Unnamed Member'),
          avatar: firebaseUser.photoURL || '',
          role: isAdmin ? UserRole.ADMIN : UserRole.MEMBER,
          createdAt: Date.now(),
        };
        
        const isGoogleSignUp = firebaseUser.providerData.some(p => p.providerId === 'google.com');
        if (isGoogleSignUp) {
          setDoc(userDocRef, newUser).catch(e => {
            console.error('Failed to auto-create user doc for google user', e);
          });
        }
        
        setUser(newUser);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("User doc listener error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Configure popup to prompt for account selection to avoid hanging issues in some cases
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      localStorage.setItem('heydays_login_timestamp', Date.now().toString());
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        alert('구글 로그인에 실패했습니다. (네트워크 오류)\n\n팝업 차단 앱이나 광고 차단기(AdBlock)를 사용 중이시라면 잠시 꺼주세요.\n\n또한 Firebase 콘솔의 Authentication -> Settings -> Authorized domains에 현재 접속 중인 도메인이 추가되어 있는지 확인해 주세요.');
        console.error('Google login failed (Network/Browser error):', error);
      } else if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Google login failed:', error);
        alert(`로그인 중 오류가 발생했습니다: ${error.message}`);
      }
      throw error;
    }
  };

  const loginWithId = async (id: string, pass: string) => {
    const email = id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@heydays.com`;
    // 파이어베이스는 최소 6자리를 요구하므로, 6자리 미만인 경우 내부적으로 패딩 처리
    const firebasePass = pass.length < 6 ? pass.padEnd(6, '0') : pass;
    
    try {
      console.log(`Attempting login for: ${email}`);
      await signInWithEmailAndPassword(auth, email, firebasePass);
      localStorage.setItem('heydays_login_timestamp', Date.now().toString());
    } catch (error: any) {
      // 관리자 계정(admin) 복구 로직: 1234 또는 admin123 지원
      const isAdminRecovery = id === 'admin' && (pass === '1234' || pass === 'admin123');
      const isMissingOrInvalid = error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential';

      if (isAdminRecovery && isMissingOrInvalid) {
        try {
          // 계정이 없으면 생성
          await createUserWithEmailAndPassword(auth, email, firebasePass);
          return;
        } catch (createError: any) {
          // 이미 계정이 있으면 (비번이 다른 경우), 기존 에러를 던지기 전에 확인
          if (createError.code === 'auth/email-already-in-use') {
            // Admin account exists but password mismatch
          }
        }
      }
      throw error;
    }
  };

  const signupWithId = async (id: string, pass: string, name: string, bio: string, avatar?: string | File | Blob) => {
    const email = id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@heydays.com`;
    // 파이어베이스는 최소 6자리를 요구하므로, 6자리 미만인 경우 내부적으로 패딩 처리
    const firebasePass = pass.length < 6 ? pass.padEnd(6, '0') : pass;
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, firebasePass);
      localStorage.setItem('heydays_login_timestamp', Date.now().toString());
      
      let avatarUrl = '';
      if (avatar instanceof File || avatar instanceof Blob) {
        const path = `avatars/${result.user.uid}/${Date.now()}`;
        avatarUrl = await StorageService.uploadFile(path, avatar, { maxWidthOrHeight: 400, maxSizeMB: 0.1, quality: 0.6 });
      } else if (typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('firestore://'))) {
        avatarUrl = avatar;
      }
      
      // If no avatar was provided or it's a temp URL we couldn't upload, use empty string
      // (The above condition avatar.startsWith('http') handles external URLs like Google profile pics)

      const newUser: User = {
        id: result.user.uid,
        name,
        avatar: avatarUrl,
        bio: bio || '',
        role: UserRole.MEMBER,
        createdAt: Date.now(),
      };
      
      // undefined 필드 제거
      const cleanUser = JSON.parse(JSON.stringify(newUser));
      await setDoc(doc(db, 'users', result.user.uid), cleanUser);
      setUser(newUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('heydays_login_timestamp');
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithId, signupWithId, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
