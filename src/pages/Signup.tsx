/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Camera, User as UserIcon, Lock, AlignLeft, ArrowLeft } from 'lucide-react';
import { useAuth } from '../services/auth';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/imageCompression';

export default function Signup() {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    confirmPassword: '',
    name: '',
    bio: '',
  });
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { signupWithId, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !authLoading) {
      navigate('/notices', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setLoadingMessage('이미지 압축 중...');
      try {
        const compressedFile = await compressImage(file, { maxWidthOrHeight: 400, maxSizeMB: 0.1, quality: 0.6 });
        setAvatarFile(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setAvatar(previewUrl);
      } catch (err) {
        console.error('Avatar compression failed:', err);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMessage('가입 처리 중...');
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    try {
      // 사진이나 자기소개가 없어도 가입 가능하도록 처리
      // avatarFile이 있으면 파일을 보내고, 없으면 undefined를 보냄 (blob: URL 등은 무시)
      const avatarData = avatarFile || undefined;
      await signupWithId(formData.id, formData.password, formData.name, formData.bio, avatarData);
      navigate('/notices');
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 아이디입니다.');
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호는 4자리 이상이어야 합니다.');
      } else {
        setError(`회원가입 중 오류가 발생했습니다 (${err.code || err.message}).`);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 overflow-hidden py-4 font-sans px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[360px]"
      >
        <button 
          onClick={() => navigate('/login')}
          className="mb-4 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group text-sm"
        >
          <ArrowLeft size={16} />
          <span className="font-bold">로그인으로 돌아가기</span>
        </button>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 text-white">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-black mb-1 tracking-tighter">헤이데이즈 가입하기</h1>
            <p className="text-[11px] text-white/70 font-medium tracking-tight">헤이데이즈의 새로운 맴버가 되주세요</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            {/* 사진 입력 */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-yellow-300">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={24} className="text-white/40" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-yellow-300 text-indigo-900 p-1 rounded-full shadow-lg">
                  <Camera size={10} />
                </div>
              </div>
            </div>

            {/* 아이디 */}
            <div className="relative group">
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30 text-sm"
                placeholder="아이디"
                required
              />
            </div>

            {/* 이름 */}
            <div className="relative group">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30 text-sm"
                placeholder="이름"
                required
              />
            </div>

            {/* 자기소개 */}
            <div className="relative group">
              <input
                type="text"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/40 text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                placeholder="자기소개 (선택사항, 줄바꿈 없이)"
              />
            </div>

            {/* 비밀번호 */}
            <div className="grid grid-cols-1 gap-3">
              <div className="relative group">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30 text-sm"
                  placeholder="비밀번호"
                  required
                />
              </div>
              {/* 비밀번호 확인 */}
              <div className="relative group">
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30 text-sm"
                  placeholder="비밀번호 확인"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-300 text-[11px] font-bold text-center">{error}</p>}

            <button
              disabled={isLoading}
              className={cn(
                "w-full bg-yellow-300 text-indigo-900 font-black py-3 rounded-xl border-b-4 border-yellow-500 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm mt-2",
                isLoading && "opacity-80 cursor-not-allowed"
              )}
            >
              {isLoading ? (loadingMessage || "처리 중...") : "가입하기"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
