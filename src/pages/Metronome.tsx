/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Square, 
  Plus, 
  Minus, 
  Volume2, 
  Hand,
  Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';

type SoundType = 'drum' | 'wood' | 'clap';

interface SwimmerProps {
  isPlaying: boolean;
  beat: number;
  key?: React.Key;
}

const Swimmer = ({ isPlaying, beat }: SwimmerProps) => {
  const isRightStroke = beat % 2 === 0;

  return (
    <div className="relative w-10 h-12 md:w-14 md:h-16 flex items-center justify-center">
      {/* Water Ripple Effect - More realistic and interactive */}
      {isPlaying && (
        <React.Fragment>
          {/* Main splash ripple */}
          <motion.div
            key={`splash-${beat}`}
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={cn(
              "absolute w-8 h-8 rounded-full border-2 border-white/40 blur-[1px]",
              isRightStroke ? "left-1 top-0" : "right-1 top-0"
            )}
          />
          {/* Expanding rings */}
          {[1, 2].map((i) => (
            <motion.div
              key={`ring-${i}-${beat}`}
              initial={{ scale: 0.5, opacity: 0.4 }}
              animate={{ scale: 4 + i, opacity: 0 }}
              transition={{ duration: 0.8 + i * 0.2, ease: "easeOut", delay: i * 0.1 }}
              className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)] rounded-full blur-sm"
            />
          ))}
          {/* Subtle trail ripples */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2] 
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute -bottom-2 w-full h-4 bg-blue-300/10 blur-md rounded-full"
          />
        </React.Fragment>
      )}
      
      <div className="relative w-5 h-9 md:w-8 md:h-12 flex flex-col items-center z-20">
        {/* Swimmer Head */}
        <motion.div
          animate={isPlaying ? { 
            rotate: [0, isRightStroke ? 5 : -5, 0],
            y: [0, -1, 0] 
          } : {}}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 md:w-6 md:h-6 bg-[#FFE4C4] rounded-full relative z-20 shadow-sm mb-[-2px]"
        >
          {/* Swim Cap */}
          <div className="absolute top-0 left-0 w-full h-[40%] bg-indigo-500 rounded-t-full" />
          {/* Happy Eyes (^ ^) */}
          <div className="absolute top-[35%] left-[20%] w-[25%] h-[10%] border-t-2 border-slate-900/60 rounded-full" />
          <div className="absolute top-[35%] right-[20%] w-[25%] h-[10%] border-t-2 border-slate-900/60 rounded-full" />
          {/* Smile */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[45%] h-[20%] border-b-2 border-red-500/60 rounded-full" />
          {/* Blushing */}
          <div className="absolute top-[45%] left-[5%] w-[25%] h-[15%] bg-red-400/40 rounded-full blur-[1px]" />
          <div className="absolute top-[45%] right-[5%] w-[25%] h-[15%] bg-red-400/40 rounded-full blur-[1px]" />
        </motion.div>

        {/* Swimmer Body */}
        <motion.div 
          animate={isPlaying ? { 
            rotate: [0, isRightStroke ? 3 : -3, 0],
            y: [0, -1, 0] 
          } : {}}
          transition={{ duration: 0.2 }}
          className="w-full h-5 md:h-8 bg-[#FFE4C4] rounded-full relative z-10 shadow-sm"
        >
          {/* Swimsuit */}
          <div className="absolute bottom-0 left-0 w-full h-[60%] bg-indigo-900 rounded-b-full" />
        </motion.div>

        {/* Left Arm */}
        <motion.div
           animate={isPlaying ? (isRightStroke ? { 
             rotate: 15,
             y: 0,
             scaleY: 1,
             zIndex: 5
           } : { 
             rotate: 165,
             y: 2,
             scaleY: 1.4,
             zIndex: 20
           }) : { rotate: 15 }}
           transition={{ type: 'spring', damping: 10, stiffness: 250 }}
           className="absolute -left-1.5 top-5 md:top-8 w-1.5 md:w-2.5 h-4 md:h-7 bg-[#FFE4C4] rounded-full origin-top shadow-sm"
        />

        {/* Right Arm */}
        <motion.div
           animate={isPlaying ? (isRightStroke ? { 
             rotate: -165,
             y: 2,
             scaleY: 1.4,
             zIndex: 20
           } : { 
             rotate: -15,
             y: 0,
             scaleY: 1,
             zIndex: 5
           }) : { rotate: -15 }}
           transition={{ type: 'spring', damping: 10, stiffness: 250 }}
           className="absolute -right-1.5 top-5 md:top-8 w-1.5 md:w-2.5 h-4 md:h-7 bg-[#FFE4C4] rounded-full origin-top shadow-sm"
        />
      </div>
    </div>
  );
};

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<SoundType>('wood');
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

  const playClick = useCallback((currentBeat: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioCtxRef.current;
    
    // Ensure context is running (required for Chrome/Safari)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const isFirstBeat = currentBeat === 0;

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
      if (currentBeat === 0) {
        playKick(ctx.currentTime);
      } else {
        playHiHat(ctx.currentTime);
        playKick(ctx.currentTime);
      }
      if (currentBeat === 2) {
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
  }, [sound]);

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
      playClick(beat);
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
    <div className="h-full flex flex-col animate-in fade-in zoom-in duration-700 overflow-hidden p-2">
      {/* Header Area - Compact */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter dark:text-white uppercase leading-none">HEYDAYS METRONOME</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[7px] md:text-[9px] uppercase tracking-[0.4em] mt-1">MASTER YOUR RHYTHM</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div 
          className={cn(
            "h-full w-full bg-slate-950 rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center justify-between transition-all duration-500",
            isPlaying ? "ring-4 md:ring-8 ring-indigo-500/20" : "hover:ring-4 md:hover:ring-8 hover:ring-white/5"
          )}
        >
          {/* Top Panel: Sound Selection - Reduced padding */}
          <div className="relative z-20 w-full flex items-center justify-center gap-4 pb-3 border-b border-white/5 bg-slate-950/40 backdrop-blur-sm rounded-t-3xl text-center flex-shrink-0">
            <div className="flex gap-2">
              {[
                { key: 'wood', label: 'WOOD' },
                { key: 'clap', label: 'CLAP' }
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={(e) => { e.stopPropagation(); setSound(s.key as SoundType); }}
                  className={cn(
                    "px-4 md:px-5 py-1.5 md:py-2 rounded-xl border-2 font-black uppercase text-[10px] md:text-[11px] tracking-widest transition-all",
                    sound === s.key 
                      ? "border-indigo-500 bg-indigo-500 text-white" 
                      : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Interactive Scaling Area */}
          <div 
            onClick={toggleMetronome}
            className="flex-1 flex flex-col items-center justify-center w-full cursor-pointer min-h-0 py-2 sm:py-4 overflow-hidden"
          >
            <div className="relative flex-1 flex items-center justify-center w-full max-h-full aspect-square p-2">
              <motion.div 
                animate={isPlaying ? {
                  scale: beat === 0 ? [1, 1.05, 1] : [1, 1.02, 1],
                } : {}}
                transition={{ duration: 0.1 }}
                className={cn(
                  "h-full aspect-square max-w-full rounded-full border-[6px] md:border-[16px] flex flex-col items-center justify-center transition-all duration-100 relative group overflow-hidden",
                  isPlaying 
                    ? (beat === 0 ? "border-yellow-400" : "border-indigo-500") 
                    : "border-slate-900"
                )}
              >
                {/* Swimming Pool Background Effect - Realistic caustics */}
                <motion.div 
                  animate={isPlaying ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-full"
                >
                  {/* Base Water Color with Gradient */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.4)_0%,rgba(8,145,178,0.6)_100%)] opacity-80" />
                  
                  {/* Caustic Layer 1: Sharp Refractions */}
                  <motion.div 
                    animate={{ 
                      x: [-20, 20, -10],
                      y: [-10, 10, -20],
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 10, 
                      ease: "linear" 
                    }}
                    className="absolute inset-[-50%] opacity-40 bg-[url('https://www.transparenttextures.com/patterns/water.png')] bg-[length:500px_500px] mix-blend-screen"
                  />

                  {/* Caustic Layer 2: Moving Light Web */}
                  <motion.div 
                    animate={{ 
                      x: [20, -20, 10],
                      y: [10, -10, 20],
                      rotate: [0, -5, 5, 0],
                      scale: [1.1, 1, 1.1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 12, 
                      ease: "linear" 
                    }}
                    style={{
                      backgroundImage: 'radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                      backgroundSize: '80px 80px'
                    }}
                    className="absolute inset-[-50%] opacity-30 mix-blend-overlay"
                  />

                  {/* Surface Shimmer */}
                  <motion.div 
                    animate={{ 
                      opacity: [0.1, 0.3, 0.1],
                      scale: [1, 1.2, 1] 
                    }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3)_0%,transparent_50%)]"
                  />

                  {/* Deeper Shadow */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.3)_100%)]" />
                </motion.div>

                <div className="text-center z-10 flex flex-col items-center relative">
                  {/* Swimmers Row */}
                  <div className="flex gap-2 md:gap-4 mb-1 md:mb-2">
                    {Array.from({ 
                      length: bpm <= 90 ? 1 : bpm <= 100 ? 2 : bpm <= 120 ? 3 : 4 
                    }).map((_, i) => (
                      <Swimmer key={i} isPlaying={isPlaying} beat={beat} />
                    ))}
                  </div>
                  <span className="text-5xl md:text-8xl lg:text-[7rem] font-black text-white tracking-tighter tabular-nums leading-none block">{bpm}</span>
                  <p className="text-slate-500 font-black tracking-[0.3em] text-[8px] md:text-xs uppercase mt-1">BPM</p>
                </div>
                
                <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {isPlaying ? (
                    <Square size={16} md:size={20} className="fill-red-500 text-red-500" />
                  ) : (
                    <Play size={20} md:size={24} className="fill-white text-white ml-1" />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Beat Indicators & Quick Adjust - Reduced gaps and margins */}
            <div className="flex items-center gap-4 sm:gap-10 mt-4 md:mt-8 flex-shrink-0">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextBpm = Math.max(40, bpm - 1);
                  setBpm(nextBpm);
                }}
                className="w-10 h-10 md:w-16 md:h-16 bg-slate-900 rounded-2xl hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center text-slate-400 border border-white/5 shadow-lg group"
              >
                <Minus size={18} md:size={24} strokeWidth={3} className="group-hover:text-white transition-colors" />
              </button>

              <div className="flex gap-3 md:gap-8">
                {[0, 1, 2, 3].map((b) => (
                  <motion.div
                    key={b}
                    animate={isPlaying && beat === b ? { scale: 1.5, opacity: 1 } : { scale: 1, opacity: 0.15 }}
                    className={cn(
                      "w-2.5 h-2.5 md:w-5 md:h-5 rounded-full transition-shadow duration-300",
                      b === 0 ? "bg-yellow-400" : "bg-white"
                    )}
                  />
                ))}
              </div>

              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextBpm = Math.min(240, bpm + 1);
                  setBpm(nextBpm);
                }}
                className="w-10 h-10 md:w-16 md:h-16 bg-slate-900 rounded-2xl hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center text-slate-400 border border-white/5 shadow-lg group"
              >
                <Plus size={18} md:size={24} strokeWidth={3} className="group-hover:text-white transition-colors" />
              </button>
            </div>
            
            <div className="mt-4 text-slate-800 font-black tracking-[0.3em] text-[8px] md:text-xs uppercase pointer-events-none flex-shrink-0">
              TAP CENTER TO {isPlaying ? 'STOP' : 'START'}
            </div>
          </div>

          {/* Bottom Panel: Tempo Adjustment - Reduced padding and gaps */}
          <div className="relative z-20 w-full max-w-5xl flex flex-col gap-3 pt-6 border-t border-white/5 bg-slate-950/40 backdrop-blur-sm rounded-b-3xl flex-shrink-0">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12">
              <div className="flex-1 w-full flex flex-col gap-2">
                <input 
                  type="range" 
                  min="40" 
                  max="240" 
                  value={bpm} 
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 md:h-2 bg-slate-900 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between w-full text-[8px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span>Adagio</span>
                  <span className="hidden sm:inline">Andante</span>
                  <span>Moderato</span>
                  <span className="hidden sm:inline">Allegro</span>
                  <span>Presto</span>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  handleTap(e);
                }}
                className="w-full md:w-auto px-8 py-4 md:py-6 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-blue-600 active:scale-95 transition-all text-[10px] md:text-sm tracking-[0.2em]"
              >
                <Hand size={18} />
                TAP TEMPO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
