import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top, // Position at the top of the trigger element
        left: rect.left + rect.width / 2, // Position at the horizontal center
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
            // Position tooltip above the trigger element, centered horizontally, with a small margin
            transform: 'translate(-50%, -100%) translateY(-0.5rem)',
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
