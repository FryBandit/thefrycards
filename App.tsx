


import React, { useEffect, useState } from 'react';
import GameBoard from './components/GameBoard';
import GameLog from './components/GameLog';
import Modal from './components/Modal';
import HowToPlay from './components/HowToPlay';
import { useGameState } from './hooks/useGameState';
import { checkDiceCost } from './hooks/useGameState';
import { CardInGame, TurnPhase, CardType } from './game/types';

const App: React.FC = () => {
  const { state, dispatch, aiAction } = useGameState();
  const [view, setView] = useState<'howToPlay' | 'game'>('howToPlay');
  const [targetingCard, setTargetingCard] = useState<CardInGame | null>(null);

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME' });
    setView('game');
    setTargetingCard(null);
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
    if (state.currentPlayerId === 0 && state.phase === TurnPhase.ROLL_SPEND && state.rollCount < 3) {
      dispatch({ type: 'ROLL_DICE' });
    }
  };
  
  const handleCardClick = (card: CardInGame) => {
    if (state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) return;
    
    if (targetingCard) { // Cancel targeting
        setTargetingCard(null);
        return;
    }

    if (!isCardPlayable(card)) return;

    if (card.keywords?.requiresTarget) {
        setTargetingCard(card);
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
      if (state.currentPlayerId !== 0 || !targetingCard) return;

      const player = state.players[0];
      const opponent = state.players[1];

      let isTargetable = false;
      if (targetingCard.keywords?.recall) {
          isTargetable = player.units.some(u => u.instanceId === targetCard.instanceId);
      } else {
          isTargetable = opponent.units.some(u => u.instanceId === targetCard.instanceId) 
            && !targetCard.keywords?.stealth 
            && (!targetCard.keywords?.breach || targetCard.hasAssaulted);
      }
      
      if (isTargetable) {
          dispatch({ type: 'PLAY_CARD', payload: { card: targetingCard, targetInstanceId: targetCard.instanceId } });
          setTargetingCard(null);
      }
  }

  const isCardPlayable = (card: CardInGame): boolean => {
    if (state.phase !== TurnPhase.ROLL_SPEND) return false;
    
    const canPayCost = checkDiceCost(card, state.dice).canPay;
    if (!canPayCost) return false;

    if (card.keywords?.requiresTarget) {
        const opponentHasTargets = state.players[1].units.filter(u => !u.keywords?.stealth && (!u.keywords?.breach || u.hasAssaulted)).length > 0;
        const playerHasTargets = card.keywords?.recall ? state.players[0].units.length > 0 : false;
        return opponentHasTargets || playerHasTargets;
    }

    return true;
  };
  
  const isCardActivatable = (card: CardInGame): boolean => {
    if (!card.keywords?.activate || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
        return false;
    }
    return checkDiceCost({ cost: card.keywords.activate.cost }, state.dice).canPay;
  };

  const isCardChannelable = (card: CardInGame): boolean => {
    if (!card.keywords?.channel || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
        return false;
    }
    return checkDiceCost({ cost: card.keywords.channel.cost }, state.dice).canPay;
  }

  const isCardScavengeable = (card: CardInGame): boolean => {
      if (!card.keywords?.scavenge || state.currentPlayerId !== 0 || state.phase !== TurnPhase.ROLL_SPEND) {
          return false;
      }
      return checkDiceCost({ cost: card.keywords.scavenge.cost }, state.dice).canPay;
  }

  const handleActivateCard = (card: CardInGame) => {
    if (isCardActivatable(card)) {
        dispatch({ type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } });
    }
  }

  const handleChannelClick = (card: CardInGame) => {
    if(isCardChannelable(card)) {
        dispatch({ type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } });
    }
  }

  const handleAdvancePhase = (assault: boolean = false) => {
      if(state.currentPlayerId === 0) {
        setTargetingCard(null); // Cancel targeting on phase advance
        dispatch({ type: 'ADVANCE_PHASE', payload: { assault } });
      }
  };

  // Main game loop and AI logic
  useEffect(() => {
    if (state.winner || !state.isProcessing) return;

    // Auto-advance for phases that require no user input
    if (state.phase === TurnPhase.START) {
       setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), 1000);
       return;
    }
    
    // AI Turn Logic
    if (state.currentPlayerId === 1 && aiAction) {
       console.log("AI Action:", aiAction);
       setTimeout(() => {
         dispatch(aiAction);
       }, 1200);
    } else if (state.isProcessing) {
      // If no AI action, but still processing, mark as not processing for player
       dispatch({ type: 'AI_ACTION' });
    }
    
  }, [state.isProcessing, state.winner, state.phase, state.currentPlayerId, aiAction, dispatch]);

  if (view === 'howToPlay') {
    return <HowToPlay onPlay={handleStartGame} />;
  }

  return (
    <main className="relative w-screen h-screen font-sans bg-black/50">
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
        onAdvancePhase={handleAdvancePhase}
        onShowRules={() => setView('howToPlay')}
        targetingCard={targetingCard}
        isCardActivatable={isCardActivatable}
        onActivateCard={handleActivateCard}
      />
      <GameLog log={state.log} />
      {targetingCard && (
        <div className="absolute bottom-1/2 translate-y-28 left-1/2 -translate-x-1/2 bg-neon-pink text-cyber-bg font-bold uppercase tracking-widest px-6 py-3 rounded-lg z-30 shadow-neon-pink">
          Select a target for {targetingCard.name}
        </div>
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