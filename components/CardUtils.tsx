import React from 'react';
import { CardType, DiceCost, DiceCostType } from '../game/types';
import Tooltip from './Tooltip';

export const renderDiceCost = (costs: DiceCost[]) => {
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

export const CardTypeIcon: React.FC<{ type: CardType, className?: string }> = ({ type, className }) => {
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
