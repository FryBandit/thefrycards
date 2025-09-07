import React from 'react';
import { CardInGame, CardType } from '../game/types';
import KeywordText from './KeywordText';
import { renderDiceCost, CardTypeIcon } from './CardUtils';

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
        className={`relative w-full h-full rounded-xl border-4 bg-arcane-surface shadow-2xl text-white ${typeColor} shadow-black/50`}
      >
        {card.imageUrl ? (
          isVideo ? (
            <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-lg" />
          ) : (
            <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
          )
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-arcane-surface via-arcane-surface/80 to-transparent rounded-lg flex flex-col justify-between text-white p-3">
          {/* Card Face Content */}
          <div className="h-full flex flex-col justify-between text-sm">
            <div className="flex justify-between items-start font-bold">
              <div className="flex-1 min-w-0">
                <span className="truncate pr-2 block text-lg">{card.name}</span>
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  {renderDiceCost(card.dice_cost)}
                </div>
              </div>
              {card.moraleValue !== undefined && (
                <span className={`flex-shrink-0 w-9 h-9 bg-arcane-bg/80 rounded-full flex items-center justify-center font-black text-xl ${typeColor} text-white`}>
                  {card.moraleValue}
                </span>
              )}
            </div>

            <div className="text-xs text-vivid-yellow/80 my-2 flex-grow p-2 bg-black/40 rounded font-mono overflow-y-auto">
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
                    <div className={`bg-vivid-pink px-2.5 py-1.5 rounded flex items-center justify-center text-arcane-bg text-base`}>
                      <span>{card.strength ?? 0}</span>
                    </div>
                    <div className={`bg-vivid-cyan px-2.5 py-1.5 rounded flex items-center justify-center text-arcane-bg text-base`}>
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