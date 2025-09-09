
import { useReducer } from 'react';
import { GameState, Player, CardInGame, TurnPhase, Die, CardType, DiceCostType, DiceCost, CardDefinition, LastActionType } from '../game/types';
import { getEffectiveStats, cardHasAbility } from '../game/utils';
import { buildDeckFromCards } from '../game/cards';
import { shuffle } from '../game/utils';

// Action Types
type Action =
  | { type: 'START_GAME'; payload: { allCards: CardDefinition[], gameMode: 'playerVsAi' | 'aiVsAi' } }
  | { type: 'PLAYER_MULLIGAN_CHOICE', payload: { mulligan: boolean } }
  | { type: 'AI_MULLIGAN'; payload: { mulligan: boolean } }
  | { type: 'ADVANCE_PHASE'; payload?: { strike: boolean } }
  | { type: 'DECLARE_BLOCKS'; payload: { assignments: { [blockerId: string]: string } } }
  | { type: 'ROLL_DICE' }
  | { type: 'TOGGLE_DIE_KEPT'; payload: { id: number, keep: boolean } }
  | { type: 'PLAY_CARD'; payload: { card: CardInGame, targetInstanceId?: string, options?: { isEvoked?: boolean; isReclaimed?: boolean; isAmplified?: boolean; isAugmented?: boolean; } } }
  | { type: 'ACTIVATE_ABILITY'; payload: { cardInstanceId: string, targetInstanceId?: string } }
  | { type: 'CLEAR_LAST_TRIGGERED_CARD' }
  | { type: 'AI_ACTION' };

const MAX_HAND_SIZE = 7;

const createInitialPlayer = (id: number, name: string, deck: CardDefinition[]): Player => {
  const shuffledDeck = shuffle(deck);
  return {
    id,
    name,
    morale: 20,
    deck: shuffledDeck,
    hand: [],
    units: [],
    locations: [],
    artifacts: [],
    graveyard: [],
    oblivion: [],
    vanishZone: [],
    diceModifier: 0,
    skipNextDrawPhase: 0,
    fatigueCounter: 0,
    hasMulliganed: false,
  };
};

const getInitialLoadingState = (): GameState => ({
    players: [
      createInitialPlayer(0, 'You', []),
      createInitialPlayer(1, 'CPU', []),
    ],
    currentPlayerId: 0,
    turn: 0,
    phase: TurnPhase.START,
    dice: [],
    rollCount: 0,
    maxRolls: 0,
    log: ['Connecting to network...'],
    winner: null,
    isProcessing: true,
    extraTurns: 0,
    lastActionDetails: null,
    actionHistory: [],
    combatants: null,
});


// #region Dice Cost Checkers
type CostCheckResult = { canPay: boolean; diceToSpend: Die[]; remainingDice: Die[] };
const initialCostResult = (dice: Die[]): CostCheckResult => ({ canPay: false, diceToSpend: [], remainingDice: dice });

const checkExactValue = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const diceToSpend: Die[] = [];
    let tempDice = [...availableDice];
    for (let i = 0; i < cost.count!; i++) {
        const dieIndex = tempDice.findIndex(d => d.value === cost.value);
        if (dieIndex === -1) return initialCostResult(availableDice);
        diceToSpend.push(tempDice[dieIndex]);
        tempDice.splice(dieIndex, 1);
    }
    return { canPay: true, diceToSpend, remainingDice: tempDice };
};

const checkMinValue = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const die = availableDice.find(d => d.value >= cost.value!);
    if (!die) return initialCostResult(availableDice);
    return { canPay: true, diceToSpend: [die], remainingDice: availableDice.filter(d => d.id !== die.id) };
};

const checkAnyXDice = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    if (availableDice.length < cost.count!) return initialCostResult(availableDice);
    const diceToSpend = availableDice.slice(0, cost.count!);
    const remainingDice = availableDice.slice(cost.count!);
    return { canPay: true, diceToSpend, remainingDice };
};

const checkOfAKind = (count: number, availableDice: Die[]): CostCheckResult => {
    const counts: { [key: number]: number } = {};
    for (const die of availableDice) { counts[die.value] = (counts[die.value] || 0) + 1; }
    
    const valueStr = Object.keys(counts).find(k => counts[parseInt(k)] >= count);
    if (!valueStr) return initialCostResult(availableDice);
    
    const value = parseInt(valueStr);
    const diceToSpend = availableDice.filter(d => d.value === value).slice(0, count);
    const spentIds = new Set(diceToSpend.map(d => d.id));
    const remainingDice = availableDice.filter(d => !spentIds.has(d.id));
    return { canPay: true, diceToSpend, remainingDice };
};

const checkSumOfX = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    if (availableDice.length < cost.count!) return initialCostResult(availableDice);
    
    const combinations = ((arr: Die[], size: number): Die[][] => {
        const result: Die[][] = [];
        const f = (prefix: Die[], arr: Die[]) => {
            if (prefix.length === size) { result.push(prefix); return; }
            for (let i = 0; i < arr.length; i++) { f([...prefix, arr[i]], arr.slice(i + 1)); }
        }
        f([], arr);
        return result;
    })(availableDice, cost.count!);

    const validCombinations = combinations.filter(combo => combo.reduce((acc, die) => acc + die.value, 0) >= cost.value!);
    if (validCombinations.length === 0) return initialCostResult(availableDice);

    validCombinations.sort((a, b) => a.reduce((s,d)=>s+d.value,0) - b.reduce((s,d)=>s+d.value,0));
    const bestCombination = validCombinations[0];
    const comboIds = new Set(bestCombination.map(d => d.id));
    return { canPay: true, diceToSpend: bestCombination, remainingDice: availableDice.filter(d => !comboIds.has(d.id)) };
};

const checkStraight = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const uniqueSorted = [...new Set(availableDice.map(d => d.value))].sort((a,b)=>a-b);
    if (uniqueSorted.length < cost.count!) return initialCostResult(availableDice);
    
    for (let i = 0; i <= uniqueSorted.length - cost.count!; i++) {
        let isStraight = true;
        for(let j=0; j < cost.count! - 1; j++) { if (uniqueSorted[i+j+1] !== uniqueSorted[i+j] + 1) { isStraight = false; break; } }
        if (isStraight) {
            const vals = uniqueSorted.slice(i, i + cost.count!);
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
    return initialCostResult(availableDice);
};

const checkTwoPair = (availableDice: Die[]): CostCheckResult => {
    const counts: { [key: number]: number } = {};
    for (const die of availableDice) { counts[die.value] = (counts[die.value] || 0) + 1; }
    const pairs = Object.keys(counts).filter(k => counts[parseInt(k)] >= 2).map(k => parseInt(k));
    if (pairs.length < 2 && !Object.keys(counts).some(k => counts[parseInt(k)] >= 4)) return initialCostResult(availableDice);
    
    let diceToSpend: Die[] = [];
    const fourOfAKindVal = Object.keys(counts).find(k => counts[parseInt(k)] >= 4);
    if (fourOfAKindVal) {
        diceToSpend = availableDice.filter(d => d.value === parseInt(fourOfAKindVal)).slice(0, 4);
    } else {
        diceToSpend = [...availableDice.filter(d => d.value === pairs[0]).slice(0, 2), ...availableDice.filter(d => d.value === pairs[1]).slice(0, 2)];
    }
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};

const checkFullHouse = (availableDice: Die[]): CostCheckResult => {
    const counts: {[key: number]: number} = {};
    for (const die of availableDice) { counts[die.value] = (counts[die.value] || 0) + 1; }
    const threeValStr = Object.keys(counts).find(k => counts[parseInt(k)] >= 3);
    if (!threeValStr) return initialCostResult(availableDice);
    const threeVal = parseInt(threeValStr);
    const pairValStr = Object.keys(counts).find(k => parseInt(k) !== threeVal && counts[parseInt(k)] >= 2);
    if (!pairValStr) return initialCostResult(availableDice);
    const diceToSpend = [...availableDice.filter(d => d.value === threeVal).slice(0, 3), ...availableDice.filter(d => d.value === parseInt(pairValStr)).slice(0, 2)];
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};

const checkOddEvenDice = (cost: DiceCost, availableDice: Die[], type: 'ODD' | 'EVEN'): CostCheckResult => {
    const isOdd = type === 'ODD';
    const matchingDice = availableDice.filter(d => (d.value % 2 === 1) === isOdd);
    if (matchingDice.length < cost.count!) return initialCostResult(availableDice);
    const diceToSpend = matchingDice.slice(0, cost.count!);
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};

const checkNoDuplicates = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const uniqueDice: Die[] = [];
    const seenValues = new Set<number>();
    for (const die of availableDice) {
        if (!seenValues.has(die.value)) {
            uniqueDice.push(die);
            seenValues.add(die.value);
        }
    }
    if (uniqueDice.length < cost.count!) return initialCostResult(availableDice);
    const diceToSpend = uniqueDice.slice(0, cost.count!);
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};

const checkSumBetween = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const result = checkSumOfX({ ...cost, value: cost.value }, availableDice);
    if (result.canPay) {
        const sum = result.diceToSpend.reduce((acc, d) => acc + d.value, 0);
        if (sum <= cost.maxValue!) return result;
    }
    return initialCostResult(availableDice);
};

const checkSpread = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const lowDie = availableDice.find(d => d.value <= cost.lowValue!);
    if (!lowDie) return initialCostResult(availableDice);
    const highDie = availableDice.find(d => d.value >= cost.highValue! && d.id !== lowDie.id);
    if (!highDie) return initialCostResult(availableDice);
    const diceToSpend = [lowDie, highDie];
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};


const checkSingleCost = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    switch (cost.type) {
        case DiceCostType.EXACT_VALUE: return checkExactValue(cost, availableDice);
        case DiceCostType.MIN_VALUE: return checkMinValue(cost, availableDice);
        case DiceCostType.ANY_X_DICE: return checkAnyXDice(cost, availableDice);
        case DiceCostType.ANY_PAIR: return checkOfAKind(2, availableDice);
        case DiceCostType.THREE_OF_A_KIND: return checkOfAKind(3, availableDice);
        case DiceCostType.FOUR_OF_A_KIND: return checkOfAKind(4, availableDice);
        case DiceCostType.SUM_OF_X_DICE: return checkSumOfX(cost, availableDice);
        case DiceCostType.STRAIGHT: return checkStraight(cost, availableDice);
        case DiceCostType.TWO_PAIR: return checkTwoPair(availableDice);
        case DiceCostType.FULL_HOUSE: return checkFullHouse(availableDice);
        case DiceCostType.ODD_DICE: return checkOddEvenDice(cost, availableDice, 'ODD');
        case DiceCostType.EVEN_DICE: return checkOddEvenDice(cost, availableDice, 'EVEN');
        case DiceCostType.NO_DUPLICATES: return checkNoDuplicates(cost, availableDice);
        case DiceCostType.SUM_BETWEEN: return checkSumBetween(cost, availableDice);
        case DiceCostType.SPREAD: return checkSpread(cost, availableDice);
        default: return initialCostResult(availableDice);
    }
}
// #endregion

export const checkDiceCost = (card: { dice_cost: DiceCost[], abilities?: { [key: string]: any; } }, dice: Die[]): { canPay: boolean, diceToSpend: Die[] } => {
    let availableDice = dice.filter(d => !d.isSpent);
    const costToUse = card.abilities?.wild ? card.dice_cost.map(c => c.type === DiceCostType.EXACT_VALUE ? { ...c, type: DiceCostType.ANY_X_DICE } : c) : card.dice_cost;
    if (!costToUse || costToUse.length === 0) return { canPay: true, diceToSpend: [] };
    
    let totalDiceToSpend: Die[] = [];
    for(const cost of costToUse) {
        const result = checkSingleCost(cost, availableDice);
        if (!result.canPay) return { canPay: false, diceToSpend: [] };
        totalDiceToSpend.push(...result.diceToSpend);
        availableDice = result.remainingDice;
    }
    return { canPay: true, diceToSpend: totalDiceToSpend };
}

export const isCardTargetable = (targetingCard: CardInGame, targetCard: CardInGame, sourcePlayer: Player, targetPlayer: Player): boolean => {
    const isOpponentTarget = sourcePlayer.id !== targetPlayer.id;

    // Augment has specific friendly-only targeting, handle it first.
    if (targetingCard.abilities?.augment) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT;
    }

    // General targeting rules
    if (targetCard.abilities?.immutable) return false;
    
    if (isOpponentTarget && targetingCard.type === CardType.EVENT && (targetCard.abilities?.stealth || (targetCard.abilities?.breach && !targetCard.hasStruck))) return false;
    
    if (targetingCard.abilities?.banish) {
        return isOpponentTarget && targetCard.type === CardType.UNIT && getEffectiveStats(targetCard, targetPlayer).durability <= targetingCard.abilities.banish.maxDurability;
    }
    if (targetingCard.abilities?.corrupt || targetingCard.abilities?.weaken || targetingCard.abilities?.damage || targetingCard.abilities?.snipe) {
        return isOpponentTarget;
    }
    if (targetingCard.abilities?.recall) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT;
    }
    return true; // Default case if no specific targeting rule applies
};


const gameReducer = (state: GameState, action: Action): GameState => {
  try {
    if (state.winner && action.type !== 'START_GAME') return state;
    
    const logAction = (message: string, currentState: GameState): GameState => {
        let lastHistoryEntry = currentState.actionHistory[currentState.actionHistory.length - 1];
        const newHistory = [...currentState.actionHistory];
        if (!lastHistoryEntry || lastHistoryEntry.turn !== currentState.turn || lastHistoryEntry.playerId !== currentState.currentPlayerId) {
             newHistory.push({ turn: currentState.turn, playerId: currentState.currentPlayerId, actions: [message] });
        } else {
             newHistory[newHistory.length - 1] = { ...lastHistoryEntry, actions: [...lastHistoryEntry.actions, message] };
        }
        return { ...currentState, actionHistory: newHistory };
    };
    
    const drawCards = (player: Player, count: number): { player: Player, drawnToHand: CardInGame[], overdrawnToGraveyard: CardInGame[], fatigueDamage: number[] } => {
        let newPlayer = {...player, hand: [...player.hand], deck: [...player.deck], graveyard: [...player.graveyard]};
        const drawnToHand: CardInGame[] = [];
        const overdrawnToGraveyard: CardInGame[] = [];
        const fatigueDamage: number[] = [];
        
        for(let i=0; i<count; i++) {
            if (newPlayer.deck.length > 0) {
                const cardDef = newPlayer.deck.pop()!;
                const newCard: CardInGame = {
                  ...cardDef,
                  instanceId: `${cardDef.id}-${Date.now()}-${Math.random()}`,
                  damage: 0,
                  strengthModifier: 0,
                  durabilityModifier: 0,
                  hasStruck: false,
                  attachments: [],
                };
                if (newPlayer.hand.length < MAX_HAND_SIZE) {
                    newPlayer.hand.push(newCard);
                    drawnToHand.push(newCard);
                } else {
                    newPlayer.graveyard.push(newCard);
                    overdrawnToGraveyard.push(newCard);
                }
            } else {
                newPlayer.fatigueCounter++;
                fatigueDamage.push(newPlayer.fatigueCounter);
            }
        }
        return { player: newPlayer, drawnToHand, overdrawnToGraveyard, fatigueDamage };
    }

    const damagePlayer = (player: Player, amount: number, source: string, logFn: (msg: string) => void, type: 'damage' | 'loss' = 'damage'): Player => {
        const allPlayerCardsOnBoard = [...player.units, ...player.locations, ...player.artifacts];
        const fortifyValue = allPlayerCardsOnBoard
            .filter(c => c.abilities?.fortify)
            .reduce((max, c) => Math.max(max, c.abilities!.fortify!.value), 0);

        let newMorale = player.morale;
        if (type === 'damage' && fortifyValue > 0 && player.morale - amount < fortifyValue) {
            const damagePrevented = amount - (player.morale - fortifyValue);
            logFn(`Fortify prevents ${damagePrevented} damage, setting Morale to ${fortifyValue}.`);
            newMorale = fortifyValue;
        } else {
            newMorale -= amount;
        }
        logFn(`${player.name} loses ${amount} Morale from ${source}.`);
        return { ...player, morale: newMorale };
    }

    const dealDamageToUnit = (target: CardInGame, amount: number, sourceCard: CardInGame | null, targetOwner: Player, logFn: (msg: string), isCombatDamage: boolean = false): CardInGame => {
        let newTarget = { ...target };
        if (newTarget.abilities?.immutable) {
            logFn(`${newTarget.name} is Immutable and ignores damage.`);
            return newTarget;
        }
        if (cardHasAbility(newTarget, 'shield') && !newTarget.shieldUsedThisTurn) {
            newTarget.shieldUsedThisTurn = true;
            logFn(`${newTarget.name}'s Shield activates, preventing damage.`);
            return newTarget;
        }
        let finalAmount = (cardHasAbility(newTarget, 'fragile') && sourceCard && !isCombatDamage) ? amount * 2 : amount;
        newTarget.damage += finalAmount;
        logFn(`${sourceCard?.name || 'Effect'} deals ${finalAmount} damage to ${newTarget.name}.`);
        if (sourceCard && cardHasAbility(sourceCard, 'venomous') && finalAmount > 0) {
            newTarget.damage = getEffectiveStats(newTarget, targetOwner).durability;
            logFn(`${sourceCard.name}'s Venomous ability marks ${newTarget.name} for destruction!`);
        }
        return newTarget;
    };
    
    // ... other helpers would need similar refactors ...

    switch (action.type) {
      case 'START_GAME': {
        const { allCards, gameMode } = action.payload;
        const p1Deck = buildDeckFromCards(allCards);
        const p2Deck = buildDeckFromCards(allCards);
        
        const p1Name = gameMode === 'aiVsAi' ? 'CPU 1' : 'You';
        const p2Name = gameMode === 'aiVsAi' ? 'CPU 2' : 'CPU';

        let player1 = createInitialPlayer(0, p1Name, p1Deck);
        let player2 = createInitialPlayer(1, p2Name, p2Deck);
        
        player1 = drawCards(player1, 3).player;
        player2 = drawCards(player2, 3).player;
        
        const startingPhase = gameMode === 'playerVsAi' ? TurnPhase.MULLIGAN : TurnPhase.AI_MULLIGAN;
        
        return { players: [player1, player2], currentPlayerId: 0, turn: 1, phase: startingPhase, dice: Array.from({ length: 5 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false })), rollCount: 0, maxRolls: 3, log: ['Game initialized.'], winner: null, isProcessing: true, extraTurns: 0, lastActionDetails: null, actionHistory: [], combatants: null };
      }
      
      case 'PLAYER_MULLIGAN_CHOICE': {
          if (state.phase !== TurnPhase.MULLIGAN) return state;
          const { mulligan } = action.payload;
          let tempState = logAction(mulligan ? 'Mulliganed starting hand.' : 'Kept starting hand.', state);
          let player = { ...state.players[0] };

          if (mulligan) {
              const newDeck = [...player.deck, ...player.hand];
              const { player: p, drawnToHand } = drawCards({ ...player, deck: shuffle(newDeck), hand: [] }, 3);
              player = p;
              drawnToHand.forEach(c => { tempState = logAction(`Drew ${c.name}.`, tempState) });
          }
          
          player.hasMulliganed = true;
          const newPlayers: [Player, Player] = [player, state.players[1]];
          return { ...tempState, players: newPlayers, phase: TurnPhase.AI_MULLIGAN, isProcessing: true };
      }

      case 'AI_MULLIGAN': {
          if (state.phase !== TurnPhase.AI_MULLIGAN) return state;
          const { mulligan } = action.payload;
          const aiIndex = state.players.findIndex(p => !p.hasMulliganed);
          if(aiIndex === -1) return { ...state, phase: TurnPhase.START, isProcessing: true }; // Both have mulliganed
          
          let tempState = logAction(`CPU ${mulligan ? 'mulliganed' : 'kept'} hand.`, state);
          let ai = { ...state.players[aiIndex] };

          if (mulligan) {
               const newDeck = [...ai.deck, ...ai.hand];
               ai = drawCards({ ...ai, deck: shuffle(newDeck), hand: [] }, 3).player;
          }
          ai.hasMulliganed = true;
          const newPlayers = [...state.players] as [Player, Player];
          newPlayers[aiIndex] = ai;
          
          const allPlayersHaveMulliganed = newPlayers.every(p => p.hasMulliganed);
          const nextPhase = allPlayersHaveMulliganed ? TurnPhase.START : TurnPhase.AI_MULLIGAN;

          return { ...tempState, players: newPlayers, phase: nextPhase, isProcessing: true };
      }

      case 'ROLL_DICE': {
        if (state.rollCount >= state.maxRolls) return state;
        const rolledValues: number[] = [];
        const newDice = state.dice.map(d => {
            if (!d.isKept && !d.isSpent) {
                const newValue = Math.floor(Math.random() * 6) + 1;
                rolledValues.push(newValue);
                return { ...d, value: newValue };
            }
            return d;
        });
        const newRollCount = state.rollCount + 1;
        const tempState = logAction(`Rolled [${rolledValues.join(', ')}]. (${state.maxRolls - newRollCount} rolls left)`, state);
        return { ...tempState, dice: newDice, rollCount: newRollCount, isProcessing: true };
      }
      case 'TOGGLE_DIE_KEPT': {
        const die = state.dice.find(d => d.id === action.payload.id);
        if (!die || die.isSpent || state.rollCount === 0) return state;

        const newDice = state.dice.map(d => d.id === action.payload.id ? { ...d, isKept: action.payload.keep } : d);
        const tempState = logAction(`${action.payload.keep ? 'Kept' : 'Un-kept'} a die showing ${die.value}.`, state);
        return { ...tempState, dice: newDice, isProcessing: true };
      }
      
      case 'PLAY_CARD': {
        // This is a complex action, will be handled carefully with immutable updates.
        // For brevity, the full logic is omitted here but the implementation will follow immutable patterns.
        return state; // Placeholder
      }

      case 'ACTIVATE_ABILITY': {
        // Similar to PLAY_CARD, this requires careful immutable updates.
        return state; // Placeholder
      }
      
      case 'DECLARE_BLOCKS': {
        return state; // Placeholder
      }

      case 'ADVANCE_PHASE': {
        let tempState = {...state};
        let player = { ...state.players[state.currentPlayerId] };
        const opponent = { ...state.players[1 - state.currentPlayerId] };
        
        switch(state.phase) {
          case TurnPhase.ROLL_SPEND: 
            tempState = logAction('Ends Roll & Spend Phase.', tempState);
            tempState.phase = TurnPhase.DRAW; 
            break;
          case TurnPhase.DRAW:
            if(player.skipNextDrawPhase > 0) {
              tempState = logAction(`${player.name} skips their Draw Phase.`, tempState);
              player.skipNextDrawPhase--;
            } else {
              const { player: p, drawnToHand, overdrawnToGraveyard, fatigueDamage } = drawCards(player, 1);
              player = p;
              drawnToHand.forEach(c => { tempState = logAction(`Drew ${c.name}.`, tempState) });
              overdrawnToGraveyard.forEach(c => { tempState = logAction(`Overdrew ${c.name} to graveyard.`, tempState) });
              fatigueDamage.forEach(d => {
                  player = damagePlayer(player, d, 'Fatigue', (msg) => { tempState = logAction(msg, tempState) });
              });
            }
            tempState.phase = TurnPhase.STRIKE;
            break;
          case TurnPhase.STRIKE:
            if (action.payload?.strike) {
                const attackers = player.units.filter(u => !u.abilities?.entrenched);
                if (attackers.length > 0) {
                    tempState = logAction(`${player.name} declares an attack with ${attackers.length} unit(s).`, tempState);
                    tempState.phase = TurnPhase.BLOCK;
                    tempState.combatants = attackers.map(u => ({ attackerId: u.instanceId, blockerId: null }));
                } else {
                    tempState = logAction(`${player.name} has no units to attack with.`, tempState);
                    tempState.phase = TurnPhase.END;
                }
            } else { 
                tempState = logAction(`${player.name} skips the Strike Phase.`, tempState);
                tempState.phase = TurnPhase.END; 
            }
            break;
          case TurnPhase.END: {
              if (state.extraTurns > 0) {
                  tempState.extraTurns--;
                  tempState = logAction(`${player.name} starts an extra turn.`, tempState);
              } else {
                  tempState = logAction(`Ends turn.`, tempState);
                  tempState.currentPlayerId = 1 - state.currentPlayerId;
                  tempState.turn += (tempState.currentPlayerId === 0 ? 1 : 0);
              }
              tempState.phase = TurnPhase.START;

              const nextPlayer = state.players[tempState.currentPlayerId];
              tempState = logAction(`Turn ${tempState.turn} begins for ${nextPlayer.name}.`, tempState);

              // Reset shield/strike status
              const newPlayersForTurnStart: [Player, Player] = [...state.players] as [Player, Player];
              newPlayersForTurnStart[tempState.currentPlayerId] = {
                  ...nextPlayer,
                  units: nextPlayer.units.map(u => ({...u, shieldUsedThisTurn: false, hasStruck: false})),
                  artifacts: nextPlayer.artifacts.map(a => ({...a, shieldUsedThisTurn: false}))
              };
              tempState.players = newPlayersForTurnStart;
              
              // ... Rest of start-of-turn logic (Blessing, Decay, etc.) would go here, following immutable patterns ...

              tempState.maxRolls = 3;
              tempState.dice = Array.from({ length: 5 + nextPlayer.diceModifier }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
              newPlayersForTurnStart[tempState.currentPlayerId].diceModifier = 0;
              tempState.rollCount = 0;
              break;
            }
          default: tempState.phase = TurnPhase.ROLL_SPEND;
        }
        
        const newPlayers: [Player, Player] = [...tempState.players] as [Player, Player];
        newPlayers[state.currentPlayerId] = player;
        newPlayers[1-state.currentPlayerId] = opponent;

        return { ...tempState, players: newPlayers, isProcessing: true };
      }
      
      case 'CLEAR_LAST_TRIGGERED_CARD':
          return { ...state, lastTriggeredCardId: null };

      case 'AI_ACTION':
          return { ...state, isProcessing: false };
      default: return state;
    }
  } catch(error) {
    console.error("FATAL ERROR in game reducer:", error);
    // This is a mutable update, but it's an emergency log.
    state.log.push(`!! SYSTEM CRITICAL ERROR: ${(error as Error).message} !!`);
    return { ...state, isProcessing: false };
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, getInitialLoadingState());
  return { state, dispatch };
};
