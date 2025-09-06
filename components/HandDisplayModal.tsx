
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
    const reclaimableCards = player.graveyard.filter(isCardReclaimable).map(c => ({ ...c, source: 'graveyard' as const }));
    const allPlayableCards = [...player.hand.map(c => ({ ...c, source: 'hand' as const })), ...reclaimableCards];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col p-4 animate-modal-show" onClick={onClose}>
            <div className="w-full max-w-7xl mx-auto flex flex-col h-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-3xl font-bold text-vivid-cyan uppercase tracking-widest">Your Hand & Reclaimable Cards</h2>
                    <button onClick={onClose} className="bg-arcane-border px-4 py-2 rounded-lg font-bold text-white hover:bg-arcane-primary transition-all uppercase border-2 border-arcane-border">Close</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-arcane-surface/50 rounded-lg">
                    {allPlayableCards.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-10">
                             {allPlayableCards.map((card) => {
                                const isPlayableFromSource = card.source === 'hand' ? isCardPlayable(card) : isCardReclaimable(card);
                                const clickHandler = card.source === 'hand' ? onCardClick : onGraveyardCardClick;

                                return (
                                    <div 
                                        key={card.instanceId} 
                                        className="flex-shrink-0" 
                                        onMouseEnter={() => card.source === 'hand' && setHoveredCardInHand(card)}
                                        onMouseLeave={() => setHoveredCardInHand(null)}
                                    >
                                        <Card
                                            card={card}
                                            inHand={true}
                                            isPlayable={isCurrentPlayer && isPlayableFromSource}
                                            onClick={() => clickHandler(card)}
                                            onChannel={card.abilities?.evoke && card.source === 'hand' && isCurrentPlayer ? () => onEvokeClick(card) : undefined}
                                            isChannelable={isCurrentPlayer && isCardEvokeable(card)}
                                            onAmplify={card.abilities?.amplify && card.source === 'hand' && isCurrentPlayer ? () => onAmplifyClick(card) : undefined}
                                            isAmplifiable={isCurrentPlayer && isCardAmplifiable(card)}
                                            origin={card.source}
                                            onExamine={onExamineCard}
                                        />
                                    </div>
                                )
                             })}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-arcane-primary/60 italic text-2xl">
                            YOUR HAND IS EMPTY
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
