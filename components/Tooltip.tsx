


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
      <span className="text-vivid-cyan underline decoration-dotted cursor-help">
        {children}
      </span>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-arcane-surface/90 backdrop-blur-sm border-2 border-vivid-cyan rounded-lg shadow-2xl shadow-vivid-cyan/20 z-[100] text-xs font-mono text-white normal-case text-left pointer-events-none whitespace-pre-wrap">
          <h4 className="font-bold text-vivid-cyan uppercase tracking-wider mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{children}</span>
          </h4>
          {content}
        </div>
      )}
    </span>
  );
};

export default Tooltip;