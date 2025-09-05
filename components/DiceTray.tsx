import React, { useState } from 'react';
import type { Die as DieType } from '../game/types';
import Die from './Die';

interface DiceTrayProps {
  dice: DieType[];
  rollCount: number;
  maxRolls: number;
  onDieClick: (id: number) => void;
  onRoll: () => void;
  canRoll: boolean;
}

const DiceTray: React.FC<DiceTrayProps> = ({ dice, rollCount, maxRolls, onDieClick, onRoll, canRoll }) => {
  const [isRolling, setIsRolling] = useState(false);
  const sortedDice = [...dice].sort((a, b) => a.value - b.value);

  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsRolling(true);
    onRoll();
    setTimeout(() => {
        setIsRolling(false);
    }, 750); // Animation duration
  }

  return (
    <div className="bg-cyber-surface/70 backdrop-blur-sm p-4 rounded-lg flex items-center justify-center space-x-4 border-2 border-cyber-border">
      <div className="flex space-x-3">
        {sortedDice.map((die) => (
          <Die 
            key={die.id} 
            die={die} 
            onClick={() => onDieClick(die.id)} 
            isRolling={isRolling && !die.isKept && !die.isSpent}
          />
        ))}
      </div>
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={handleRoll}
          disabled={!canRoll || isRolling}
          className="w-24 h-16 bg-cyber-primary text-white font-bold rounded-lg shadow-md hover:bg-cyber-secondary transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed border-2 border-cyber-border"
        >
          {isRolling ? '...' : 'ROLL'}
        </button>
        <div className="text-neon-yellow text-sm font-semibold">Rolls left: {maxRolls - rollCount}</div>
      </div>
    </div>
  );
};

export default DiceTray;