/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Music, Music2, Music3, Music4, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../services/auth';
import { StorageService } from '../services/storage';
import { cn } from '../lib/utils';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, loginWithId, loginWithGoogle, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/notices', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await loginWithId(id, password);
      navigate('/notices');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        const isMsg = id.toLowerCase() === 'admin' 
          ? '관리자 아이디/비밀번호가 틀렸거나, 파이어베이스 패스워드 정책(최소 6자)과 충돌이 있을 수 있습니다. "Signup" 페이지에서 새 계정을 만들어보세요.'
          : '아이디 또는 비밀번호가 올바르지 않습니다.';
        setError(isMsg);
      } else if (err.code === 'auth/invalid-email') {
        setError('올바른 아이디 형식이 아닙니다.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('파이어베이스 콘솔에서 "Email/Password" 로그인이 활성화되지 않았습니다. [Authentication > Sign-in method] 메뉴에서 활성화해 주세요.');
      } else {
        setError('로그인 중 오류가 발생했습니다. (Firebase 설정을 확인해주세요)');
      }
      setIsLoading(false);
    }
  };

  const FloatingNote = ({ delay = 0, icon: Icon, className }: { delay?: number; icon: any; className?: string }) => (
    <motion.div
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: [-20, 20, -20],
        rotate: [0, 10, -10, 0],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        delay,
        ease: "easeInOut"
      }}
      className={cn("absolute text-white/20 select-none pointer-events-none", className)}
    >
      <Icon size={48} />
    </motion.div>
  );

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 overflow-x-hidden overflow-y-auto font-sans">
      <div className="min-h-screen flex items-center justify-center py-10">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingNote icon={Music} className="top-1/4 left-1/4" delay={0} />
        <FloatingNote icon={Music2} className="top-3/4 left-2/4" delay={1} />
        <FloatingNote icon={Music3} className="top-2/4 left-3/4" delay={2} />
        <FloatingNote icon={Music4} className="top-1/3 left-[85%]" delay={1.5} />
        <FloatingNote icon={Music} className="bottom-1/4 left-1/3" delay={0.5} />
      </div>

      {/* Animated Light Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400 blur-[120px] rounded-full pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-pink-400 blur-[150px] rounded-full pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2 md:mb-3 drop-shadow-xl">
            HEYDAYS
          </h1>
          <p className="text-white/80 text-base md:text-lg font-medium tracking-tight">우리들의 가장 빛나는 음악의 순간</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 text-white">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black mb-2 tracking-tight">로그인</h2>
            <p className="text-lg text-white/80 font-bold whitespace-nowrap tracking-tight">헤이데이즈에 오신 것을 환영합니다</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/50 group-focus-within:text-yellow-300 transition-colors">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="username"
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30"
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/50 group-focus-within:text-yellow-300 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all placeholder:text-white/30"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-300 text-sm font-medium px-2 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              disabled={isLoading}
              className={cn(
                "w-full bg-white text-indigo-700 font-bold py-4 rounded-2xl border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2",
                isLoading && "opacity-80 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-indigo-700 border-t-transparent rounded-full"
                />
              ) : (
                "로그인"
              )}
            </button>

            <div className="relative flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">또는</span>
              <div className="flex-1 h-px bg-white/20"></div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  await loginWithGoogle();
                  navigate('/notices');
                } catch (err: any) {
                  if (err.code === 'auth/popup-closed-by-user') {
                    // Do nothing, the user intentionally closed it.
                  } else {
                    setError('구글 로그인 중 오류가 발생했습니다.');
                  }
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              구글로 계속하기
            </button>

            <p className="text-center text-[11px] text-white/50 mt-4 leading-relaxed px-4">
              헤이데이즈는 보안을 위해 구글 인증을 권장하지만,<br />현재는 기존 아이디 방식으로도 접속이 가능합니다.
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full text-white/70 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              아직 회원이 아니신가요? <span className="text-yellow-300 underline underline-offset-4 decoration-yellow-300/50">헤이데이즈 가입하기</span>
            </button>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
