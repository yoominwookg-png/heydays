import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { FirestoreImage } from './FirestoreImage';

interface ImageGalleryProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageGallery({ images, initialIndex = 0, onClose }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastTapTime, setLastTapTime] = useState(0);
  const [origin, setOrigin] = useState("center");
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setOrigin("center");
  };

  const handlePrevious = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setDirection(-1);
    resetZoom();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setDirection(1);
    resetZoom();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleTapNavigation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    // Double tap check
    const now = Date.now();
    if (now - lastTapTime < 300) {
      resetZoom();
      setLastTapTime(0);
      return;
    }
    setLastTapTime(now);

    // Only navigate if not zoomed in
    if (scale > 1.1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const { innerWidth } = window;
    
    if (clientX < innerWidth / 2) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const dist = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY
      );
      setTouchStartDist(dist);

      // Set transform origin toward the midpoint of the fingers
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      
      const originX = ((midX - rect.left) / rect.width) * 100;
      const originY = ((midY - rect.top) / rect.height) * 100;
      
      // Update origin only if we are starting from or near scale 1 to avoid jumps
      if (scale < 1.1) {
        setOrigin(`${originX}% ${originY}%`);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / touchStartDist;
      const newScale = Math.min(Math.max(1, scale * delta), 5);
      setScale(newScale);
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-md lg:p-10 select-none touch-none"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[250] backdrop-blur-md border border-white/10 shadow-2xl active:scale-90"
      >
        <X size={32} />
      </button>

      <div className="absolute top-6 left-6 flex items-center gap-3 text-white/50 text-xs font-black tracking-widest uppercase z-[250] pointer-events-none">
        <div className="p-2 bg-white/10 rounded-xl">
          <Maximize2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-black">sheet music view</p>
          <p className="text-[10px]">PINCH TO ZOOM • DOUBLE TAP TO RESET • SWIPE TO FLIP</p>
        </div>
        <span className="ml-4 px-3 py-1 bg-white/10 rounded-full text-xs font-black text-white">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.3 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              if (scale > 1.1) return; // Disable swipe when zoomed
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) {
                handleNext();
              } else if (swipe > 10000) {
                handlePrevious();
              }
            }}
            className="absolute w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
            onClick={handleTapNavigation}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div 
              className="relative max-w-full max-h-full"
              drag={scale > 1.1}
              dragConstraints={{ 
                left: -500 * (scale - 1), 
                right: 500 * (scale - 1), 
                top: -800 * (scale - 1), 
                bottom: 800 * (scale - 1) 
              }}
              dragElastic={0.1}
              dragMomentum={false} // Prevents "slippery" feeling by stopping exactly where released
              animate={{ 
                scale,
                x: scale <= 1.1 ? 0 : undefined,
                y: scale <= 1.1 ? 0 : undefined
              }}
              style={{ transformOrigin: origin }}
              transition={{ 
                type: "spring", 
                stiffness: 450, 
                damping: 45,
                mass: 0.5
              }}
            >
              <FirestoreImage
                src={images[currentIndex]}
                alt={`Full size view ${currentIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg pointer-events-none"
                loadingClassName="w-32 h-32"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <div className="hidden lg:block">
              <button
                onClick={handlePrevious}
                className="absolute left-10 p-6 text-white/50 hover:text-white transition-all z-[250] flex items-center justify-center group hover:scale-125 active:scale-95"
              >
                <ChevronLeft size={64} strokeWidth={1} className="group-hover:-translate-x-2 transition-transform" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-10 p-6 text-white/50 hover:text-white transition-all z-[250] flex items-center justify-center group hover:scale-125 active:scale-95"
              >
                <ChevronRight size={64} strokeWidth={1} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[250] bg-black/20 backdrop-blur-sm p-3 rounded-full border border-white/5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx); 
                  }}
                  className={`relative h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
                    idx === currentIndex ? 'bg-white w-10' : 'bg-white/20 hover:bg-white/40 w-3'
                  }`}
                >
                  {idx === currentIndex && (
                    <motion.div 
                      layoutId="gallery-indicator" 
                      className="absolute inset-0 bg-indigo-500" 
                    />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
