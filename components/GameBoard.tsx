
import React from 'react';
// FIX: 'TurnPhase' is an enum, which is a runtime value. It cannot be imported using 'import type'. Changed to a regular import.
import { type GameState, type CardInGame, type Player, TurnPhase, getEffectiveStats, CardType } from '../game/types';
import DiceTray from './DiceTray';
import Card from './Card';


// This component is now exported so App.tsx can use it for the HUD
export const PlayerInfoPanel: React.FC<{ player: Player, isCurrent: boolean, isOpponent?: boolean }> = ({ player, isCurrent, isOpponent = false }) => (
    <div className={`w-64 bg-cyber-surface/80 backdrop-blur-sm p-4 rounded-lg text-white h-full flex flex-col justify-between border-2 ${isCurrent ? 'border-neon-cyan shadow-neon-cyan' : 'border-cyber-border'}`}>
        <div>
            <h2 className={`text-2xl font-bold truncate ${isCurrent ? 'text-neon-cyan' : ''}`}>{player.name}</h2>
            <p className={`text-4xl font-black ${isOpponent ? 'text-right' : 'text-left'} text-neon-pink`}>{player.command} <span className="text-lg opacity-75">Command</span></p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
            <div>
                <div className="font-bold text-lg text-neon-yellow">{player.deck.length}</div>
                <div className="opacity-75">Deck</div>
            </div>
            <div>
                <div className="font-bold text-lg text-neon-yellow">{player.hand.length}</div>
                <div className="opacity-75">Hand</div>
            </div>
            <div>
                <div className="font-bold text-lg text-neon-yellow">{player.graveyard.length}</div>
                <div className="opacity-75">Grave</div>
            </div>
        </div>
    </div>
);

// New sub-component for cards on the field
const FieldArea: React.FC<{ 
    player: Player;
    isOpponent: boolean;
    onCardClick: (card: CardInGame) => void;
    targetingCard: CardInGame | null;
    isCardActivatable: (card: CardInGame) => boolean;
    onActivateCard: (card: CardInGame) => void;
    isCurrentPlayer: boolean;
    phase: TurnPhase;
}> = ({ player, isOpponent, onCardClick, targetingCard, isCardActivatable, onActivateCard, isCurrentPlayer, phase }) => {
    
    return (
        <div className="flex-grow w-full flex items-center justify-center p-2 min-h-[12rem] bg-[radial-gradient(ellipse_at_center,_rgba(26,9,58,0.3)_0%,_rgba(13,2,33,0)_60%)]">
            <div className="flex gap-4 items-center justify-center w-full h-full">
                {[...player.locations, ...player.artifacts, ...player.units].map(card => {
                    const isUnit = card.type === CardType.UNIT;
                    
                    let isTargetable = false;
                    if (targetingCard) {
                        const isEnemyTarget = isOpponent && isUnit && !card.keywords?.stealth && (!card.keywords?.breach || card.hasAssaulted) && !card.keywords?.immutable;
                        const isFriendlyRecallTarget = !isOpponent && isUnit && targetingCard.keywords?.recall;
                        
                        if (targetingCard.keywords?.recall) {
                             isTargetable = isFriendlyRecallTarget;
                        } else {
                             isTargetable = isEnemyTarget;
                        }
                    }

                    const isAssaultPhase = isCurrentPlayer && phase === TurnPhase.ASSAULT;
                    const { strength: effectiveStrength, durability: effectiveDurability } = getEffectiveStats(card, player, { isAssaultPhase });
                    
                    return (
                        <Card 
                            key={card.instanceId} 
                            card={card} 
                            onClick={isTargetable ? () => onCardClick(card) : undefined}
                            isTargetable={isTargetable}
                            onActivate={card.keywords?.activate && isCurrentPlayer ? () => onActivateCard(card) : undefined}
                            isActivatable={isCurrentPlayer && isCardActivatable(card)}
                            effectiveStrength={effectiveStrength}
                            effectiveDurability={effectiveDurability}
                        />
                    );
                })}
                {[...player.locations, ...player.artifacts, ...player.units].length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-cyber-primary/50 italic text-lg">FIELD EMPTY</div>
                )}
            </div>
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
    isCurrentPlayer: boolean
}> = ({ 
    player, isOpponent, onCardClick, onGraveyardCardClick, isCardPlayable, isCardScavengeable, 
    isCardChannelable, onChannelClick, isCardAmplifiable, onAmplifyClick, isCurrentPlayer 
}) => {
    if (isOpponent) {
        return (
            <div className="h-24 flex-shrink-0 flex justify-center items-center -space-x-12">
                {player.hand.map((card) => (
                    <div key={card.instanceId} className="w-40 h-56 bg-gradient-to-b from-cyber-border to-cyber-bg rounded-lg border-2 border-cyber-border shadow-xl flex items-center justify-center transform -translate-y-20">
                        <span className="text-2xl font-black text-neon-pink/50">CARD</span>
                    </div>
                ))}
            </div>
        );
    }
    
    // Player's Fanned Hand
    const scavengeableCards = player.graveyard.filter(isCardScavengeable);

    return (
        <div className="h-64 flex-shrink-0 flex justify-center items-end pb-4">
            <div className="flex justify-center items-end -space-x-16">
                 {scavengeableCards.map(card => (
                    <div 
                        key={card.instanceId}
                        className="transition-all duration-300 ease-in-out hover:-translate-y-8 hover:z-20 origin-bottom hover:!rotate-0"
                    >
                        <Card
                            card={card}
                            inHand={true}
                            isPlayable={isCurrentPlayer && isCardScavengeable(card)}
                            onClick={() => onGraveyardCardClick(card)}
                            origin="graveyard"
                        />
                    </div>
                 ))}
                 {player.hand.map((card, i) => {
                    const numCards = player.hand.length;
                    const rotation = (i - (numCards - 1) / 2) * 4;
                    return (
                        <div 
                            key={card.instanceId} 
                            className="transition-all duration-300 ease-in-out hover:-translate-y-8 hover:z-20 origin-bottom hover:!rotate-0" 
                            style={{ transform: `rotate(${rotation}deg)`}}
                        >
                            <Card
                                card={card}
                                inHand={true}
                                isPlayable={isCurrentPlayer && isCardPlayable(card)}
                                onClick={() => onCardClick(card)}
                                onChannel={card.keywords?.channel && isCurrentPlayer ? () => onChannelClick(card) : undefined}
                                isChannelable={isCurrentPlayer && isCardChannelable(card)}
                                onAmplify={card.keywords?.amplify && isCurrentPlayer ? () => onAmplifyClick(card) : undefined}
                                isAmplifiable={isCurrentPlayer && isCardAmplifiable(card)}
                                origin="hand"
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
}

const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, onDieClick, onRoll, onCardClick, onGraveyardCardClick, onFieldCardClick, 
    isCardPlayable, isCardScavengeable, isCardChannelable, onChannelClick,
    isCardAmplifiable, onAmplifyClick,
    onAdvancePhase, targetingCard, isCardActivatable, onActivateCard 
}) => {
  const { players, currentPlayerId, phase, dice, rollCount, turn } = gameState;
  const currentPlayer = players[currentPlayerId];
  const opponentPlayer = players[1 - currentPlayerId];

  const isPlayerTurn = currentPlayerId === 0;

  const getPhaseAction = () => {
    if (!isPlayerTurn) return null;
    if (targetingCard) return { text: "CANCEL", action: () => onCardClick(targetingCard), disabled: false };
    switch(phase) {
        case TurnPhase.START: return null;
        case TurnPhase.ROLL_SPEND: return { text: "END PHASE", action: () => onAdvancePhase(), disabled: false };
        case TurnPhase.DRAW: return { text: "DRAW CARD", action: () => onAdvancePhase(), disabled: false };
        case TurnPhase.ASSAULT: return null; // Handled by separate JSX below
        case TurnPhase.END: return { text: "END TURN", action: () => onAdvancePhase(), disabled: false };
        default: return null;
    }
  }
  const phaseAction = getPhaseAction();

  return (
    <div className="w-full h-screen flex flex-col bg-transparent text-white font-bold uppercase overflow-hidden">

      {/* Opponent's Side (reversed column) */}
      <div className="flex-1 flex flex-col-reverse">
        <FieldArea 
            player={opponentPlayer} 
            onCardClick={onFieldCardClick} 
            isOpponent={true} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            isCurrentPlayer={currentPlayerId === opponentPlayer.id}
            phase={phase}
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
        />
      </div>

      {/* Center Bar */}
      <div className="flex-shrink-0 border-y-2 border-neon-cyan/20 bg-black/20 backdrop-blur-sm flex items-center justify-center gap-6 px-4 h-40">
        <div className="text-center w-64">
             <div className="bg-cyber-surface/80 px-6 py-2 rounded-lg shadow-lg border-2 border-cyber-border text-neon-yellow tracking-widest">
                Turn {turn} - {players[currentPlayerId].name}'s {phase} Phase
            </div>
        </div>

        <div className="flex-grow flex items-center justify-center">
            {phase === TurnPhase.ROLL_SPEND && isPlayerTurn && (
                <DiceTray
                    dice={dice}
                    rollCount={rollCount}
                    onDieClick={onDieClick}
                    onRoll={onRoll}
                    canRoll={rollCount < 3}
                />
            )}
        </div>
        
        <div className="w-64 flex items-center justify-center">
             {phase === TurnPhase.ASSAULT && isPlayerTurn ? (
                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => onAdvancePhase(true)}
                        disabled={currentPlayer.units.filter(u => !u.keywords?.entrenched).length === 0}
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
            onCardClick={onFieldCardClick} 
            isOpponent={false} 
            targetingCard={targetingCard}
            isCardActivatable={isCardActivatable}
            onActivateCard={onActivateCard}
            isCurrentPlayer={currentPlayerId === currentPlayer.id}
            phase={phase}
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
        />
      </div>
    </div>
  );
};

export default GameBoard;
