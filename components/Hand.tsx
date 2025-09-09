
import React from 'react';
import { CardInGame, Player } from '../game/types';
import Card from './Card';

interface HandProps {
    player: Player;
    isCurrentPlayer: boolean;
    onCardClick: (card: CardInGame) => void;
    isCardPlayable: (card: CardInGame) => boolean;
    isCardEvokeable: (card: CardInGame) => boolean;
    onEvokeClick: (card: CardInGame) => void;
    isCardAmplifiable: (card: CardInGame) => boolean;
    onAmplifyClick: (card: CardInGame) => void;
    onExamineCard: (card: CardInGame) => void;
    setHoveredCardInHand: (card: CardInGame | null) => void;
    isSpectator?: boolean;
}

export const Hand: React.FC<HandProps> = ({
    player, isCurrentPlayer, onCardClick, isCardPlayable,
    isCardEvokeable, onEvokeClick, isCardAmplifiable, onAmplifyClick, onExamineCard, setHoveredCardInHand,
    isSpectator = false,
}) => {
    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));

    const getCardStyle = (index: number, total: number): React.CSSProperties => {
        if (total <= 1) return { transform: 'translateX(-50%)' };
        
        const maxAngle = 45;
        const anglePerCard = Math.min(maxAngle / total, 8);
        const rotation = (index - (total - 1) / 2) * anglePerCard;
        
        const translateYArc = Math.sin(Math.abs(index - (total - 1) / 2) * (Math.PI / total)) * 30;

        const baseSpacing = 120; // Spacing for a few cards
        const minSpacing = 60;  // Minimum spacing for a full hand
        const spacing = Math.max(minSpacing, baseSpacing - total * 10);
        const translateX = (index - (total - 1) / 2) * spacing;
        
        return {
            transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotation}deg) translateY(${translateYArc}px)`,
            transformOrigin: 'bottom center',
            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        };
    };

    return (
        <div className={`w-full h-full flex flex-col items-center justify-end ${isSpectator ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            {/* Card Area */}
            <div className="flex-grow w-full flex items-end justify-center px-4 relative h-[16rem]">
                 {handCards.length > 0 ? (
                     handCards.map((card, index) => {
                        const canClick = !isSpectator && isCurrentPlayer;
                        return (
                         <div 
                            key={card.instanceId} 
                            className="absolute bottom-0 h-full hover:z-30 hover:!scale-110 hover:!-translate-y-12 hover:!rotate-0 left-1/2"
                            style={getCardStyle(index, handCards.length)}
                            onMouseEnter={() => setHoveredCardInHand(card)}
                            onMouseLeave={() => setHoveredCardInHand(null)}
                        >
                            <Card
                                card={card}
                                inHand={true}
                                isPlayable={canClick && isCardPlayable(card)}
                                onClick={canClick ? () => onCardClick(card) : undefined}
                                onEvoke={canClick && card.abilities?.evoke ? () => onEvokeClick(card) : undefined}
                                isEvokeable={canClick && isCardEvokeable(card)}
                                onAmplify={canClick && card.abilities?.amplify ? () => onAmplifyClick(card) : undefined}
                                isAmplifiable={canClick && isCardAmplifiable(card)}
                                origin={card.source}
                                onExamine={onExamineCard}
                            />
                        </div>
                    )})
                 ) : (
                    <div className="w-full text-center text-arcane-primary/60 italic text-lg">Hand is empty.</div>
                 )}
            </div>
        </div>
    );
};
