import React from 'react';
import { CardInGame, Player } from '../game/types';
import Card from './Card';

interface HandDisplayModalProps {
  player: Player;
  isCurrentPlayer: boolean;
  onCardClick: (card: CardInGame) => void;
  onGraveyardCardClick: (card: CardInGame) => void;
  isCardPlayable: (card: CardInGame) => boolean;
  isCardReclaimable: (card: CardInGame) => boolean;
  isCardEvokeable: (card: CardInGame) => boolean;
  onEvokeClick: (card: CardInGame) => void;
  isCardAmplifiable: (card: CardInGame) => boolean;
  onAmplifyClick: (card: CardInGame) => void;
  onExamineCard: (card: CardInGame) => void;
  setHoveredCardInHand: (card: CardInGame | null) => void;
  onClose: () => void;
}

export const HandDisplayModal: React.FC<HandDisplayModalProps> = ({
    player, isCurrentPlayer, onCardClick, onGraveyardCardClick, isCardPlayable, isCardReclaimable,
    isCardEvokeable, onEvokeClick, isCardAmplifiable, onAmplifyClick, onExamineCard, setHoveredCardInHand, onClose
}) => {
    const reclaimableCards = player.graveyard
        .filter(c => c.abilities?.reclaim)
        .map(c => ({ ...c, source: 'graveyard' as const }));

    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col p-4 animate-modal-show" onClick={onClose}>
            <div className="w-full max-w-7xl mx-auto flex flex-col h-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-3xl font-bold text-vivid-cyan uppercase tracking-widest">Your Hand & Reclaimable Cards</h2>
                    <button onClick={onClose} className="bg-arcane-border px-4 py-2 rounded-lg font-bold text-white hover:bg-arcane-primary transition-all uppercase border-2 border-arcane-border">Close</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-arcane-surface/50 rounded-lg space-y-8">
                    {/* Hand Section */}
                    <div>
                        <h3 className="text-xl font-bold text-vivid-pink mb-4 border-b-2 border-vivid-pink/30 pb-2">In Hand ({handCards.length})</h3>
                        {handCards.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-10">
                                {handCards.map((card) => (
                                    <div 
                                        key={card.instanceId} 
                                        className="flex-shrink-0" 
                                        onMouseEnter={() => setHoveredCardInHand(card)}
                                        onMouseLeave={() => setHoveredCardInHand(null)}
                                    >
                                        <Card
                                            card={card}
                                            inHand={true}
                                            isPlayable={isCurrentPlayer && isCardPlayable(card)}
                                            onClick={() => onCardClick(card)}
                                            onEvoke={card.abilities?.evoke ? () => onEvokeClick(card) : undefined}
                                            isEvokeable={isCurrentPlayer && isCardEvokeable(card)}
                                            onAmplify={card.abilities?.amplify ? () => onAmplifyClick(card) : undefined}
                                            isAmplifiable={isCurrentPlayer && isCardAmplifiable(card)}
                                            origin={card.source}
                                            onExamine={onExamineCard}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full text-center text-arcane-primary/60 italic text-lg">Hand is empty.</div>
                        )}
                    </div>
                    
                    {/* Graveyard/Reclaim Section */}
                    <div>
                        <h3 className="text-xl font-bold text-vivid-yellow mb-4 border-b-2 border-vivid-yellow/30 pb-2">Reclaimable ({reclaimableCards.length})</h3>
                        {reclaimableCards.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-10">
                                {reclaimableCards.map((card) => (
                                     <div key={card.instanceId} className="flex-shrink-0">
                                        <Card
                                            card={card}
                                            inHand={true} // Use inHand styling for better visibility/size
                                            isPlayable={isCurrentPlayer && isCardReclaimable(card)}
                                            onClick={() => onGraveyardCardClick(card)}
                                            origin={card.source}
                                            onExamine={onExamineCard}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="w-full text-center text-arcane-primary/60 italic text-lg">No reclaimable cards in graveyard.</div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
