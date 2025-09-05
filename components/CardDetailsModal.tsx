import React from 'react';
import { CardInGame, CardType } from '../game/types';

interface CardDetailsModalProps {
  card: CardInGame;
  onClose: () => void;
}

const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ card, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 font-sans p-4" onClick={onClose}>
      <div className="bg-cyber-surface border-2 border-neon-cyan rounded-lg shadow-2xl p-6 text-white w-full max-w-4xl flex flex-col md:flex-row gap-6 shadow-neon-cyan" onClick={e => e.stopPropagation()}>
        {card.imageUrl && (
            <img src={card.imageUrl} alt={card.name} className="w-full md:w-1/3 h-auto object-contain rounded-lg" />
        )}
        <div className="flex-grow flex flex-col">
          <h2 className="text-3xl font-bold text-neon-cyan uppercase tracking-widest">{card.name}</h2>
          <p className="text-lg text-neon-pink/80">{card.type}{card.rarity && ` - ${card.rarity}`}</p>
          <p className="text-sm font-semibold capitalize text-neon-yellow/90 mb-4">{card.faction && `Faction: ${card.faction}`}</p>
          
          <div className="flex-grow bg-black/30 rounded p-3 overflow-y-auto mb-4">
            <p className="whitespace-pre-wrap font-mono">{card.text}</p>
            {card.flavor_text && <p className="italic text-neon-yellow/70 mt-4">"{card.flavor_text}"</p>}
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
