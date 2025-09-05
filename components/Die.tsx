import React, { useState, useEffect } from 'react';
import type { Die as DieType } from '../game/types';

interface DieProps {
  die: DieType;
  onClick: () => void;
  isRolling?: boolean;
}

const Die: React.FC<DieProps> = ({ die, onClick, isRolling = false }) => {
  const [displayValue, setDisplayValue] = useState(die.value);

  useEffect(() => {
    let animationInterval: number | undefined;

    if (isRolling) {
      // Rapidly change the displayed value to simulate rolling
      animationInterval = window.setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 60);

      // Stop the animation after a duration and set the final value
      const animationTimeout = setTimeout(() => {
        clearInterval(animationInterval);
        setDisplayValue(die.value);
      }, 700);

      return () => {
        clearInterval(animationInterval);
        clearTimeout(animationTimeout);
      };
    } else {
      // If not rolling, ensure the display value matches the actual die value
      setDisplayValue(die.value);
    }
    // die.value is included to update the display if the die is rerolled while it wasn't rolling before (unlikely but safe)
  }, [isRolling, die.value]);

  const dieFace = [
    '',
    '⚀',
    '⚁',
    '⚂',
    '⚃',
    '⚄',
    '⚅',
  ][displayValue];

  const baseClasses = "w-16 h-16 rounded-lg flex items-center justify-center text-5xl font-bold transition-all duration-200 border-2";
  const stateClasses = die.isSpent
    ? "bg-gray-800/80 border-gray-600 text-gray-500 opacity-50"
    : die.isKept
    ? "bg-neon-cyan text-cyber-bg scale-105 border-neon-cyan shadow-neon-cyan"
    : "bg-cyber-surface/80 border-cyber-border text-neon-pink hover:bg-cyber-primary hover:border-neon-pink cursor-pointer";
  
  const animationClass = isRolling ? 'animate-roll-shake' : '';

  return (
    <button
      onClick={onClick}
      disabled={die.isSpent || isRolling}
      className={`${baseClasses} ${stateClasses} ${animationClass}`}
      aria-label={`Die showing ${displayValue}, ${die.isKept ? 'kept' : die.isSpent ? 'spent' : 'available'}`}
    >
      {dieFace}
    </button>
  );
};

export default Die;