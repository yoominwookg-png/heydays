import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Declare YT for TypeScript
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Global YouTube API Loader
let apiLoaded = false;
const loadYoutubeApi = () => {
  if (apiLoaded || window.YT) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });
};

interface SmartYoutubePlayerProps {
  videoId: string;
  title?: string;
  onReady?: (player: any) => void;
  className?: string;
  isSticky?: boolean;
  hidePracticeControls?: boolean;
}

export const HeydaysPracticePlayer: React.FC<SmartYoutubePlayerProps> = ({ 
  videoId, 
  title, 
  onReady, 
  className,
  isSticky = false,
  hidePracticeControls = false
}) => {
  const [playing, setPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [played, setPlayed] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  const playerRef = useRef<any>(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substr(2, 9)}`);
  const isMountedRef = useRef(true);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // A-B Repeat State
  const [startA, setStartA] = useState<number | null>(null);
  const [endB, setEndB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);

  // Robust Video ID extraction
  const getCleanVideoId = useCallback((input: string) => {
    const trimmed = input?.trim();
    if (!trimmed) return "";
    
    // Most standard and comprehensive YouTube URL regex
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = trimmed.match(regExp);
    const extractedId = (match && match[7].length === 11) ? match[7] : (trimmed.length === 11 ? trimmed : "");
    
    if (trimmed && !extractedId) {
      // Try secondary regex for shorts etc.
      const secondaryRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
      const secondaryMatch = trimmed.match(secondaryRegex);
      return secondaryMatch ? secondaryMatch[1] : "";
    }
    return extractedId;
  }, []);

  const activeVideoId = getCleanVideoId(videoId);

  // Initialize YT Player
  useEffect(() => {
    isMountedRef.current = true;
    let player: any = null;

    const initPlayer = async () => {
      await loadYoutubeApi();
      if (!isMountedRef.current || !activeVideoId) return;

      console.log(`[YouTube Player] Initializing direct IFrame for: ${activeVideoId}`);
      
      player = new window.YT.Player(containerId.current, {
        videoId: activeVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0
        },
        events: {
          onReady: (event: any) => {
            console.log("[YouTube Player] Native Ready Signal Received");
            if (isMountedRef.current) {
              const p = event.target;
              playerRef.current = p;
              setIsReady(true);
              
              // Force metadata sync (Handshake)
              const d = p.getDuration();
              if (d > 0) {
                setDuration(d);
                console.log("[YouTube Player] Sync Success: Duration =", d);
              }
              onReady?.(p);
            }
          },
          onStateChange: (event: any) => {
            if (isMountedRef.current) {
              // event.data: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) setPlaying(true);
              if (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED) setPlaying(false);
            }
          },
          onError: (e: any) => {
            console.error("[YouTube Player] API ERROR:", e.data);
            if (isMountedRef.current) setIsReady(false);
          }
        }
      });
    };

    initPlayer();

    return () => {
      isMountedRef.current = false;
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [activeVideoId]);

  // Master Sync Timer
  useEffect(() => {
    if (isReady && isMountedRef.current) {
      syncIntervalRef.current = setInterval(() => {
        const player = playerRef.current;
        if (player && typeof player.getCurrentTime === 'function') {
          const now = player.getCurrentTime();
          const total = player.getDuration();
          
          if (total > 0) {
            setCurrentTime(now);
            setPlayed(now / total);
            if (duration === 0) setDuration(total);

            // A-B Repeat Logic
            if (isLooping && startA !== null && endB !== null) {
              if (now >= endB) {
                player.seekTo(startA, true);
              }
            }
          }
        }
      }, 500);
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isReady, isLooping, startA, endB]);

  // Sync Playback Rate
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    
    if (playing) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [playing, isReady]);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPlayed = parseFloat(e.target.value);
    setPlayed(newPlayed);
    const player = playerRef.current;
    if (player && duration > 0) {
      player.seekTo(newPlayed * duration, true);
    }
  }, [duration]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!videoId) return null;

  return (
    <motion.div
      layout
      transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.6 }}
      className={cn(
        isMinimized 
          ? "fixed bottom-8 right-8 z-[99999] w-[320px] bg-[#030303] rounded-2xl border border-white/10 shadow-2xl overflow-hidden cursor-pointer group"
          : cn(
              isSticky ? "fixed bottom-0 left-0 w-full z-[99999] border-t border-[#333] bg-[#030303] shadow-2xl pointer-events-auto" : "relative w-full bg-[#030303] rounded-2xl border border-white/5",
              "text-white",
              isVideoVisible ? "p-6 pt-10" : "p-3 pt-4 pb-2 px-4"
            ),
        className
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {/* Fold/Unfold Toggle - Mobile and Desktop Handle */}
      {!isMinimized && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsVideoVisible(!isVideoVisible); }}
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center text-white/5 hover:text-[#1db954] transition-colors group cursor-pointer z-[60]",
            isVideoVisible ? "top-0 h-10" : "top-0 h-4"
          )}
          title={isVideoVisible ? "Fold Video" : "Unfold Video"}
        >
          <div className="flex flex-col items-center">
            <div className={cn("bg-current rounded-full transition-all group-hover:scale-x-110", isVideoVisible ? "w-12 h-1 mb-1" : "w-10 h-1")} />
            {isVideoVisible && (
              <div className="transition-transform duration-300 transform">
                <ChevronDown size={14} className="opacity-0 group-hover:opacity-100" />
              </div>
            )}
          </div>
        </button>
      )}

      {/* Minimize to Corner (Separate from folding) */}
      {!isMinimized && isVideoVisible && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
          className="absolute top-3 right-4 p-2 text-white/20 hover:text-white transition-colors z-[70] hidden md:block"
          title="Minimize to Corner"
        >
          <X size={16} />
        </button>
      )}

      {isMinimized && (
        <div className="absolute top-2 right-2 z-50 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#1db954] transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      <div className={cn("w-full flex flex-col", isVideoVisible || isMinimized ? "pt-2" : "pt-0")}>
        {/* Video Area - Foldable */}
        <motion.div 
          layout
          initial={false}
          animate={{
            height: isMinimized ? 'auto' : (isVideoVisible ? 'auto' : 0),
            opacity: isMinimized ? 1 : (isVideoVisible ? 1 : 0),
            marginBottom: isVideoVisible || isMinimized ? '1.25rem' : 0,
            scale: isVideoVisible || isMinimized ? 1 : 0.98,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 500, mass: 0.5 }}
          className="overflow-hidden bg-black rounded-xl"
        >
          {activeVideoId ? (
            <div className={cn(
                "w-full aspect-video overflow-hidden relative border border-white/10",
                !isReady && "animate-pulse"
              )}
            >
              <div id={containerId.current} className="w-full h-full" />
              
              {/* Click Shield for Mini Mode */}
              {isMinimized && <div className="absolute inset-0 bg-black/0" />}

              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
                    <div className="text-[#1db954] font-black text-[9px] tracking-widest uppercase">Syncing</div>
                  </div>
                </div>
              )}

              {/* Play Overlay for Mini Mode */}
              {isMinimized && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                    className="w-12 h-12 rounded-full bg-[#1db954] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                  >
                    {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-[#111] border border-dashed border-red-500/20 text-red-400 p-8 text-center gap-2">
              <X size={24} className="opacity-50" />
              <div className="font-bold text-sm">Invalid URL</div>
            </div>
          )}
        </motion.div>

        {/* Info & Main Controls (Hidden in Mini Mode or transformed) */}
        <motion.div layout className={cn("flex flex-col w-full", isVideoVisible ? "gap-4" : "gap-3")}>
          {isMinimized ? (
            <div className="flex items-center justify-between pb-1">
              <div className="flex flex-col min-w-0 pr-4">
                <span className="text-[9px] font-black text-[#1db954] uppercase tracking-widest mb-0.5">Practicing</span>
                <span className="text-[11px] font-bold text-white truncate opacity-90">{title || 'Practice Mode'}</span>
              </div>
              <div className="text-[10px] font-bold text-gray-500 tabular-nums">
                 {formatTime(currentTime)}
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar Area */}
              <div className="flex flex-col w-full">
                <div className="relative w-full h-6 flex items-center">
                  {duration > 0 && startA !== null && endB !== null && (
                    <div className="absolute h-1 bg-[#1db954]/20 rounded-full pointer-events-none z-0"
                         style={{ left: `${(startA / duration) * 100}%`, width: `${((endB - startA) / duration) * 100}%` }} />
                  )}
                  {duration > 0 && startA !== null && (
                    <div className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-10"
                         style={{ left: `${(startA / duration) * 100}%` }}>
                      <div className="w-0.5 h-full bg-[#1db954] shadow-[0_0_8px_rgba(29,185,84,0.5)]" />
                      <span className="text-[9px] font-black text-[#1db954] absolute -top-4">A</span>
                    </div>
                  )}
                  {duration > 0 && endB !== null && (
                    <div className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-10"
                         style={{ left: `${(endB / duration) * 100}%` }}>
                      <div className="w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <span className="text-[9px] font-black text-red-500 absolute -top-4">B</span>
                    </div>
                  )}
                  <input type="range" min={0} max={0.999999} step="any" value={played} onChange={handleSeekChange}
                         className="relative w-full h-1 bg-[#222] accent-[#1db954] cursor-pointer appearance-none rounded-full z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1db954] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(29,185,84,0.5)] [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1db954] [&::-moz-range-thumb]:border-none"
                         style={{ background: `linear-gradient(to right, #1db954 ${played * 100}%, transparent ${played * 100}%)` }} />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-bold tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1db954] tracking-tight">{formatTime(currentTime)}</span>
                    <span className="opacity-20">|</span>
                    <span className="opacity-60">{formatTime(duration)}</span>
                  </div>
                  <span className="text-white/20 uppercase tracking-[0.2em] text-[10px] font-black leading-none self-end">HEYDAYS</span>
                </div>
              </div>

              {/* Simplified Controls Section - Single Row */}
              {!hidePracticeControls && (
                <div className="flex items-center justify-between w-full pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1 bg-[#111] p-1 rounded-lg border border-white/5">
                    {[0.8, 1.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black rounded-md transition-all uppercase tracking-widest",
                          playbackRate === rate ? 'bg-[#1db954] text-white' : 'text-gray-500 hover:text-white'
                        )}
                      >
                        {rate === 1.0 ? 'Normal' : 'Slow'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-[#111] p-1 rounded-lg border border-white/5 gap-1">
                    <button onClick={() => setStartA(currentTime)} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", startA !== null ? "bg-[#1db954] text-white" : "text-gray-500 hover:text-white")}>A</button>
                    <button onClick={() => setEndB(currentTime)} 
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all", endB !== null ? "bg-red-500 text-white" : "text-gray-500 hover:text-white")}>B</button>
                    <div className="w-[1px] h-3 bg-white/10 mx-1" />
                    <button onClick={() => setIsLooping(!isLooping)} disabled={startA === null || endB === null}
                      className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all disabled:opacity-10", isLooping ? "text-[#1db954] bg-[#1db954]/10" : "text-gray-500 hover:text-white")}>
                      {isLooping ? 'Looping' : 'Loop'}
                    </button>
                    {(startA !== null || endB !== null) && (
                      <button onClick={() => { setStartA(null); setEndB(null); setIsLooping(false); }} className="p-1 px-2 text-gray-600 hover:text-red-500"><X size={14} strokeWidth={3} /></button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Minimal Progress Line (Always visible, but specifically for mini mode) */}
          {isMinimized && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#222]">
              <div className="h-full bg-[#1db954] transition-all duration-300" style={{ width: `${played * 100}%` }} />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

