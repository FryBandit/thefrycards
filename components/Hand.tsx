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
    isOpponentHand?: boolean;
}

const Hand: React.FC<HandProps> = ({
    player, isCurrentPlayer, onCardClick, isCardPlayable,
    isCardEvokeable, onEvokeClick, isCardAmplifiable, onAmplifyClick, onExamineCard, 
    setHoveredCardInHand, hoveredCardInHand,
    isSpectator = false,
    isOpponentHand = false,
}) => {
    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));

    const getCardStyle = (index: number, total: number, isHovered: boolean): React.CSSProperties => {
        if (total <= 1) return { transform: 'translateX(-50%)', zIndex: isHovered ? 30 : 1 };
    
        const maxAngle = 45;
        const anglePerCard = Math.min(maxAngle / total, 8);
        const baseRotation = (index - (total - 1) / 2) * anglePerCard;
        const ySign = isOpponentHand ? -1 : 1;

        const baseTranslateY = ySign * Math.sin(Math.abs(index - (total - 1) / 2) * (Math.PI / total)) * 50; // Increased fan
        
        const baseSpacing = 100;
        const minSpacing = 50;
        const spacing = Math.max(minSpacing, baseSpacing - total * 8); // Adjusted spacing
        const translateX = (index - (total - 1) / 2) * spacing;

        const rotation = isHovered ? 0 : baseRotation;
        const translateY = isHovered ? (isOpponentHand ? 48 : -48) : baseTranslateY; // 48px is y-12
        const scale = isHovered ? 1.1 : 1;
        const zIndex = isHovered ? 30 : index;
        
        const transform = `translateX(calc(-50% + ${translateX}px)) rotate(${isOpponentHand ? -rotation : rotation}deg) translateY(${translateY}px) scale(${scale})`;

        return {
            transform: transform,
            transformOrigin: isOpponentHand ? 'top center' : 'bottom center',
            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            zIndex: zIndex,
        };
    };

    return (
        <div className={`w-full h-full flex flex-col items-center ${isOpponentHand ? 'justify-start' : 'justify-end'} ${isSpectator ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            {/* Card Area */}
            <div 
                className={`w-full flex ${isOpponentHand ? 'items-start' : 'items-end'} justify-center px-4 relative h-[16rem]`}
                onMouseLeave={() => setHoveredCardInHand(null)}
            >
                 {handCards.length > 0 ? (
                     handCards.map((card, index) => {
                        const canClick = !isSpectator && isCurrentPlayer;
                        const isHovered = hoveredCardInHand?.instanceId === card.instanceId;
                        return (
                         <div 
                            key={card.instanceId} 
                            className={`absolute ${isOpponentHand ? 'top-0' : 'bottom-0'} h-full left-1/2`}
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
                    <div className="w-full text-center text-arcane-primary/60 italic text-lg">{isOpponentHand ? '' : 'Hand is empty.'}</div>
                 )}
            </div>
        </div>
    );
};

export default React.memo(Hand);