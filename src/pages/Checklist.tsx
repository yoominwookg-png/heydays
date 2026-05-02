/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'motion/react';
import { 
  Square, 
  CheckSquare, 
  Plus, 
  GripVertical, 
  Trash2, 
  Music,
  Clock,
  Mic2
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { cn } from '../lib/utils';
import { ListItem } from '../types';

export default function Checklist() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      const data = await StorageService.getChecklist();
      setItems(data);
    };
    fetchItems();
  }, []);

  const saveItems = async (newItems: ListItem[]) => {
    setItems(newItems);
    await StorageService.saveChecklist(newItems);
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newItem: ListItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputValue,
      completed: false
    };
    saveItems([newItem, ...items]);
    setInputValue('');
  };

  const toggleItem = (id: string) => {
    saveItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="max-w-none space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white uppercase">합주 체크리스트</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">완벽한 합주를 위한 오늘의 준비 사항</p>
        </div>
        <button 
          onClick={() => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
            input?.focus();
          }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all text-xs uppercase tracking-widest self-start md:self-center"
        >
          <Plus size={18} strokeWidth={3} />
          항목 추가
        </button>
      </div>

      <form onSubmit={addItem} className="relative group">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl py-5 pl-8 pr-20 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 shadow-sm transition-all font-semibold dark:text-white"
          placeholder="새로운 할 일을 추가하세요..."
        />
        <button className="absolute right-3 top-2 bottom-2 bg-indigo-600 text-white px-6 rounded-2xl font-black hover:bg-slate-900 transition-all flex items-center gap-2 text-xs uppercase tracking-widest">
          추가
        </button>
      </form>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-lg">오늘의 연습 리스트</h3>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {items.filter(i => i.completed).length} / {items.length} 완료
          </span>
        </div>
        
        <div className="p-4">
          <Reorder.Group axis="y" values={items} onReorder={saveItems} className="space-y-2">
            {items.map((item) => (
              <Reorder.Item 
                key={item.id} 
                value={item}
                className={cn(
                  "bg-slate-50 p-4 rounded-2xl flex items-center gap-4 group transition-all",
                  item.completed && "opacity-50"
                )}
              >
                <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400">
                  <GripVertical size={20} />
                </div>
                <button 
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    item.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 text-transparent"
                  )}
                >
                  <CheckSquare size={14} strokeWidth={3} />
                </button>
                <span className={cn(
                  "flex-1 font-bold tracking-tight",
                  item.completed && "line-through text-slate-400"
                )}>
                  {item.text}
                </span>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {items.length === 0 && (
            <div className="text-center py-12 text-slate-300">
              <p className="font-bold">리스트가 비어있습니다.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-6 rounded-3xl text-center">
          <Mic2 className="mx-auto mb-2 text-indigo-600" size={24} />
          <p className="text-[10px] font-black uppercase text-indigo-400">Vocal</p>
          <p className="font-black text-xl text-indigo-900">3</p>
        </div>
        <div className="bg-pink-50 p-6 rounded-3xl text-center">
          <Music className="mx-auto mb-2 text-pink-600" size={24} />
          <p className="text-[10px] font-black uppercase text-pink-400">Inst</p>
          <p className="font-black text-xl text-pink-900">8</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-3xl text-center">
          <Clock className="mx-auto mb-2 text-yellow-600" size={24} />
          <p className="text-[10px] font-black uppercase text-yellow-400">Time</p>
          <p className="font-black text-xl text-yellow-900">2h</p>
        </div>
      </div>
    </div>
  );
}
