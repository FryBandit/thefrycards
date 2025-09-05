import React, { useRef, useEffect } from 'react';

interface GameLogProps {
  log: string[];
}

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="absolute top-4 left-4 w-64 h-1/3 bg-cyber-surface/70 backdrop-blur-sm rounded-lg p-2 text-white text-xs font-mono flex flex-col z-20 border-2 border-cyber-border">
        <h3 className="text-sm font-bold border-b border-neon-cyan/50 mb-2 pb-1 text-neon-cyan uppercase tracking-widest">System Log</h3>
        <div className="overflow-y-auto flex-grow pr-2">
            {log.map((entry, index) => (
            <p key={index} className="mb-1 text-neon-yellow/80">{`> ${entry}`}</p>
            ))}
            <div ref={logEndRef} />
        </div>
    </div>
  );
};

export default GameLog;