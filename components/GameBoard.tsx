
import React, { useMemo, useState } from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase } from '../game/types';
import { checkDiceCost } from '../hooks/useGameState';
import DiceTray from './DiceTray';
import CardPreview from './CardPreview';
import PlayerInfoPanel from './PlayerInfoPanel';
import { CombatPreviewTooltip } from './CombatPreviewTooltip';
import PlayerArea from './PlayerArea';
import { Hand } from './Hand';
import Card from './Card';
import { phaseStyles } from './PhaseAnnouncer';

interface GameBoardProps {
  gameState: GameState;
  isSpectator?: boolean;
  onDieClick: (id: number) => void;
  onRoll: () => void;
  onHandCardClick: (card: CardInGame) => void;
  onBoardCardClick: (card: CardInGame) => void;
  isCardPlayable: (card: CardInGame) => boolean;
  onAdvancePhase: (strike?: boolean) => void;
  targetingCard: CardInGame | null;
  onCancelTargeting: () => void;
  isCardActivatable: (card: CardInGame) => boolean;
  onActivateCard: (card: CardInGame) => void;
  lastActivatedCardId: string | null;
  lastTriggeredCardId: string | null;
  onExamineCard: (card: CardInGame) => void;
  hoveredCardInHand: CardInGame | null;
  setHoveredCardInHand: (card: CardInGame | null) => void;
  onMulligan: (mulligan: boolean) => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  onConfirmBlocks: () => void;
  selectedBlockerId: string | null;
  blockAssignments: Map<string, string>;
  onZoneClick: (player: Player, zone: 'graveyard' | 'oblivion') => void;
  onGraveyardCardClick: (card: CardInGame) => void;
  isCardReclaimable: (card: CardInGame) => boolean;
  isCardEvokeable: (card: CardInGame) => boolean;
  onEvokeClick: (card: CardInGame) => void;
  isCardAmplifiable: (card: CardInGame) => boolean;
  onAmplifyClick: (card: CardInGame) => void;
  onShowHowToPlay: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, isSpectator = false, onDieClick, onRoll, onBoardCardClick, 
    isCardPlayable,
    onAdvancePhase, targetingCard, onCancelTargeting, isCardActivatable, onActivateCard,
    lastActivatedCardId, lastTriggeredCardId, onExamineCard, hoveredCardInHand, setHoveredCardInHand,
    onMulligan, showConfirmation, onConfirmBlocks, selectedBlockerId, blockAssignments,
    onZoneClick, onGraveyardCardClick, isCardReclaimable, isCardEvokeable, onEvokeClick,
    isCardAmplifiable, onAmplifyClick, onHandCardClick, onShowHowToPlay
}) => {
  const { players, currentPlayerId, phase, dice, rollCount, turn, maxRolls } = gameState;
  const player = players[0];
  const opponent = players[1];

  const isPlayerTurn = currentPlayerId === 0;
  const [hoveredAttackerId, setHoveredAttackerId] = useState<string | null>(null);

  const isHoveredCardPlayable = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn || isSpectator) return true;
    if (hoveredCardInHand.source === 'graveyard') return isCardReclaimable(hoveredCardInHand);
    return isCardPlayable(hoveredCardInHand);
  }, [hoveredCardInHand, isPlayerTurn, isCardPlayable, isCardReclaimable, isSpectator]);

  const valuableDiceForHover = useMemo(() => {
    if (!hoveredCardInHand || !isPlayerTurn || isSpectator) return new Set<number>();
    let costToCheck = hoveredCardInHand.dice_cost;
    if (hoveredCardInHand.source === 'graveyard' && hoveredCardInHand.abilities?.reclaim) {
        costToCheck = hoveredCardInHand.abilities.reclaim.cost;
    }
    const result = checkDiceCost({ ...hoveredCardInHand, dice_cost: costToCheck }, gameState.dice);
    return new Set(result.diceToSpend.map(d => d.id));
  }, [hoveredCardInHand, gameState.dice, isPlayerTurn, isSpectator]);
  
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
    if (isSpectator) return null;
    if (targetingCard) return { text: "CANCEL", action: onCancelTargeting, disabled: false, style: 'h-16' };
    
    if (phase === TurnPhase.BLOCK && !isPlayerTurn) {
        return { text: "CONFIRM BLOCKS", action: onConfirmBlocks, disabled: false, style: 'bg-blue-600 hover:bg-blue-500 h-16 text-xl' };
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
            return { text: "END PHASE", action, disabled: rollCount === 0, style: 'h-16 text-lg' };
        }
        case TurnPhase.DRAW: return { text: "BEGIN STRIKE", action: () => onAdvancePhase(), disabled: false, style: 'h-16 text-lg' };
        case TurnPhase.STRIKE: return null;
        case TurnPhase.END: return { text: "END TURN", action: () => showConfirmation('End Turn?', 'Are you sure you want to end your turn?', () => onAdvancePhase()), disabled: false, style: 'h-16 text-lg' };
        default: return null;
    }
  }
  const phaseAction = getPhaseAction();
  const phaseStyle = phaseStyles[phase] || phaseStyles.default;

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
        
        {targetingCard && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onCancelTargeting} />}
        {phase === TurnPhase.BLOCK && <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" />}

        {/* Top left corner actions */}
        <div className="absolute top-4 left-4 z-40 pointer-events-auto">
            <button 
                onClick={onShowHowToPlay} 
                className="w-12 h-12 bg-arcane-primary/80 rounded-full flex items-center justify-center text-2xl font-black hover:bg-arcane-secondary transition-colors border-2 border-arcane-border"
                aria-label="How to Play"
              >
                ?
              </button>
        </div>

        {/* Center Game State */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="text-center bg-arcane-surface/80 backdrop-blur-sm p-2 rounded-lg border-2 border-arcane-border shadow-lg">
              <div className="text-sm md:text-base font-bold text-vivid-cyan tracking-[0.2em]">TURN {turn}</div>
              <div className={`text-xl md:text-2xl font-black leading-none transition-colors duration-300 ${phaseStyle}`}>{`${phase}`}</div>
              <div className="text-sm md:text-base font-semibold text-vivid-yellow tracking-wider mt-1">{players[currentPlayerId].name}'s Turn</div>
            </div>
        </div>
        
        {/* Game Board Layout */}
        <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col justify-between items-center pt-20 pb-48">
            {/* Opponent Side */}
             <PlayerArea 
                player={opponent} players={players} gameState={gameState} onCardClick={onBoardCardClick} 
                targetingCard={targetingCard} isCardActivatable={isCardActivatable}
                onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId}
                lastTriggeredCardId={lastTriggeredCardId}
                onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId}
                blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId}
                isCurrent={!isPlayerTurn}
            />
            <div className="w-full border-t-2 border-vivid-cyan/20 my-1 sm:my-2"></div>
            {/* Player Side */}
            <PlayerArea 
                player={player} players={players} gameState={gameState} onCardClick={onBoardCardClick} 
                targetingCard={targetingCard} isCardActivatable={isCardActivatable}
                onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId}
                lastTriggeredCardId={lastTriggeredCardId}
                hoveredAttackerId={hoveredAttackerId}
                onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId}
                blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId}
                isCurrent={isPlayerTurn}
            />
        </div>
        
        {/* Opponent Info Panel */}
        <div className="absolute top-4 right-4 z-40 w-80">
            <PlayerInfoPanel player={opponent} isCurrent={!isPlayerTurn} isOpponent={true} onZoneClick={(zone) => onZoneClick(opponent, zone)} />
        </div>
        
        {/* Player UI Area */}
        <div className="absolute bottom-0 left-0 right-0 h-48 z-30 pointer-events-none">
            <Hand 
                player={player}
                isCurrentPlayer={isPlayerTurn}
                onCardClick={onHandCardClick}
                isCardPlayable={isCardPlayable}
                isCardEvokeable={isCardEvokeable}
                onEvokeClick={onEvokeClick}
                isCardAmplifiable={isCardAmplifiable}
                onAmplifyClick={onAmplifyClick}
                onExamineCard={onExamineCard}
                setHoveredCardInHand={setHoveredCardInHand}
                isSpectator={isSpectator}
            />
        </div>

        {/* Player Info Panel */}
        <div className="absolute bottom-4 left-4 z-40 w-80">
            <PlayerInfoPanel player={player} isCurrent={isPlayerTurn} onZoneClick={(zone) => onZoneClick(player, zone)} />
        </div>

        {/* Action Hub */}
        <div className="absolute bottom-4 right-4 z-40 w-96 flex items-end gap-3">
             {phase === TurnPhase.ROLL_SPEND && isPlayerTurn && !isSpectator && (
                <DiceTray
                    dice={dice} rollCount={rollCount} maxRolls={maxRolls} onDieClick={onDieClick}
                    onRoll={onRoll} canRoll={rollCount < maxRolls} valuableDiceForHover={valuableDiceForHover}
                    isHoveredCardPlayable={isHoveredCardPlayable} lastActionDetails={gameState.lastActionDetails}
                />
            )}
            
             <div className="flex-grow flex flex-col gap-2">
                {phase === TurnPhase.STRIKE && isPlayerTurn && !isSpectator ? (
                    <div className="flex flex-col gap-2 w-full">
                        <button onClick={() => onAdvancePhase(true)} disabled={player.units.filter(u => !u.abilities?.entrenched).length === 0}
                            className="w-full bg-vivid-pink text-arcane-bg px-4 h-16 text-xl rounded-lg shadow-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-600 disabled:text-white font-bold uppercase">Strike</button>
                        <button onClick={() => onAdvancePhase(false)}
                            className="w-full bg-arcane-primary text-white px-4 h-10 text-md rounded-lg shadow-lg hover:bg-arcane-secondary transition-colors font-bold uppercase">Skip Strike</button>
                    </div>
                ) : phaseAction ? (
                    <button onClick={phaseAction.action} disabled={phaseAction.disabled}
                        className={`w-full ${phaseAction.style || 'bg-arcane-primary hover:bg-arcane-secondary'} text-white px-4 rounded-lg shadow-lg transition-colors disabled:bg-gray-600 border-2 border-arcane-border`}>
                        {phaseAction.text}
                    </button>
                ) : phase === TurnPhase.BLOCK && !isSpectator ? (
                    <div className="text-center text-yellow-300 italic text-lg animate-pulse h-16 flex items-center justify-center bg-arcane-surface/70 rounded-lg border-2 border-arcane-border">
                        {isPlayerTurn ? "Opponent is Blocking" : "Declare Blockers"}
                    </div>
                ) : (isSpectator && phase !== TurnPhase.MULLIGAN) ? (
                     <div className="text-center text-vivid-cyan italic text-lg animate-pulse h-16 flex items-center justify-center bg-arcane-surface/70 rounded-lg border-2 border-arcane-border">
                        Spectating AI...
                    </div>
                ) : null}
             </div>
        </div>


      {/* Mulligan UI - Full screen overlay */}
      {phase === TurnPhase.MULLIGAN && isPlayerTurn && !isSpectator && (
        <div className="absolute inset-0 bg-arcane-bg/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-4xl font-black text-vivid-cyan uppercase tracking-widest mb-4">Choose Your Starting Hand</h2>
            <p className="text-vivid-yellow/70 mb-8">You may redraw your starting starting hand once.</p>
            <div className="flex justify-center items-end gap-4 h-80 mb-8">
                {players[0].hand.map((card) => (
                    <div key={card.instanceId} className="transition-all duration-300 ease-in-out">
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
