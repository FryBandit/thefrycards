import React, { useState } from 'react';
import { CardInGame, Player } from '../game/types';
import Card from './Card';

interface HandProps {
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
}

export const Hand: React.FC<HandProps> = ({
    player, isCurrentPlayer, onCardClick, onGraveyardCardClick, isCardPlayable, isCardReclaimable,
    isCardEvokeable, onEvokeClick, isCardAmplifiable, onAmplifyClick, onExamineCard, setHoveredCardInHand
}) => {
    const [view, setView] = useState<'hand' | 'reclaim'>('hand');

    const reclaimableCards = player.graveyard
        .filter(c => c.abilities?.reclaim)
        .map(c => ({ ...c, source: 'graveyard' as const }));

    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));

    const cardsToShow = view === 'hand' ? handCards : reclaimableCards;
    const title = view === 'hand' ? 'Hand' : 'Reclaimable';
    const count = cardsToShow.length;

    return (
        <div className="w-full h-[16rem] bg-arcane-surface/70 backdrop-blur-sm border-t-2 border-arcane-border p-2 flex flex-col">
            <div className="flex justify-center items-center gap-4 mb-2 flex-shrink-0">
                <button 
                    onClick={() => setView('hand')}
                    disabled={view === 'hand'}
                    className={`px-4 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${view === 'hand' ? 'bg-vivid-pink text-arcane-bg' : 'bg-arcane-border hover:bg-arcane-primary'}`}
                >
                    Hand ({handCards.length})
                </button>
                <button 
                    onClick={() => setView('reclaim')}
                    disabled={view === 'reclaim'}
                     className={`px-4 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${view === 'reclaim' ? 'bg-vivid-yellow text-arcane-bg' : 'bg-arcane-border hover:bg-arcane-primary'}`}
                >
                    Reclaim ({reclaimableCards.length})
                </button>
            </div>
            
            <div className="flex-grow overflow-x-auto overflow-y-hidden w-full flex items-center justify-center">
                 {cardsToShow.length > 0 ? (
                    <div className="flex items-end justify-center gap-4 px-4 h-full pb-2">
                        {cardsToShow.map((card, index) => (
                             <div 
                                key={card.instanceId} 
                                className="flex-shrink-0 transition-transform duration-200 hover:-translate-y-4"
                                onMouseEnter={() => setHoveredCardInHand(card)}
                                onMouseLeave={() => setHoveredCardInHand(null)}
                            >
                                <Card
                                    card={card}
                                    inHand={true}
                                    isPlayable={isCurrentPlayer && (view === 'hand' ? isCardPlayable(card) : isCardReclaimable(card))}
                                    onClick={() => view === 'hand' ? onCardClick(card) : onGraveyardCardClick(card)}
                                    onEvoke={view === 'hand' && card.abilities?.evoke ? () => onEvokeClick(card) : undefined}
                                    isEvokeable={view === 'hand' && isCurrentPlayer && isCardEvokeable(card)}
                                    onAmplify={view === 'hand' && card.abilities?.amplify ? () => onAmplifyClick(card) : undefined}
                                    isAmplifiable={view === 'hand' && isCurrentPlayer && isCardAmplifiable(card)}
                                    origin={card.source}
                                    onExamine={onExamineCard}
                                />
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="w-full text-center text-arcane-primary/60 italic text-lg">{title} is empty.</div>
                 )}
            </div>
        </div>
    );
};
