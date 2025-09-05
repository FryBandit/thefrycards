import React from 'react';
import type { Die as DieType } from '../game/types';

interface DieProps {
  die: DieType;
  onClick: () => void;
}

const Die: React.FC<DieProps> = ({ die, onClick }) => {
  const dieFace = [
    '',
    '⚀',
    '⚁',
    '⚂',
    '⚃',
    '⚄',
    '⚅',
  ][die.value];

  const baseClasses = "w-16 h-16 rounded-lg flex items-center justify-center text-5xl font-bold transition-all duration-200 border-2";
  const stateClasses = die.isSpent
    ? "bg-gray-800/80 border-gray-600 text-gray-500 opacity-50"
    : die.isKept
    ? "bg-neon-cyan text-cyber-bg scale-105 border-neon-cyan shadow-neon-cyan"
    : "bg-cyber-surface/80 border-cyber-border text-neon-pink hover:bg-cyber-primary hover:border-neon-pink cursor-pointer";

  return (
    <button
      onClick={onClick}
      disabled={die.isSpent}
      className={`${baseClasses} ${stateClasses}`}
      aria-label={`Die showing ${die.value}, ${die.isKept ? 'kept' : die.isSpent ? 'spent' : 'available'}`}
    >
      {dieFace}
    </button>
  );
};

export default Die;