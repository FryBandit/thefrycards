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
  
  // Group dice by value
  const groupedDice = dice.reduce((acc, die) => {
    (acc[die.value] = acc[die.value] || []).push(die);
    return acc;
  }, {} as Record<number, DieType[]>);

  // Sort groups by die value
  const sortedGroups = Object.keys(groupedDice)
    .map(Number)
    .sort((a, b) => a - b)
    .map(value => groupedDice[value]);


  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsRolling(true);
    onRoll();
    setTimeout(() => {
        setIsRolling(false);
    }, 750); // Animation duration
  }

  return (
    <div className="bg-arcane-surface/70 backdrop-blur-sm p-2 sm:p-4 rounded-lg flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 border-2 border-arcane-border">
      <div className="flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-4 gap-y-2">
        {sortedGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex gap-2 sm:gap-3">
                {group.map((die) => (
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
        ))}
      </div>
      <div className="flex flex-col items-center space-y-1 sm:space-y-2">
        <button
          onClick={handleRoll}
          disabled={!canRoll || isRolling}
          className={`w-24 h-12 sm:h-16 bg-arcane-primary text-white font-bold rounded-lg shadow-md hover:bg-arcane-secondary transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed border-2 border-arcane-border ${canRoll && !isRolling ? 'animate-pulse-glow' : ''}`}
        >
          {isRolling ? '...' : 'ROLL'}
        </button>
        <div className="text-vivid-yellow text-xs sm:text-sm font-semibold">Rolls: {maxRolls - rollCount}</div>
      </div>
    </div>
  );
};

export default DiceTray;