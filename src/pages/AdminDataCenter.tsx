/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2,
  FileJson,
  RefreshCw,
  Zap
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { cn } from '../lib/utils';

export default function AdminDataCenter() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleExport = () => {
    alert('Firestore 데이터 백업은 Firebase Console에서 수행할 수 있습니다.');
  };

  const handleImport = () => {
    alert('Firestore 데이터 복구는 Firebase Console에서 수행할 수 있습니다.');
  };

  const handleClear = () => {
    if (confirm('모든 로컬 설정(테마 등)을 초기화하시겠습니까? Firestore 데이터는 삭제되지 않습니다.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4">
          <Database size={48} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter mb-2">HEYDAYS 데이터 관리</h1>
        <p className="text-slate-500 font-medium">서비스의 모든 데이터를 백업하거나 복원할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 flex flex-col items-center group">
          <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[2rem] mb-6 group-hover:scale-110 transition-transform">
            <Download size={32} />
          </div>
          <h3 className="text-2xl font-black mb-2 tracking-tight">데이터 내보내기</h3>
          <p className="text-slate-500 text-center font-medium mb-8">현재까지의 모든 멤버 정보, 게시글, 악보 데이터를 JSON 파일로 다운로드합니다.</p>
          <button 
            onClick={handleExport}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <FileJson size={20} />
            JSON 파일로 저장
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 flex flex-col items-center group">
          <div className="p-5 bg-yellow-50 text-yellow-600 rounded-[2rem] mb-6 group-hover:scale-110 transition-transform">
            <Upload size={32} />
          </div>
          <h3 className="text-2xl font-black mb-2 tracking-tight">데이터 불러오기</h3>
          <p className="text-slate-500 text-center font-medium mb-8">내보냈던 JSON 파일을 불러와 데이터를 복원합니다. 현재 데이터에 덮어씌워집니다.</p>
          <label className="w-full py-5 bg-yellow-400 text-indigo-900 rounded-2xl font-black hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <RefreshCw size={20} />
            백업 파일 불러오기
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 p-10 rounded-[3rem] border border-red-100 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white text-red-500 rounded-2xl">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-red-900 mb-1">데이터 관리 (주의)</h3>
            <p className="text-red-700/60 font-medium text-sm">모든 데이터를 영구적으로 삭제하고 초기 상태로 되돌립니다.</p>
          </div>
        </div>
        <button 
          onClick={handleClear}
          className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Trash2 size={20} />
          저장소 완전 초기화
        </button>
      </div>

      {/* Toast Feedback */}
      {isSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold"
        >
          <CheckCircle2 size={20} className="text-yellow-300" />
          작업이 성공적으로 완료되었습니다!
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold"
        >
          <AlertTriangle size={20} />
          {error}
        </motion.div>
      )}
    </div>
  );
}
