import React from 'react';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminCrownProps {
  size?: number;
  className?: string;
}

export const AdminCrown: React.FC<AdminCrownProps> = ({ size = 24, className }) => {
  return (
    <motion.span
      animate={{
        filter: [
          "drop-shadow(0 0 2px #FFD700)",
          "drop-shadow(0 0 4px #FFEF00)",
          "drop-shadow(0 0 2px #FFD700)"
        ]
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={cn("inline-flex items-center justify-center relative", className)}
    >
      {/* Base Crown */}
      <Crown 
        size={size} 
        className="text-[#FFD700] fill-[#FFD700]/30 relative z-10" 
        strokeWidth={2}
      />
      
      {/* Inner Glow - Subtler */}
      <motion.span
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 bg-yellow-400/20 blur-lg rounded-full -z-10"
      />

      {/* Flame Sparks - Much subtler and fewer */}
      <motion.span
        animate={{ 
          y: [-1, -4, -1],
          opacity: [0, 0.4, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1 left-1/3 w-1 h-1 bg-yellow-200/50 rounded-full blur-[1px]"
      />
      <motion.span
        animate={{ 
          y: [0, -5, 0],
          opacity: [0, 0.3, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1, ease: "easeInOut" }}
        className="absolute -top-2 right-1/3 w-0.5 h-0.5 bg-white/40 rounded-full blur-[1px]"
      />
    </motion.span>
  );
};
