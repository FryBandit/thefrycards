import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="text-neon-cyan underline decoration-dotted cursor-help">
        {children}
      </span>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-cyber-bg border-2 border-neon-pink rounded-lg shadow-lg z-[60] text-xs font-mono text-white normal-case text-left pointer-events-none">
          <h4 className="font-bold text-neon-pink uppercase tracking-wider mb-1">{children}</h4>
          {content}
        </div>
      )}
    </span>
  );
};

export default Tooltip;
