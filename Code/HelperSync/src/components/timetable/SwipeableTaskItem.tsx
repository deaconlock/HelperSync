"use client";

import { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { MoreHorizontal, Trash2 } from "lucide-react";

const BUTTON_WIDTH = 68; // px per button
const REVEAL_WIDTH = BUTTON_WIDTH * 2; // two buttons: More + Delete

interface SwipeableTaskItemProps {
  children: React.ReactNode;
  onMorePress: () => void;
  onDeletePress?: () => void;
  isSwipeOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  disabled?: boolean;
}

export function SwipeableTaskItem({
  children,
  onMorePress,
  onDeletePress,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
  disabled = false,
}: SwipeableTaskItemProps) {
  const x = useMotionValue(0);
  const buttonOpacity = useTransform(x, [-REVEAL_WIDTH, -20, 0], [1, 0.5, 0]);
  const buttonScale = useTransform(x, [-REVEAL_WIDTH, 0], [1, 0.8]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external state
  useEffect(() => {
    if (isSwipeOpen) {
      animate(x, -REVEAL_WIDTH, { type: "spring", damping: 30, stiffness: 300 });
    } else {
      animate(x, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  }, [isSwipeOpen, x]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const shouldOpen = info.offset.x < -30 || info.velocity.x < -200;
    if (shouldOpen) {
      onSwipeOpen();
    } else {
      onSwipeClose();
    }
  };

  const handleMoreClick = () => {
    onSwipeClose();
    onMorePress();
  };

  const handleDeleteClick = () => {
    onSwipeClose();
    onDeletePress?.();
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind the content */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{
          width: REVEAL_WIDTH,
          opacity: buttonOpacity,
          scale: buttonScale,
        }}
      >
        {/* More button */}
        <button
          onClick={handleMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-gray-500 text-white"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xs font-medium">More</span>
        </button>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-red-500 text-white"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        className="relative z-10 bg-white"
        style={{ x }}
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.15}
        dragDirectionLock
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
