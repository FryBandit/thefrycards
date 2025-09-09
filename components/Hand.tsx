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
    hoveredCardInHand: CardInGame | null;
    isSpectator?: boolean;
}

const Hand: React.FC<HandProps> = ({
    player, isCurrentPlayer, onCardClick, isCardPlayable,
    isCardEvokeable, onEvokeClick, isCardAmplifiable, onAmplifyClick, onExamineCard, 
    setHoveredCardInHand, hoveredCardInHand,
    isSpectator = false,
}) => {
    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));

    const getCardStyle = (index: number, total: number, isHovered: boolean): React.CSSProperties => {
        if (total <= 1) return { transform: 'translateX(-50%)', zIndex: isHovered ? 30 : 1 };
    
        // --- Base calculations from original component ---
        const maxAngle = 45;
        const anglePerCard = Math.min(maxAngle / total, 8);
        const baseRotation = (index - (total - 1) / 2) * anglePerCard;
        const baseTranslateY = Math.sin(Math.abs(index - (total - 1) / 2) * (Math.PI / total)) * 30;
        
        const baseSpacing = 120;
        const minSpacing = 60;
        const spacing = Math.max(minSpacing, baseSpacing - total * 10);
        const translateX = (index - (total - 1) / 2) * spacing;

        // --- Determine final values based on hover state, mimicking tailwind classes ---
        const rotation = isHovered ? 0 : baseRotation;
        const translateY = isHovered ? -48 : baseTranslateY; // -48px is -translate-y-12
        const scale = isHovered ? 1.1 : 1;
        const zIndex = isHovered ? 30 : index;
        
        // Replicating original transform order: translateX -> rotate -> translateY, then add scale
        const transform = `translateX(calc(-50% + ${translateX}px)) rotate(${rotation}deg) translateY(${translateY}px) scale(${scale})`;

        return {
            transform: transform,
            transformOrigin: 'bottom center',
            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            zIndex: zIndex,
        };
    };

    return (
        <div className={`w-full h-full flex flex-col items-center justify-end ${isSpectator ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            {/* Card Area */}
            <div 
                className="flex-grow w-full flex items-end justify-center px-4 relative h-[16rem]"
                onMouseLeave={() => setHoveredCardInHand(null)}
            >
                 {handCards.length > 0 ? (
                     handCards.map((card, index) => {
                        const canClick = !isSpectator && isCurrentPlayer;
                        const isHovered = hoveredCardInHand?.instanceId === card.instanceId;
                        return (
                         <div 
                            key={card.instanceId} 
                            className="absolute bottom-0 h-full left-1/2"
                            style={getCardStyle(index, handCards.length, isHovered)}
                            onMouseEnter={() => setHoveredCardInHand(card)}
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

export default React.memo(Hand);
