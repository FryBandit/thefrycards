

import React, { useMemo } from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase, CardType, DiceCost, Die, DiceCostType } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { isCardTargetable } from '../hooks/useGameState';
import { findValuableDiceForCost } from '../game/utils';
import DiceTray from './DiceTray';
import Card from './Card';

// Helper function (copied from ai.ts) to determine which dice are useful for a given cost.
// MOVED TO game/utils.ts


// New sub-component for cards on the field
const FieldArea: React.FC<{ 
    player: Player;
    players: [Player, Player];
    currentPlayerId: number;
    isOpponent: boolean;
    onCardClick: (card: CardInGame) => void;
    targetingCard: CardInGame | null;
    isCardActivatable: (card: CardInGame) => boolean;
    onActivateCard: (card: CardInGame) => void;
    phase: TurnPhase;
    lastActivatedCardId: string | null;
    onExamineCard: (card: CardInGame) => void;
}> = ({ player, players, currentPlayerId, isOpponent, onCardClick, targetingCard, isCardActivatable, onActivateCard, phase, lastActivatedCardId, onExamineCard }) => {
    
    const backRowCards = [...player.locations, ...player.artifacts];
    const frontRowCards = [...player.units];
    const allCards = [...backRowCards, ...frontRowCards];

    const renderCard = (card: CardInGame) => {
        const sourcePlayer = players[currentPlayerId];
        const targetPlayer = player;
        const cardIsTargetable = targetingCard ? isCardTargetable(targetingCard, card, sourcePlayer, targetPlayer) : false;

        const isAssaultPhase = currentPlayerId === player.id && phase === TurnPhase.ASSAULT;
        const { strength: effectiveStrength, durability: effectiveDurability, rallyBonus } = getEffectiveStats(card, player, { isAssaultPhase });
        
        return (
            <Card 
                key={card.instanceId} 
                card={card} 
                onClick={cardIsTargetable ? () => onCardClick(card) : undefined}
                isTargetable={cardIsTargetable}
                onActivate={card.abilities?.activate && currentPlayerId === player.id ? () => onActivateCard(card) : undefined}
                isActivatable={currentPlayerId === player.id && isCardActivatable(card)}
                effectiveStrength={effectiveStrength}
                effectiveDurability={effectiveDurability}
                isActivating={lastActivatedCardId === card.instanceId}
                rallyBonus={rallyBonus}
                onExamine={onExamineCard}
            />
        );
    };
    
    return (
        <div className="flex-grow w-full flex flex-col items-center justify-center p-2 min-h-[18rem] bg-[radial-gradient(ellipse_at_center,_rgba(26,9,58,0.3)_0%,_rgba(13,2,33,0)_60%)]">
            {allCards.length > 0 ? (
                 <div className="w-full h-full flex flex-col justify-center items-center gap-y-2">
                    {/* Back Row (Locations & Artifacts) */}
                    <div className="flex flex-wrap gap-4 items-center justify-center w-full flex-1 min-h-0">
                        {backRowCards.map(renderCard)}
                    </div>
                    {/* Separator */}
                    {frontRowCards.length > 0 && (
                        <div className="w-3/4 h-px bg-gradient-to-r from-cyber-bg via-neon-cyan to-cyber-bg"></div>
                    )}
                    {/* Front Row (Units) */}
                    <div className="flex flex-wrap gap-4 items-center justify-center w-full flex-1 min-h-0">
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
             <div className="h-32 flex-shrink-0 w-full flex justify-center items-start pt-4 relative">
                {numCards > 0 && 
                    <div className="flex justify-center items-start -space-x-24">
                         {player.hand.map((card, i) => {
                            const rotation = (i - (numCards - 1) / 2) * 5;
                            
                            return (
                                <div 
                                    key={card.instanceId} 
                                    className="transition-all duration-300 ease-in-out origin-top" 
                                    style={{ transform: `rotate(${rotation}deg)`}}
                                >
                                    <div className="w-48 h-64 bg-gradient-to-b from-cyber-border to-cyber-bg rounded-lg border-2 border-cyber-border shadow-xl flex items-center justify-center">
                                        <span className="text-2xl font-black text-neon-pink/50">CARD</span>
                                    </div>
                                </div>
                            )
                         })}
                    </div>
                }
                {player.hand.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-cyber-bg/80 text-neon-yellow font-black text-3xl rounded-full w-20 h-20 flex items-center justify-center border-4 border-neon-yellow pointer-events-none shadow-lg shadow-neon-yellow/50">
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


    return (
        <div className="h-80 flex-shrink-0 flex justify-center items-end pb-12">
            <div className="flex justify-center items-end -space-x-40 h-full">
                 {allPlayableCards.map((card, i) => {
                    const numCards = allPlayableCards.length;
                    const rotation = (i - (numCards - 1) / 2) * 5;
                    
                    const isPlayableFromSource = card.source === 'hand' ? isCardPlayable(card) : isCardScavengeable(card);
                    const clickHandler = card.source === 'hand' ? onCardClick : onGraveyardCardClick;

                    return (
                        <div 
                            key={card.instanceId} 
                            className="transition-all duration-300 ease-in-out hover:-translate-y-24 hover:scale-110 hover:z-40 origin-bottom hover:!rotate-0" 
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
  onCardClick: (card: CardInGame) => void;
  onGraveyardCardClick: (card: CardInGame) => void;
  onFieldCardClick: (card: CardInGame) => void;
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
}

const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, onDieClick, onRoll, onCardClick, onGraveyardCardClick, onFieldCardClick, 
    isCardPlayable, isCardScavengeable, isCardChannelable, onChannelClick,
    isCardAmplifiable, onAmplifyClick,
    onAdvancePhase, targetingCard, isCardActivatable, onActivateCard,
    lastActivatedCardId, onExamineCard, hoveredCardInHand, setHoveredCardInHand,
    onMulligan, showConfirmation
}) => {
  const { players, currentPlayerId, phase, dice, rollCount, turn, maxRolls } = gameState;
  const currentPlayer = players[currentPlayerId];
  const opponentPlayer = players[1 - currentPlayerId];

  const isPlayerTurn = currentPlayerId === 0;

  const isHoveredCardPlayable = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn) return true; // Default to true to not show red when no card is hovered
    return isCardPlayable(hoveredCardInHand);
  }, [hoveredCardInHand, isPlayerTurn, isCardPlayable]);

  const valuableDiceForHover = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn) return new Set<number>();
    const diceToConsider = gameState.dice.filter(d => !d.isSpent);
    const costs = hoveredCardInHand.dice_cost || [];
    const valuableDice = costs.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
    return new Set(valuableDice.map(d => d.id));
  }, [hoveredCardInHand, gameState.dice, isPlayerTurn]);


  const getPhaseAction = () => {
    if (!isPlayerTurn) return null;
    if (targetingCard) return { text: "CANCEL", action: () => onCardClick(targetingCard), disabled: false };
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
      
      {targetingCard && <div className="absolute inset-0 bg-black/50 z-20 pointer-events-none" />}

      {/* Mulligan UI */}
      {phase === TurnPhase.MULLIGAN && isPlayerTurn && (
        <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white">
          <h2 className="text-4xl font-black text-neon-cyan uppercase tracking-widest mb-8">Choose Your Starting Hand</h2>
          <div className="flex justify-center items-end -space-x-24 mb-8 h-72">
            {players[0].hand.map((card, i) => {
              const numCards = players[0].hand.length;
              const rotation = (i - (numCards - 1) / 2) * 5;
              return (
                <div key={card.instanceId} style={{ transform: `rotate(${rotation}deg)` }}>
                  <Card card={card} inHand={true} onExamine={onExamineCard} />
                </div>
              );
            })}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onMulligan(false)}
              className="bg-cyber-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase"
            >
              Keep Hand
            </button>
            <button
              onClick={() => onMulligan(true)}
              className="bg-cyber-border text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-primary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase"
            >
              Mulligan
            </button>
          </div>
          <p className="mt-4 text-neon-yellow/70">You can redraw your starting hand once.</p>
        </div>
      )}

      {/* Opponent's Side (reversed column) */}
      <div className="flex-1 flex flex-col-reverse">
        <FieldArea 
            player={opponentPlayer}
            players={players}
            currentPlayerId={currentPlayerId}
            onCardClick={onFieldCardClick} 
            isOpponent={true} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            phase={phase}
            lastActivatedCardId={lastActivatedCardId}
            onExamineCard={onExamineCard}
        />
        <HandArea 
            player={opponentPlayer}
            isOpponent={true} 
            onCardClick={() => {}}
            onGraveyardCardClick={() => {}}
            isCardPlayable={() => false}
            isCardScavengeable={() => false}
            isCardChannelable={() => false}
            onChannelClick={() => {}}
            isCardAmplifiable={() => false}
            onAmplifyClick={() => {}}
            isCurrentPlayer={currentPlayerId === opponentPlayer.id}
            onExamineCard={onExamineCard}
            setHoveredCardInHand={setHoveredCardInHand}
        />
      </div>

      {/* Center Bar */}
      <div className="flex-shrink-0 border-y-2 border-neon-cyan/20 bg-black/20 backdrop-blur-sm flex items-center justify-center gap-6 px-4 h-40">
        <div className="text-center w-64 h-full flex flex-col items-center justify-center bg-cyber-surface/80 p-2 rounded-lg border-2 border-cyber-border shadow-lg">
            <div className="text-base font-bold text-neon-cyan tracking-[0.2em] leading-tight">TURN</div>
            <div className="text-5xl font-black text-white leading-none">{turn}</div>
            <div className="text-base font-semibold text-neon-yellow tracking-wider leading-tight mt-1">{players[currentPlayerId].name}</div>
            <div className="text-xs opacity-80 text-white tracking-widest leading-tight">{`${phase} Phase`}</div>
        </div>

        <div className="flex-grow flex items-center justify-center min-w-[560px]">
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
            ) : (
                <div className="text-center text-cyber-primary/60 italic p-4 text-lg">
                    {!isPlayerTurn ? "Opponent's Turn" : (rollCount === 0 ? "Roll dice to begin" : "Dice appear here during Roll & Spend Phase")}
                </div>
            )}
        </div>
        
        <div className="w-64 flex items-center justify-center">
             {phase === TurnPhase.ASSAULT && isPlayerTurn ? (
                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => onAdvancePhase(true)}
                        disabled={currentPlayer.units.filter(u => !u.abilities?.entrenched).length === 0}
                        className="bg-neon-pink text-cyber-bg px-6 py-2 rounded-lg shadow-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-600 disabled:text-white font-bold uppercase"
                    >
                        Assault
                    </button>
                    <button
                        onClick={() => onAdvancePhase(false)}
                        className="bg-cyber-primary text-white px-6 py-2 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors font-bold uppercase"
                    >
                        Skip
                    </button>
                </div>
            ) : phaseAction && (
                <button 
                    onClick={phaseAction.action}
                    disabled={phaseAction.disabled}
                    className="bg-cyber-primary text-white px-8 py-3 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors disabled:bg-gray-600 pointer-events-auto border-2 border-cyber-border"
                >
                    {phaseAction.text}
                </button>
            )}
        </div>
      </div>


      {/* Player's Side */}
       <div className="flex-1 flex flex-col">
        <FieldArea 
            player={currentPlayer} 
            players={players}
            currentPlayerId={currentPlayerId}
            onCardClick={onFieldCardClick} 
            isOpponent={false} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            phase={phase}
            lastActivatedCardId={lastActivatedCardId}
            onExamineCard={onExamineCard}
        />
        <HandArea 
            player={currentPlayer}
            isOpponent={false} 
            onCardClick={onCardClick}
            onGraveyardCardClick={onGraveyardCardClick}
            isCardPlayable={isCardPlayable}
            isCardScavengeable={isCardScavengeable}
            isCardChannelable={isCardChannelable}
            onChannelClick={onChannelClick}
            isCardAmplifiable={isCardAmplifiable}
            onAmplifyClick={onAmplifyClick}
            isCurrentPlayer={currentPlayerId === currentPlayer.id}
            onExamineCard={onExamineCard}
            setHoveredCardInHand={setHoveredCardInHand}
        />
      </div>
    </div>
  );
};

export default GameBoard;