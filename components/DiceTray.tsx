
import React, { useState } from 'react';
import type { Die as DieType, GameState } from '../game/types';
import Die from './Die';

interface DiceTrayProps {
  dice: DieType[];
  rollCount: number;
  maxRolls: number;
  onDieClick: (id: number) => void;
  onRoll: () => void;
  canRoll: boolean;
  valuableDiceForHover: Set<number>;
  isHoveredCardPlayable: boolean;
  lastActionDetails: GameState['lastActionDetails'];
}

const DiceTray: React.FC<DiceTrayProps> = ({ dice, rollCount, maxRolls, onDieClick, onRoll, canRoll, valuableDiceForHover, isHoveredCardPlayable, lastActionDetails }) => {
  const [isRolling, setIsRolling] = useState(false);
  
  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsRolling(true);
    onRoll();
    setTimeout(() => {
        setIsRolling(false);
    }, 750); // Animation duration
  }

  return (
    <div className="bg-arcane-surface/70 backdrop-blur-sm p-3 rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-arcane-border">
      <div className="flex items-center justify-between gap-3 w-full">
         <button
          onClick={handleRoll}
          disabled={!canRoll || isRolling}
          className={`w-28 h-12 bg-arcane-primary text-white text-lg font-bold rounded-lg shadow-md hover:bg-arcane-secondary transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed border-2 border-arcane-border ${canRoll && !isRolling ? 'animate-pulse-glow' : ''}`}
        >
          {isRolling ? '...' : 'ROLL'}
        </button>
        <div className="text-vivid-yellow text-sm font-semibold">Rolls left: {maxRolls - rollCount}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {dice.map((die) => (
            <Die 
                key={die.id} 
                die={die} 
                onClick={() => onDieClick(die.id)} 
                isRolling={isRolling && !die.isKept && !die.isSpent}
                isHighlighted={valuableDiceForHover.has(die.id)}
                isHoveredCardPlayable={isHoveredCardPlayable}
                isTrayRolling={isRolling}
                lastActionDetails={lastActionDetails}
            />
        ))}
      </div>
    </div>
  );
};

export default DiceTray;
