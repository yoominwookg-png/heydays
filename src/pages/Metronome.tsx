/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Plus, 
  Minus, 
  Smartphone, 
  Volume2, 
  Hand,
  Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';

type SoundType = 'drum' | 'wood' | 'clap';

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<SoundType>('wood');
  const [vibration, setVibration] = useState(true);
  const [beat, setBeat] = useState(0);
  const [lastTaps, setLastTaps] = useState<number[]>([]);

  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const playClick = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioCtxRef.current;
    
    // Ensure context is running (required for Chrome/Safari)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const isFirstBeat = beat === 0;

    const playKick = (time: number) => {
      // Body oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.3);
      gain.gain.setValueAtTime(2.0, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.3);

      // Click/Transient oscillator
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(800, time);
      clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
      clickGain.gain.setValueAtTime(1.0, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(time);
      clickOsc.stop(time + 0.05);
    };

    const playSnare = (time: number) => {
      // Noise + snap
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(time);
      noise.stop(time + 0.2);
    };

    const playHiHat = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.05);
    };

    if (sound === 'drum') {
      if (beat === 0) {
        playKick(ctx.currentTime);
      } else {
        playHiHat(ctx.currentTime);
        playKick(ctx.currentTime);
      }
      if (beat === 2) {
        playSnare(ctx.currentTime);
      }
    } else {
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();

      let frequency = isFirstBeat ? 1000 : 800;
      
      if (sound === 'wood') frequency = isFirstBeat ? 1200 : 900;
      if (sound === 'clap') frequency = isFirstBeat ? 600 : 400;

      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      envelope.gain.setValueAtTime(1, ctx.currentTime);
      envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(envelope);
      envelope.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }

    if (vibration && navigator.vibrate) {
      navigator.vibrate(isFirstBeat ? 40 : 20);
    }
  }, [beat, sound, vibration]);

  const toggleMetronome = () => {
    if (isPlaying) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsPlaying(false);
      setBeat(0);
    } else {
      setIsPlaying(true);
      const interval = (60 / bpm) * 1000;
      timerRef.current = window.setInterval(() => {
        setBeat(prev => (prev + 1) % 4);
      }, interval);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playClick();
    }
  }, [beat, isPlaying, playClick]);

  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const interval = (60 / bpm) * 1000;
      timerRef.current = window.setInterval(() => {
        setBeat(prev => (prev + 1) % 4);
      }, interval);
    }
  }, [bpm, isPlaying]);

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger start/stop
    const now = Date.now();
    const newTaps = [...lastTaps, now].slice(-4);
    setLastTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i-1]);
      }
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avg);
      if (newBpm >= 40 && newBpm <= 240) {
        setBpm(newBpm);
      }
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in duration-700 overflow-hidden">
      {/* Header Area */}
      <div className="flex-shrink-0 flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter dark:text-white uppercase leading-none">HEYDAYS METRONOME</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.4em] mt-1">MASTER YOUR RHYTHM</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div 
          className={cn(
            "h-full w-full bg-slate-950 rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center justify-between transition-all duration-500",
            isPlaying ? "ring-4 md:ring-8 ring-indigo-500/20" : "hover:ring-4 md:hover:ring-8 hover:ring-white/5"
          )}
        >
          {/* Background Animation */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                key={beat}
                initial={{ opacity: 0.8, scale: 0.8 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "absolute inset-0 rounded-full blur-[80px] pointer-events-none",
                  beat === 0 ? "bg-yellow-400/40" : "bg-indigo-600/20"
                )}
              />
            )}
          </AnimatePresence>

          {/* Top Panel: Sound Selection & Haptic */}
          <div className="relative z-20 w-full flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-sm rounded-t-3xl">
            <div className="flex gap-2">
              {[
                { key: 'wood', label: 'WOOD' },
                { key: 'clap', label: 'CLAP' }
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={(e) => { e.stopPropagation(); setSound(s.key as SoundType); }}
                  className={cn(
                    "px-4 md:px-5 py-2 md:py-2.5 rounded-xl border-2 font-black uppercase text-[10px] md:text-[11px] tracking-widest transition-all",
                    sound === s.key 
                      ? "border-indigo-500 bg-indigo-500 text-white" 
                      : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Smartphone size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">HAPTIC FEEDBACK</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setVibration(!vibration); }}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  vibration ? "bg-indigo-600" : "bg-slate-800"
                )}
              >
                <motion.div 
                  animate={{ x: vibration ? 16 : 0 }}
                  className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
          </div>

          {/* Main Interactive Circle */}
          <div 
            onClick={toggleMetronome}
            className="flex-1 flex flex-col items-center justify-center w-full cursor-pointer min-h-0 py-4"
          >
            <motion.div 
              animate={isPlaying ? {
                scale: beat === 0 ? [1, 1.08, 1] : [1, 1.03, 1],
              } : {}}
              transition={{ duration: 0.1 }}
              className={cn(
                "w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full border-8 md:border-[16px] flex flex-col items-center justify-center transition-all duration-100 relative group",
                isPlaying 
                  ? (beat === 0 ? "border-yellow-400 shadow-[0_0_80px_rgba(250,204,21,0.4)]" : "border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.2)]") 
                  : "border-slate-900"
              )}
            >
              <div className="text-center z-10">
                <span className="text-6xl md:text-8xl lg:text-[7rem] font-black text-white tracking-tighter tabular-nums leading-none block">{bpm}</span>
                <p className="text-slate-500 font-black tracking-[0.3em] text-[9px] md:text-xs uppercase mt-1">BPM</p>
              </div>
              
              <div className="absolute bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {isPlaying ? (
                  <Square size={20} className="fill-red-500 text-red-500" />
                ) : (
                  <Play size={24} className="fill-white text-white ml-1" />
                )}
              </div>
            </motion.div>

            {/* Beat Indicators & Quick Adjust */}
            <div className="flex items-center gap-6 sm:gap-10 mt-6 md:mt-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setBpm(b => Math.max(40, b - 1)); }}
                className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center text-slate-400 border border-white/5 shadow-lg group"
              >
                <Minus size={20} md:size={24} strokeWidth={3} className="group-hover:text-white transition-colors" />
              </button>

              <div className="flex gap-4 md:gap-8">
                {[0, 1, 2, 3].map((b) => (
                  <motion.div
                    key={b}
                    animate={isPlaying && beat === b ? { scale: 1.8, opacity: 1 } : { scale: 1, opacity: 0.15 }}
                    className={cn(
                      "w-3 h-3 md:w-5 md:h-5 rounded-full transition-shadow duration-300",
                      b === 0 ? "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    )}
                  />
                ))}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setBpm(b => Math.min(240, b + 1)); }}
                className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center text-slate-400 border border-white/5 shadow-lg group"
              >
                <Plus size={20} md:size={24} strokeWidth={3} className="group-hover:text-white transition-colors" />
              </button>
            </div>
            
            <div className="mt-8 text-slate-800 font-black tracking-[0.3em] text-[10px] md:text-xs uppercase pointer-events-none">
              TAP CENTER TO {isPlaying ? 'STOP' : 'START'}
            </div>
          </div>

          {/* Bottom Panel: Tempo Adjustment */}
          <div className="relative z-20 w-full max-w-5xl flex flex-col gap-6 pt-8 border-t border-white/5 bg-slate-950/40 backdrop-blur-sm rounded-b-3xl">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1 w-full flex flex-col gap-4">
                <input 
                  type="range" 
                  min="40" 
                  max="240" 
                  value={bpm} 
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-2 bg-slate-900 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between w-full text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span>Adagio</span>
                  <span className="hidden sm:inline">Andante</span>
                  <span>Moderato</span>
                  <span className="hidden sm:inline">Allegro</span>
                  <span>Presto</span>
                </div>
              </div>

              <button 
                onClick={handleTap}
                className="w-full md:w-auto px-10 py-5 md:py-6 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-blue-600 active:scale-95 transition-all text-xs md:text-sm tracking-[0.2em]"
              >
                <Hand size={20} />
                TAP TEMPO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
