



import React, { useEffect, useState, useMemo, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import ActionHistory from './components/GameLog';
import Modal from './components/Modal';
import HowToPlay from './components/HowToPlay';
import PlayerInfoPanel from './components/PlayerInfoPanel';
import CardViewerModal from './components/CardViewerModal';
import CardDetailsModal from './components/CardDetailsModal';
import PhaseAnnouncer from './components/PhaseAnnouncer';
import ConfirmModal from './components/ConfirmModal';
import LoadingScreen from './components/LoadingScreen';
import { useGameState, checkDiceCost, isCardTargetable } from './hooks/useGameState';
import { CardInGame, TurnPhase, Player, CardDefinition, CardType, DiceCost } from './game/types';
import { fetchCardDefinitions, requiredComposition } from './game/cards';


const App: React.FC = () => {
  const { state, dispatch, aiAction } = useGameState();
  const [view, setView] = useState<'howToPlay' | 'game'>('howToPlay');
  const [allCards, setAllCards] = useState<CardDefinition[] | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [targetingInfo, setTargetingInfo] = useState<{ card: CardInGame; isAmplify: boolean } | null>(null);
  const [viewingZone, setViewingZone] = useState<{ player: Player; zone: 'graveyard' | 'void'; title: string } | null>(null);
  const [lastActivatedCardId, setLastActivatedCardId] = useState<string | null>(null);
  const [examiningCard, setExaminingCard] = useState<CardInGame | null>(null);
  const [hoveredCardInHand, setHoveredCardInHand] = useState<CardInGame | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // State for block assignments
  const [blockAssignments, setBlockAssignments] = useState<Map<string, string>>(new Map()); // blockerId -> attackerId
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);

  // State for animations
  const [isOpponentDrawing, setIsOpponentDrawing] = useState(false);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await fetchCardDefinitions();
        if (cards.length === 0) {
            throw new Error("No card definitions loaded. The network may be down.");
        }

        // Check if a valid deck can be constructed from the loaded cards.
        const cardCountsByType = cards.reduce((acc, card) => {
            acc[card.type] = (acc[card.type] || 0) + 1;
            return acc;
        }, {} as Record<CardType, number>);

        const missingCards: string[] = [];
        for (const [cardType, requiredCount] of Object.entries(requiredComposition)) {
            const haveCount = cardCountsByType[cardType as CardType] || 0;
            if (haveCount < requiredCount) {
                missingCards.push(`${requiredCount} ${cardType}s (found ${haveCount})`);
            }
        }

        if (missingCards.length > 0) {
            throw new Error(`Cannot start game: insufficient cards in database. Missing: ${missingCards.join(', ')}.`);
        }

        setAllCards(cards);
        setLoadingError(null);
      } catch (error) {
        if (error instanceof Error) {
            setLoadingError(error.message);
        } else {
            setLoadingError("An unknown error occurred while loading cards.");
        }
        setAllCards([]); // Indicate loading is done, but failed
      }
    };
    loadCards();
  }, []);

  // Clear transient state on phase/turn changes
  useEffect(() => {
    setTargetingInfo(null);
    setSelectedBlockerId(null);
    setBlockAssignments(new Map());
  }, [state.phase, state.currentPlayerId]);


  const handleStartGame = () => {
    if (!allCards || allCards.length === 0) return;
    dispatch({ type: 'START_GAME', payload: { allCards } });
    setView('game');
    setTargetingInfo(null);
    setViewingZone(null);
    setExaminingCard(null);
    setConfirmation(null);
  };

  const handleMulliganChoice = (mulligan: boolean) => {
    dispatch({ type: 'PLAYER_MULLIGAN_CHOICE', payload: { mulligan } });
  }

  const handleDieClick = (id: number) => {
    if (state.currentPlayerId === 0 && state.phase === TurnPhase.ROLL_SPEND) {
      const die = state.dice.find(d => d.id === id);
      if(die) {
        dispatch({ type: 'TOGGLE_DIE_KEPT', payload: { id, keep: !die.isKept } });
      }
    }
  };

  const handleRoll = () => {
    if (state.currentPlayerId === 0 && state.phase === TurnPhase.ROLL_SPEND && state.rollCount < state.maxRolls) {
      dispatch({ type: 'ROLL_DICE' });
    }
  };

  const isCardPlayable = useCallback((card: CardInGame): boolean => {
    if (state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) return false;
    
    let dice_cost: DiceCost[] | undefined = card.dice_cost;
    // Augment has a different cost and is handled like a targeted ability
    if (card.abilities?.augment) {
        dice_cost = card.abilities.augment.cost;
    }

    const canPayCost = checkDiceCost({ ...card, dice_cost: dice_cost || [] }, state.dice).canPay;
    if (!canPayCost) return false;

    if (card.abilities?.requiresTarget || card.abilities?.augment) {
        const hasAnyTarget = state.players.some(targetPlayer => 
            [...targetPlayer.units, ...targetPlayer.locations, ...targetPlayer.artifacts].some(targetUnit => 
                isCardTargetable(card, targetUnit, state.players[0], targetPlayer)
            )
        );
        return hasAnyTarget;
    }

    return true;
  }, [state.phase, state.rollCount, state.dice, state.players]);
  
  const handleHandCardClick = (card: CardInGame) => {
    if (state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
    
    if (targetingInfo) { // Cancel targeting
        setTargetingInfo(null);
        return;
    }

    if (!isCardPlayable(card)) return;

    if (card.abilities?.requiresTarget || card.abilities?.augment) {
        setTargetingInfo({ card, isAmplify: false });
        return;
    }
    
    // Play card without target
    dispatch({ type: 'PLAY_CARD', payload: { card } });
  };
  
  const isCardScavengeable = useCallback((card: CardInGame): boolean => {
      if (!card.abilities?.scavenge || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
          return false;
      }
      return checkDiceCost({ ...card, dice_cost: card.abilities.scavenge.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId]);

  const handleGraveyardCardClick = (card: CardInGame) => {
      if (state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
      if (isCardScavengeable(card)) {
          dispatch({ type: 'PLAY_CARD', payload: { card, options: { isScavenged: true } } });
      }
  }

  const handleBoardCardClick = (card: CardInGame) => {
    // --- BLOCKING LOGIC ---
    const isPlayerDefender = state.phase === TurnPhase.BLOCK && state.currentPlayerId === 1;
    if (isPlayerDefender) {
        const isOwnUnit = state.players[0].units.some(u => u.instanceId === card.instanceId);
        const isAttacker = state.combatants?.some(c => c.attackerId === card.instanceId) ?? false;
        
        if (isOwnUnit && !card.abilities?.entrenched) { // Clicked on one of my units
            if (selectedBlockerId === card.instanceId) {
                // Clicked the selected blocker again -> deselect it
                setSelectedBlockerId(null);
            } else {
                // Select this unit as the blocker. If it was already blocking someone else,
                // that assignment is broken and it's now ready to be reassigned.
                const newAssignments = new Map(blockAssignments);
                newAssignments.delete(card.instanceId); // Remove previous assignment if it exists
                setBlockAssignments(newAssignments);
                setSelectedBlockerId(card.instanceId);
            }
        } else if (isAttacker && selectedBlockerId) { // Clicked on an attacker with a blocker selected
            const newAssignments = new Map(blockAssignments);
            // An attacker can only be blocked by one unit. So if another unit was blocking this attacker, un-assign it.
            newAssignments.forEach((attackerId, blockerId) => {
                if (attackerId === card.instanceId) {
                    newAssignments.delete(blockerId);
                }
            });
            // Assign the currently selected unit to block this attacker
            newAssignments.set(selectedBlockerId, card.instanceId);
            setBlockAssignments(newAssignments);
            setSelectedBlockerId(null); // Clear selection after assignment
        }
        return;
    }

    // --- TARGETING LOGIC ---
    if (state.currentPlayerId !== 0 || !targetingInfo) return;
    
    const { card: sourceCard, isAmplify } = targetingInfo;
    const player = state.players[0];
    const targetOwner = state.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(u => u.instanceId === card.instanceId))!;
    
    if (isCardTargetable(sourceCard, card, player, targetOwner)) {
        dispatch({ type: 'PLAY_CARD', payload: { card: sourceCard, targetInstanceId: card.instanceId, options: { isAmplified: isAmplify } } });
        setTargetingInfo(null);
    }
  }

  const handleConfirmBlocks = () => {
    const assignments: { [blockerId: string]: string } = {};
    for (const [key, value] of blockAssignments.entries()) {
        assignments[key] = value;
    }
    dispatch({ type: 'DECLARE_BLOCKS', payload: { assignments } });
  };

  const isCardActivatable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.activate || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    if (card.abilities.consume && (card.counters ?? 0) <= 0) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId]);

  const isCardChannelable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.channel || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.channel.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId]);

  const isCardAmplifiable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.amplify || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    const combinedCost = { ...card, dice_cost: (card.dice_cost || []).concat(card.abilities.amplify.cost || []) };
    return checkDiceCost(combinedCost, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId]);

  const handleActivateCard = (card: CardInGame) => {
    if (isCardActivatable(card)) {
        dispatch({ type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } });
        setLastActivatedCardId(card.instanceId);
    }
  }
   useEffect(() => {
        if (lastActivatedCardId) {
            const timer = setTimeout(() => setLastActivatedCardId(null), 1000); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [lastActivatedCardId]);

  const handleChannelClick = (card: CardInGame) => {
    if(isCardChannelable(card)) {
        dispatch({ type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } });
    }
  }

  const handleAmplifyClick = (card: CardInGame) => {
    if (!isCardAmplifiable(card)) return;
    if (card.abilities?.requiresTarget || card.abilities.amplify.effect?.type === 'DEAL_DAMAGE') {
      setTargetingInfo({ card, isAmplify: true });
    } else {
      dispatch({ type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } });
    }
  };

  const handleAdvancePhase = (assault: boolean = false) => {
      if(state.currentPlayerId === 0) {
        setTargetingInfo(null); // Cancel targeting on phase advance
        dispatch({ type: 'ADVANCE_PHASE', payload: { assault } });
      }
  };
  
  const handleExamineCard = (card: CardInGame) => {
    setExaminingCard(card);
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
      setConfirmation({ title, message, onConfirm });
  };

  const handleConfirm = () => {
      if (confirmation) {
          confirmation.onConfirm();
          setConfirmation(null);
      }
  };

  const handleCancel = () => {
      setConfirmation(null);
  };

  // Main game loop and AI logic
  useEffect(() => {
    if (state.winner || !state.isProcessing || state.turn === 0) return;

    let timeoutId: number | undefined;
    
    const isPlayerCurrent = state.currentPlayerId === 0;
    // AI needs to act if it's its turn OR if it's the BLOCK phase and the player is attacking
    const isAiTurnToAct = !isPlayerCurrent || (state.phase === TurnPhase.BLOCK && isPlayerCurrent) || state.phase === TurnPhase.AI_MULLIGAN;

    // Trigger opponent draw animation
    if (state.isProcessing && state.phase === TurnPhase.DRAW && state.currentPlayerId === 1) {
        setIsOpponentDrawing(true);
        setTimeout(() => setIsOpponentDrawing(false), 1200); // Animation duration
    }

    if (isAiTurnToAct) {
        if (aiAction) {
            console.log("AI Action:", aiAction);
            const randomDelay = 1200 + Math.random() * 1000;
            timeoutId = window.setTimeout(() => {
                dispatch(aiAction);
            }, randomDelay);
        } else {
            // Failsafe: If AI computes no action, advance the phase to prevent a soft lock.
            console.error("AI returned no action. Advancing phase to prevent stall.");
            timeoutId = window.setTimeout(() => {
                dispatch({ type: 'ADVANCE_PHASE' });
            }, 1800);
        }
    } else if (state.phase === TurnPhase.START) {
        // Auto-advance start phase for any player
        timeoutId = window.setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), 1500);
    } else if (isPlayerCurrent && state.phase === TurnPhase.DRAW) {
        // Auto-advance draw phase for the player
        timeoutId = window.setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), 1500);
    } else if (state.isProcessing) {
        // Unlock UI for player if it's not the AI's turn to act but state is processing
        dispatch({ type: 'AI_ACTION' });
    }

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}, [state.isProcessing, state.winner, state.phase, state.currentPlayerId, state.turn, aiAction, dispatch]);


  if (allCards === null || allCards.length === 0) {
    return <LoadingScreen loadingError={loadingError} />;
  }
  
  if (view === 'howToPlay') {
    return <HowToPlay onPlay={handleStartGame} />;
  }

  const isPlayerCurrent = state.currentPlayerId === 0;

  return (
    <main className="relative w-screen h-screen font-sans bg-cyber-bg">
      <GameBoard
        gameState={state}
        onDieClick={handleDieClick}
        onRoll={handleRoll}
        onHandCardClick={handleHandCardClick}
        onGraveyardCardClick={handleGraveyardCardClick}
        onBoardCardClick={handleBoardCardClick}
        isCardPlayable={isCardPlayable}
        isCardScavengeable={isCardScavengeable}
        isCardChannelable={isCardChannelable}
        onChannelClick={handleChannelClick}
        isCardAmplifiable={isCardAmplifiable}
        onAmplifyClick={handleAmplifyClick}
        onAdvancePhase={handleAdvancePhase}
        targetingCard={targetingInfo?.card ?? null}
        isCardActivatable={isCardActivatable}
        onActivateCard={handleActivateCard}
        lastActivatedCardId={lastActivatedCardId}
        onExamineCard={handleExamineCard}
        hoveredCardInHand={hoveredCardInHand}
        setHoveredCardInHand={setHoveredCardInHand}
        onMulligan={handleMulliganChoice}
        showConfirmation={showConfirmation}
        onConfirmBlocks={handleConfirmBlocks}
        selectedBlockerId={selectedBlockerId}
        blockAssignments={blockAssignments}
        isOpponentDrawing={isOpponentDrawing}
      />

      {/* HUD Elements */}
      <ActionHistory history={state.actionHistory} players={state.players} />

      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 h-36 md:h-40 z-10">
        <PlayerInfoPanel 
            player={state.players[0]} 
            isCurrent={isPlayerCurrent}
            onZoneClick={(zone) => setViewingZone({ player: state.players[0], zone, title: `Your ${zone}`})}
        />
      </div>

      <div className="absolute top-2 right-2 md:top-4 md:right-4 h-36 md:h-40 z-10">
        <PlayerInfoPanel 
            player={state.players[1]} 
            isCurrent={!isPlayerCurrent} 
            isOpponent={true}
            onZoneClick={(zone) => setViewingZone({ player: state.players[1], zone, title: `Opponent's ${zone}`})}
        />
      </div>
      
      <button 
        onClick={() => setView('howToPlay')} 
        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 w-10 h-10 md:w-12 md:h-12 bg-cyber-primary/80 rounded-full flex items-center justify-center text-xl md:text-2xl font-black hover:bg-cyber-secondary transition-colors z-20 border-2 border-cyber-border"
        aria-label="How to Play"
      >
        ?
      </button>

      {/* Overlays */}
       <PhaseAnnouncer phase={state.phase} turn={state.turn} />
      
      <ConfirmModal 
        isOpen={!!confirmation}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {targetingInfo && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-20 text-cyber-bg font-bold uppercase tracking-widest px-6 py-3 rounded-lg z-30 ${targetingInfo.isAmplify ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-neon-pink shadow-neon-pink'}`}>
          Select a target for {targetingInfo.card.name} {targetingInfo.isAmplify ? '(Amplified)' : ''}
        </div>
      )}
      {viewingZone && (
          <CardViewerModal 
            title={viewingZone.title}
            cards={viewingZone.player[viewingZone.zone]}
            onClose={() => setViewingZone(null)}
            onExamine={handleExamineCard}
          />
      )}
      {examiningCard && (
        <CardDetailsModal 
            card={examiningCard}
            onClose={() => setExaminingCard(null)}
        />
      )}
      {state.winner && (
        <Modal title="Game Over" onClose={handleStartGame} onHowToPlay={() => setView('howToPlay')}>
          <p>{state.winner.name} is victorious!</p>
        </Modal>
      )}
    </main>
  );
};

export default App;