





import { useReducer } from 'react';
import { GameState, Player, CardInGame, TurnPhase, Die, CardType, DiceCostType, DiceCost, getEffectiveStats } from '../game/types';
import { buildDeck } from '../game/cards';
import { getAiAction } from './ai';

// Action Types
type Action =
  | { type: 'START_GAME' }
  | { type: 'ADVANCE_PHASE'; payload?: { assault: boolean } }
  | { type: 'ROLL_DICE' }
  | { type: 'TOGGLE_DIE_KEPT'; payload: { id: number, keep: boolean } }
  | { type: 'PLAY_CARD'; payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; } } }
  | { type: 'ACTIVATE_ABILITY'; payload: { cardInstanceId: string } }
  | { type: 'AI_ACTION' };

// Helper Functions
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createInitialPlayer = (id: number, name: string): Player => {
  const deck = shuffle(buildDeck());
  return {
    id,
    name,
    command: 20,
    deck: deck,
    hand: [],
    units: [],
    locations: [],
    artifacts: [],
    graveyard: [],
    void: [],
    diceModifier: 0,
    shieldUsedThisTurn: false,
    isCommandFortified: false,
    skipNextDrawPhase: false,
  };
};

const drawCards = (player: Player, count: number): Player => {
    const newPlayer = {...player};
    const drawn: CardInGame[] = [];
    for(let i=0; i<count; i++) {
        if (newPlayer.deck.length > 0) {
            const cardDef = newPlayer.deck.pop()!;
            drawn.push({
              ...cardDef,
              instanceId: `${cardDef.id}-${Date.now()}-${Math.random()}`,
              damage: 0,
              strengthModifier: 0,
              durabilityModifier: 0,
              hasAssaulted: false,
            });
        }
    }
    newPlayer.hand = [...newPlayer.hand, ...drawn];
    return newPlayer;
}

const createInitialState = (): GameState => {
  let player1 = createInitialPlayer(0, 'You');
  let player2 = createInitialPlayer(1, 'CPU');
  player1 = drawCards(player1, 3);
  player2 = drawCards(player2, 3);

  return {
    players: [player1, player2],
    currentPlayerId: 0,
    turn: 1,
    phase: TurnPhase.START,
    dice: Array.from({ length: 4 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false })),
    rollCount: 0,
    log: ['SYSTEM BOOT: Game initialized.'],
    winner: null,
    isProcessing: false,
    extraTurns: 0,
  };
};

// Cost Checking Logic
export const checkDiceCost = (card: { cost: DiceCost[] }, dice: Die[]): { canPay: boolean, diceToSpend: Die[] } => {
    let availableDice = dice.filter(d => !d.isSpent);
    if (!card.cost || card.cost.length === 0) return { canPay: true, diceToSpend: [] };
    
    let totalDiceToSpend: Die[] = [];
    let canPay = true;

    for(const cost of card.cost) {
        const result = checkSingleCost(cost, availableDice);
        if (!result.canPay) {
            canPay = false;
            break;
        }
        totalDiceToSpend.push(...result.diceToSpend);
        
        const spentIds = new Set(result.diceToSpend.map(d => d.id));
        availableDice = availableDice.filter(d => !spentIds.has(d.id));
    }
    
    return { canPay, diceToSpend: canPay ? totalDiceToSpend : [] };
}

const checkSingleCost = (cost: DiceCost, availableDice: Die[]): { canPay: boolean, diceToSpend: Die[], remainingDice: Die[] } => {
    const diceValues = [...availableDice].map(d => d.value).sort((a,b) => a-b);

    switch (cost.type) {
        case DiceCostType.EXACTLY_X: {
            const die = availableDice.find(d => d.value === cost.value);
            if (!die) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            return { canPay: true, diceToSpend: [die], remainingDice: availableDice.filter(d => d.id !== die.id) };
        }
        case DiceCostType.ANY_X_PLUS: {
            const die = availableDice.find(d => d.value >= cost.value!);
            if (!die) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            return { canPay: true, diceToSpend: [die], remainingDice: availableDice.filter(d => d.id !== die.id) };
        }
        case DiceCostType.ANY_X_DICE: {
            if (availableDice.length < cost.count!) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            const diceToSpend = availableDice.slice(0, cost.count!);
            const remainingDice = availableDice.slice(cost.count!);
            return { canPay: true, diceToSpend, remainingDice };
        }
        case DiceCostType.ANY_PAIR: {
            for(let i = 0; i < diceValues.length - 1; i++) {
                if(diceValues[i] === diceValues[i+1]) {
                    const first = availableDice.find(d => d.value === diceValues[i])!;
                    const second = availableDice.find(d => d.value === diceValues[i] && d.id !== first.id)!;
                    const remainingDice = availableDice.filter(d => d.id !== first.id && d.id !== second.id);
                    return { canPay: true, diceToSpend: [first, second], remainingDice };
                }
            }
            return { canPay: false, diceToSpend: [], remainingDice: availableDice };
        }
        case DiceCostType.SUM_OF_X_PLUS: {
             if (availableDice.length < cost.count!) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
             
             // Find all combinations of 'count' dice and check their sum.
             const combinations = ((arr: Die[], size: number): Die[][] => {
                const result: Die[][] = [];
                const f = (prefix: Die[], arr: Die[]) => {
                    if (prefix.length === size) {
                        result.push(prefix);
                        return;
                    }
                    for (let i = 0; i < arr.length; i++) {
                        f([...prefix, arr[i]], arr.slice(i + 1));
                    }
                }
                f([], arr);
                return result;
            })(availableDice, cost.count!);

            const validCombination = combinations.find(combo => combo.reduce((acc, die) => acc + die.value, 0) >= cost.value!);

            if (validCombination) {
                const comboIds = new Set(validCombination.map(d => d.id));
                return { 
                    canPay: true, 
                    diceToSpend: validCombination, 
                    remainingDice: availableDice.filter(d => !comboIds.has(d.id)) 
                };
            }

             return { canPay: false, diceToSpend: [], remainingDice: availableDice };
        }
        case DiceCostType.THREE_OF_A_KIND: {
            const counts: {[key: number]: number} = {};
            for (const val of diceValues) { counts[val] = (counts[val] || 0) + 1; }
            const threeVal = Object.keys(counts).find(k => counts[parseInt(k)] >= 3);
            if(!threeVal) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            const value = parseInt(threeVal);
            const diceToSpend = availableDice.filter(d => d.value === value).slice(0,3);
            const remainingIds = new Set(diceToSpend.map(d => d.id));
            const remainingDice = availableDice.filter(d => !remainingIds.has(d.id));
            return { canPay: true, diceToSpend, remainingDice };
        }
        case DiceCostType.FOUR_OF_A_KIND: {
            const counts: {[key: number]: number} = {};
            for (const val of diceValues) { counts[val] = (counts[val] || 0) + 1; }
            const fourVal = Object.keys(counts).find(k => counts[parseInt(k)] >= 4);
            if(!fourVal) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            const value = parseInt(fourVal);
            const diceToSpend = availableDice.filter(d => d.value === value).slice(0,4);
            const remainingIds = new Set(diceToSpend.map(d => d.id));
            const remainingDice = availableDice.filter(d => !remainingIds.has(d.id));
            return { canPay: true, diceToSpend, remainingDice };
        }
        case DiceCostType.STRAIGHT_3: {
             const uniqueSorted = [...new Set(diceValues)];
             if (uniqueSorted.length < 3) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
             for (let i = 0; i <= uniqueSorted.length - 3; i++) {
                 if (uniqueSorted[i+1] === uniqueSorted[i] + 1 && uniqueSorted[i+2] === uniqueSorted[i] + 2) {
                     const vals = uniqueSorted.slice(i, i+3);
                     const diceToSpend: Die[] = [];
                     let tempDice = [...availableDice];
                     for(const v of vals) {
                         const dieIndex = tempDice.findIndex(d => d.value === v);
                         diceToSpend.push(tempDice[dieIndex]);
                         tempDice.splice(dieIndex, 1);
                     }
                     return { canPay: true, diceToSpend, remainingDice: tempDice };
                 }
             }
             return { canPay: false, diceToSpend: [], remainingDice: availableDice };
        }
        default:
            return { canPay: false, diceToSpend: [], remainingDice: availableDice };
    }
}


const gameReducer = (state: GameState, action: Action): GameState => {
  if (state.winner && action.type !== 'START_GAME') return state;

  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const log = (message: string) => newState.log.push(message);
  
  const damagePlayer = (player: Player, amount: number, source: string) => {
      if (player.isCommandFortified) {
          log(`${player.name}'s Command is fortified and takes no damage from ${source}!`);
          return;
      }
      player.command -= amount;
      log(`${player.name} loses ${amount} Command from ${source}!`);
  }

  const dealDamageToUnit = (target: CardInGame, amount: number, sourceCard: CardInGame | null, targetOwner: Player) => {
      if (target.keywords?.immutable) {
          log(`${target.name} is Immutable and ignores damage from ${sourceCard?.name || 'Effect'}.`);
          return;
      }

      let finalAmount = amount;

      if (target.keywords?.fragile && sourceCard?.type === CardType.EVENT) {
          finalAmount *= 2;
          log(`${target.name} is Fragile and takes double damage!`);
      }
      target.damage += finalAmount;
      log(`${sourceCard?.name || 'Effect'} deals ${finalAmount} damage to ${target.name}.`);

      if (sourceCard?.keywords?.venomous && finalAmount > 0) {
          const { durability } = getEffectiveStats(target, targetOwner);
          target.damage = durability; // Mark for destruction
          log(`${sourceCard.name}'s Venomous ability marks ${target.name} for destruction!`);
      }
  };

  const checkForDestroyedUnits = (sourcePlayerId: number, sourceCard?: CardInGame): boolean => {
      let changed = false;
      for (let i = 0; i < 2; i++) {
          const player = newState.players[i];
          const opponent = newState.players[1 - i];
          const unitsToCheck = [...player.units];
          
          for (const unit of unitsToCheck) {
              const { durability } = getEffectiveStats(unit, player);
              if (unit.damage >= durability) {
                  changed = true;
                  if (player.artifacts.some(a => a.id === 14) && !player.shieldUsedThisTurn) {
                      player.shieldUsedThisTurn = true;
                      unit.damage = 0;
                      log(`Aegis Protocol shielded ${unit.name} from destruction!`);
                  } else {
                      player.units = player.units.filter(u => u.instanceId !== unit.instanceId);
                      
                      if (unit.isScavenged || unit.isToken) {
                        player.void.push(unit);
                        log(`${unit.name} was destroyed and Voided (${unit.isToken ? 'Token' : 'Scavenged'}).`);
                      } else {
                        player.graveyard.push(unit);
                        log(`${unit.name} was destroyed.`);
                      }
                      
                       // Executioner check (must happen before other on-destroy effects might change the board)
                      if (sourceCard?.keywords?.executioner && player.id !== sourcePlayerId) {
                        damagePlayer(player, sourceCard.keywords.executioner.amount, `${sourceCard.name}'s Executioner`);
                      }

                      let standardPenaltyApplies = true;

                      // --- On-destruction keyword triggers ---
                      if (unit.keywords?.malice) {
                          damagePlayer(player, unit.keywords.malice, `${unit.name}'s Malice`);
                      }

                      if (unit.keywords?.martyrdom) {
                          const effect = unit.keywords.martyrdom;
                          log(`${unit.name}'s Martyrdom triggers!`);
                          switch(effect.type) {
                              case 'DRAW_CARD':
                                  newState.players[player.id] = drawCards(player, effect.value);
                                  log(`${player.name} draws ${effect.value} card(s).`);
                                  break;
                              case 'DEAL_DAMAGE_TO_OPPONENT':
                                  damagePlayer(opponent, effect.value, `${unit.name}'s Martyrdom`);
                                  break;
                          }
                      }
                      
                      if (unit.keywords?.haunt) {
                        damagePlayer(opponent, unit.keywords.haunt, `${unit.name}'s Haunt`);
                        standardPenaltyApplies = false; // Haunt overrides standard penalty.
                      } 
                      
                      if (standardPenaltyApplies && player.id !== sourcePlayerId) {
                         // Rule: owner of unit loses command if destroyed by an opponent.
                         damagePlayer(player, unit.commandNumber, `${unit.name}'s destruction`);
                      }
                  }
              }
          }
      }
      if (newState.players[0].command <= 0) newState.winner = newState.players[1];
      if (newState.players[1].command <= 0) newState.winner = newState.players[0];
      return changed;
  }

  switch (action.type) {
    case 'START_GAME':
      return { ...createInitialState(), isProcessing: true };

    case 'ROLL_DICE':
      if (newState.rollCount >= 3) return state;
      const diceToRoll = newState.dice.filter(d => !d.isKept && !d.isSpent);
      diceToRoll.forEach(d => {
        newState.dice.find(nd => nd.id === d.id)!.value = Math.floor(Math.random() * 6) + 1;
      });
      newState.rollCount++;
      log(`${newState.players[newState.currentPlayerId].name} rolled dice.`);
      return { ...newState, isProcessing: true };

    case 'TOGGLE_DIE_KEPT':
      const die = newState.dice.find(d => d.id === action.payload.id);
      if (die && !die.isSpent && newState.rollCount > 0) {
        die.isKept = action.payload.keep;
      }
      return newState;
    
    case 'PLAY_CARD': {
      const { card: cardToPlay, targetInstanceId, options } = action.payload;
      let currentPlayer = newState.players[newState.currentPlayerId];
      let opponentPlayer = newState.players[1 - newState.currentPlayerId];
      
      let cost = cardToPlay.cost;
      if (options?.isChanneled) cost = cardToPlay.keywords.channel.cost;
      if (options?.isScavenged) cost = cardToPlay.keywords.scavenge.cost;
      if (options?.isAmplified) cost = cardToPlay.cost.concat(cardToPlay.keywords.amplify.cost);

      const costCheck = checkDiceCost({ cost }, newState.dice);
      if(!costCheck.canPay) return state;

      costCheck.diceToSpend.forEach(dts => {
          newState.dice.find(d => d.id === dts.id)!.isSpent = true;
      });
      
      // Remove card from its source location
      if(options?.isScavenged) {
        currentPlayer.graveyard = currentPlayer.graveyard.filter(c => c.instanceId !== cardToPlay.instanceId);
        cardToPlay.isScavenged = true;
        log(`${currentPlayer.name} Scavenged ${cardToPlay.name} from the graveyard.`);
      } else {
        currentPlayer.hand = currentPlayer.hand.filter(c => c.instanceId !== cardToPlay.instanceId);
        log(`${currentPlayer.name} played ${cardToPlay.name}.`);
      }


      // Handle Channel effect
      if(options?.isChanneled) {
        log(`...using its Channel ability.`);
        const effect = cardToPlay.keywords.channel.effect;
        switch(effect.type) {
          case 'DRAW':
            newState.players[currentPlayer.id] = drawCards(currentPlayer, effect.value);
            log(`${currentPlayer.name} draws ${effect.value} card(s).`);
            break;
        }
        currentPlayer.graveyard.push(cardToPlay); // Channeled cards go to graveyard
        return { ...newState, isProcessing: true };
      }

      // Place card in play or graveyard
      switch(cardToPlay.type) {
          case CardType.UNIT: currentPlayer.units.push(cardToPlay); break;
          case CardType.LOCATION: currentPlayer.locations.push(cardToPlay); break;
          case CardType.ARTIFACT: currentPlayer.artifacts.push(cardToPlay); break;
          case CardType.EVENT: currentPlayer.graveyard.push(cardToPlay); break;
      }

      // Echo keyword
      if (cardToPlay.type === CardType.UNIT && cardToPlay.keywords?.echo) {
        log(`${cardToPlay.name} Echoes, creating a token copy!`);
        const tokenCopy: CardInGame = {
            ...cardToPlay,
            instanceId: `${cardToPlay.id}-token-${Date.now()}-${Math.random()}`,
            isToken: true,
        };
        currentPlayer.units.push(tokenCopy);
      }

      // Keyword-based Effects
      if (cardToPlay.keywords?.resonance) {
          if (currentPlayer.deck.length > 0) {
              const topCard = currentPlayer.deck[currentPlayer.deck.length - 1];
              log(`${cardToPlay.name}'s Resonance reveals ${topCard.name}.`);
              if (topCard.commandNumber >= cardToPlay.keywords.resonance.value) {
                  const effect = cardToPlay.keywords.resonance.effect;
                  if (effect.type === 'BUFF_STRENGTH') {
                      const cardInPlay = currentPlayer.units.find(u => u.instanceId === cardToPlay.instanceId);
                      if (cardInPlay) cardInPlay.strengthModifier += effect.amount;
                      log(`Resonance successful! ${cardToPlay.name} gains +${effect.amount} Strength.`);
                  }
              } else {
                  log(`Resonance failed. Top card's Command Number was too low.`);
              }
          }
      }
      if (cardToPlay.keywords?.stagnate) {
          opponentPlayer.skipNextDrawPhase = true;
          log(`${opponentPlayer.name} will skip their next Draw Phase due to Stagnate!`);
      }
       if (cardToPlay.keywords?.recall && targetInstanceId) {
          const targetIndex = currentPlayer.units.findIndex(u => u.instanceId === targetInstanceId);
          if (targetIndex > -1) {
              const target = currentPlayer.units[targetIndex];
              log(`${target.name} is Recalled to ${currentPlayer.name}'s hand.`);
              // Reset card to base state
              const baseCard = {
                  ...target,
                  damage: 0,
                  strengthModifier: 0,
                  durabilityModifier: 0,
                  hasAssaulted: false,
                  isScavenged: false, // Recall cleanses scavenge status
                  isToken: false, // and token status
              }
              currentPlayer.units.splice(targetIndex, 1);
              currentPlayer.hand.push(baseCard);
          }
      }
      if(cardToPlay.keywords?.fateweave) {
        if(newState.rollCount > 0) {
          newState.rollCount -= cardToPlay.keywords.fateweave;
          log(`${currentPlayer.name} gains an extra roll from Fateweave!`);
        }
      }
      if(cardToPlay.keywords?.foresight && currentPlayer.deck.length > 0) {
        log(`Foresight reveals ${currentPlayer.name}'s top card: ${currentPlayer.deck[currentPlayer.deck.length - 1].name}`);
      }
      if(cardToPlay.keywords?.draw) {
        newState.players[currentPlayer.id] = drawCards(currentPlayer, cardToPlay.keywords.draw);
        log(`${currentPlayer.name} draws ${cardToPlay.keywords.draw} card(s).`);
      }
      if (cardToPlay.keywords?.barrage) {
          log(`${cardToPlay.name}'s Barrage deals ${cardToPlay.keywords.barrage} damage to all enemy units!`);
          opponentPlayer.units.forEach(unit => {
              dealDamageToUnit(unit, cardToPlay.keywords.barrage, cardToPlay, opponentPlayer);
          });
      }
      if (cardToPlay.keywords?.purge) {
          log(`${cardToPlay.name} purges ${cardToPlay.keywords.purge} cards from ${opponentPlayer.name}'s graveyard.`);
          for (let i=0; i < cardToPlay.keywords.purge; i++) {
              if (opponentPlayer.graveyard.length > 0) {
                  const randomIndex = Math.floor(Math.random() * opponentPlayer.graveyard.length);
                  const purgedCard = opponentPlayer.graveyard.splice(randomIndex, 1)[0];
                  opponentPlayer.void.push(purgedCard);
                  log(`Voided ${purgedCard.name}.`);
              }
          }
      }
      if(cardToPlay.keywords?.voidTarget && targetInstanceId) {
        const target = opponentPlayer.units.find(u => u.instanceId === targetInstanceId);
        if (target) {
            if (target.keywords?.immutable) {
                log(`${target.name} is Immutable and cannot be voided.`);
            } else {
                opponentPlayer.units = opponentPlayer.units.filter(u => u.instanceId !== targetInstanceId);
                opponentPlayer.void.push(target);
                log(`${target.name} was voided by ${cardToPlay.name}.`);
            }
        }
      }
       if ((cardToPlay.keywords?.damage || cardToPlay.keywords?.snipe) && targetInstanceId) {
          const target = opponentPlayer.units.find(u => u.instanceId === targetInstanceId);
          if (target) {
            let damage = cardToPlay.keywords.damage || cardToPlay.keywords.snipe;
            if (options?.isAmplified && cardToPlay.keywords.amplify?.effect.type === 'DEAL_DAMAGE') {
                damage = cardToPlay.keywords.amplify.effect.amount;
                log(`${cardToPlay.name} is Amplified!`);
            }
            dealDamageToUnit(target, damage, cardToPlay, opponentPlayer);
          }
      }
      if (cardToPlay.keywords?.sabotage) {
          opponentPlayer.diceModifier = cardToPlay.keywords.sabotage * -1;
          log(`${opponentPlayer.name} will roll ${cardToPlay.keywords.sabotage} fewer dice next turn!`);
      }
      if (cardToPlay.keywords?.warp) {
          newState.extraTurns += 1;
          log(`${currentPlayer.name} will take an extra turn!`);
      }
      if (cardToPlay.keywords?.corrupt && targetInstanceId) {
          const target = opponentPlayer.units.find(u => u.instanceId === targetInstanceId);
          if (target) {
              if (target.keywords?.immutable) {
                log(`${target.name} is Immutable and cannot be corrupted.`);
              } else {
                target.strengthModifier -= cardToPlay.keywords.corrupt;
                log(`${target.name} gets -${cardToPlay.keywords.corrupt} Strength.`);
              }
          }
      }
      if (cardToPlay.keywords?.discard) {
          if (opponentPlayer.hand.length > 0) {
              const discardCount = cardToPlay.keywords.discard;
              for(let i=0; i < discardCount; i++) {
                  if(opponentPlayer.hand.length === 0) break;
                  const randomIndex = Math.floor(Math.random() * opponentPlayer.hand.length);
                  const discardedCard = opponentPlayer.hand.splice(randomIndex, 1)[0];
                  opponentPlayer.graveyard.push(discardedCard);
                  log(`${opponentPlayer.name} discards ${discardedCard.name}.`);
              }
          }
      }
      
      // Card-specific (unique) effects
      switch(cardToPlay.id) {
          case 15: { // System-Killer KAIJU
              log(`KAIJU's Annihilate voids all other units!`);
              const opponentUnitsToVoid = opponentPlayer.units.filter(u => !u.keywords?.immutable);
              const playerUnitsToVoid = currentPlayer.units.filter(u => u.instanceId !== cardToPlay.instanceId && !u.keywords?.immutable);
              
              const opponentUnitsKept = opponentPlayer.units.filter(u => u.keywords?.immutable);
              const playerUnitsKept = currentPlayer.units.filter(u => u.instanceId === cardToPlay.instanceId || u.keywords?.immutable);

              currentPlayer.units = playerUnitsKept;
              opponentPlayer.units = opponentUnitsKept;
              
              playerUnitsToVoid.forEach(u => {
                currentPlayer.void.push(u);
                log(`${u.name} is voided.`);
              });

              opponentUnitsToVoid.forEach(u => {
                opponentPlayer.void.push(u);
                log(`${u.name} is voided.`);
                damagePlayer(opponentPlayer, u.commandNumber, `${u.name}'s voiding`);
              });
              break;
          }
      }
      
      checkForDestroyedUnits(currentPlayer.id, cardToPlay);
      if (opponentPlayer.command <= 0) newState.winner = currentPlayer;

      newState.players[newState.currentPlayerId] = currentPlayer;
      newState.players[1-newState.currentPlayerId] = opponentPlayer;

      return { ...newState, isProcessing: true };
    }

    case 'ACTIVATE_ABILITY': {
      const { cardInstanceId } = action.payload;
      const currentPlayer = newState.players[newState.currentPlayerId];
      
      const card = [...currentPlayer.units, ...currentPlayer.locations, ...currentPlayer.artifacts].find(c => c.instanceId === cardInstanceId);
      
      if (!card || !card.keywords?.activate) return state;

      const costCheck = checkDiceCost({ ...card, cost: card.keywords.activate.cost }, newState.dice);
      if (!costCheck.canPay) return state;
      
      costCheck.diceToSpend.forEach(dts => {
          newState.dice.find(d => d.id === dts.id)!.isSpent = true;
      });

      log(`${currentPlayer.name} activated ${card.name}.`);

      switch(card.keywords.activate.effect) {
          case 'fortify_command':
              currentPlayer.isCommandFortified = true;
              log(`${currentPlayer.name}'s Command is fortified until their next turn!`);
              break;
          case 'spike': {
              const availableDice = newState.dice.filter(d => !d.isSpent && d.value < 6);
              if (availableDice.length > 0) {
                  // Find the lowest value die to spike for max impact
                  const dieToSpike = availableDice.sort((a,b) => a.value - b.value)[0];
                  const originalValue = dieToSpike.value;
                  dieToSpike.value = Math.min(6, dieToSpike.value + card.keywords.activate.value);
                  log(`Spiked a die from ${originalValue} to ${dieToSpike.value}.`);
              } else {
                  log(`No available dice to Spike.`);
              }
              break;
            }
      }

      return { ...newState, isProcessing: true };
    }

    case 'ADVANCE_PHASE': {
      let currentPlayer = newState.players[newState.currentPlayerId];
      let opponentPlayer = newState.players[1 - newState.currentPlayerId];

      switch(newState.phase) {
        case TurnPhase.START:
          currentPlayer.isCommandFortified = false;
          currentPlayer.units.forEach(u => u.hasAssaulted = false); // Reset for Breach keyword
          // Generator effects
          currentPlayer.locations.forEach(loc => {
              if (loc.id === 11) { // Data Haven
                  currentPlayer.command++;
                  log(`${currentPlayer.name} gained 1 command from Data Haven.`);
              }
          });
          // Decay effects
          currentPlayer.units.forEach(unit => {
              if(unit.keywords?.decay) {
                  unit.damage++;
                  log(`${unit.name} takes 1 damage from Decay.`);
              }
          });
          checkForDestroyedUnits(currentPlayer.id);

          newState.phase = TurnPhase.ROLL_SPEND;
          break;
        case TurnPhase.ROLL_SPEND:
          newState.phase = TurnPhase.DRAW;
          break;
        case TurnPhase.DRAW:
          if(currentPlayer.skipNextDrawPhase) {
            log(`${currentPlayer.name} skips their Draw Phase due to Stagnate.`);
            currentPlayer.skipNextDrawPhase = false;
          } else {
            newState.players[newState.currentPlayerId] = drawCards(currentPlayer, 1);
            log(`${currentPlayer.name} drew a card.`);
          }
          newState.phase = TurnPhase.ASSAULT;
          break;
        case TurnPhase.ASSAULT:
          if (action.payload?.assault) {
            let totalDamage = 0;
            let phasingDamage = 0;
            let commandGained = 0;
            currentPlayer.units.forEach(unit => {
              if (!unit.keywords?.entrenched) {
                 const { strength } = getEffectiveStats(unit, currentPlayer, { isAssaultPhase: true });
                 if (unit.keywords?.phasing) {
                    phasingDamage += strength;
                 } else {
                    totalDamage += strength;
                 }
                 if (unit.keywords?.siphon) {
                    commandGained += unit.keywords.siphon;
                 }
                 unit.hasAssaulted = true; // Mark unit as having assaulted for Breach keyword
              }
            });

            if (phasingDamage > 0) {
                opponentPlayer.command -= phasingDamage;
                log(`${currentPlayer.name}'s Phasing units deal ${phasingDamage} unpreventable Command damage!`);
            }
            if (totalDamage > 0) {
                damagePlayer(opponentPlayer, totalDamage, `${currentPlayer.name}'s assault`);
            }
            if (totalDamage === 0 && phasingDamage === 0) {
                log(`${currentPlayer.name} has no units to assault with.`);
            }

            if (commandGained > 0) {
                currentPlayer.command += commandGained;
                log(`${currentPlayer.name} gained ${commandGained} Command from Siphon.`);
            }

            if (opponentPlayer.command <= 0) {
              newState.winner = currentPlayer;
              log(`${currentPlayer.name} is victorious!`);
            }
          } else {
            log(`${currentPlayer.name} skips the assault.`);
          }
          newState.phase = TurnPhase.END;
          break;
        case TurnPhase.END:
            currentPlayer.shieldUsedThisTurn = false;
            if (newState.extraTurns > 0) {
                newState.extraTurns--;
                // Extra turn skips Roll and Draw, but gets a fresh Assault phase.
                // Reset hasAssaulted for units to allow them to attack again.
                currentPlayer.units.forEach(u => u.hasAssaulted = false);
                newState.phase = TurnPhase.ASSAULT;
                newState.dice = Array.from({ length: 4 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
                newState.rollCount = 3; // No rolls allowed in extra turn
                log(`${currentPlayer.name} begins an extra turn, skipping to the Assault Phase.`);
            } else {
                newState.currentPlayerId = 1 - newState.currentPlayerId;
                newState.turn += (newState.currentPlayerId === 0 ? 1 : 0);
                newState.phase = TurnPhase.START;
                const nextPlayer = newState.players[newState.currentPlayerId];
                const diceCount = 4 + nextPlayer.diceModifier;
                nextPlayer.diceModifier = 0;
                newState.dice = Array.from({ length: Math.max(0, diceCount) }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
                newState.rollCount = 0;
                log(`Turn ${newState.turn} - ${nextPlayer.name}'s turn.`);
            }
            break;
      }
      return { ...newState, isProcessing: true };
    }
    
    case 'AI_ACTION':
        newState.isProcessing = false;
        return newState;

    default:
      return state;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  return { state, dispatch, aiAction: getAiAction(state) };
};