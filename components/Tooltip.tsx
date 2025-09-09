import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; transform: string } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 in pixels
      const tooltipHeight = 120; // estimate
      const margin = 16; // 1rem

      let finalTop = rect.top;
      let finalLeft = rect.left + rect.width / 2;
      let finalTransform = 'translate(-50%, -100%) translateY(-0.5rem)';

      // Check vertical collision: if not enough space at the top, show below
      if (rect.top - tooltipHeight - margin < 0) {
        finalTop = rect.bottom;
        finalTransform = 'translate(-50%, 0) translateY(0.5rem)';
      }

      // Check horizontal collision and clamp position
      if (finalLeft - tooltipWidth / 2 < margin) {
        finalLeft = tooltipWidth / 2 + margin;
      } else if (finalLeft + tooltipWidth / 2 > window.innerWidth - margin) {
        finalLeft = window.innerWidth - tooltipWidth / 2 - margin;
      }

      setPosition({
        top: finalTop,
        left: finalLeft,
        transform: finalTransform,
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <span
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && position && createPortal(
        <div
          className="fixed w-64 p-3 bg-arcane-surface/90 backdrop-blur-sm border-2 border-vivid-cyan rounded-lg shadow-2xl shadow-vivid-cyan/20 z-[100] text-xs font-mono text-white normal-case text-left pointer-events-none animate-modal-show"
          style={{
            top: position.top,
            left: position.left,
            transform: position.transform,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  );
};

export default Tooltip;
