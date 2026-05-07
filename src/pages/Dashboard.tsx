/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  Calendar, 
  Music, 
  Layers, 
  ChevronRight,
  TrendingUp,
  Clock,
  Timer,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Post, Schedule, Score, PostType } from '../types';
import { formatDate, cn } from '../lib/utils';
import { UserAvatarDisplay } from '../components/UserAvatarDisplay';

export default function Dashboard() {
  const [notices, setNotices] = useState<Post[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const allPosts = await StorageService.getPosts();
      setNotices(allPosts.filter(p => p.type === PostType.NOTICE).slice(0, 3));
      
      const allSchedules = await StorageService.getSchedules();
      setSchedules(allSchedules.slice(0, 3));
      
      const allScores = await StorageService.getScores();
      setScores(allScores.slice(0, 3));
    };
    fetchData();
  }, []);

  const WelcomeCard = () => (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 text-white mb-8">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 leading-tight">
            HEYDAYS<br />
            <span className="text-indigo-200 uppercase text-lg font-bold tracking-widest">우리들의 뜨거운 순간을 연주하다</span>
          </h1>
          <p className="text-indigo-100 font-medium max-w-md">음악으로 연결되는 우리의 시간, 멤버들의 소식을 확인하고 함께 연습하세요.</p>
        </div>
        <button 
          onClick={() => navigate('/notices')}
          className="bg-white text-indigo-600 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all self-start md:self-center"
        >
          최근 소식 보기
          <ArrowRight size={18} />
        </button>
      </div>
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl -ml-10 -mb-10" />
    </div>
  );

  const SectionHeader = ({ title, icon: Icon, path }: { title: string; icon: any; path: string }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Icon size={20} />
        </div>
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
      </div>
      <button 
        onClick={() => navigate(path)}
        className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm font-bold"
      >
        전체보기 <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <WelcomeCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notice Section */}
        <section>
          <SectionHeader title="헤이데이즈 공지" icon={Bell} path="/notices" />
          <div className="space-y-4">
            {notices.map((notice) => (
              <motion.div 
                key={notice.id}
                whileHover={{ y: -4 }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                onClick={() => navigate(`/notices/${notice.id}`)}
              >
                <UserAvatarDisplay 
                  userId={notice.authorId} 
                  name={notice.authorName} 
                  className="w-12 h-12 border-2 border-white shadow-sm flex-shrink-0"
                  size={24}
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg group-hover:text-indigo-600 transition-colors">{notice.title}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                    <Clock size={14} /> {formatDate(notice.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
            {notices.length === 0 && <p className="text-slate-400 text-center py-8">공지사항이 없습니다.</p>}
          </div>
        </section>

        {/* Schedule Section */}
        <section>
          <SectionHeader title="오늘의 일정" icon={Calendar} path="/schedules" />
          <div className="space-y-4">
            {schedules.map((schedule) => {
              const eventDate = new Date(schedule.date);
              const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
              const monthStr = months[eventDate.getMonth()];
              const dayStr = eventDate.getDate();

              return (
                <motion.div 
                  key={schedule.id}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                  onClick={() => navigate('/schedules')}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="text-[10px] font-black uppercase leading-none mb-1">{monthStr}</span>
                      <span className="text-xl font-black leading-none">{dayStr}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-lg dark:text-white leading-none mb-1">{schedule.title}</h3>
                      <p className="text-xs text-slate-400 font-bold tracking-tight">{schedule.location}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full group-hover:translate-x-1 transition-all">
                    <ChevronRight size={20} />
                  </div>
                </motion.div>
              );
            })}
            {schedules.length === 0 && <p className="text-slate-400 text-center py-8 font-medium">예정된 일정이 없습니다.</p>}
          </div>
        </section>
      </div>

      {/* Featured Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
              <Timer size={24} />
            </div>
            <h3 className="text-xl font-black tracking-tight">METRONOME</h3>
          </div>
          <p className="text-slate-500 font-medium mb-6">연습의 정확도를 높이세요.<br />탭템포와 다양한 비프음을 지원합니다.</p>
          <button 
            onClick={() => navigate('/metronome')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
          >
            시작하기
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Music size={24} />
            </div>
            <h3 className="text-xl font-black tracking-tight">악보 도서관</h3>
          </div>
          <p className="text-slate-500 font-medium mb-6">언제 어디서나 우리의 곡을<br />확인하고 메모를 남기세요.</p>
          <button 
            onClick={() => navigate('/scores')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            악보 보기
          </button>
        </div>
      </div>
    </div>
  );
}
