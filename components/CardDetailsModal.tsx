

import React from 'react';
import { CardInGame, CardType } from '../game/types';
import KeywordText from './KeywordText';

interface CardDetailsModalProps {
  card: CardInGame;
  onClose: () => void;
}

const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ card, onClose }) => {
  const isVideo = card.imageUrl?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 font-sans p-4" onClick={onClose}>
      <div className="bg-arcane-surface border-2 border-vivid-cyan rounded-lg shadow-2xl p-6 text-white w-full max-w-4xl flex flex-col md:flex-row gap-6 shadow-vivid-cyan" onClick={e => e.stopPropagation()}>
        {card.imageUrl && (
            isVideo ? (
                <video src={card.imageUrl} autoPlay loop muted playsInline className="w-full md:w-1/3 h-auto object-contain rounded-lg" />
            ) : (
                <img src={card.imageUrl} alt={card.name} className="w-full md:w-1/3 h-auto object-contain rounded-lg" />
            )
        )}
        <div className="flex-grow flex flex-col">
          <h2 className="text-3xl font-bold text-vivid-cyan uppercase tracking-widest">{card.name}</h2>
          <p className="text-lg text-vivid-pink/80">{card.type}{card.rarity && ` - ${card.rarity}`}</p>
          
          <div className="flex-grow bg-black/30 rounded p-3 overflow-y-auto my-4">
            <div className="whitespace-pre-wrap font-mono">
              <KeywordText text={card.text} />
            </div>
            {card.flavor_text && <p className="italic text-vivid-yellow/70 mt-4">"{card.flavor_text}"</p>}
          </div>

          <div className="mt-auto text-xs text-white/50 text-right">
            {card.card_set && <p><strong>Set:</strong> {card.card_set}</p>}
            {card.author && <p><strong>Artist:</strong> {card.author}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailsModal;