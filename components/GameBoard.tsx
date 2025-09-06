
import React, { useMemo, useState } from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase, CardType } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { isCardTargetable, checkDiceCost } from '../hooks/useGameState';
import DiceTray from './DiceTray';
import Card from './Card';
import CardPreview from './CardPreview';
import PlayerInfoPanel from './PlayerInfoPanel';
import { CombatPreviewTooltip } from './CombatPreviewTooltip';
import { HandDisplayModal } from './HandDisplayModal';

const FieldArea: React.FC<{ 
    player: Player;
    players: [Player, Player];
    gameState: GameState;
    onCardClick: (card: CardInGame) => void;
    targetingCard: CardInGame | null;
    isCardActivatable: (card: CardInGame) => boolean;
    onActivateCard: (card: CardInGame) => void;
    lastActivatedCardId: string | null;
    onExamineCard: (card: CardInGame) => void;
    selectedBlockerId?: string | null;
    blockAssignments?: Map<string, string>;
    setHoveredAttackerId: (id: string | null) => void;
}> = ({ player, players, gameState, onCardClick, targetingCard, isCardActivatable, onActivateCard, lastActivatedCardId, onExamineCard, selectedBlockerId, blockAssignments, setHoveredAttackerId }) => {
    
    const { phase, currentPlayerId, combatants } = gameState;
    const backRowCards = [...player.locations, ...player.artifacts];
    const frontRowCards = [...player.units];
    const allCards = [...backRowCards, ...frontRowCards];
    const isOpponent = player.id !== 0;

    const renderCard = (card: CardInGame) => {
        const sourcePlayer = players[currentPlayerId];
        const targetPlayer = player;
        const cardIsTargetable = targetingCard ? isCardTargetable(targetingCard, card, sourcePlayer, targetPlayer) : false;

        const isStrikePhase = phase === TurnPhase.STRIKE || phase === TurnPhase.BLOCK;
        const { strength: effectiveStrength, durability: effectiveDurability, rallyBonus } = getEffectiveStats(card, player, { isStrikePhase });
        
        const isAttacking = (phase === TurnPhase.BLOCK || phase === TurnPhase.STRIKE) && combatants?.some(c => c.attackerId === card.instanceId) || false;
        const isBlocker = phase === TurnPhase.BLOCK && blockAssignments?.has(card.instanceId) || false;
        const isSelectedAsBlocker = phase === TurnPhase.BLOCK && selectedBlockerId === card.instanceId;
        
        const isPlayerDefender = phase === TurnPhase.BLOCK && currentPlayerId === 1;
        const isPotentialBlocker = isPlayerDefender && player.id === 0 && card.type === CardType.UNIT && !card.abilities?.entrenched && !isBlocker;

        const isPlayerAttackerInStrikePhase = phase === TurnPhase.STRIKE && currentPlayerId === 0;
        const isPotentialAttacker = isPlayerAttackerInStrikePhase && player.id === 0 && card.type === CardType.UNIT && !card.abilities?.entrenched;

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
        <div className="flex-grow w-full flex flex-col items-center justify-center p-2 min-h-[18rem] bg-[radial-gradient(ellipse_at_center,_rgba(26,9,58,0.3)_0%,_rgba(13,2,33,0)_70%)]">
            {allCards.length > 0 ? (
                 <div className="w-full h-full flex flex-col justify-center items-center gap-y-2">
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full min-h-[8rem]">
                        {backRowCards.map(renderCard)}
                    </div>
                    {frontRowCards.length > 0 && <div className={`flex flex-wrap gap-2 md:gap-4 items-center justify-center w-full min-h-[8rem] ${backRowCards.length > 0 ? 'border-t-2 border-vivid-cyan/20 pt-2 mt-2' : ''}`}>
                        {frontRowCards.map(renderCard)}
                    </div>}
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-arcane-primary/50 italic text-lg">FIELD EMPTY</div>
            )}
        </div>
    );
};

const OpponentHandDisplay: React.FC<{ player: Player }> = ({ player }) => {
    if (player.hand.length === 0) return null;
    return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 h-20 flex justify-center items-center -space-x-12 z-0 pointer-events-none">
            {player.hand.map((card, i) => (
                <div 
                    key={card.instanceId} 
                    className="w-24 h-32 bg-gradient-to-b from-arcane-border to-arcane-bg rounded-lg border-2 border-arcane-border shadow-xl transform-gpu"
                    style={{ transform: `rotate(${(i - player.hand.length / 2) * 5}deg)` }}
                >
                    <div className="w-full h-full bg-vivid-pink/10 rounded-lg" />
                </div>
            ))}
            <div className="absolute -bottom-8 bg-arcane-bg/80 text-vivid-yellow font-black text-2xl rounded-full w-12 h-12 flex items-center justify-center border-2 border-vivid-yellow pointer-events-none shadow-lg shadow-vivid-yellow/50">
                {player.hand.length}
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
  isCardReclaimable: (card: CardInGame) => boolean;
  isCardEvokeable: (card: CardInGame) => boolean;
  onEvokeClick: (card: CardInGame) => void;
  isCardAmplifiable: (card: CardInGame) => boolean;
  onAmplifyClick: (card: CardInGame) => void;
  onAdvancePhase: (strike?: boolean) => void;
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
  onZoneClick: (player: Player, zone: 'graveyard' | 'oblivion') => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, onDieClick, onRoll, onHandCardClick, onGraveyardCardClick, onBoardCardClick, 
    isCardPlayable, isCardReclaimable, isCardEvokeable, onEvokeClick,
    isCardAmplifiable, onAmplifyClick,
    onAdvancePhase, targetingCard, isCardActivatable, onActivateCard,
    lastActivatedCardId, onExamineCard, hoveredCardInHand, setHoveredCardInHand,
    onMulligan, showConfirmation, onConfirmBlocks, selectedBlockerId, blockAssignments,
    isOpponentDrawing, onZoneClick
}) => {
  const { players, currentPlayerId, phase, dice, rollCount, turn, maxRolls } = gameState;
  const player = players[0];
  const opponent = players[1];

  const isPlayerTurn = currentPlayerId === 0;
  const [hoveredAttackerId, setHoveredAttackerId] = useState<string | null>(null);
  const [isHandModalOpen, setIsHandModalOpen] = useState(false);

  const isHoveredCardPlayable = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn) return true;
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
    
    if (phase === TurnPhase.BLOCK && currentPlayerId === 1) {
        return { text: "CONFIRM BLOCKS", action: onConfirmBlocks, disabled: false, style: 'bg-blue-600 hover:bg-blue-500' };
    }

    if (!isPlayerTurn) return null;
    
    switch(phase) {
        case TurnPhase.MULLIGAN: return null;
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
        case TurnPhase.STRIKE: return { text: "STRIKE PHASE", action: () => {}, disabled: true }; // This is handled by dedicated buttons
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

        {isOpponentDrawing && (
            <div className="absolute top-4 right-40 w-32 h-44 z-[60] pointer-events-none">
                <div className="w-full h-full bg-gradient-to-b from-arcane-border to-arcane-bg rounded-lg border-2 border-arcane-border shadow-xl flex items-center justify-center animate-opponent-draw">
                    <span className="text-xl font-black text-vivid-pink/50">CARD</span>
                </div>
            </div>
        )}

        {/* Top bar for opponent */}
        <div className="absolute top-2 left-4 right-4 z-20">
            <PlayerInfoPanel player={opponent} isCurrent={!isPlayerTurn} isOpponent={true} onZoneClick={(zone) => onZoneClick(opponent, zone)} />
        </div>

        <OpponentHandDisplay player={opponent} />

        {/* Main Board */}
        <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col justify-around items-center pt-24 pb-36">
            <FieldArea 
                player={opponent} players={players} gameState={gameState} onCardClick={onBoardCardClick} 
                targetingCard={targetingCard} isCardActivatable={isCardActivatable}
                onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId}
                onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId}
                blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId}
            />
            <div className="w-full border-t-2 border-vivid-cyan/20 my-2"></div>
            <FieldArea 
                player={player} players={players} gameState={gameState} onCardClick={onBoardCardClick} 
                targetingCard={targetingCard} isCardActivatable={isCardActivatable}
                onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId}
                onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId}
                blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId}
            />
        </div>
        
        {/* Center HUD */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 p-4 text-center pointer-events-none">
            <div className="text-base font-bold text-vivid-cyan tracking-[0.2em]">TURN {turn}</div>
            <div className="text-4xl font-black text-white leading-none">{`${phase}`}</div>
            <div className="text-base font-semibold text-vivid-yellow tracking-wider mt-1">{players[currentPlayerId].name}</div>
        </div>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-arcane-bg/90 border-t-2 border-arcane-border z-30">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="w-64 flex justify-start">
                    <button onClick={() => setIsHandModalOpen(true)} className="bg-arcane-primary h-16 px-6 rounded-lg shadow-lg hover:bg-arcane-secondary transition-colors border-2 border-arcane-border">
                        Hand ({player.hand.length})
                    </button>
                </div>

                <div className="flex-grow flex justify-center">
                    {phase === TurnPhase.ROLL_SPEND && isPlayerTurn ? (
                        <DiceTray
                            dice={dice} rollCount={rollCount} maxRolls={maxRolls} onDieClick={onDieClick}
                            onRoll={onRoll} canRoll={rollCount < maxRolls} valuableDiceForHover={valuableDiceForHover}
                            isHoveredCardPlayable={isHoveredCardPlayable} lastActionDetails={gameState.lastActionDetails}
                        />
                    ) : <div className="h-24"></div>}
                </div>
                
                <div className="w-64 flex justify-end items-center">
                    {phase === TurnPhase.STRIKE && isPlayerTurn ? (
                        <div className="flex gap-2">
                            <button onClick={() => onAdvancePhase(true)} disabled={player.units.filter(u => !u.abilities?.entrenched).length === 0}
                                className="bg-vivid-pink text-arcane-bg px-6 py-3 rounded-lg shadow-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-600 disabled:text-white font-bold uppercase">Strike</button>
                            <button onClick={() => onAdvancePhase(false)}
                                className="bg-arcane-primary text-white px-6 py-3 rounded-lg shadow-lg hover:bg-arcane-secondary transition-colors font-bold uppercase">Skip</button>
                        </div>
                    ) : phaseAction ? (
                        <button onClick={phaseAction.action} disabled={phaseAction.disabled}
                            className={`${phaseAction.style || 'bg-arcane-primary hover:bg-arcane-secondary'} text-white h-16 px-8 rounded-lg shadow-lg transition-colors disabled:bg-gray-600 border-2 border-arcane-border`}>
                            {phaseAction.text}
                        </button>
                    ) : phase === TurnPhase.BLOCK ? (
                        <div className="text-center text-yellow-300 italic text-lg animate-pulse">
                            {currentPlayerId === 0 ? "Opponent is Blocking" : "Declare Blockers"}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>

      {isHandModalOpen && (
        <HandDisplayModal 
            player={player}
            isCurrentPlayer={isPlayerTurn}
            onCardClick={(card) => { onHandCardClick(card); setIsHandModalOpen(false); }}
            onGraveyardCardClick={(card) => { onGraveyardCardClick(card); setIsHandModalOpen(false); }}
            isCardPlayable={isCardPlayable}
            isCardReclaimable={isCardReclaimable}
            isCardEvokeable={isCardEvokeable}
            onEvokeClick={(card) => { onEvokeClick(card); setIsHandModalOpen(false); }}
            isCardAmplifiable={isCardAmplifiable}
            onAmplifyClick={(card) => { onAmplifyClick(card); setIsHandModalOpen(false); }}
            onExamineCard={onExamineCard}
            setHoveredCardInHand={setHoveredCardInHand}
            onClose={() => setIsHandModalOpen(false)}
        />
      )}

      {/* Mulligan UI - Full screen overlay */}
      {phase === TurnPhase.MULLIGAN && isPlayerTurn && (
        <div className="absolute inset-0 bg-arcane-bg/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-4xl font-black text-vivid-cyan uppercase tracking-widest mb-4">Choose Your Starting Hand</h2>
            <p className="text-vivid-yellow/70 mb-8">You may redraw your starting hand once.</p>
            <div className="flex justify-center items-end -space-x-32 h-80 mb-8">
                {players[0].hand.map((card, i) => (
                    <div key={card.instanceId} className="transition-all duration-300 ease-in-out origin-bottom hover:-translate-y-12 hover:scale-105 hover:z-50">
                        <Card card={card} inHand={true} onExamine={onExamineCard} />
                    </div>
                ))}
            </div>
            <div className="flex space-x-6">
                <button onClick={() => onMulligan(false)} className="bg-arcane-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-arcane-secondary transition-colors text-xl transform hover:scale-105 border-2 border-vivid-cyan uppercase tracking-wider">Keep Hand</button>
                <button onClick={() => onMulligan(true)} className="bg-arcane-border text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-arcane-primary transition-colors text-xl transform hover:scale-105 border-2 border-arcane-border uppercase tracking-wider">Mulligan</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
