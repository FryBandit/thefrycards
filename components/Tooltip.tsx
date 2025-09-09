import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-arcane-surface/90 backdrop-blur-sm border-2 border-vivid-cyan rounded-lg shadow-2xl shadow-vivid-cyan/20 z-[100] text-xs font-mono text-white normal-case text-left pointer-events-none animate-modal-show">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
