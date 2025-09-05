


import React from 'react';
import { CardInGame, CardType } from '../game/types';

interface CardProps {
  card: CardInGame;
  isPlayable?: boolean;
  isTargetable?: boolean;
  inHand?: boolean;
  onClick?: () => void;
  isActivatable?: boolean;
  onActivate?: () => void;
  isChannelable?: boolean;
  onChannel?: () => void;
  isAmplifiable?: boolean;
  onAmplify?: () => void;
  effectiveStrength?: number;
  effectiveDurability?: number;
  origin?: 'hand' | 'graveyard';
}

const Card: React.FC<CardProps> = ({ 
    card, isPlayable = false, isTargetable = false, inHand = false, onClick, 
    isActivatable = false, onActivate, isChannelable = false, onChannel,
    isAmplifiable = false, onAmplify,
    effectiveStrength, effectiveDurability, origin = 'hand' 
}) => {
  const typeColor = {
    [CardType.UNIT]: 'border-unit shadow-unit/30',
    [CardType.EVENT]: 'border-event shadow-event/30',
    [CardType.LOCATION]: 'border-location shadow-location/30',
    [CardType.ARTIFACT]: 'border-artifact shadow-artifact/30',
  }[card.type];

  const originClasses = origin === 'graveyard' ? 'opacity-80 border-dashed border-gray-500' : '';
  const tokenClasses = card.isToken ? 'opacity-95 border-dashed border-neon-cyan' : '';

  const baseClasses = `relative w-40 h-56 bg-cyber-surface/80 backdrop-blur-sm rounded-lg p-2 border-2 flex flex-col justify-between shadow-lg text-white transition-all duration-200 transform ${typeColor} ${originClasses} ${tokenClasses}`;
  const interactiveClasses = onClick ? "cursor-pointer" : "";
  const inHandClasses = inHand ? "hover:-translate-y-2" : "";
  const playableClasses = isPlayable ? "ring-4 ring-neon-cyan shadow-neon-cyan scale-105" : "border-cyber-border";
  const targetableClasses = isTargetable ? "ring-4 ring-red-500 shadow-lg shadow-red-500/50 scale-105 animate-pulse" : "";

  let strengthClasses = 'text-cyber-bg';
  let displayStrength = card.strength ?? 0;
  if (card.type === CardType.UNIT && effectiveStrength !== undefined) {
      displayStrength = effectiveStrength;
      const baseStrength = card.strength ?? 0;
      if (displayStrength > baseStrength) strengthClasses = 'text-green-400';
      else if (displayStrength < baseStrength) strengthClasses = 'text-red-500';
  }

  let durabilityClasses = 'text-cyber-bg';
  let displayDurability = card.durability ?? 0;
  if (card.type === CardType.UNIT && effectiveDurability !== undefined) {
      displayDurability = effectiveDurability;
      const baseDurability = card.durability ?? 0;
      if (displayDurability > baseDurability) durabilityClasses = 'text-green-400';
      else if (displayDurability < baseDurability) durabilityClasses = 'text-red-500';
  }


  return (
    <div className={`${baseClasses} ${interactiveClasses} ${inHandClasses} ${playableClasses} ${targetableClasses}`} onClick={onClick} role={onClick ? "button" : "figure"} aria-label={`${card.name} card`}>
      <div className="flex justify-between items-start text-sm font-bold">
        <span className="truncate pr-2">{card.name}</span>
        <span className={`flex-shrink-0 w-8 h-8 bg-cyber-bg/80 rounded-full flex items-center justify-center font-black text-lg ${typeColor} text-white`}>
          {card.commandNumber}
        </span>
      </div>
      
      <div className="text-xs text-neon-yellow/70 my-2 flex-grow overflow-y-auto p-1 bg-black/30 rounded font-mono">
        {card.text}
      </div>

      <div className="flex justify-between items-end text-sm font-semibold">
        <span className="capitalize text-white">{card.type}</span>
        {card.type === CardType.UNIT && (
          <div className="flex items-center space-x-2 font-bold">
            <div className={`bg-neon-pink px-2 py-1 rounded ${strengthClasses}`}>{displayStrength}</div>
            <div className={`bg-neon-cyan px-2 py-1 rounded ${durabilityClasses}`}>{displayDurability - card.damage}</div>
          </div>
        )}
      </div>
      {((onActivate && !inHand) || (onChannel && inHand) || (onAmplify && inHand)) && (
        <div className="absolute -bottom-3 left-1 right-1 flex justify-center space-x-1">
            {onActivate && !inHand && (
                 <button
                    onClick={(e) => { e.stopPropagation(); onActivate(); }}
                    disabled={!isActivatable}
                    className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isActivatable ? 'bg-neon-pink text-cyber-bg shadow-neon-pink hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    Activate
                </button>
            )}
            {onChannel && inHand && (
                 <button
                    onClick={(e) => { e.stopPropagation(); onChannel(); }}
                    disabled={!isChannelable}
                    className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isChannelable ? 'bg-neon-cyan text-cyber-bg shadow-neon-cyan hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    Channel
                </button>
            )}
            {onAmplify && inHand && (
                 <button
                    onClick={(e) => { e.stopPropagation(); onAmplify?.(); }}
                    disabled={!isAmplifiable}
                    className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isAmplifiable ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    Amplify
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default Card;