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
      className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none animate-zoom-announce"
      // Using onAnimationEnd to clear the phase could be an option, but resetting the key is cleaner
      // as it allows back-to-back announcements of the same phase (e.g. extra turn)
    >
      <div className={`bg-black/60 backdrop-blur-sm font-black text-4xl md:text-6xl uppercase p-4 md:p-6 rounded-lg border-2 text-center ${style}`}>
        <div className="text-lg md:text-2xl opacity-80 tracking-widest">Turn {turn}</div>
        <div className="tracking-[0.3em]">{currentPhase}</div>
      </div>
    </div>
  );
};

export default PhaseAnnouncer;