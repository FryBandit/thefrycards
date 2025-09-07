import React from 'react';
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
  isEvokeable?: boolean;
  onEvoke?: () => void;
  isAmplifiable?: boolean;
  onAmplify?: () => void;
  effectiveStrength?: number;
  effectiveDurability?: number;
  origin?: 'hand' | 'graveyard';
  isActivating?: boolean;
  rallyBonus?: number;
  synergyBonus?: number;
  onExamine: (card: CardInGame) => void;
  isAttacking?: boolean;
  isBlocker?: boolean;
  isSelectedAsBlocker?: boolean;
  isPotentialBlocker?: boolean;
  blockingTargetName?: string;
  isPotentialAttacker?: boolean;
  isTargetForBlocker?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

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
                textContent = `Requires ${cost.count} dice showing the value ${cost.value}.`;
                content = <>{Array(cost.count || 1).fill(null).map((_, i) => <span key={i} className="text-lg">{dieFace(cost.value!)}</span>)}</>;
                break;
            case DiceCostType.MIN_VALUE:
                textContent = `Requires 1 die with a value of ${cost.value} or higher.`;
                content = <span className="text-lg">{dieFace(cost.value!)}<span className="font-bold">+</span></span>;
                break;
            case DiceCostType.ANY_PAIR:
                textContent = 'Requires any pair of dice with the same value.';
                content = <span>PAIR</span>;
                break;
            case DiceCostType.TWO_PAIR:
                 textContent = 'Requires two different pairs of dice.';
                content = <span>2-PAIR</span>;
                break;
            case DiceCostType.THREE_OF_A_KIND:
                textContent = 'Requires three dice of the same value.';
                content = <span>3xKIND</span>;
                break;
            case DiceCostType.FOUR_OF_A_KIND:
                textContent = 'Requires four dice of the same value.';
                content = <span>4xKIND</span>;
                break;
            case DiceCostType.FULL_HOUSE:
                textContent = 'Requires three dice of one value and two of another.';
                content = <span>FULL-H</span>;
                break;
            case DiceCostType.STRAIGHT:
                textContent = `Requires a straight of ${cost.count} dice (e.g., 2-3-4).`;
                content = <span>STR({cost.count})</span>;
                break;
            case DiceCostType.SUM_OF_X_DICE:
                textContent = `Requires ${cost.count} dice whose values sum to at least ${cost.value}.`;
                content = <span className="text-[11px] tracking-tighter">SUM {cost.count}D ≥ {cost.value}</span>;
                break;
            case DiceCostType.ANY_X_DICE:
                textContent = `Requires any ${cost.count} dice.`;
                content = <span>ANY({cost.count})</span>;
                break;
            case DiceCostType.ODD_DICE:
                textContent = `Requires ${cost.count} dice with odd values.`;
                content = <span>ODD({cost.count})</span>;
                break;
            case DiceCostType.EVEN_DICE:
                textContent = `Requires ${cost.count} dice with even values.`;
                content = <span>EVEN({cost.count})</span>;
                break;
            case DiceCostType.NO_DUPLICATES:
                textContent = `Requires ${cost.count} dice with no duplicate values.`;
                content = <span>UNIQUE({cost.count})</span>;
                break;
            case DiceCostType.SUM_BETWEEN:
                textContent = `Requires ${cost.count} dice whose values sum to between ${cost.value} and ${cost.maxValue}.`;
                content = <span className="text-[11px] tracking-tighter">SUM {cost.count}D: {cost.value}-{cost.maxValue}</span>;
                break;
            case DiceCostType.SPREAD:
                textContent = `Requires one die with a value of ${cost.lowValue} or less, and one die with a value of ${cost.highValue} or more.`;
                content = <span className="text-[10px]">SPREAD(≤{cost.lowValue},≥{cost.highValue})</span>;
                break;
            default:
                content = null;
                textContent = 'Unknown Cost';
        }
        return (
             <Tooltip key={index} content={textContent}>
                <div className="bg-black/40 text-vivid-pink px-1.5 py-0.5 rounded-sm flex items-center gap-1 font-mono text-xs cursor-help">{content}</div>
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
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2 3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

const Card: React.FC<CardProps> = ({ 
    card, isPlayable, isTargetable, inHand, onClick, isActivatable, onActivate,
    isEvokeable, onEvoke, isAmplifiable, onAmplify, effectiveStrength, effectiveDurability,
    origin, isActivating, rallyBonus = 0, synergyBonus = 0, onExamine,
    isAttacking, isBlocker, isSelectedAsBlocker, isPotentialBlocker, blockingTargetName,
    isPotentialAttacker, isTargetForBlocker, onMouseEnter, onMouseLeave
}) => {
    const isUnit = card.type === CardType.UNIT;
    const currentDurability = (effectiveDurability ?? card.durability ?? 1) - card.damage;
    const hasDamage = card.damage > 0;
    const isVideo = card.imageUrl?.endsWith('.mp4');

    const baseClasses = "relative w-40 h-56 sm:w-48 sm:h-64 bg-arcane-surface text-white rounded-lg shadow-lg border-2 transform-gpu transition-all duration-200 group";

    const typeColor = {
        [CardType.UNIT]: 'border-unit',
        [CardType.EVENT]: 'border-event',
        [CardType.LOCATION]: 'border-location',
        [CardType.ARTIFACT]: 'border-artifact',
    }[card.type];

    const typeIconColor = {
        [CardType.UNIT]: 'text-unit',
        [CardType.EVENT]: 'text-event',
        [CardType.LOCATION]: 'text-location',
        [CardType.ARTIFACT]: 'text-artifact',
    };

    let stateClasses = typeColor;

    if (isPlayable) stateClasses += ' cursor-pointer animate-pulse-playable';
    else if (inHand && !isPlayable) stateClasses += ' opacity-70';
    if (isTargetable) stateClasses += ' ring-4 ring-offset-2 ring-offset-arcane-bg ring-vivid-pink shadow-vivid-pink scale-105';
    if (isTargetForBlocker) stateClasses += ' ring-4 ring-offset-2 ring-offset-arcane-bg ring-yellow-400 shadow-yellow-400 scale-105 cursor-pointer';
    if (isPotentialBlocker) stateClasses += ' cursor-pointer hover:ring-4 hover:ring-blue-400 hover:scale-105';
    if (isPotentialAttacker) stateClasses += ' hover:ring-4 hover:ring-red-400 hover:scale-105';
    if (isSelectedAsBlocker) stateClasses += ' ring-4 ring-blue-500 shadow-blue-500 scale-105';
    if (isActivating) stateClasses += ' animate-pulse-bright';

    const renderActionButton = (text: string, action?: () => void, enabled?: boolean, color = 'bg-vivid-yellow', textColor = 'text-arcane-bg') => {
        if (!action || !enabled) return null;
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
            className={`${baseClasses} ${stateClasses}`}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
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
                    <h3 className="font-bold text-sm sm:text-base leading-tight flex-1 pr-1">{card.name}</h3>
                    {isUnit && card.moraleValue !== undefined && (
                        <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-lg ${typeColor} bg-arcane-bg/80 border-2 ${typeColor}`}>
                           {card.moraleValue}
                        </div>
                    )}
                </div>

                {/* Body - Text Box on hover for non-hand cards */}
                {!inHand && (
                     <div className="absolute left-2 right-2 top-12 bottom-12 bg-black/70 backdrop-blur-sm p-2 rounded text-xs font-mono text-vivid-yellow/90 overflow-y-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <KeywordText text={card.text} />
                    </div>
                )}
                
                {/* Footer */}
                <div>
                     {isBlocker && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10 truncate max-w-[90%]">
                            Blocks: {blockingTargetName || '...'}
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                         <div className="flex flex-wrap gap-1 items-center">
                           {origin === 'graveyard' ? (
                                <div className="bg-vivid-yellow text-arcane-bg px-2 py-0.5 rounded-sm font-mono text-xs font-bold">RECLAIM</div>
                            ) : renderDiceCost(card.abilities?.augment ? card.abilities.augment.cost : card.dice_cost)}
                        </div>

                         <button onClick={(e) => { e.stopPropagation(); onExamine(card); }} className="absolute bottom-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-vivid-cyan opacity-50 group-hover:opacity-100" aria-label="Examine Card">
                             ?
                        </button>

                        {isUnit && effectiveStrength !== undefined && effectiveDurability !== undefined ? (
                            <div className="flex items-center space-x-1.5 font-black text-lg sm:text-xl">
                                <div className={`px-2.5 py-1 rounded flex items-center justify-center text-arcane-bg ${card.strengthModifier > 0 ? 'bg-green-400' : card.strengthModifier < 0 ? 'bg-red-500' : 'bg-vivid-pink'}`}>
                                    <span>{effectiveStrength}</span>
                                </div>
                                <div className={`px-2.5 py-1 rounded flex items-center justify-center text-arcane-bg ${hasDamage ? 'bg-orange-400 animate-flash-damage' : 'bg-vivid-cyan'}`}>
                                    <span>{currentDurability}</span>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-1.5" title={card.type}>
                                <CardTypeIcon type={card.type} className={`w-5 h-5 ${typeIconColor[card.type]}`} />
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

export default Card;
