

import React, { useState } from 'react';
import { CardInGame, CardType, DiceCost, DiceCostType } from '../game/types';
import KeywordText from './KeywordText';
import Tooltip from './Tooltip';

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
  isAttacking?: boolean;
  isBlocker?: boolean;
  isSelectedAsBlocker?: boolean;
  isPotentialBlocker?: boolean;
  blockingTargetName?: string;
  isPotentialAttacker?: boolean;
}

// Helper function to render dice costs
const renderDiceCost = (costs: DiceCost[]) => {
    if (!costs || costs.length === 0) {
        return <div className="bg-black/40 text-gray-400 px-1.5 py-0.5 rounded-sm flex items-center gap-1 font-mono text-xs">Free</div>;
    }

    const dieFace = (value: number) => ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value] || `[${value}]`;

    return costs.map((cost, index) => {
        let content: React.ReactNode;
        let textContent = '';
        switch (cost.type) {
            case DiceCostType.EXACT_VALUE:
                textContent = `${cost.count}x ${cost.value}`;
                content = <>{Array(cost.count || 1).fill(null).map((_, i) => <span key={i} className="text-lg">{dieFace(cost.value!)}</span>)}</>;
                break;
            case DiceCostType.MIN_VALUE:
                textContent = `Minimum value of ${cost.value}`;
                content = <span className="text-lg">{dieFace(cost.value!)}<span className="font-bold">+</span></span>;
                break;
            case DiceCostType.ANY_PAIR:
                textContent = 'Any Pair';
                content = <span>PAIR</span>;
                break;
            case DiceCostType.TWO_PAIR:
                 textContent = 'Two Pair';
                content = <span>2-PAIR</span>;
                break;
            case DiceCostType.THREE_OF_A_KIND:
                textContent = 'Three of a Kind';
                content = <span>3xKIND</span>;
                break;
            case DiceCostType.FOUR_OF_A_KIND:
                textContent = 'Four of a Kind';
                content = <span>4xKIND</span>;
                break;
            case DiceCostType.FULL_HOUSE:
                textContent = 'Full House';
                content = <span>FULL-H</span>;
                break;
            case DiceCostType.STRAIGHT:
                textContent = `Straight of ${cost.count}`;
                content = <span>STR({cost.count})</span>;
                break;
            case DiceCostType.SUM_OF_X_DICE:
                textContent = `Sum of ${cost.count} dice >= ${cost.value}`;
                content = <span>Σ({cost.count})≥{cost.value}</span>;
                break;
            case DiceCostType.ANY_X_DICE:
                textContent = `${cost.count} of Any Dice`;
                content = <span>ANY({cost.count})</span>;
                break;
            case DiceCostType.ODD_DICE:
                textContent = `${cost.count} Odd Dice`;
                content = <span>ODD({cost.count})</span>;
                break;
            case DiceCostType.EVEN_DICE:
                textContent = `${cost.count} Even Dice`;
                content = <span>EVEN({cost.count})</span>;
                break;
            case DiceCostType.NO_DUPLICATES:
                textContent = `${cost.count} Dice with Unique Values`;
                content = <span>UNIQUE({cost.count})</span>;
                break;
            case DiceCostType.SUM_BETWEEN:
                textContent = `Sum of ${cost.count} dice between ${cost.value} and ${cost.maxValue}`;
                content = <span>Σ({cost.count})∈[{cost.value}-{cost.maxValue}]</span>;
                break;
            case DiceCostType.SPREAD:
                textContent = `One die <= ${cost.lowValue} and one die >= ${cost.highValue}`;
                content = <span className="text-[10px]">SPREAD(≤{cost.lowValue},≥{cost.highValue})</span>;
                break;
            default:
                content = null;
                textContent = 'Unknown Cost';
        }
        return (
             <Tooltip key={index} content={textContent}>
                <div className="bg-black/40 text-neon-pink px-1.5 py-0.5 rounded-sm flex items-center gap-1 font-mono text-xs cursor-help">{content}</div>
            </Tooltip>
        );
    });
};

const CardTypeIcon: React.FC<{ type: CardType, className?: string }> = ({ type, className }) => {
  const icons = {
    [CardType.UNIT]: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
    [CardType.EVENT]: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
      </svg>
    ),
    [CardType.LOCATION]: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M21 9v2h-2V3h-2v2h-2V3h-2v2h-2V3H9v2H7V3H5v8H3V9H1v12h22V9h-2zM7 19H5v-2h2v2zm4 0H9v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
      </svg>
    ),
    [CardType.ARTIFACT]: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2 3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};


const Card: React.FC<CardProps> = ({ 
    card, isPlayable = false, isTargetable = false, inHand = false, onClick, 
    isActivatable = false, onActivate, isChannelable = false, onChannel,
    isAmplifiable = false, onAmplify,
    effectiveStrength, effectiveDurability, origin = 'hand',
    isActivating = false, rallyBonus = 0, onExamine,
    isAttacking = false, isBlocker = false, isSelectedAsBlocker = false, isPotentialBlocker = false, blockingTargetName,
    isPotentialAttacker = false,
}) => {
  const typeColor = {
    [CardType.UNIT]: 'border-unit shadow-unit/30',
    [CardType.EVENT]: 'border-event shadow-event/30',
    [CardType.LOCATION]: 'border-location shadow-location/30',
    [CardType.ARTIFACT]: 'border-artifact shadow-artifact/30',
  }[card.type];
  
  const typeIconColor = {
    [CardType.UNIT]: 'text-unit',
    [CardType.EVENT]: 'text-event',
    [CardType.LOCATION]: 'text-location',
    [CardType.ARTIFACT]: 'text-artifact',
  };

  const originClasses = origin === 'graveyard' ? 'opacity-80 border-dashed border-gray-500' : '';
  const tokenClasses = card.isToken ? 'opacity-95 border-dashed border-neon-cyan' : '';

  const interactiveClasses = (onClick || onExamine) ? "cursor-pointer" : "";
  const targetableClasses = isTargetable ? "ring-4 ring-red-500 shadow-lg shadow-red-500/50 scale-105 z-30" : "";
  const activatingClasses = isActivating ? 'animate-pulse-bright' : '';
  
  const attackingClasses = isAttacking ? "ring-4 ring-red-500 shadow-lg shadow-red-500/50 animate-pulse" : "";
  const blockerClasses = isBlocker ? "ring-4 ring-blue-500 shadow-lg shadow-blue-500/50" : "";
  const selectedBlockerClasses = isSelectedAsBlocker ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 scale-105" : "";
  const potentialBlockerClasses = isPotentialBlocker ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-cyber-bg" : "";
  const potentialAttackerClasses = isPotentialAttacker ? "ring-2 ring-red-400 ring-offset-2 ring-offset-cyber-bg" : "";


  const isActionable = (isPlayable || isActivatable) && !isTargetable;
  const hoverScaleClass = isActionable ? 'hover:scale-105' : '';
  const hoverGlowClasses = isActionable ? 'hover:shadow-neon-cyan hover:ring-4 hover:ring-neon-cyan' : '';
  const playableClasses = isPlayable && !isTargetable && inHand ? 'animate-pulse-playable' : '';

  const isVideo = card.imageUrl?.endsWith('.mp4');
  const cardSizeClasses = inHand && origin !== 'graveyard' ? 'w-40 h-56 md:w-56 md:h-80' : 'w-36 h-48 md:w-48 md:h-64';

  const CardFace = () => (
      <div className={`relative z-10 h-full flex flex-col justify-between p-2 text-xs md:text-sm`}>
        <div className="flex justify-between items-start font-bold">
             <div className="flex-1 min-w-0">
                <span className="truncate pr-2 block">{card.name}</span>
                <div className="flex flex-wrap gap-1 items-center mt-0.5">
                    {renderDiceCost(card.dice_cost)}
                </div>
            </div>
            {card.commandNumber !== undefined && (
              <span className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-cyber-bg/80 rounded-full flex items-center justify-center font-black text-base md:text-lg ${typeColor} text-white`}>
                {card.commandNumber}
              </span>
            )}
        </div>
        <div className="text-[10px] md:text-xs text-neon-yellow/70 my-1 md:my-2 flex-grow p-1 bg-black/30 rounded font-mono">
            <KeywordText text={card.text} />
        </div>
        <div>
            <div className="flex justify-between items-end font-semibold">
                <div className="flex items-center gap-1.5" title={card.type}>
                    <CardTypeIcon type={card.type} className={`w-4 h-4 ${typeIconColor[card.type]}`} />
                    <span className="capitalize text-white">{card.type}</span>
                </div>
                {card.type === CardType.UNIT && (
                <div className="flex items-center space-x-2 font-bold">
                    {/* Strength Display */}
                    <div className={`bg-neon-pink px-2 py-1 rounded flex items-center justify-center text-cyber-bg text-xs md:text-sm space-x-1`}>
                        {(() => {
                            const base = card.strength ?? 0;
                            const effective = effectiveStrength ?? base;
                            const modifier = effective - base;
                            
                            return (
                                <>
                                    <span>{base}</span>
                                    {modifier !== 0 && (
                                        <span className={`font-normal text-[10px] md:text-xs ${modifier > 0 ? 'text-green-800' : 'text-red-800'}`}>
                                            ({modifier > 0 ? '+' : ''}{modifier})
                                        </span>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                    {/* Durability/Health Display */}
                    <div className={`bg-neon-cyan px-2 py-1 rounded flex items-center justify-center text-cyber-bg text-xs md:text-sm space-x-1`}>
                         {(() => {
                            const base = card.durability ?? 1;
                            const effective = effectiveDurability ?? base;
                            const currentHealth = effective - card.damage;
                            
                            let healthColorClass = 'text-cyber-bg';
                            if (card.damage > 0) {
                                healthColorClass = 'text-red-700';
                            } else if (effective > base) {
                                healthColorClass = 'text-green-700';
                            } else if (effective < base) {
                                healthColorClass = 'text-yellow-700';
                            }
                            
                            return (
                                <>
                                    <span className={healthColorClass}>{currentHealth}</span>
                                    <span>/</span>
                                    <span>{effective}</span>
                                </>
                            );
                        })()}
                    </div>
                </div>
                )}
            </div>
            {card.imageUrl && (
                <p className="text-[8px] text-white/40 truncate mt-0.5 font-mono" title={card.imageUrl}>
                    {card.imageUrl.split('/').pop()}
                </p>
            )}
        </div>
      </div>
  );

  return (
    <div className={`relative ${cardSizeClasses}`}>
      <div 
        className={`group absolute inset-0 transition-all duration-200 transform-gpu ${targetableClasses} ${activatingClasses} ${hoverScaleClass} ${attackingClasses} ${blockerClasses} ${selectedBlockerClasses} ${potentialBlockerClasses} ${potentialAttackerClasses}`}
      >
        <div 
            className={`relative w-full h-full rounded-lg border-2 bg-cyber-surface/80 shadow-lg text-white transform transition-all duration-200 ${interactiveClasses} ${typeColor} ${originClasses} ${tokenClasses} ${hoverGlowClasses} ${playableClasses}`}
            onClick={onClick}
        >
            {card.imageUrl ? (
                isVideo ? (
                    <video src={card.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover rounded-lg" />
                )
            ) : (
                <div className="w-full h-full backdrop-blur-sm flex flex-col justify-between">
                    <CardFace />
                </div>
            )}
            
            {card.imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-cyber-surface via-cyber-surface/70 to-transparent rounded-lg flex flex-col justify-between text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <CardFace />
                </div>
            )}
            
            {isBlocker && blockingTargetName && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[90%] bg-blue-800/90 text-white text-[10px] text-center px-2 py-0.5 z-20 rounded-t-md truncate flex items-center" title={`Blocking: ${blockingTargetName}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.002 12.052 12.052 0 0110 18.451 12.052 12.052 0 0117.834 5.002 11.954 11.954 0 0110 1.944zM9 11.75l-2.293-2.293a1 1 0 011.414-1.414L9 9.586l3.879-3.879a1 1 0 111.414 1.414L9 11.75z" clipRule="evenodd" />
                    </svg>
                    <span className="font-bold">BLOCKING:</span>&nbsp;<span className="truncate">{blockingTargetName}</span>
                </div>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onExamine(card); }}
                className="absolute bottom-1 right-1 bg-cyber-primary text-white text-xs font-bold px-2 py-0.5 rounded-full hover:bg-cyber-secondary transition-colors z-20 opacity-0 group-hover:opacity-100"
            >
                Examine
            </button>
            
            {/* Visible Status Icons */}
            <div className="absolute top-1 left-1 flex flex-col space-y-1 z-10">
                {card.strengthModifier < 0 && (
                    <div 
                        className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50" 
                        title={`Corrupted: ${card.strengthModifier} Strength`}>
                        {card.strengthModifier}
                    </div>
                )}
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
                 {card.abilities?.immutable && (
                    <div className="w-6 h-6 bg-purple-700 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/50" title="Immutable">I</div>
                )}
                {card.abilities?.stealth && (
                    <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 font-black text-xs shadow-md border-2 border-white/50" title="Stealth">S</div>
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