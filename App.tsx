import React, { useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import GameBoard from './components/GameBoard';
import GameLog from './components/GameLog';
import Modal from './components/Modal';
import HowToPlay from './components/HowToPlay';
import PlayerInfoPanel from './components/PlayerInfoPanel';
import CardViewerModal from './components/CardViewerModal';
import CardDetailsModal from './components/CardDetailsModal';
import PhaseAnnouncer from './components/PhaseAnnouncer';
import { useGameState, checkDiceCost, isCardTargetable } from './hooks/useGameState';
import { CardInGame, TurnPhase, Player, CardDefinition, CardType } from './game/types';
import { fetchCardDefinitions, requiredComposition } from './game/cards';


const App: React.FC = () => {
  const { state, dispatch, aiAction } = useGameState();
  const [view, setView] = useState<'howToPlay' | 'game'>('howToPlay');
  const [allCards, setAllCards] = useState<CardDefinition[] | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [targetingInfo, setTargetingInfo] = useState<{ card: CardInGame; isAmplify: boolean } | null>(null);
  const [viewingZone, setViewingZone] = useState<{ player: Player; zone: 'graveyard' | 'void'; title: string } | null>(null);
  const [lastActivatedCardId, setLastActivatedCardId] = useState<string | null>(null);
  const [announcedPhase, setAnnouncedPhase] = useState<string | null>(state.phase);
  const [examiningCard, setExaminingCard] = useState<CardInGame | null>(null);
  const [hoveredCardInHand, setHoveredCardInHand] = useState<CardInGame | null>(null);

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

  useEffect(() => {
    setLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  useEffect(() => {
    if (state.phase !== TurnPhase.MULLIGAN && state.phase !== TurnPhase.AI_MULLIGAN) {
       setAnnouncedPhase(state.phase);
    }
  }, [state.phase]);

  const handleStartGame = () => {
    if (!allCards) return;
    dispatch({ type: 'START_GAME', payload: { allCards } });
    setView('game');
    setTargetingInfo(null);
    setViewingZone(null);
    setExaminingCard(null);
  };

  const handleMulliganChoice = (mulligan: boolean) => {
    dispatch({ type: 'PLAYER_MULLIGAN_CHOICE', payload: { mulligan } });
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord' });
    if (error) console.error("Error logging in with Discord:", error);
  };

  const handleLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error logging out:", error);
  };

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
  
  const handleCardClick = (card: CardInGame) => {
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

  const handleGraveyardCardClick = (card: CardInGame) => {
      if (state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
      if (isCardScavengeable(card)) {
          dispatch({ type: 'PLAY_CARD', payload: { card, options: { isScavenged: true } } });
      }
  }

  const handleFieldCardClick = (targetCard: CardInGame) => {
      if (state.currentPlayerId !== 0 || !targetingInfo) return;
      
      const { card, isAmplify } = targetingInfo;
      const player = state.players[0];
      const targetOwner = state.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(u => u.instanceId === targetCard.instanceId))!;
      
      if (isCardTargetable(card, targetCard, player, targetOwner)) {
          dispatch({ type: 'PLAY_CARD', payload: { card, targetInstanceId: targetCard.instanceId, options: { isAmplified: isAmplify } } });
          setTargetingInfo(null);
      }
  }

  const isCardPlayable = (card: CardInGame): boolean => {
    if (state.phase !== TurnPhase.ROLL_SPEND) return false;
    
    let dice_cost = card.dice_cost;
    // Augment has a different cost and is handled like a targeted ability
    if (card.abilities?.augment) {
        dice_cost = card.abilities.augment.cost;
    }

    const canPayCost = checkDiceCost({ ...card, dice_cost }, state.dice).canPay;
    if (!canPayCost) return false;

    if (card.abilities?.requiresTarget || card.abilities?.augment) {
        const hasAnyTarget = state.players.some(targetPlayer => 
            targetPlayer.units.some(targetUnit => 
                isCardTargetable(card, targetUnit, state.players[0], targetPlayer)
            )
        );
        return hasAnyTarget;
    }

    return true;
  };
  
  const isCardActivatable = (card: CardInGame): boolean => {
    if (!card.abilities?.activate || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost }, state.dice).canPay;
  };

  const isCardChannelable = (card: CardInGame): boolean => {
    if (!card.abilities?.channel || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
        return false;
    }
    return checkDiceCost({ ...card, dice_cost: card.abilities.channel.cost }, state.dice).canPay;
  }

  const isCardAmplifiable = (card: CardInGame): boolean => {
    if (!card.abilities?.amplify || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
        return false;
    }
    const combinedCost = { ...card, dice_cost: card.dice_cost.concat(card.abilities.amplify.cost) };
    return checkDiceCost(combinedCost, state.dice).canPay;
  };

  const isCardScavengeable = (card: CardInGame): boolean => {
      if (!card.abilities?.scavenge || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
          return false;
      }
      return checkDiceCost({ ...card, dice_cost: card.abilities.scavenge.cost }, state.dice).canPay;
  }

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
    if (card.abilities?.requiresTarget) {
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

  // Main game loop and AI logic
  useEffect(() => {
    if (state.winner || !state.isProcessing || state.turn === 0 || state.phase === TurnPhase.MULLIGAN) return;

    let timeoutId: number | undefined;

    // Auto-advance for phases that require no user input
    if (state.phase === TurnPhase.START) {
       timeoutId = window.setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), 1000);
    }
    // AI Turn Logic
    else if ((state.currentPlayerId === 1 || state.phase === TurnPhase.AI_MULLIGAN) && aiAction) {
       console.log("AI Action:", aiAction);
       timeoutId = window.setTimeout(() => {
         dispatch(aiAction);
       }, 1200);
    } else if (state.isProcessing) {
      // If no AI action, but still processing, mark as not processing for player
       dispatch({ type: 'AI_ACTION' });
    }
    
    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
  }, [state.isProcessing, state.winner, state.phase, state.currentPlayerId, state.turn, aiAction, dispatch]);

  if (loadingSession) {
    return (
        <div className="w-screen h-screen bg-cyber-bg flex items-center justify-center text-neon-cyan text-2xl font-bold uppercase tracking-widest">
            Connecting to Grid...
        </div>
    );
  }

  if (view === 'howToPlay') {
    return <HowToPlay 
        onPlay={handleStartGame} 
        cardsLoaded={!!allCards && allCards.length > 0}
        loadingError={loadingError}
        session={session}
        onLogin={handleLogin}
        onLogout={handleLogout}
     />;
  }
  
  if (!allCards || state.turn === 0) {
    return (
        <div className="w-screen h-screen bg-cyber-bg flex items-center justify-center text-neon-cyan text-2xl font-bold uppercase tracking-widest">
            Loading Assets...
        </div>
    );
  }

  const isPlayerCurrent = state.currentPlayerId === 0;

  return (
    <main className="relative w-screen h-screen font-sans bg-cyber-bg">
      <GameBoard
        gameState={state}
        onDieClick={handleDieClick}
        onRoll={handleRoll}
        onCardClick={handleCardClick}
        onGraveyardCardClick={handleGraveyardCardClick}
        onFieldCardClick={handleFieldCardClick}
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
      />

      {/* HUD Elements */}
      <div className="absolute top-4 left-4 h-1/2 z-10 pointer-events-none">
        <GameLog log={state.log} />
      </div>

      <div className="absolute bottom-4 left-4 h-40 z-10">
        <PlayerInfoPanel 
            player={state.players[0]} 
            isCurrent={isPlayerCurrent}
            onZoneClick={(zone) => setViewingZone({ player: state.players[0], zone, title: `Your ${zone}`})}
        />
      </div>

      <div className="absolute top-4 right-4 h-40 z-10">
        <PlayerInfoPanel 
            player={state.players[1]} 
            isCurrent={!isPlayerCurrent} 
            isOpponent={true}
            onZoneClick={(zone) => setViewingZone({ player: state.players[1], zone, title: `Opponent's ${zone}`})}
        />
      </div>
      
      <button 
        onClick={() => setView('howToPlay')} 
        className="absolute bottom-4 right-4 w-12 h-12 bg-cyber-primary/80 rounded-full flex items-center justify-center text-2xl font-black hover:bg-cyber-secondary transition-colors z-20 border-2 border-cyber-border"
        aria-label="How to Play"
      >
        ?
      </button>

      {/* Overlays */}
       <PhaseAnnouncer phase={announcedPhase} />

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
        <Modal title="Game Over" onClose={handleStartGame} onShowRules={() => setView('howToPlay')}>
          <p>{state.winner.name} is victorious!</p>
        </Modal>
      )}
    </main>
  );
};

export default App;