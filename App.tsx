import React, { useEffect, useState, useMemo, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import ActionHistory from './components/GameLog';
import Modal from './components/Modal';
import HowToPlay from './components/HowToPlay';
import CardViewerModal from './components/CardViewerModal';
import CardDetailsModal from './components/CardDetailsModal';
import PhaseAnnouncer from './components/PhaseAnnouncer';
import ConfirmModal from './components/ConfirmModal';
import LoadingScreen from './components/LoadingScreen';
import { useGameState, checkDiceCost, isCardTargetable } from './hooks/useGameState';
import { getAiAction } from './hooks/ai';
import { CardInGame, TurnPhase, Player, CardDefinition, CardType } from './game/types';
import { fetchCardDefinitions, requiredComposition } from './game/cards';
import { cardHasAbility } from './game/utils';


const App: React.FC = () => {
  const { state, dispatch } = useGameState();
  const [view, setView] = useState<'howToPlay' | 'game'>('howToPlay');
  const [gameMode, setGameMode] = useState<'playerVsAi' | 'aiVsAi' | 'none'>('none');
  const [allCards, setAllCards] = useState<CardDefinition[] | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [targetingInfo, setTargetingInfo] = useState<{ card: CardInGame; isAmplify?: boolean, isAugment?: boolean } | null>(null);
  const [viewingZone, setViewingZone] = useState<{ player: Player; zone: 'graveyard' | 'oblivion'; title: string } | null>(null);
  const [lastActivatedCardId, setLastActivatedCardId] = useState<string | null>(null);
  const [lastTriggeredCardId, setLastTriggeredCardId] = useState<string | null>(null);
  const [examiningCard, setExaminingCard] = useState<CardInGame | null>(null);
  const [hoveredCardInHand, setHoveredCardInHand] = useState<CardInGame | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
  
  const [blockAssignments, setBlockAssignments] = useState<Map<string, string>>(new Map()); // blockerId -> attackerId
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await fetchCardDefinitions();
        if (cards.length === 0) {
            throw new Error("No card definitions were found in the local library.");
        }

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
        setAllCards([]);
      }
    };
    loadCards();
  }, []);

  useEffect(() => {
    setTargetingInfo(null);
    setSelectedBlockerId(null);
    setBlockAssignments(new Map());
  }, [state.phase, state.currentPlayerId]);

  // Effect for handling visual feedback on automatically triggered cards (e.g., Blessings)
  useEffect(() => {
    if (state.lastTriggeredCardId) {
        setLastTriggeredCardId(state.lastTriggeredCardId);
        const timer = setTimeout(() => {
            setLastTriggeredCardId(null);
            dispatch({ type: 'CLEAR_LAST_TRIGGERED_CARD' });
        }, 1500); // Animation duration
        return () => clearTimeout(timer);
    }
  }, [state.lastTriggeredCardId, dispatch]);


  const handleStartGame = (mode: 'playerVsAi' | 'aiVsAi') => {
    if (!allCards || allCards.length === 0) return;
    setGameMode(mode);
    dispatch({ type: 'START_GAME', payload: { allCards, gameMode: mode } });
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
    if (gameMode === 'aiVsAi') return;
    if (state.currentPlayerId === 0 && state.phase === TurnPhase.ROLL_SPEND) {
      const die = state.dice.find(d => d.id === id);
      if(die) {
        dispatch({ type: 'TOGGLE_DIE_KEPT', payload: { id, keep: !die.isKept } });
      }
    }
  };

  const handleRoll = () => {
    if (gameMode === 'aiVsAi') return;
    if (state.currentPlayerId === 0 && state.phase === TurnPhase.ROLL_SPEND && state.rollCount < state.maxRolls) {
      dispatch({ type: 'ROLL_DICE' });
    }
  };

  const isCardPlayable = useCallback((card: CardInGame): boolean => {
    if (state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) return false;
    
    const costConfig = {
      dice_cost: card.abilities?.augment ? card.abilities.augment.cost : card.dice_cost,
      abilities: card.abilities,
    };

    const canPayCost = checkDiceCost(costConfig, state.dice).canPay;
    if (!canPayCost) return false;

    if (card.abilities?.requiresTarget || card.abilities?.augment) {
        const hasAnyTarget = state.players.some(targetPlayer => 
            [...targetPlayer.units, ...targetPlayer.locations, ...targetPlayer.artifacts].some(targetUnit => 
                isCardTargetable(card, targetUnit, state.players[state.currentPlayerId], targetPlayer)
            )
        );
        return hasAnyTarget;
    }

    return true;
  }, [state.phase, state.rollCount, state.dice, state.players, state.currentPlayerId]);
  
  const handleHandCardClick = (card: CardInGame) => {
    if (gameMode === 'aiVsAi' || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
    
    if (targetingInfo) {
        setTargetingInfo(null);
        return;
    }

    if (!isCardPlayable(card)) return;

    if (card.abilities?.augment) {
        setTargetingInfo({ card, isAugment: true });
        return;
    }
    if (card.abilities?.requiresTarget) {
        setTargetingInfo({ card });
        return;
    }
    
    dispatch({ type: 'PLAY_CARD', payload: { card } });
  };
  
  const isCardReclaimable = useCallback((card: CardInGame): boolean => {
      if (!card.abilities?.reclaim || (gameMode === 'playerVsAi' && state.currentPlayerId !== 0) || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
          return false;
      }
      return checkDiceCost({ ...card, dice_cost: card.abilities.reclaim.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId, gameMode]);

  const handleGraveyardCardClick = (card: CardInGame) => {
      if (gameMode === 'aiVsAi' || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
      if (isCardReclaimable(card)) {
          dispatch({ type: 'PLAY_CARD', payload: { card, options: { isReclaimed: true } } });
          setViewingZone(null); // Close the modal after reclaiming
      }
  }

  const handleBoardCardClick = (card: CardInGame) => {
    if (gameMode === 'aiVsAi') return;

    const isPlayerDefender = state.phase === TurnPhase.BLOCK && state.currentPlayerId === 1;
    if (isPlayerDefender) {
        const isOwnUnit = state.players[0].units.some(u => u.instanceId === card.instanceId);
        const isAttacker = state.combatants?.some(c => c.attackerId === card.instanceId) ?? false;
        
        if (isOwnUnit && !card.abilities?.entrenched) {
            if (selectedBlockerId === card.instanceId) {
                setSelectedBlockerId(null);
            } else {
                const newAssignments = new Map(blockAssignments);
                newAssignments.delete(card.instanceId);
                setBlockAssignments(newAssignments);
                setSelectedBlockerId(card.instanceId);
            }
        } else if (isAttacker && selectedBlockerId) {
            const newAssignments = new Map(blockAssignments);
            newAssignments.forEach((attackerId, blockerId) => {
                if (attackerId === card.instanceId) {
                    newAssignments.delete(blockerId);
                }
            });
            newAssignments.set(selectedBlockerId, card.instanceId);
            setBlockAssignments(newAssignments);
            setSelectedBlockerId(null);
        }
        return;
    }

    if (state.currentPlayerId !== 0 || !targetingInfo) return;
    
    if (card.instanceId === targetingInfo.card.instanceId) {
        setTargetingInfo(null);
        return;
    }
    
    const { card: sourceCard, isAmplify, isAugment } = targetingInfo;
    const player = state.players[0];
    const targetOwner = state.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(u => u.instanceId === card.instanceId))!;
    
    if (isCardTargetable(sourceCard, card, player, targetOwner)) {
        dispatch({ type: 'PLAY_CARD', payload: { card: sourceCard, targetInstanceId: card.instanceId, options: { isAmplified: isAmplify, isAugmented: isAugment } } });
        setTargetingInfo(null);
    }
  }

  const handleConfirmBlocks = () => {
    if (gameMode === 'aiVsAi') return;
    const assignments: { [blockerId: string]: string } = {};
    for (const [key, value] of blockAssignments.entries()) {
        assignments[key] = value;
    }
    dispatch({ type: 'DECLARE_BLOCKS', payload: { assignments } });
  };

  const isCardActivatable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.activate || (gameMode === 'playerVsAi' && state.currentPlayerId !== 0) || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    if (card.type === CardType.UNIT && card.turnPlayed === state.turn && !cardHasAbility(card, 'charge')) {
        return false;
    }
    if (card.abilities.consume && (card.counters ?? 0) <= 0) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId, state.turn, gameMode]);

  const isCardEvokeable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.evoke || (gameMode === 'playerVsAi' && state.currentPlayerId !== 0) || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.evoke.cost || [] }, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId, gameMode]);

  const isCardAmplifiable = useCallback((card: CardInGame): boolean => {
    if (!card.abilities?.amplify || (gameMode === 'playerVsAi' && state.currentPlayerId !== 0) || state.phase !== TurnPhase.ROLL_SPEND || state.rollCount === 0) {
        return false;
    }
    const combinedCost = { ...card, dice_cost: (card.dice_cost || []).concat(card.abilities.amplify.cost || []) };
    return checkDiceCost(combinedCost, state.dice).canPay;
  }, [state.phase, state.rollCount, state.dice, state.currentPlayerId, gameMode]);

  const handleActivateCard = (card: CardInGame) => {
    if (gameMode === 'aiVsAi') return;
    if (isCardActivatable(card)) {
        dispatch({ type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } });
        setLastActivatedCardId(card.instanceId);
    }
  }
   useEffect(() => {
        if (lastActivatedCardId) {
            const timer = setTimeout(() => setLastActivatedCardId(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [lastActivatedCardId]);

  const handleEvokeClick = (card: CardInGame) => {
    if (gameMode === 'aiVsAi') return;
    if(isCardEvokeable(card)) {
        dispatch({ type: 'PLAY_CARD', payload: { card, options: { isEvoked: true } } });
    }
  }

  const handleAmplifyClick = (card: CardInGame) => {
    if (gameMode === 'aiVsAi' || !isCardAmplifiable(card)) return;
    // Check if the base card effect OR the amplify-specific effect requires a target.
    if (card.abilities?.requiresTarget || card.abilities.amplify.requiresTarget) {
      setTargetingInfo({ card, isAmplify: true });
    } else {
      dispatch({ type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } });
    }
  };

  const handleAdvancePhase = (strike: boolean = false) => {
      if(gameMode === 'aiVsAi' || state.currentPlayerId !== 0) return;
      setTargetingInfo(null);
      dispatch({ type: 'ADVANCE_PHASE', payload: { strike } });
  };
  
  const handleExamineCard = (card: CardInGame) => {
    setExaminingCard(card);
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
      setConfirmation({ title, message, onConfirm });
  };
  
  const handleZoneClick = (player: Player, zone: 'graveyard' | 'oblivion') => {
    const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1);
    const title = `${player.name}'s ${zoneName} (${player[zone].length})`;
    setViewingZone({ player, zone, title });
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

 useEffect(() => {
    if (state.winner || !state.isProcessing || state.turn === 0 || gameMode === 'none') {
        if (state.isProcessing && (state.winner || state.turn === 0)) {
            dispatch({ type: 'AI_ACTION' });
        }
        return;
    }

    let timeoutId: number | undefined;

    const player0isAi = gameMode === 'aiVsAi';
    const player1isAi = gameMode === 'aiVsAi' || gameMode === 'playerVsAi';

    const handleAiTurn = (actorId: number) => {
        const aiAction = getAiAction(state, actorId);
        if (aiAction) {
            const delay = (aiAction.type === 'ROLL_DICE' || aiAction.type === 'TOGGLE_DIE_KEPT') ? 800 : 1200 + Math.random() * 800;
            timeoutId = window.setTimeout(() => {
                dispatch(aiAction);
            }, delay);
        } else if (actorId === state.currentPlayerId) {
            // Failsafe: if AI returns null for the ACTIVE player, advance to prevent stall.
            // Don't advance if it's just a waiting player (e.g. attacker in block phase).
            timeoutId = window.setTimeout(() => {
                dispatch({ type: 'ADVANCE_PHASE' });
            }, 1000);
        }
    };

    if (state.phase === TurnPhase.AI_MULLIGAN) {
        const actor = state.players.find(p => !p.hasMulliganed);
        if (actor) {
            handleAiTurn(actor.id);
        }
    } else if (state.phase === TurnPhase.BLOCK) {
        const defenderId = 1 - state.currentPlayerId;
        const isDefenderAi = (defenderId === 0 && player0isAi) || (defenderId === 1 && player1isAi);
        if (isDefenderAi) {
            handleAiTurn(defenderId);
        } else {
            // Defender is human, AI attacker is waiting. Allow human interaction.
            dispatch({ type: 'AI_ACTION' }); // Set isProcessing to false
        }
    } else {
        const isCurrentPlayerAi = (state.currentPlayerId === 0 && player0isAi) || (state.currentPlayerId === 1 && player1isAi);
        if (isCurrentPlayerAi) {
            handleAiTurn(state.currentPlayerId);
        } else {
            // Human Player's turn. Don't auto-advance.
            // Allow manual advance from START/DRAW via button.
            dispatch({ type: 'AI_ACTION' }); // Set isProcessing to false
        }
    }

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}, [state.isProcessing, state.winner, state.phase, state.currentPlayerId, state.turn, gameMode, dispatch]);


  if (allCards === null || allCards.length === 0) {
    return <LoadingScreen loadingError={loadingError} />;
  }
  
  const isGameInProgress = state.turn > 0 && !state.winner;
  if (view === 'howToPlay') {
    return <HowToPlay onStartGame={handleStartGame} onReturn={() => setView('game')} isGameInProgress={isGameInProgress} />;
  }

  return (
    <main className="relative w-screen h-screen font-sans bg-stone-bg">
      <GameBoard
        gameState={state}
        isSpectator={gameMode === 'aiVsAi'}
        gameMode={gameMode}
        onDieClick={handleDieClick}
        onRoll={handleRoll}
        onHandCardClick={handleHandCardClick}
        onBoardCardClick={handleBoardCardClick}
        isCardPlayable={isCardPlayable}
        onAdvancePhase={handleAdvancePhase}
        targetingCard={targetingInfo?.card ?? null}
        onCancelTargeting={() => setTargetingInfo(null)}
        isCardActivatable={isCardActivatable}
        onActivateCard={handleActivateCard}
        lastActivatedCardId={lastActivatedCardId}
        lastTriggeredCardId={lastTriggeredCardId}
        onExamineCard={handleExamineCard}
        hoveredCardInHand={hoveredCardInHand}
        setHoveredCardInHand={setHoveredCardInHand}
        onMulligan={handleMulliganChoice}
        showConfirmation={showConfirmation}
        onConfirmBlocks={handleConfirmBlocks}
        selectedBlockerId={selectedBlockerId}
        blockAssignments={blockAssignments}
        onZoneClick={handleZoneClick}
        onGraveyardCardClick={handleGraveyardCardClick}
        isCardReclaimable={isCardReclaimable}
        isCardEvokeable={isCardEvokeable}
        // Fix: Pass the correct handler function `handleEvokeClick` for the `onEvokeClick` prop.
        onEvokeClick={handleEvokeClick}
        isCardAmplifiable={isCardAmplifiable}
        // Fix: Pass the correct handler function `handleAmplifyClick` for the `onAmplifyClick` prop.
        onAmplifyClick={handleAmplifyClick}
        onShowHowToPlay={() => setView('howToPlay')}
      />

      <ActionHistory history={state.actionHistory} players={state.players} />

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
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-20 text-stone-bg font-bold uppercase tracking-widest px-6 py-3 rounded-lg z-30 ${targetingInfo.isAmplify ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-vivid-pink shadow-vivid-pink'}`}>
          Select a target for {targetingInfo.card.name}
        </div>
      )}
      {viewingZone && (
          <CardViewerModal 
            title={viewingZone.title}
            cards={viewingZone.player[viewingZone.zone]}
            onClose={() => setViewingZone(null)}
            onExamine={handleExamineCard}
            isCardReclaimable={isCardReclaimable}
            onCardClick={viewingZone.zone === 'graveyard' && viewingZone.player.id === state.currentPlayerId && gameMode === 'playerVsAi' ? handleGraveyardCardClick : undefined}
          />
      )}
      {examiningCard && (
        <CardDetailsModal 
            card={examiningCard}
            onClose={() => setExaminingCard(null)}
        />
      )}
      {state.winner && (
        <Modal title="Game Over" onClose={() => { handleStartGame(gameMode as 'playerVsAi' | 'aiVsAi') }} onHowToPlay={() => setView('howToPlay')}>
          <p>{state.winner.name} is victorious!</p>
        </Modal>
      )}
    </main>
  );
};

export default App;
