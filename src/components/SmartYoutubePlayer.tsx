import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SmartYoutubePlayerProps {
  videoId: string;
  title?: string;
  onReady?: (player: any) => void;
  className?: string;
  isSticky?: boolean;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const SmartYoutubePlayer: React.FC<SmartYoutubePlayerProps> = ({ 
  videoId, 
  title, 
  onReady, 
  className,
  isSticky = false
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRate, setCurrentRate] = useState(1.0);
  const [isApiReady, setIsApiReady] = useState(!!window.YT);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    } else {
      setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isApiReady || !videoId) return;

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(`player-${videoId}`, {
        height: '40', // 비디오 리소스를 최소화하기 위해 높이 축소
        width: '100%',
        videoId: videoId,
        playerVars: {
          'autoplay': 0,
          'controls': 1,
          'rel': 0,
          'showinfo': 0,
          'modestbranding': 1,
          'playsinline': 1,
          'origin': window.location.origin
        },
        events: {
          onReady: (event: any) => {
            onReady?.(event.target);
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          }
        }
      });
    };

    // Give a small delay for the DOM element to be available
    const timeout = setTimeout(initPlayer, 100);
    return () => {
      clearTimeout(timeout);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [isApiReady, videoId]);

  const setProfessionalSpeed = (rate: number) => {
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      playerRef.current.setPlaybackRate(rate);
      setCurrentRate(rate);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const seekTo = (seconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  // Listen for global events for timestamp jumping
  useEffect(() => {
    const handleJump = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.seconds === 'number') {
        seekTo(e.detail.seconds);
      }
    };
    window.addEventListener('youtube-seek', handleJump as any);
    return () => window.removeEventListener('youtube-seek', handleJump as any);
  }, []);

  return (
    <div className={cn(
      "w-full transition-all duration-500",
      isSticky ? "fixed bottom-0 left-0 right-0 z-[200] px-4 pb-4 animate-in slide-in-from-bottom-full" : "relative",
      className
    )}>
      <div className={cn(
        "bg-slate-900 border border-white/10 overflow-hidden shadow-2xl",
        isSticky ? "rounded-3xl" : "rounded-[2rem]"
      )}>
        {/* Actual Video Area (Invisible/Minimal) */}
        <div id={`player-${videoId}`} className="bg-black w-full" style={{ height: '1px' }} />
        
        {/* Custom Control Bar */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-4 justify-between bg-gradient-to-r from-slate-900 to-indigo-950">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Now Playing</p>
              <p className="text-xs font-bold text-white truncate max-w-[200px]">{title || 'YouTube Audio'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            {[0.5, 0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => setProfessionalSpeed(rate)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all",
                  currentRate === rate 
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105" 
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                )}
              >
                {rate.toFixed(2)}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 10)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={() => playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 10)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <FastForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
