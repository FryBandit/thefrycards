import React, { useState, useEffect } from 'react';
import type { Die as DieType, GameState } from '../game/types';
import { LastActionType } from '../game/types';

interface DieProps {
  die: DieType;
  onClick: () => void;
  isRolling?: boolean;
  isHighlighted?: boolean;
  isHoveredCardPlayable?: boolean;
  isTrayRolling?: boolean;
  lastActionDetails: GameState['lastActionDetails'];
}

const Die: React.FC<DieProps> = ({ die, onClick, isRolling = false, isHighlighted = false, isHoveredCardPlayable = true, isTrayRolling = false, lastActionDetails }) => {
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

  const wasJustSpent = lastActionDetails?.spentDiceIds.includes(die.id);
  const spendAnimationType = wasJustSpent ? lastActionDetails?.type : null;

  const spendColor: { [key in LastActionType]: string } = {
    [LastActionType.PLAY]: 'shadow-neon-pink',
    [LastActionType.CHANNEL]: 'shadow-neon-cyan',
    [LastActionType.SCAVENGE]: 'shadow-neon-yellow',
    [LastActionType.ACTIVATE]: 'shadow-unit',
  };

  const baseClasses = "w-16 h-16 rounded-lg flex items-center justify-center text-5xl font-bold transition-all duration-200 border-2";
  
  let stateClasses = "";
  if (die.isSpent) {
      stateClasses = "bg-gray-800/80 border-gray-600 text-gray-500 opacity-50";
  } else if (die.isKept) {
      stateClasses = "bg-neon-cyan text-cyber-bg scale-105 border-neon-cyan shadow-neon-cyan";
  } else if (isHighlighted) {
      if (isHoveredCardPlayable) {
        stateClasses = "bg-cyber-primary/90 border-neon-cyan ring-4 ring-offset-2 ring-offset-cyber-surface ring-neon-cyan text-white shadow-neon-cyan";
      } else {
        stateClasses = "bg-red-900/80 border-red-500 ring-4 ring-offset-2 ring-offset-cyber-surface ring-red-500 text-white shadow-lg shadow-red-500/50";
      }
  } else {
      stateClasses = "bg-cyber-surface/80 border-cyber-border text-neon-pink hover:bg-cyber-primary hover:border-neon-pink cursor-pointer";
  }

  const animationClass = isRolling 
    ? 'animate-roll-shake' 
    : spendAnimationType 
    ? `animate-pulse-spend ${spendColor[spendAnimationType] || 'shadow-neon-pink'}`
    : '';

  return (
    <button
      onClick={onClick}
      disabled={die.isSpent || isTrayRolling}
      className={`${baseClasses} ${stateClasses} ${animationClass}`}
      aria-label={`Die showing ${displayValue}, ${die.isKept ? 'kept' : die.isSpent ? 'spent' : 'available'}`}
    >
      {dieFace}
    </button>
  );
};

export default Die;