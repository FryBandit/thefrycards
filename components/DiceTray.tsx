import React, { useState } from 'react';
// FIX: Import TurnPhase as a value, not just a type, to use it for comparisons.
import { TurnPhase, type Die as DieType, type GameState } from '../game/types';
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
  onAdvancePhase: () => void;
  canAdvance: boolean;
  phase: TurnPhase;
  isPlayerTurn: boolean;
}

const DiceTray: React.FC<DiceTrayProps> = ({ dice, rollCount, maxRolls, onDieClick, onRoll, canRoll, valuableDiceForHover, isHoveredCardPlayable, lastActionDetails, onAdvancePhase, canAdvance, phase, isPlayerTurn }) => {
  const [isRolling, setIsRolling] = useState(false);
  
  const handleRoll = () => {
    if (!canRoll || isRolling) return;
    setIsRolling(true);
    onRoll();
    setTimeout(() => {
        setIsRolling(false);
    }, 750); // Animation duration
  }

  const getDiePosition = (index: number) => {
    const angle = (index / dice.length) * 2 * Math.PI - (Math.PI / 2) + (Math.PI / dice.length); // Start from top, offset for centering
    const radius = 95; // pixels
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { transform: `translate(${x}px, ${y}px)` };
  };

  const getPhaseActionText = () => {
      if (phase === TurnPhase.ROLL_SPEND) return "END PHASE";
      if (phase === TurnPhase.END) return "END TURN";
      if (phase === TurnPhase.DRAW) return "BEGIN STRIKE";
      return "ADVANCE";
  }

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Ornate Circle */}
      <div className="absolute inset-0 border-8 border-stone-surface rounded-full shadow-inner bg-stone-border/80">
          <div className="absolute inset-4 border-2 border-stone-surface/50 rounded-full"></div>
      </div>

      {/* Dice */}
      <div className="relative w-full h-full">
        {dice.map((die, index) => (
            <div key={die.id} className="absolute left-1/2 top-1/2 -ml-8 -mt-8 sm:-ml-8 sm:-mt-8 transition-transform duration-500" style={getDiePosition(index)}>
                <Die 
                    die={die} 
                    onClick={() => onDieClick(die.id)} 
                    isRolling={isRolling && !die.isKept && !die.isSpent}
                    isHighlighted={valuableDiceForHover.has(die.id)}
                    isHoveredCardPlayable={isHoveredCardPlayable}
                    isTrayRolling={isRolling}
                    lastActionDetails={lastActionDetails}
                />
            </div>
        ))}
      </div>

      {/* Center Controls */}
      <div className="absolute flex flex-col items-center justify-center gap-1 z-10 text-center">
         <p className="font-cinzel text-stone-surface font-bold text-sm tracking-widest">{phase}</p>
         {isPlayerTurn && phase === TurnPhase.ROLL_SPEND && (
             <>
                <button
                    onClick={handleRoll}
                    disabled={!canRoll || isRolling}
                    className="w-24 h-12 bg-stone-surface text-white text-lg rounded-lg shadow-md hover:bg-stone-surface/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed border-2 border-stone-border font-cinzel tracking-widest"
                >
                    {isRolling ? '...' : 'ROLL'}
                </button>
                <div className="text-stone-surface text-sm font-semibold">Rolls left: {maxRolls - rollCount}</div>
            </>
         )}
         {canAdvance && (
             <button
                onClick={onAdvancePhase}
                className="w-32 h-10 bg-glow-blue text-white text-sm font-bold rounded-lg shadow-md hover:bg-blue-500 transition-colors border-2 border-stone-border font-cinzel tracking-widest mt-2"
              >
                  {getPhaseActionText()}
              </button>
         )}
      </div>
    </div>
  );
};

export default DiceTray;
