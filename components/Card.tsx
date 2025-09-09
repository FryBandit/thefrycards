
import React from 'react';
import { CardInGame, CardType } from '../game/types';
import KeywordText from './KeywordText';
import { renderDiceCost, CardTypeIcon } from './CardUtils';
import Tooltip from './Tooltip';

interface CardProps {
  card: CardInGame;
  displayMode?: 'full' | 'mini';
  isPlayable?: boolean;
  isTargetable?: boolean;
  inHand?: boolean;
  onClick?: () => void;
  isActivatable?: boolean;
  onActivate?: () => void;
  isEvokeable?: boolean;
  onEvoke?: () => void;
  isAmplifiable?: boolean;
  onAmplify?: () => void;
  effectiveStrength?: number;
  effectiveDurability?: number;
  origin?: 'hand' | 'graveyard';
  isActivating?: boolean;
  isTriggered?: boolean;
  rallyBonus?: number;
  synergyBonus?: number;
  onExamine: (card: CardInGame) => void;
  isAttacking?: boolean;
  isBlocker?: boolean;
  isSelectedAsBlocker?: boolean;
  isPotentialBlocker?: boolean;
  isPotentialBlockerForHover?: boolean;
  blockingTargetName?: string;
  isPotentialAttacker?: boolean;
  isTargetForBlocker?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const StatDisplay: React.FC<{ 
    label: string;
    baseValue: number;
    effectiveValue: number; 
    color: string;
    isDamaged?: boolean;
}> = ({ label, baseValue, effectiveValue, color, isDamaged }) => {
    const finalColor = isDamaged ? 'bg-orange-400' : (effectiveValue > baseValue ? 'bg-green-400' : effectiveValue < baseValue ? 'bg-red-500' : color);
    const icon = effectiveValue > baseValue ? '▲' : effectiveValue < baseValue ? '▼' : null;

    return (
        <div title={label} className={`px-2 py-0.5 rounded flex items-center justify-center text-arcane-bg gap-1 ${finalColor}`}>
            {icon && <span className="font-sans text-xs">{icon}</span>}
            <span>{effectiveValue}</span>
        </div>
    );
};


const Card: React.FC<CardProps> = ({ 
    card, displayMode = 'full', isPlayable, isTargetable, inHand, onClick, isActivatable, onActivate,
    isEvokeable, onEvoke, isAmplifiable, onAmplify, effectiveStrength, effectiveDurability,
    origin, isActivating, isTriggered, rallyBonus = 0, synergyBonus = 0, onExamine,
    isAttacking, isBlocker, isSelectedAsBlocker, isPotentialBlocker, isPotentialBlockerForHover, blockingTargetName,
    isPotentialAttacker, isTargetForBlocker, onMouseEnter, onMouseLeave
}) => {
    const isUnit = card.type === CardType.UNIT;
    const isOnBoard = displayMode === 'mini';
    const currentDurability = (effectiveDurability ?? card.durability ?? 1) - card.damage;
    const hasDamage = card.damage > 0;
    const isVideo = card.imageUrl?.endsWith('.mp4');

    const baseClasses = "relative bg-arcane-surface text-white rounded-lg shadow-lg border-2 transform-gpu transition-all duration-300 group";
    const sizeClasses = isOnBoard ? "w-28 h-40 hover:scale-[1.6] hover:z-20" : "w-40 h-56 sm:w-48 sm:h-64";

    const typeColor = {
        [CardType.UNIT]: 'border-unit',
        [CardType.EVENT]: 'border-event',
        [CardType.LOCATION]: 'border-location',
        [CardType.ARTIFACT]: 'border-artifact',
    }[card.type];

    let stateClasses = typeColor;

    if (isPlayable) stateClasses += ' cursor-pointer animate-pulse-playable';
    else if (inHand && !isPlayable) stateClasses += ' opacity-70';
    if (isTargetable) stateClasses += ' ring-4 ring-offset-2 ring-offset-arcane-bg ring-vivid-pink shadow-vivid-pink scale-105 animate-pulse-target-glow';
    if (isTargetForBlocker) stateClasses += ' ring-4 ring-offset-2 ring-offset-arcane-bg ring-yellow-400 shadow-yellow-400 scale-105 cursor-pointer';
    if (isPotentialBlocker) stateClasses += ' cursor-pointer hover:ring-4 hover:ring-blue-400 hover:scale-105';
    if (isPotentialBlockerForHover) stateClasses += ' ring-4 ring-blue-300 animate-pulse';
    if (isPotentialAttacker) stateClasses += ' hover:ring-4 hover:ring-red-400 hover:scale-105';
    if (isSelectedAsBlocker) stateClasses += ' ring-4 ring-blue-500 shadow-blue-500 scale-105 animate-pulse-selected';
    if (isActivating || isTriggered) stateClasses += ' animate-pulse-bright';

    const renderActionButton = (text: string, action?: () => void, enabled?: boolean, color = 'bg-vivid-yellow', textColor = 'text-arcane-bg') => {
        if (!action || !enabled || isOnBoard) return null;
        return (
            <button
                onClick={(e) => { e.stopPropagation(); action(); }}
                className={`w-full py-1 ${color} ${textColor} text-xs font-bold uppercase rounded-b-md transition-opacity duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={!enabled}
            >
                {text}
            </button>
        );
    };

    return (
        <div 
            className={`${baseClasses} ${sizeClasses} ${stateClasses}`}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
             {isUnit && hasDamage && (
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xs border-2 border-white z-10" title={`Damage: ${card.damage}`}>
                    {card.damage}
                </div>
            )}
            <div className="absolute inset-0 w-full h-full rounded-md overflow-hidden">
                {card.imageUrl && (
                    isVideo ? (
                        <video src={card.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                    )
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            </div>

            <div className="relative h-full flex flex-col p-2 justify-between">
                {/* Header */}
                <div className="flex justify-between items-start text-shadow">
                    <h3 className={`font-bold leading-tight flex-1 pr-1 transition-opacity truncate ${isOnBoard ? 'text-xs opacity-0 group-hover:opacity-100' : 'text-sm sm:text-base'}`}>{card.name}</h3>
                    {isUnit && card.moraleValue !== undefined && (
                        <div className={`flex-shrink-0 rounded-full flex items-center justify-center font-black ${isOnBoard ? 'w-6 h-6 text-sm' : 'w-7 h-7 sm:w-8 sm:h-8 text-lg'} ${typeColor} bg-arcane-bg/80 border-2 ${typeColor}`}>
                           {card.moraleValue}
                        </div>
                    )}
                </div>

                {/* Body - Text Box */}
                <div className={`absolute left-2 right-2 top-10 bottom-12 bg-black/80 backdrop-blur-md p-1 rounded text-xs font-mono text-vivid-yellow/90 overflow-y-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100`}>
                    <KeywordText text={card.text} />
                </div>
                
                {/* Footer */}
                <div>
                     {isBlocker && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10 truncate max-w-[90%]">
                            Blocks: {blockingTargetName || '...'}
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                         <div className={`flex flex-wrap gap-1 items-center transition-opacity ${isOnBoard ? 'opacity-0 group-hover:opacity-100' : ''}`}>
                           {origin === 'graveyard' ? (
                                <div className="flex flex-wrap gap-1 items-center">
                                    <div className="bg-vivid-yellow text-arcane-bg px-2 py-0.5 rounded-sm font-mono text-xs font-bold">RECLAIM</div>
                                    {renderDiceCost(card.abilities?.reclaim?.cost)}
                                </div>
                            ) : renderDiceCost(card.abilities?.augment ? card.abilities.augment.cost : card.dice_cost)}
                        </div>

                         <button onClick={(e) => { e.stopPropagation(); onExamine(card); }} className={`absolute bottom-1 right-1 bg-black/50 rounded-full flex items-center justify-center text-vivid-cyan transition-opacity opacity-0 group-hover:opacity-100 ${isOnBoard ? 'w-5 h-5 text-xs' : 'w-6 h-6'}`} aria-label="Examine Card">
                             ?
                        </button>

                        {isUnit && effectiveStrength !== undefined && effectiveDurability !== undefined ? (
                            <div className={`flex items-center space-x-1 font-black ${isOnBoard ? 'text-base' : 'text-lg sm:text-xl'}`}>
                               <StatDisplay label="Strength" baseValue={card.strength ?? 0} effectiveValue={effectiveStrength} color="bg-vivid-pink" />
                               <StatDisplay label="Durability" baseValue={card.durability ?? 1} effectiveValue={currentDurability} color="bg-vivid-cyan" isDamaged={hasDamage} />
                            </div>
                        ) : (
                             <div className={`flex items-center gap-1.5 transition-opacity ${isOnBoard ? 'opacity-0 group-hover:opacity-100' : ''}`} title={card.type}>
                                <CardTypeIcon type={card.type} className={'w-5 h-5'} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons Overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col z-10">
                {renderActionButton('Evoke', onEvoke, isEvokeable, 'bg-vivid-cyan')}
                {renderActionButton('Amplify', onAmplify, isAmplifiable, 'bg-red-500')}
                {renderActionButton('Activate', onActivate, isActivatable)}
            </div>
            
            {isAttacking && <div className="absolute inset-0 ring-4 ring-red-500 rounded-lg pointer-events-none animate-pulse" />}
        </div>
    );
};

export default React.memo(Card);
