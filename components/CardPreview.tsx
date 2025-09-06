import React from 'react';
import { CardInGame, CardType, DiceCost, DiceCostType } from '../game/types';
import KeywordText from './KeywordText';
import Tooltip from './Tooltip';

// Copied from Card.tsx
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
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2 3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};
// End copied code

interface CardPreviewProps {
  card: CardInGame | null;
}

const CardPreview: React.FC<CardPreviewProps> = ({ card }) => {
  if (!card) return null;

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

  const isVideo = card.imageUrl?.endsWith('.mp4');

  return (
    <div className="fixed top-1/2 -translate-y-1/2 left-4 w-72 h-[26rem] z-40 pointer-events-none animate-fade-in-left">
      <div
        className={`relative w-full h-full rounded-xl border-4 bg-cyber-surface shadow-2xl text-white ${typeColor} shadow-black/50`}
      >
        {card.imageUrl ? (
          isVideo ? (
            <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-lg" />
          ) : (
            <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
          )
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-cyber-surface via-cyber-surface/80 to-transparent rounded-lg flex flex-col justify-between text-white p-3">
          {/* Card Face Content */}
          <div className="h-full flex flex-col justify-between text-sm">
            <div className="flex justify-between items-start font-bold">
              <div className="flex-1 min-w-0">
                <span className="truncate pr-2 block text-lg">{card.name}</span>
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  {renderDiceCost(card.dice_cost)}
                </div>
              </div>
              {card.commandNumber !== undefined && (
                <span className={`flex-shrink-0 w-9 h-9 bg-cyber-bg/80 rounded-full flex items-center justify-center font-black text-xl ${typeColor} text-white`}>
                  {card.commandNumber}
                </span>
              )}
            </div>

            <div className="text-xs text-neon-yellow/80 my-2 flex-grow p-2 bg-black/40 rounded font-mono overflow-y-auto">
              <KeywordText text={card.text} />
            </div>

            <div>
              <div className="flex justify-between items-end font-semibold">
                <div className="flex items-center gap-1.5" title={card.type}>
                  <CardTypeIcon type={card.type} className={`w-5 h-5 ${typeIconColor[card.type]}`} />
                  <span className="capitalize text-white text-base">{card.type}</span>
                </div>
                {card.type === CardType.UNIT && (
                  <div className="flex items-center space-x-2 font-bold">
                    <div className={`bg-neon-pink px-2.5 py-1.5 rounded flex items-center justify-center text-cyber-bg text-base`}>
                      <span>{card.strength ?? 0}</span>
                    </div>
                    <div className={`bg-neon-cyan px-2.5 py-1.5 rounded flex items-center justify-center text-cyber-bg text-base`}>
                      <span>{card.durability ?? 1}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;
