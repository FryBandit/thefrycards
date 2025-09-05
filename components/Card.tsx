

import React, { useState } from 'react';
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
  isActivating?: boolean;
  rallyBonus?: number;
  onExamine: (card: CardInGame) => void;
}

const Card: React.FC<CardProps> = ({ 
    card, isPlayable = false, isTargetable = false, inHand = false, onClick, 
    isActivatable = false, onActivate, isChannelable = false, onChannel,
    isAmplifiable = false, onAmplify,
    effectiveStrength, effectiveDurability, origin = 'hand',
    isActivating = false, rallyBonus = 0, onExamine
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const typeColor = {
    [CardType.UNIT]: 'border-unit shadow-unit/30',
    [CardType.EVENT]: 'border-event shadow-event/30',
    [CardType.LOCATION]: 'border-location shadow-location/30',
    [CardType.ARTIFACT]: 'border-artifact shadow-artifact/30',
  }[card.type];

  const originClasses = origin === 'graveyard' ? 'opacity-80 border-dashed border-gray-500' : '';
  const tokenClasses = card.isToken ? 'opacity-95 border-dashed border-neon-cyan' : '';

  const interactiveClasses = onClick ? "cursor-pointer" : "";
  const targetableClasses = isTargetable ? "ring-4 ring-red-500 shadow-lg shadow-red-500/50 scale-105 animate-pulse z-30" : "";
  const activatingClasses = isActivating ? 'animate-pulse-bright' : '';
  
  const isActionable = (isPlayable || isActivatable) && !isTargetable;
  const hoverScaleClass = isActionable ? 'hover:scale-105' : '';
  const hoverGlowClasses = isActionable ? 'hover:shadow-neon-cyan hover:ring-4 hover:ring-neon-cyan' : '';

  let strengthClasses = 'text-cyber-bg';
  let displayStrength = card.strength ?? 0;
  if (card.type === CardType.UNIT && effectiveStrength !== undefined) {
      displayStrength = effectiveStrength;
      const baseStrength = (card.strength ?? 0) + card.strengthModifier;
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
  
  const OldCardFace = () => (
      <div className={`relative z-10 h-full flex flex-col justify-between p-2`}>
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
      </div>
  );

  return (
    <div className="relative w-40 h-56">
      <div 
        className={`absolute inset-0 transition-all duration-200 transform-gpu ${targetableClasses} ${activatingClasses} ${hoverScaleClass}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
            className={`relative w-full h-full rounded-lg border-2 bg-cyber-surface/80 shadow-lg text-white transform transition-all duration-200 ${interactiveClasses} ${typeColor} ${originClasses} ${tokenClasses} ${hoverGlowClasses}`}
            onClick={onClick}
        >
            {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
                <div className="w-full h-full backdrop-blur-sm flex flex-col justify-between">
                    <OldCardFace />
                </div>
            )}

            {isHovered && card.imageUrl && (
                 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex flex-col justify-between text-white p-2">
                    <OldCardFace/>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExamine(card); }}
                        className="absolute bottom-1 right-1 bg-cyber-primary text-white text-xs font-bold px-2 py-0.5 rounded-full hover:bg-cyber-secondary transition-colors"
                    >
                        Examine
                    </button>
                 </div>
            )}
            
            {/* Visible Status Icons */}
            <div className="absolute top-1 left-1 flex flex-col space-y-1 z-10">
                {card.abilities?.shield && (
                    <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50
                            ${card.shieldUsedThisTurn ? 'bg-gray-600 opacity-70' : 'bg-blue-500'}`}
                        title={card.shieldUsedThisTurn ? 'Shield Used' : 'Shield Active'}
                    >S</div>
                )}
                {card.abilities?.entrenched && (
                    <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50" title="Entrenched">E</div>
                )}
            </div>
            {(rallyBonus > 0 || card.counters !== undefined) && (
                <div className="absolute top-1 right-1 flex flex-col space-y-1 items-end z-10">
                    {rallyBonus > 0 && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50" title={`+${rallyBonus} from Rally`}>+{rallyBonus}</div>
                    )}
                    {card.counters !== undefined && (
                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50" title={`Counters: ${card.counters}`}>{card.counters}</div>
                    )}
                </div>
            )}
        </div>
      </div>
      
      {/* Action buttons remain visible for gameplay clarity */}
      {((onActivate && !inHand) || (onChannel && inHand) || (onAmplify && inHand)) && (
        <div className="absolute -bottom-4 left-0 right-0 flex justify-center space-x-1 z-20">
            {onActivate && !inHand && (
                 <button onClick={(e) => { e.stopPropagation(); onActivate(); }} disabled={!isActivatable} className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isActivatable ? 'bg-neon-pink text-cyber-bg shadow-neon-pink hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>Activate</button>
            )}
            {onChannel && inHand && (
                 <button onClick={(e) => { e.stopPropagation(); onChannel(); }} disabled={!isChannelable} className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isChannelable ? 'bg-neon-cyan text-cyber-bg shadow-neon-cyan hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>Channel</button>
            )}
            {onAmplify && inHand && (
                 <button onClick={(e) => { e.stopPropagation(); onAmplify?.(); }} disabled={!isAmplifiable} className={`px-3 py-0.5 text-xs font-bold rounded-full transition-all uppercase tracking-wider ${isAmplifiable ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>Amplify</button>
            )}
        </div>
      )}
    </div>
  );
};

export default Card;