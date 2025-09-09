import React, { useMemo, useState } from 'react';
import { type GameState, type CardInGame, type Player, TurnPhase } from '../game/types';
import { checkDiceCost } from '../hooks/useGameState';
import DiceTray from './DiceTray';
import PlayerInfoPanel from './PlayerInfoPanel';
import { CombatPreviewTooltip } from './CombatPreviewTooltip';
import PlayerArea from './PlayerArea';
import Hand from './Hand';
import Card from './Card';

interface GameBoardProps {
  gameState: GameState;
  isSpectator?: boolean;
  gameMode: 'playerVsAi' | 'aiVsAi' | 'none';
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

const ZoneTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-center font-cinzel text-stone-surface/60 tracking-[0.3em] text-xs uppercase mb-1">{children}</div>
);

const DeploymentZone: React.FC<{ children: React.ReactNode; color: 'red' | 'blue'; isCurrent: boolean }> = ({ children, color, isCurrent }) => {
    const shadowClass = color === 'red' ? 'shadow-glow-red' : 'shadow-glow-blue';
    const borderClass = color === 'red' ? 'border-glow-red' : 'border-glow-blue';
    return (
        <div className={`w-full h-full bg-stone-border/30 p-2 rounded-lg border-2 ${isCurrent ? `${borderClass} ${shadowClass}` : 'border-stone-surface/30'} transition-all duration-300`}>
            <ZoneTitle>Deployment Zone</ZoneTitle>
            {children}
        </div>
    );
};

const DeckZone: React.FC<{ player: Player }> = ({ player }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-border/30 rounded-lg p-2 border-2 border-stone-surface/30">
        <ZoneTitle>Deck</ZoneTitle>
        <div className="w-28 h-40 bg-stone-surface/50 rounded-lg flex items-center justify-center text-4xl font-black font-cinzel text-stone-border">
            {player.deck.length}
        </div>
    </div>
);

const GraveyardZone: React.FC<{ player: Player; onZoneClick: (player: Player, zone: 'graveyard' | 'oblivion') => void }> = ({ player, onZoneClick }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-border/30 rounded-lg p-2 border-2 border-stone-surface/30 cursor-pointer hover:border-vivid-yellow" onClick={() => onZoneClick(player, 'graveyard')}>
        <ZoneTitle>Unleashed</ZoneTitle>
        <div className="w-28 h-40 bg-stone-surface/50 rounded-lg flex items-center justify-center text-stone-border/70 p-2 text-center text-xs italic">
            {player.graveyard.length > 0 ? `${player.graveyard.length} cards` : '(empty)'}
        </div>
    </div>
);


const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, isSpectator = false, onDieClick, onRoll, onBoardCardClick, 
    isCardPlayable,
    onAdvancePhase, targetingCard, onCancelTargeting, isCardActivatable, onActivateCard,
    lastActivatedCardId, lastTriggeredCardId, onExamineCard, hoveredCardInHand, setHoveredCardInHand,
    onMulligan, showConfirmation, onConfirmBlocks, selectedBlockerId, blockAssignments,
    onZoneClick, onGraveyardCardClick, isCardReclaimable, isCardEvokeable, onEvokeClick,
    isCardAmplifiable, onAmplifyClick, onHandCardClick, onShowHowToPlay,
    gameMode
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

  const canAdvancePhase = useMemo(() => {
    if(isSpectator || !isPlayerTurn) return false;
    if(targetingCard) return false;
    if(phase === TurnPhase.ROLL_SPEND || phase === TurnPhase.END || phase === TurnPhase.DRAW) return true;
    return false;
  }, [phase, isPlayerTurn, isSpectator, targetingCard]);

  const handleAdvance = () => {
    if (phase === TurnPhase.ROLL_SPEND) {
         const hasUnspentDice = dice.some(d => !d.isSpent);
        if (hasUnspentDice) {
            showConfirmation('End Phase?', 'You have unspent dice. Are you sure you want to end the phase?', () => onAdvancePhase());
        } else {
            onAdvancePhase();
        }
    } else if (phase === TurnPhase.END) {
        showConfirmation('End Turn?', 'Are you sure you want to end your turn?', () => onAdvancePhase())
    } else {
        onAdvancePhase();
    }
  }
  
  const isPlayerDefender = phase === TurnPhase.BLOCK && currentPlayerId === 1 && gameMode !== 'aiVsAi';

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-transparent text-white font-sans p-2 sm:p-4">
        {isSpectator && (
            <div className="absolute top-0 left-0 right-0 h-48 z-30 pointer-events-none">
                <Hand 
                    player={opponent}
                    isCurrentPlayer={!isPlayerTurn}
                    onCardClick={() => {}}
                    isCardPlayable={() => false}
                    isCardEvokeable={() => false}
                    onEvokeClick={() => {}}
                    isCardAmplifiable={() => false}
                    onAmplifyClick={() => {}}
                    onExamineCard={onExamineCard}
                    setHoveredCardInHand={() => {}}
                    hoveredCardInHand={null}
                    isSpectator={isSpectator}
                    isOpponentHand={true}
                />
            </div>
        )}

        {/* Strike/Block Phase UI */}
        {isPlayerTurn && !isSpectator && phase === TurnPhase.STRIKE && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-stone-bg/90 backdrop-blur-md border-2 border-stone-surface rounded-lg p-6 flex flex-col items-center gap-4 shadow-2xl animate-modal-show">
                <h3 className="text-2xl font-cinzel tracking-widest text-glow-red uppercase">Strike Phase</h3>
                <p className="text-stone-surface/80">Declare a strike with your ready units or skip combat.</p>
                <div className="flex gap-4 mt-2">
                    <button 
                        onClick={() => onAdvancePhase(false)}
                        className="w-40 h-12 bg-stone-surface text-white text-lg rounded-lg shadow-md hover:bg-stone-surface/80 transition-colors border-2 border-stone-border font-cinzel tracking-widest"
                    >
                        Skip Combat
                    </button>
                    <button 
                        onClick={() => onAdvancePhase(true)}
                        className="w-40 h-12 bg-glow-red text-white text-lg rounded-lg shadow-md hover:bg-red-500 transition-colors border-2 border-stone-border font-cinzel tracking-widest"
                    >
                        Declare Strike
                    </button>
                </div>
            </div>
        )}

        {isPlayerDefender && !isSpectator && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-stone-bg/90 backdrop-blur-md border-2 border-glow-blue rounded-lg p-6 flex flex-col items-center gap-4 shadow-2xl animate-modal-show">
                <h3 className="text-2xl font-cinzel tracking-widest text-glow-blue uppercase">Block Phase</h3>
                <p className="text-stone-surface/80">Assign blockers to incoming attackers, then confirm.</p>
                <button 
                    onClick={onConfirmBlocks}
                    className="w-48 h-12 bg-glow-blue text-white text-lg rounded-lg shadow-md hover:bg-blue-500 transition-colors border-2 border-stone-border font-cinzel tracking-widest mt-2"
                >
                    Confirm Blocks
                </button>
            </div>
        )}

        {combatPreviewData && (
            <CombatPreviewTooltip 
                attacker={combatPreviewData.attacker}
                blocker={combatPreviewData.blocker}
                attackerPlayer={opponent}
                blockerPlayer={player}
            />
        )}
        
        {targetingCard && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onCancelTargeting} />}

        <div className="w-full h-full max-w-[1800px] max-h-[1000px] grid grid-cols-[80px_2fr_1fr_80px] grid-rows-[auto_1fr_1fr_auto] gap-4 bg-stone-bg p-4 rounded-lg border-4 border-stone-border shadow-2xl relative">
                
            {/* Title */}
            <div className="col-start-2 col-span-2 text-center py-1 font-cinzel text-2xl md:text-3xl tracking-[0.5em] text-stone-surface/80 uppercase">Runworn Battlefield</div>

            {/* Morale Tracks */}
            <div className="row-start-2 row-span-2"><PlayerInfoPanel player={opponent} isOpponent={true} /></div>
            <div className="col-start-4 row-start-2 row-span-2"><PlayerInfoPanel player={player} /></div>

            {/* Opponent Area */}
            <div className="col-start-2 row-start-2">
                <DeploymentZone color="red" isCurrent={!isPlayerTurn}>
                    <PlayerArea player={opponent} players={players} gameState={gameState} onCardClick={onBoardCardClick} targetingCard={targetingCard} isCardActivatable={isCardActivatable} onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId} lastTriggeredCardId={lastTriggeredCardId} onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId} blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId} isCurrent={!isPlayerTurn} />
                </DeploymentZone>
            </div>

            {/* Player Area */}
            <div className="col-start-2 row-start-3">
                <DeploymentZone color="blue" isCurrent={isPlayerTurn}>
                    <PlayerArea player={player} players={players} gameState={gameState} onCardClick={onBoardCardClick} targetingCard={targetingCard} isCardActivatable={isCardActivatable} onActivateCard={onActivateCard} lastActivatedCardId={lastActivatedCardId} lastTriggeredCardId={lastTriggeredCardId} onExamineCard={onExamineCard} selectedBlockerId={selectedBlockerId} blockAssignments={blockAssignments} setHoveredAttackerId={setHoveredAttackerId} hoveredAttackerId={hoveredAttackerId} isCurrent={isPlayerTurn} />
                </DeploymentZone>
            </div>

            {/* Opponent Deck/Grave */}
            <div className="col-start-3 row-start-2 flex gap-4">
                <DeckZone player={opponent} />
                <GraveyardZone player={opponent} onZoneClick={onZoneClick} />
            </div>

             {/* Player Deck/Grave */}
            <div className="col-start-3 row-start-3 flex gap-4">
                <DeckZone player={player} />
                <GraveyardZone player={player} onZoneClick={onZoneClick} />
            </div>

            {/* Center Hub */}
            <div className="col-start-2 col-span-2 row-start-2 row-span-2 flex flex-col items-center justify-center pointer-events-none">
                <div className="pointer-events-auto">
                    <DiceTray 
                        dice={dice} rollCount={rollCount} maxRolls={maxRolls} onDieClick={onDieClick}
                        onRoll={onRoll} canRoll={rollCount < maxRolls && isPlayerTurn && !isSpectator} 
                        valuableDiceForHover={valuableDiceForHover}
                        isHoveredCardPlayable={isHoveredCardPlayable} lastActionDetails={gameState.lastActionDetails}
                        onAdvancePhase={handleAdvance}
                        canAdvance={canAdvancePhase}
                        phase={phase}
                        isPlayerTurn={isPlayerTurn}
                    />
                </div>
            </div>
            
            <div className="col-start-2 col-span-2 flex items-center justify-center font-cinzel text-stone-surface/60 tracking-[0.3em] text-xs uppercase"><p className="bg-stone-bg px-4">COMMAND HUB</p></div>
            <div className="col-start-2 col-span-2 row-start-4 flex items-center justify-center font-cinzel text-stone-surface/60 tracking-[0.3em] text-xs uppercase"><p className="bg-stone-bg px-4">OBLIVION (THE AETHER)</p></div>

        </div>

        {/* Hand Area - Absolute positioned over the board */}
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
                hoveredCardInHand={hoveredCardInHand}
                isSpectator={isSpectator}
            />
        </div>

      {/* Mulligan UI - Full screen overlay */}
      {phase === TurnPhase.MULLIGAN && isPlayerTurn && !isSpectator && (
        <div className="absolute inset-0 bg-stone-bg/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-4xl font-black text-glow-blue uppercase tracking-widest mb-4 font-cinzel">Choose Your Starting Hand</h2>
            <p className="text-vivid-yellow/70 mb-8">You may redraw your starting starting hand once.</p>
            <div className="flex justify-center items-end gap-4 h-80 mb-8">
                {players[0].hand.map((card) => (
                    <div key={card.instanceId} className="transition-all duration-300 ease-in-out">
                        <Card card={card} inHand={true} onExamine={onExamineCard} />
                    </div>
                ))}
            </div>
            <div className="flex space-x-6">
                <button onClick={() => onMulligan(false)} className="bg-stone-surface text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-stone-surface/80 transition-colors text-xl transform hover:scale-105 border-2 border-glow-blue uppercase tracking-wider font-cinzel">Keep Hand</button>
                <button onClick={() => onMulligan(true)} className="bg-stone-border text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-stone-surface transition-colors text-xl transform hover:scale-105 border-2 border-stone-border uppercase tracking-wider font-cinzel">Mulligan</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
