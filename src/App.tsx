/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Metronome from './pages/Metronome';
import Board from './components/Board';
import ScoreLibrary from './pages/ScoreLibrary';
import AdminDataCenter from './pages/AdminDataCenter';
import AdminCenter from './pages/AdminCenter';
import Schedules from './pages/Schedules';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import Members from './pages/Members';
import { PostType } from './types';

import { UsersProvider } from './contexts/UsersContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Placeholder components for other pages
const Placeholder = ({ name }: { name: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center">
      <span className="text-3xl font-black">{name[0]}</span>
    </div>
    <h1 className="text-3xl font-black tracking-tighter dark:text-white">{name}</h1>
    <p className="text-slate-500 dark:text-slate-400 font-medium">준비 중인 페이지입니다.</p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black dark:text-white dark:bg-slate-950">HEYDAYS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UsersProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/notices" replace />} />
                <Route path="notices" element={<Board type={PostType.NOTICE} title="헤이데이즈 소식" />} />
                <Route path="schedules" element={<Schedules />} />
                <Route path="reviews" element={<Board type={PostType.REVIEW} title="공연후기 글" />} />
                <Route path="scores" element={<ScoreLibrary />} />
                <Route path="metronome" element={<Metronome />} />
                <Route path="settings" element={<Settings />} />
                <Route path="messages" element={<Messages />} />
                <Route path="members" element={<Members />} />
                <Route path="admin" element={<AdminCenter />} />
                <Route path="admin/data" element={<AdminDataCenter />} />
              </Route>
  
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </UsersProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
