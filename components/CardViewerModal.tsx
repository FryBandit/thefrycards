import React from 'react';
import { CardInGame } from '../game/types';
import Card from './Card';

interface CardViewerModalProps {
  title: string;
  cards: CardInGame[];
  onClose: () => void;
  onExamine: (card: CardInGame) => void;
  isCardReclaimable?: (card: CardInGame) => boolean;
  onCardClick?: (card: CardInGame) => void;
}

const CardViewerModal: React.FC<CardViewerModalProps> = ({ title, cards, onClose, onExamine, isCardReclaimable, onCardClick }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 font-sans p-4" onClick={onClose}>
      <div className="bg-arcane-surface border-2 border-vivid-cyan rounded-lg shadow-2xl p-6 text-white w-full max-w-4xl h-[80vh] flex flex-col shadow-vivid-cyan" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-vivid-cyan uppercase tracking-widest">{title}</h2>
             <button
                onClick={onClose}
                className="bg-arcane-border px-4 py-2 rounded-lg font-bold text-white hover:bg-arcane-primary transition-all uppercase border-2 border-arcane-border"
            >
                Close
            </button>
        </div>
        <div className="flex-grow overflow-y-auto bg-black/30 rounded p-4">
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cards.map(card => {
                const canReclaim = isCardReclaimable ? isCardReclaimable(card) : false;
                const canClick = canReclaim && onCardClick;
                return (
                  <Card 
                    key={card.instanceId} 
                    card={card} 
                    onExamine={onExamine}
                    isPlayable={canReclaim}
                    onClick={canClick ? () => onCardClick(card) : undefined}
                    origin={card.abilities?.reclaim ? 'graveyard' : undefined}
                  />
                )
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-arcane-primary/50 italic text-2xl">
              ZONE EMPTY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardViewerModal;