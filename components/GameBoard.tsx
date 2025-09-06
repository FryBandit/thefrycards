


import React, { useMemo, useState } from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase, CardType, DiceCost, Die, DiceCostType } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { isCardTargetable, checkDiceCost } from '../hooks/useGameState';
import DiceTray from './DiceTray';
import Card from './Card';
import CardPreview from './CardPreview';
import CombatPreviewTooltip from './CombatPreviewTooltip';

// Helper function (copied from ai.ts) to determine which dice are useful for a given cost.
// MOVED TO game/utils.ts


// New sub-component for cards on the field
const FieldArea: React.FC<{ 
    player: Player;
    players: [Player, Player];
    gameState: GameState;
    isOpponent: boolean;
    onCardClick: (card: CardInGame) => void;
    targetingCard: CardInGame | null;
    isCardActivatable: (card: CardInGame) => boolean;
    onActivateCard: (card: CardInGame) => void;
    lastActivatedCardId: string | null;
    onExamineCard: (card: CardInGame) => void;
    selectedBlockerId?: string | null;
    blockAssignments?: Map<string, string>;
    setHoveredAttackerId: (id: string | null) => void;
}> = ({ player, players, gameState, isOpponent, onCardClick, targetingCard, isCardActivatable, onActivateCard, lastActivatedCardId, onExamineCard, selectedBlockerId, blockAssignments, setHoveredAttackerId }) => {
    
    const { phase, currentPlayerId, combatants } = gameState;
    const backRowCards = [...player.locations, ...player.artifacts];
    const frontRowCards = [...player.units];
    const allCards = [...backRowCards, ...frontRowCards];

    const renderCard = (card: CardInGame) => {
        const sourcePlayer = players[currentPlayerId];
        const targetPlayer = player;
        const cardIsTargetable = targetingCard ? isCardTargetable(targetingCard, card, sourcePlayer, targetPlayer) : false;

        const isAssaultPhase = phase === TurnPhase.ASSAULT || phase === TurnPhase.BLOCK;
        const { strength: effectiveStrength, durability: effectiveDurability, rallyBonus } = getEffectiveStats(card, player, { isAssaultPhase });
        
        // Combat states
        const isAttacking = (phase === TurnPhase.BLOCK || phase === TurnPhase.ASSAULT) && combatants?.some(c => c.attackerId === card.instanceId) || false;
        const isBlocker = phase === TurnPhase.BLOCK && blockAssignments?.has(card.instanceId) || false;
        const isSelectedAsBlocker = phase === TurnPhase.BLOCK && selectedBlockerId === card.instanceId;
        
        const isPlayerDefender = phase === TurnPhase.BLOCK && currentPlayerId === 1; // AI is attacking, Player is defending
        const isPotentialBlocker = isPlayerDefender && player.id === 0 && card.type === CardType.UNIT && !card.abilities?.entrenched && !isBlocker;

        const isPlayerAttackerInAssaultPhase = phase === TurnPhase.ASSAULT && currentPlayerId === 0;
        const isPotentialAttacker = isPlayerAttackerInAssaultPhase && player.id === 0 && card.type === CardType.UNIT && !card.abilities?.entrenched;

        let blockingTargetName: string | undefined;
        if (isBlocker) {
            const attackerId = blockAssignments?.get(card.instanceId);
            const attackerCard = players[1 - player.id].units.find(u => u.instanceId === attackerId);
            blockingTargetName = attackerCard?.name;
        }

        const canBeHoveredForCombatPreview = isOpponent && isAttacking && selectedBlockerId;
        
        return (
            <Card 
                key={card.instanceId} 
                card={card} 
                onClick={() => onCardClick(card)}
                isTargetable={cardIsTargetable}
                onActivate={card.abilities?.activate && currentPlayerId === player.id ? () => onActivateCard(card) : undefined}
                isActivatable={currentPlayerId === player.id && isCardActivatable(card)}
                effectiveStrength={effectiveStrength}
                effectiveDurability={effectiveDurability}
                isActivating={lastActivatedCardId === card.instanceId}
                rallyBonus={rallyBonus}
                onExamine={onExamineCard}
                isAttacking={isAttacking}
                isBlocker={isBlocker}
                isSelectedAsBlocker={isSelectedAsBlocker}
                isPotentialBlocker={isPotentialBlocker}
                blockingTargetName={blockingTargetName}
                isPotentialAttacker={isPotentialAttacker}
                onMouseEnter={canBeHoveredForCombatPreview ? () => setHoveredAttackerId(card.instanceId) : undefined}
                onMouseLeave={canBeHoveredForCombatPreview ? () => setHoveredAttackerId(null) : undefined}
            />
        );
    };
    
    return (
        <div className="flex-grow w-full flex flex-col items-center justify-center p-2 min-h-[14rem] md:min-h-[18rem] bg-[radial-gradient(ellipse_at_center,_rgba(26,9,58,0.3)_0%,_rgba(13,2,33,0)_60%)]">
            {allCards.length > 0 ? (
                 <div className="w-full h-full flex flex-col justify-center items-center gap-y-2">
                    {/* Back Row (Locations & Artifacts) */}
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full flex-1 min-h-0">
                        {backRowCards.map(renderCard)}
                    </div>
                    {/* Separator */}
                    {frontRowCards.length > 0 && backRowCards.length > 0 && (
                        <div className="w-3/4 h-px bg-gradient-to-r from-cyber-bg via-neon-cyan to-cyber-bg my-1"></div>
                    )}
                    {/* Front Row (Units) */}
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full flex-1 min-h-0">
                        {frontRowCards.map(renderCard)}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-cyber-primary/50 italic text-lg">FIELD EMPTY</div>
            )}
        </div>
    );
};


// New sub-component for cards in hand
const HandArea: React.FC<{
    player: Player,
    isOpponent: boolean,
    onCardClick: (card: CardInGame) => void;
    onGraveyardCardClick: (card: CardInGame) => void;
    isCardPlayable: (card: CardInGame) => boolean;
    isCardScavengeable: (card: CardInGame) => boolean;
    isCardChannelable: (card: CardInGame) => boolean;
    onChannelClick: (card: CardInGame) => void;
    isCardAmplifiable: (card: CardInGame) => boolean;
    onAmplifyClick: (card: CardInGame) => void;
    isCurrentPlayer: boolean;
    onExamineCard: (card: CardInGame) => void;
    setHoveredCardInHand: (card: CardInGame | null) => void;
}> = ({ 
    player, isOpponent, onCardClick, onGraveyardCardClick, isCardPlayable, isCardScavengeable, 
    isCardChannelable, onChannelClick, isCardAmplifiable, onAmplifyClick, isCurrentPlayer, onExamineCard,
    setHoveredCardInHand
}) => {
    if (isOpponent) {
        const numCards = player.hand.length;
        return (
             <div className="h-24 md:h-32 flex-shrink-0 w-full flex justify-center items-start pt-4 relative">
                {numCards > 0 && 
                    <div className="flex justify-center items-start -space-x-24 md:-space-x-32">
                         {player.hand.map((card, i) => {
                            const rotation = (i - (numCards - 1) / 2) * 5;
                            
                            return (
                                <div 
                                    key={card.instanceId} 
                                    className="transition-all duration-300 ease-in-out origin-top" 
                                    style={{ transform: `rotate(${rotation}deg)`}}
                                >
                                    <div className="w-32 h-44 md:w-48 md:h-64 bg-gradient-to-b from-cyber-border to-cyber-bg rounded-lg border-2 border-cyber-border shadow-xl flex items-center justify-center">
                                        <span className="text-xl md:text-2xl font-black text-neon-pink/50">CARD</span>
                                    </div>
                                </div>
                            )
                         })}
                    </div>
                }
                {player.hand.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-cyber-bg/80 text-neon-yellow font-black text-2xl md:text-3xl rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border-4 border-neon-yellow pointer-events-none shadow-lg shadow-neon-yellow/50">
                        {player.hand.length}
                    </div>
                )}
            </div>
        );
    }
    
    // Player's Fanned Hand
    const handCards = player.hand.map(c => ({ ...c, source: 'hand' as const }));
    const scavengeableCards = player.graveyard.filter(isCardScavengeable).map(c => ({ ...c, source: 'graveyard' as const }));
    const allPlayableCards = [...scavengeableCards, ...handCards];
    
    const numCards = allPlayableCards.length;
    let overlapClass = '-space-x-28 md:-space-x-40'; // default for <= 5 cards
    if (numCards === 6) overlapClass = '-space-x-32 md:-space-x-44';
    if (numCards === 7) overlapClass = '-space-x-36 md:-space-x-48';
    if (numCards >= 8) overlapClass = '-space-x-40 md:-space-x-52';


    return (
        <div className="h-60 md:h-80 flex-shrink-0 flex justify-center items-end pb-4 md:pb-12">
            <div className={`flex justify-center items-end h-full transition-all duration-300 ${overlapClass}`}>
                 {allPlayableCards.map((card, i) => {
                    const rotation = (i - (numCards - 1) / 2) * 5;
                    
                    const isPlayableFromSource = card.source === 'hand' ? isCardPlayable(card) : isCardScavengeable(card);
                    const clickHandler = card.source === 'hand' ? onCardClick : onGraveyardCardClick;

                    return (
                        <div 
                            key={card.instanceId} 
                            className="transition-all duration-300 ease-in-out hover:-translate-y-16 md:hover:-translate-y-24 hover:scale-110 hover:z-40 origin-bottom hover:!rotate-0" 
                            style={{ transform: `rotate(${rotation}deg)`}}
                            onMouseEnter={() => card.source === 'hand' && setHoveredCardInHand(card)}
                            onMouseLeave={() => setHoveredCardInHand(null)}
                        >
                            <Card
                                card={card}
                                inHand={true}
                                isPlayable={isCurrentPlayer && isPlayableFromSource}
                                onClick={() => clickHandler(card)}
                                onChannel={card.abilities?.channel && card.source === 'hand' && isCurrentPlayer ? () => onChannelClick(card) : undefined}
                                isChannelable={isCurrentPlayer && isCardChannelable(card)}
                                onAmplify={card.abilities?.amplify && card.source === 'hand' && isCurrentPlayer ? () => onAmplifyClick(card) : undefined}
                                isAmplifiable={isCurrentPlayer && isCardAmplifiable(card)}
                                origin={card.source}
                                onExamine={onExamineCard}
                            />
                        </div>
                    )
                 })}
            </div>
        </div>
    );
};


interface GameBoardProps {
  gameState: GameState;
  onDieClick: (id: number) => void;
  onRoll: () => void;
  onHandCardClick: (card: CardInGame) => void;
  onGraveyardCardClick: (card: CardInGame) => void;
  onBoardCardClick: (card: CardInGame) => void;
  isCardPlayable: (card: CardInGame) => boolean;
  isCardScavengeable: (card: CardInGame) => boolean;
  isCardChannelable: (card: CardInGame) => boolean;
  onChannelClick: (card: CardInGame) => void;
  isCardAmplifiable: (card: CardInGame) => boolean;
  onAmplifyClick: (card: CardInGame) => void;
  onAdvancePhase: (assault?: boolean) => void;
  targetingCard: CardInGame | null;
  isCardActivatable: (card: CardInGame) => boolean;
  onActivateCard: (card: CardInGame) => void;
  lastActivatedCardId: string | null;
  onExamineCard: (card: CardInGame) => void;
  hoveredCardInHand: CardInGame | null;
  setHoveredCardInHand: (card: CardInGame | null) => void;
  onMulligan: (mulligan: boolean) => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  onConfirmBlocks: () => void;
  selectedBlockerId: string | null;
  blockAssignments: Map<string, string>;
  isOpponentDrawing: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, onDieClick, onRoll, onHandCardClick, onGraveyardCardClick, onBoardCardClick, 
    isCardPlayable, isCardScavengeable, isCardChannelable, onChannelClick,
    isCardAmplifiable, onAmplifyClick,
    onAdvancePhase, targetingCard, isCardActivatable, onActivateCard,
    lastActivatedCardId, onExamineCard, hoveredCardInHand, setHoveredCardInHand,
    onMulligan, showConfirmation, onConfirmBlocks, selectedBlockerId, blockAssignments,
    isOpponentDrawing,
}) => {
  const { players, currentPlayerId, phase, dice, rollCount, turn, maxRolls } = gameState;
  const player = players[0];
  const opponent = players[1];

  const isPlayerTurn = currentPlayerId === 0;

  const [hoveredAttackerId, setHoveredAttackerId] = useState<string | null>(null);

  const isHoveredCardPlayable = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn) return true; // Default to true to not show red when no card is hovered
    return isCardPlayable(hoveredCardInHand);
  }, [hoveredCardInHand, isPlayerTurn, isCardPlayable]);

  const valuableDiceForHover = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn) return new Set<number>();
    const result = checkDiceCost(hoveredCardInHand, gameState.dice);
    return new Set(result.diceToSpend.map(d => d.id));
  }, [hoveredCardInHand, gameState.dice, isPlayerTurn]);
  
  const combatPreviewData = useMemo(() => {
    if (phase === TurnPhase.BLOCK && selectedBlockerId && hoveredAttackerId) {
        const blocker = player.units.find(u => u.instanceId === selectedBlockerId);
        const attacker = opponent.units.find(u => u.instanceId === hoveredAttackerId);
        if (blocker && attacker) {
            return { blocker, attacker };
        }
    }
    return null;
  }, [phase, selectedBlockerId, hoveredAttackerId, player.units, opponent.units]);


  const getPhaseAction = () => {
    if (targetingCard) return { text: "CANCEL", action: () => onBoardCardClick(targetingCard), disabled: false };
    
    // Player is defender
    if (phase === TurnPhase.BLOCK && currentPlayerId === 1) {
        return { text: "CONFIRM BLOCKS", action: onConfirmBlocks, disabled: false, style: 'bg-blue-600 hover:bg-blue-500' };
    }

    if (!isPlayerTurn) return null;
    
    switch(phase) {
        case TurnPhase.MULLIGAN: return null;
        case TurnPhase.AI_MULLIGAN: return null;
        case TurnPhase.START: return null;
        case TurnPhase.ROLL_SPEND: {
            const hasUnspentDice = dice.some(d => !d.isSpent);
            const action = () => {
                if (hasUnspentDice) {
                    showConfirmation('End Phase?', 'You have unspent dice. Are you sure you want to end the phase?', () => onAdvancePhase());
                } else {
                    onAdvancePhase();
                }
            };
            return { text: "END PHASE", action, disabled: rollCount === 0 };
        }
        case TurnPhase.DRAW: return { text: "DRAW CARD", action: () => onAdvancePhase(), disabled: false };
        case TurnPhase.ASSAULT: return null; // Handled by separate JSX below
        case TurnPhase.END: return { text: "END TURN", action: () => showConfirmation('End Turn?', 'Are you sure you want to end your turn?', () => onAdvancePhase()), disabled: false };
        default: return null;
    }
  }
  const phaseAction = getPhaseAction();

  return (
    <div className="relative w-full h-screen flex flex-col bg-transparent text-white font-bold uppercase overflow-hidden">
      
      <CardPreview card={hoveredCardInHand} />
      {combatPreviewData && (
        <CombatPreviewTooltip 
            attacker={combatPreviewData.attacker}
            blocker={combatPreviewData.blocker}
            attackerPlayer={opponent}
            blockerPlayer={player}
        />
      )}

      {targetingCard && <div className="absolute inset-0 bg-black/50 z-20 pointer-events-none" />}
      {phase === TurnPhase.BLOCK && <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" />}

      {/* Mulligan UI */}
      {phase === TurnPhase.MULLIGAN && isPlayerTurn && (
        <div className="absolute inset-0 bg-cyber-bg/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-4xl font-black text-neon-cyan uppercase tracking-widest mb-4">Choose Your Starting Hand</h2>
            <p className="text-neon-yellow/70 mb-8">You may redraw your starting hand once.</p>
            <div className="flex justify-center items-end h-96 mb-8">
                <div className="flex justify-center items-end -space-x-40 h-full">
                    {players[0].hand.map((card, i) => {
                        const numCards = players[0].hand.length;
                        const rotation = (i - (numCards - 1) / 2) * 5;
                        return (
                            <div
                                key={card.instanceId}
                                className="transition-all duration-300 ease-in-out origin-bottom hover:-translate-y-12 hover:scale-105 hover:!rotate-0 hover:z-50"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            >
                                <Card card={card} inHand={true} onExamine={onExamineCard} />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex space-x-6">
                <button
                    onClick={() => onMulligan(false)}
                    className="bg-cyber-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors text-xl transform hover:scale-105 border-2 border-neon-cyan uppercase tracking-wider"
                >
                    Keep Hand
                </button>
                <button
                    onClick={() => onMulligan(true)}
                    className="bg-cyber-border text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-primary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase tracking-wider"
                >
                    Mulligan
                </button>
            </div>
        </div>
      )}
      
      {isOpponentDrawing && (
        <div className="absolute top-4 right-40 w-32 h-44 md:w-48 md:h-64 z-[60] pointer-events-none">
            <div className="w-full h-full bg-gradient-to-b from-cyber-border to-cyber-bg rounded-lg border-2 border-cyber-border shadow-xl flex items-center justify-center animate-opponent-draw">
                <span className="text-xl md:text-2xl font-black text-neon-pink/50">CARD</span>
            </div>
        </div>
      )}

      {/* Opponent's Side (reversed column) */}
      <div className="flex-1 flex flex-col-reverse">
        <FieldArea 
            player={opponent}
            players={players}
            gameState={gameState}
            onCardClick={onBoardCardClick} 
            isOpponent={true} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            lastActivatedCardId={lastActivatedCardId}
            onExamineCard={onExamineCard}
            selectedBlockerId={selectedBlockerId}
            blockAssignments={blockAssignments}
            setHoveredAttackerId={setHoveredAttackerId}
        />
        <HandArea 
            player={opponent}
            isOpponent={true} 
            onCardClick={() => {}}
            onGraveyardCardClick={() => {}}
            isCardPlayable={() => false}
            isCardScavengeable={() => false}
            isCardChannelable={() => false}
            onChannelClick={() => {}}
            isCardAmplifiable={() => false}
            onAmplifyClick={() => {}}
            isCurrentPlayer={currentPlayerId === opponent.id}
            onExamineCard={onExamineCard}
            setHoveredCardInHand={setHoveredCardInHand}
        />
      </div>

      {/* Center Bar */}
      <div className="flex-shrink-0 border-y-2 border-neon-cyan/20 bg-black/20 backdrop-blur-sm flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 px-2 md:px-4 py-2 md:h-40 z-30">
        <div className={`text-center w-full md:w-64 md:h-full flex flex-row md:flex-col items-center justify-between md:justify-center bg-cyber-surface/80 p-2 rounded-lg border-2 shadow-lg transition-all duration-300 ${isPlayerTurn ? 'border-neon-cyan shadow-neon-cyan animate-pulse-glow' : 'border-cyber-border'}`}>
            <div className='flex-1 text-left md:text-center'>
                <div className="text-xs md:text-base font-bold text-neon-cyan tracking-[0.2em] leading-tight">TURN {turn}</div>
                <div className="text-sm md:text-base font-semibold text-neon-yellow tracking-wider leading-tight mt-1">{players[currentPlayerId].name}</div>
            </div>
            <div className='flex-1 text-right md:text-center'>
                 <div className="text-2xl md:text-5xl font-black text-white leading-none">{`${phase}`}</div>
                 <div className="text-xs opacity-80 text-white tracking-widest leading-tight">Phase</div>
            </div>
        </div>

        <div className="flex-grow flex items-center justify-center min-w-0 w-full">
            {phase === TurnPhase.ROLL_SPEND && isPlayerTurn ? (
                <DiceTray
                    dice={dice}
                    rollCount={rollCount}
                    maxRolls={maxRolls}
                    onDieClick={onDieClick}
                    onRoll={onRoll}
                    canRoll={rollCount < maxRolls}
                    valuableDiceForHover={valuableDiceForHover}
                    isHoveredCardPlayable={isHoveredCardPlayable}
                    lastActionDetails={gameState.lastActionDetails}
                />
            ) : phase === TurnPhase.BLOCK ? (
                <div className="text-center text-yellow-300 italic p-2 md:p-4 text-sm md:text-lg animate-pulse">
                    {currentPlayerId === 0 ? "Opponent is Declaring Blockers..." : "Declare Your Blockers!"}
                </div>
            ) : (
                <div className="text-center text-cyber-primary/60 italic p-2 md:p-4 text-sm md:text-lg">
                    {!isPlayerTurn ? "Opponent's Turn" : "Dice appear here during Roll & Spend Phase"}
                </div>
            )}
        </div>
        
        <div className="w-full md:w-64 flex items-center justify-center p-2 md:p-0">
             {phase === TurnPhase.ASSAULT && isPlayerTurn ? (
                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => onAdvancePhase(true)}
                        disabled={player.units.filter(u => !u.abilities?.entrenched).length === 0}
                        className="bg-neon-pink text-cyber-bg px-4 py-2 md:px-6 md:py-2 rounded-lg shadow-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-600 disabled:text-white font-bold uppercase"
                    >
                        Assault
                    </button>
                    <button
                        onClick={() => onAdvancePhase(false)}
                        className="bg-cyber-primary text-white px-4 py-2 md:px-6 md:py-2 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors font-bold uppercase"
                    >
                        Skip
                    </button>
                </div>
            ) : phaseAction && (
                <button 
                    onClick={phaseAction.action}
                    disabled={phaseAction.disabled}
                    className={`${phaseAction.style || 'bg-cyber-primary hover:bg-cyber-secondary'} text-white px-6 py-2 md:px-8 md:py-3 rounded-lg shadow-lg transition-colors disabled:bg-gray-600 pointer-events-auto border-2 border-cyber-border`}
                >
                    {phaseAction.text}
                </button>
            )}
        </div>
      </div>


      {/* Player's Side */}
       <div className="flex-1 flex flex-col">
        <FieldArea 
            player={player} 
            players={players}
            gameState={gameState}
            onCardClick={onBoardCardClick} 
            isOpponent={false} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            lastActivatedCardId={lastActivatedCardId}
            onExamineCard={onExamineCard}
            selectedBlockerId={selectedBlockerId}
            blockAssignments={blockAssignments}
            setHoveredAttackerId={setHoveredAttackerId}
        />
        <HandArea 
            player={player}
            isOpponent={false} 
            onCardClick={onHandCardClick}
            onGraveyardCardClick={onGraveyardCardClick}
            isCardPlayable={isCardPlayable}
            isCardScavengeable={isCardScavengeable}
            isCardChannelable={isCardChannelable}
            onChannelClick={onChannelClick}
            isCardAmplifiable={isCardAmplifiable}
            onAmplifyClick={onAmplifyClick}
            isCurrentPlayer={currentPlayerId === player.id}
            onExamineCard={onExamineCard}
            setHoveredCardInHand={setHoveredCardInHand}
        />
      </div>
    </div>
  );
};

export default GameBoard;