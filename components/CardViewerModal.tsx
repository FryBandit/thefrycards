import React from 'react';
import { CardInGame } from '../game/types';
import Card from './Card';

interface CardViewerModalProps {
  title: string;
  cards: CardInGame[];
  onClose: () => void;
}

const CardViewerModal: React.FC<CardViewerModalProps> = ({ title, cards, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 font-sans p-4" onClick={onClose}>
      <div className="bg-cyber-surface border-2 border-neon-cyan rounded-lg shadow-2xl p-6 text-white w-full max-w-4xl h-[80vh] flex flex-col shadow-neon-cyan" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-neon-cyan uppercase tracking-widest">{title}</h2>
             <button
                onClick={onClose}
                className="bg-cyber-primary px-4 py-2 rounded-lg font-bold text-white hover:bg-cyber-secondary transition-colors uppercase"
            >
                Close
            </button>
        </div>
        <div className="flex-grow overflow-y-auto bg-black/30 rounded p-4">
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cards.map(card => (
                // FIX: Added onExamine prop to satisfy CardProps. The examine feature is disabled in this view.
                <Card key={card.instanceId} card={card} onExamine={() => {}} />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cyber-primary/50 italic text-2xl">
              ZONE EMPTY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardViewerModal;