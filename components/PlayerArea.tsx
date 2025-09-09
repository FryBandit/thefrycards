import React from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase, CardType } from '../game/types';
import { getEffectiveStats, cardHasAbility } from '../game/utils';
import { isCardTargetable } from '../hooks/useGameState';
import Card from './Card';


const PlayerArea: React.FC<{ 
    player: Player;
    players: [Player, Player];
    gameState: GameState;
    onCardClick: (card: CardInGame) => void;
    targetingCard: CardInGame | null;
    isCardActivatable: (card: CardInGame) => boolean;
    onActivateCard: (card: CardInGame) => void;
    lastActivatedCardId: string | null;
    lastTriggeredCardId: string | null;
    onExamineCard: (card: CardInGame) => void;
    selectedBlockerId?: string | null;
    blockAssignments?: Map<string, string>;
    setHoveredAttackerId: (id: string | null) => void;
    hoveredAttackerId?: string | null;
    isCurrent: boolean;
}> = ({ player, players, gameState, onCardClick, targetingCard, isCardActivatable, onActivateCard, lastActivatedCardId, lastTriggeredCardId, onExamineCard, selectedBlockerId, blockAssignments, setHoveredAttackerId, hoveredAttackerId, isCurrent }) => {
    
    const { phase, currentPlayerId, combatants, turn } = gameState;
    const backRowCards = [...player.locations, ...player.artifacts];
    const frontRowCards = [...player.units];
    const allCards = [...backRowCards, ...frontRowCards];

    const renderCard = (card: CardInGame) => {
        const sourcePlayer = players[players.findIndex(p => p.id === gameState.currentPlayerId)];
        const targetPlayer = player;
        const cardIsTargetable = targetingCard ? isCardTargetable(targetingCard, card, sourcePlayer, targetPlayer) : false;

        const isStrikePhase = phase === TurnPhase.STRIKE || phase === TurnPhase.BLOCK;
        const { strength: effectiveStrength, durability: effectiveDurability, rallyBonus, synergyBonus } = getEffectiveStats(card, player, { isStrikePhase });
        
        const isAttacking = (phase === TurnPhase.BLOCK || phase === TurnPhase.STRIKE) && combatants?.some(c => c.attackerId === card.instanceId) || false;
        const isBlocker = phase === TurnPhase.BLOCK && blockAssignments?.has(card.instanceId) || false;
        const isSelectedAsBlocker = phase === TurnPhase.BLOCK && selectedBlockerId === card.instanceId;
        
        const isPlayerDefender = phase === TurnPhase.BLOCK && player.id !== currentPlayerId;
        const isPotentialBlocker = isPlayerDefender && card.type === CardType.UNIT && !cardHasAbility(card, 'entrenched') && !isBlocker;
        const isPotentialBlockerForHover = isPotentialBlocker && !!hoveredAttackerId;


        const isPlayerAttackerInStrikePhase = phase === TurnPhase.STRIKE && player.id === currentPlayerId;
        const canAttack = card.turnPlayed < turn || cardHasAbility(card, 'charge');
        const isPotentialAttacker = isPlayerAttackerInStrikePhase && card.type === CardType.UNIT && !cardHasAbility(card, 'entrenched') && canAttack;

        // Is this card an attacker that can be targeted by the currently selected blocker?
        const isTargetForBlocker = isPlayerDefender && isAttacking && !!selectedBlockerId;

        let blockingTargetName: string | undefined;
        if (isBlocker) {
            const attackerId = blockAssignments?.get(card.instanceId);
            const opponent = players.find(p => p.id !== player.id);
            const attackerCard = opponent?.units.find(u => u.instanceId === attackerId);
            blockingTargetName = attackerCard?.name;
        }

        const canBeHoveredForCombatPreview = isAttacking && !!selectedBlockerId;
        
        return (
            <Card 
                key={card.instanceId} 
                card={card}
                displayMode="mini"
                onClick={() => onCardClick(card)}
                isTargetable={cardIsTargetable}
                onActivate={card.abilities?.activate && currentPlayerId === player.id ? () => onActivateCard(card) : undefined}
                isActivatable={currentPlayerId === player.id && isCardActivatable(card)}
                effectiveStrength={effectiveStrength}
                effectiveDurability={effectiveDurability}
                isActivating={lastActivatedCardId === card.instanceId}
                isTriggered={lastTriggeredCardId === card.instanceId}
                rallyBonus={rallyBonus}
                synergyBonus={synergyBonus}
                onExamine={onExamineCard}
                isAttacking={isAttacking}
                isBlocker={isBlocker}
                isSelectedAsBlocker={isSelectedAsBlocker}
                isPotentialBlocker={isPotentialBlocker}
                isPotentialBlockerForHover={isPotentialBlockerForHover}
                blockingTargetName={blockingTargetName}
                isPotentialAttacker={isPotentialAttacker}
                isTargetForBlocker={isTargetForBlocker}
                onMouseEnter={isAttacking ? () => setHoveredAttackerId(card.instanceId) : (canBeHoveredForCombatPreview ? () => setHoveredAttackerId(card.instanceId) : undefined)}
                onMouseLeave={isAttacking ? () => setHoveredAttackerId(null) : (canBeHoveredForCombatPreview ? () => setHoveredAttackerId(null) : undefined)}
            />
        );
    };
    
    return (
        <div className="flex-grow w-full flex flex-col items-center justify-center p-1 min-h-[16rem]">
            {allCards.length > 0 ? (
                 <div className="w-full h-full flex flex-col justify-center items-center gap-y-4">
                    {backRowCards.length > 0 && <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full">
                        {backRowCards.map(renderCard)}
                    </div>}
                    {frontRowCards.length > 0 && <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full">
                        {frontRowCards.map(renderCard)}
                    </div>}
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-surface/60 italic text-lg border-2 border-dashed border-stone-surface/30 rounded-lg">FIELD EMPTY</div>
            )}
        </div>
    );
};
export default React.memo(PlayerArea);