import React, { useState, useEffect } from 'react';
import { TurnPhase } from '../game/types';

interface PhaseAnnouncerProps {
  phase: string | null;
  turn: number;
}

const phaseStyles: { [key: string]: string } = {
    [TurnPhase.MULLIGAN]: 'text-neon-yellow border-neon-yellow/50',
    [TurnPhase.START]: 'text-white border-white/50',
    [TurnPhase.ROLL_SPEND]: 'text-neon-cyan border-neon-cyan/50',
    [TurnPhase.DRAW]: 'text-blue-400 border-blue-400/50',
    [TurnPhase.ASSAULT]: 'text-red-400 border-red-400/50',
    [TurnPhase.BLOCK]: 'text-yellow-400 border-yellow-400/50',
    [TurnPhase.END]: 'text-gray-400 border-gray-400/50',
    'default': 'text-neon-cyan border-neon-cyan/50'
};


const PhaseAnnouncer: React.FC<PhaseAnnouncerProps> = ({ phase, turn }) => {
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Only update and trigger animation if the phase actually changes to a new non-null value
    if (phase && phase !== currentPhase) {
      setCurrentPhase(phase);
      setAnimationKey(prev => prev + 1);
    }
  }, [phase, currentPhase]);

  if (!currentPhase) return null;

  const style = phaseStyles[currentPhase] || phaseStyles.default;

  return (
    <div
      key={animationKey}
      className="fixed top-4 left-1/2 -translate-x-1/2 w-auto z-40 pointer-events-none animate-zoom-announce"
    >
      <div className={`bg-black/80 backdrop-blur-sm font-black text-2xl md:text-3xl uppercase px-6 py-2 rounded-lg border-2 text-center ${style}`}>
        <span className="opacity-80 tracking-wider">Turn {turn}: </span>
        <span className="tracking-widest">{currentPhase}</span>
      </div>
    </div>
  );
};

export default PhaseAnnouncer;