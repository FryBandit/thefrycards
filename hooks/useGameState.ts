

import { useReducer } from 'react';
import { GameState, Player, CardInGame, TurnPhase, Die, CardType, DiceCostType, DiceCost, CardDefinition, LastActionType } from '../game/types';
import { getEffectiveStats, cardHasAbility, shuffle } from '../game/utils';
import { buildDeckFromCards } from '../game/cards';

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
const INITIAL_HAND_SIZE = 3;
const NUM_DICE = 5;
const MAX_ROLLS_PER_TURN = 3;


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

const getInitialState = (): GameState => ({
    players: [
      createInitialPlayer(0, 'You', []),
      createInitialPlayer(1, 'CPU', []),
    ],
    currentPlayerId: 0,
    turn: 0,
    phase: TurnPhase.MULLIGAN,
    dice: [],
    rollCount: 0,
    maxRolls: MAX_ROLLS_PER_TURN,
    log: [],
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
    if (cardHasAbility(targetCard, 'immutable')) return false;
    
    if (isOpponentTarget && targetingCard.type === CardType.EVENT && (cardHasAbility(targetCard, 'stealth') || (cardHasAbility(targetCard, 'breach') && !targetCard.hasStruck))) return false;
    
    if (targetingCard.abilities?.banish) {
        return isOpponentTarget && targetCard.type === CardType.UNIT && getEffectiveStats(targetCard, targetPlayer).durability <= targetingCard.abilities.banish.maxDurability;
    }
    if (targetingCard.abilities?.corrupt || targetingCard.abilities?.weaken || targetingCard.abilities?.damage || targetingCard.abilities?.snipe) {
        return isOpponentTarget;
    }
    if (targetingCard.abilities?.recall) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT;
    }
    return false; // Default to no targets if no rule matches
}

const drawCards = (player: Player, count: number): { player: Player, drawnCards: CardDefinition[] } => {
    const drawnCards: CardDefinition[] = [];
    for (let i = 0; i < count; i++) {
        if (player.deck.length > 0) {
            const [drawnCard] = player.deck;
            drawnCards.push(drawnCard);
            player.deck = player.deck.slice(1);
        } else {
            // Fatigue damage
            player.fatigueCounter += 1;
            player.morale -= player.fatigueCounter;
        }
    }
    
    for (const card of drawnCards) {
        const newCardInGame: CardInGame = {
            ...card,
            instanceId: crypto.randomUUID(),
            damage: 0,
            strengthModifier: 0,
            durabilityModifier: 0,
            hasStruck: false,
            turnPlayed: 0,
        };
        if (player.hand.length < MAX_HAND_SIZE) {
            player.hand.push(newCardInGame);
        } else {
            player.graveyard.push(newCardInGame); // Card goes to graveyard if hand is full
        }
    }
    return { player, drawnCards };
};

const applyCardEffects = (
    state: GameState,
    payload: { effect: { [key: string]: any }, sourceCard: CardInGame, target?: CardInGame | null },
    log: string[]
): GameState => {
    const { effect, sourceCard, target } = payload;
    let newState = { ...state };
    const player = newState.players[newState.currentPlayerId];
    const opponent = newState.players[1 - newState.currentPlayerId];

    for (const [key, value] of Object.entries(effect)) {
        switch(key) {
            case 'draw': {
                const { player: updatedPlayer } = drawCards(player, value as number);
                log.push(`${player.name} draws ${value} card(s).`);
                break;
            }
            case 'discard': {
                for (let i = 0; i < (value as number); i++) {
                    if (opponent.hand.length > 0) {
                        const cardToDiscard = opponent.hand.splice(Math.floor(Math.random() * opponent.hand.length), 1)[0];
                        opponent.graveyard.push(cardToDiscard);
                        log.push(`${player.name} forces ${opponent.name} to discard ${cardToDiscard.name}.`);
                    }
                }
                break;
            }
            case 'damage': {
                if (target) {
                    (target as CardInGame).damage += value as number;
                    log.push(`${sourceCard.name} deals ${value} damage to ${target.name}.`);
                }
                break;
            }
            case 'gain_morale': {
                player.morale += value as number;
                log.push(`${player.name} gains ${value} morale.`);
                break;
            }
            case 'exhaust': {
                opponent.skipNextDrawPhase += 1;
                log.push(`${opponent.name} will skip their next draw phase.`);
                break;
            }
            case 'prophecy': {
                newState.maxRolls += value as number;
                log.push(`${player.name} gains ${value} extra roll(s) this turn.`);
                break;
            }
            case 'disrupt': {
                opponent.diceModifier -= value as number;
                log.push(`${opponent.name} will roll ${value} fewer dice next turn.`);
                break;
            }
             case 'recall': {
                if (target) {
                    const unitToRecall = target as CardInGame;
                    player.units = player.units.filter(u => u.instanceId !== unitToRecall.instanceId);
                    
                    const cardDef = { ...unitToRecall, damage: 0, strengthModifier: 0, durabilityModifier: 0, hasStruck: false, attachments: [], turnPlayed: 0 };

                    if (player.hand.length < MAX_HAND_SIZE) {
                        player.hand.push(cardDef);
                        log.push(`${player.name} recalls ${unitToRecall.name} to their hand.`);
                    } else {
                        player.graveyard.push(cardDef);
                        log.push(`${unitToRecall.name} was recalled, but hand was full. It goes to the graveyard.`);
                    }
                }
                break;
            }
            case 'spike': {
                const availableDice = newState.dice.filter(d => !d.isSpent);
                if (availableDice.length > 0) {
                    availableDice.sort((a, b) => a.value - b.value);
                    const dieToSpike = availableDice[0];
                    newState.dice = newState.dice.map(d => 
                        d.id === dieToSpike.id ? { ...d, value: Math.min(6, d.value + (value as number ?? 1)) } : d
                    );
                    log.push(`${player.name} spikes a die from ${dieToSpike.value} to ${Math.min(6, dieToSpike.value + (value as number ?? 1))}.`);
                }
                break;
            }
             case 'resonance': {
                const [topCard, ...restOfDeck] = player.deck;
                if (!topCard) {
                    log.push(`${player.name}'s deck is empty, Resonance fails.`);
                    break;
                }
                log.push(`${player.name} reveals ${topCard.name} for Resonance.`);
                if ((topCard.moraleValue ?? 0) >= (value as { threshold: number }).threshold) {
                    log.push(`Resonance successful! Applying effect.`);
                    const effectState = applyCardEffects(
                        { ...newState, players: newState.players.map(p => p.id === player.id ? { ...p, deck: restOfDeck } : p) as [Player, Player] },
                        { effect: (value as { effect: any }).effect, sourceCard, target },
                        log
                    );
                    return effectState; // Return the new state from the recursive call
                } else {
                    log.push(`Resonance fails.`);
                    player.deck = restOfDeck;
                }
                break;
            }
            case 'chain_reaction': {
                const [topCard, ...restOfDeck] = player.deck;
                 if (!topCard) {
                    log.push(`${player.name}'s deck is empty, Chain Reaction fails.`);
                    break;
                }
                log.push(`${player.name} reveals ${topCard.name} for Chain Reaction.`);
                if(topCard.type === CardType.EVENT) {
                    log.push(`Chain Reaction successful! Applying ${topCard.name}'s effects.`);
                     const effectState = applyCardEffects(
                        { ...newState, players: newState.players.map(p => p.id === player.id ? { ...p, deck: restOfDeck } : p) as [Player, Player] },
                        { effect: topCard.abilities, sourceCard: { ...topCard, instanceId: 'chain-reaction-event', turnPlayed: 0 } as CardInGame, target: null },
                        log
                    );
                    return effectState;
                } else {
                     log.push(`Chain Reaction fails. Revealed card was not an Event.`);
                     player.deck = restOfDeck;
                }
                break;
            }
        }
    }
    return newState;
}

const processDestroyedUnits = (state: GameState, log: string[], combatInfo?: Map<string, { destroyer: CardInGame, destroyerPlayer: Player }>): GameState => {
    let newState = state;
    let unitsWereDestroyed;

    do {
        unitsWereDestroyed = false;
        const allPlayers = [...newState.players];
        for (const player of allPlayers) {
            const opponent = newState.players.find(p => p.id !== player.id)!;
            
            const destroyedThisPass = player.units.filter(u => 
                (getEffectiveStats(u, player).durability - u.damage) <= 0
            );

            if (destroyedThisPass.length > 0) {
                unitsWereDestroyed = true;
                player.units = player.units.filter(u => !destroyedThisPass.find(d => d.instanceId === u.instanceId));

                for (const destroyedUnit of destroyedThisPass) {
                    log.push(`${destroyedUnit.name} was destroyed.`);

                    // Move to graveyard or oblivion
                    if (destroyedUnit.isToken || destroyedUnit.isReclaimed) {
                        player.oblivion.push(destroyedUnit);
                    } else {
                        player.graveyard.push(destroyedUnit);
                    }
                    
                    if (destroyedUnit.moraleValue && destroyedUnit.moraleValue > 0 && opponent.id !== player.id) {
                        player.morale -= destroyedUnit.moraleValue;
                        log.push(`${player.name} loses ${destroyedUnit.moraleValue} Morale from ${destroyedUnit.name}'s destruction.`);
                    }

                    if (cardHasAbility(destroyedUnit, 'haunt')) {
                        opponent.morale -= destroyedUnit.abilities.haunt;
                        log.push(`${destroyedUnit.name}'s Haunt deals ${destroyedUnit.abilities.haunt} damage to ${opponent.name}.`);
                    }
                    if (cardHasAbility(destroyedUnit, 'malice')) {
                        player.morale -= destroyedUnit.abilities.malice;
                        log.push(`${destroyedUnit.name}'s Malice deals ${destroyedUnit.abilities.malice} damage to ${player.name}.`);
                    }
                    if (cardHasAbility(destroyedUnit, 'martyrdom')) {
                        newState = applyCardEffects(newState, { effect: destroyedUnit.abilities.martyrdom.effect, sourceCard: destroyedUnit, target: null }, log);
                    }

                    const combatData = combatInfo?.get(destroyedUnit.instanceId);
                    if (combatData) {
                        const { destroyer, destroyerPlayer } = combatData;
                        if (cardHasAbility(destroyer, 'executioner')) {
                            const amount = destroyer.abilities.executioner.amount || 1;
                            player.morale -= amount;
                            log.push(`${destroyer.name}'s Executioner deals ${amount} Morale damage to ${player.name} for destroying ${destroyedUnit.name}.`);
                        }
                    }
                }
            }
        }
    } while (unitsWereDestroyed);
    
    for (const player of newState.players) {
        if (player.morale <= 0) {
            newState.winner = newState.players.find(p => p.id !== player.id)!;
            break;
        }
    }

    return newState;
}


const gameReducer = (state: GameState, action: Action): GameState => {
    let newState = JSON.parse(JSON.stringify(state)); // Deep copy for safety
    let log: string[] = [];

    const addLogEntry = (message: string) => {
        const currentTurnLog = newState.actionHistory.find(h => h.turn === newState.turn && h.playerId === newState.currentPlayerId);
        if (currentTurnLog) {
            currentTurnLog.actions.push(message);
        } else {
            newState.actionHistory.push({
                turn: newState.turn,
                playerId: newState.currentPlayerId,
                actions: [message],
            });
        }
    };
    
    switch(action.type) {
        case 'START_GAME': {
            const playerDeck = buildDeckFromCards(action.payload.allCards);
            const opponentDeck = buildDeckFromCards(action.payload.allCards);
            
            let player = createInitialPlayer(0, 'You', playerDeck);
            let opponent = createInitialPlayer(1, 'CPU', opponentDeck);
            
            ({ player } = drawCards(player, INITIAL_HAND_SIZE));
            ({ player: opponent } = drawCards(opponent, INITIAL_HAND_SIZE));
            
            newState = getInitialState();
            newState.players = [player, opponent];
            newState.turn = 1;

            if (action.payload.gameMode === 'aiVsAi') {
                newState.phase = TurnPhase.AI_MULLIGAN;
            } else {
                newState.phase = TurnPhase.MULLIGAN;
            }
            newState.isProcessing = true;
            newState.actionHistory = [{ turn: 1, playerId: 0, actions: [] }];

            return newState;
        }

        case 'PLAYER_MULLIGAN_CHOICE': {
            let player = newState.players[0];
            if (action.payload.mulligan) {
                const hand = player.hand;
                player.deck.push(...hand);
                player.deck = shuffle(player.deck);
                player.hand = [];
                ({ player } = drawCards(player, INITIAL_HAND_SIZE));
                addLogEntry("You mulliganed your hand.");
            } else {
                addLogEntry("You kept your hand.");
            }
            player.hasMulliganed = true;
            newState.phase = TurnPhase.AI_MULLIGAN;
            newState.isProcessing = true;
            return newState;
        }

        case 'AI_MULLIGAN': {
             let player = newState.players.find(p => !p.hasMulliganed)!;
             if (action.payload.mulligan) {
                const hand = player.hand;
                player.deck.push(...hand);
                player.deck = shuffle(player.deck);
                player.hand = [];
                ({ player } = drawCards(player, INITIAL_HAND_SIZE));
                addLogEntry(`${player.name} mulliganed their hand.`);
            } else {
                 addLogEntry(`${player.name} kept their hand.`);
            }
            player.hasMulliganed = true;

            const nextPlayerToMulligan = newState.players.find(p => !p.hasMulliganed);
            if(nextPlayerToMulligan) {
                newState.phase = TurnPhase.AI_MULLIGAN;
            } else {
                newState.phase = TurnPhase.START;
            }
            newState.isProcessing = true;
            return newState;
        }

        case 'ADVANCE_PHASE': {
            newState.lastActionDetails = null; // Clear dice spend animation
            
            switch (newState.phase) {
                case TurnPhase.START: {
                    newState.phase = TurnPhase.ROLL_SPEND;
                    
                    const player = newState.players[newState.currentPlayerId];
                    const numDiceToRoll = NUM_DICE + (player.diceModifier || 0);
                    player.diceModifier = 0; // Reset modifier after use
                    
                    newState.dice = Array.from({ length: numDiceToRoll }, (_, i) => ({
                        id: i,
                        value: 0, // Will be blank until first roll
                        isKept: false,
                        isSpent: false,
                    }));
                    newState.rollCount = 0;
                    newState.maxRolls = MAX_ROLLS_PER_TURN;

                    newState.isProcessing = false;
                    break;
                }
                case TurnPhase.ROLL_SPEND:
                    newState.phase = TurnPhase.DRAW;
                    newState.isProcessing = true;
                    break;
                case TurnPhase.DRAW:
                    newState.phase = TurnPhase.STRIKE;
                    newState.isProcessing = false;
                    break;
                case TurnPhase.STRIKE:
                    if (action.payload?.strike) {
                        newState.phase = TurnPhase.BLOCK;
                        const attackers = newState.players[newState.currentPlayerId].units.filter(u => 
                            !cardHasAbility(u, 'entrenched') &&
                            (u.turnPlayed < newState.turn || cardHasAbility(u, 'charge'))
                        );
                        newState.combatants = attackers.map(a => ({ attackerId: a.instanceId, blockerId: null }));
                        newState.isProcessing = true;
                    } else {
                        newState.phase = TurnPhase.END;
                        newState.isProcessing = true;
                    }
                    break;
                case TurnPhase.BLOCK:
                    newState.phase = TurnPhase.END;
                    newState.isProcessing = true;
                    break;
                case TurnPhase.END: {
                    // Reset statuses for all units on board
                    newState.players.forEach(p => {
                        p.units.forEach(u => {
                            u.hasStruck = false;
                            u.shieldUsedThisTurn = false;
                        });
                    });
                     // Switch players
                    newState.currentPlayerId = 1 - newState.currentPlayerId;
                    if (newState.currentPlayerId === 0) {
                        newState.turn++;
                    }
                    newState.phase = TurnPhase.START;
                    newState.isProcessing = true;
                    const nextPlayerLog = newState.actionHistory.find(h => h.turn === newState.turn && h.playerId === newState.currentPlayerId);
                    if (!nextPlayerLog) {
                        newState.actionHistory.push({ turn: newState.turn, playerId: newState.currentPlayerId, actions: [] });
                    }
                    break;
                }
            }
            return newState;
        }

        case 'ROLL_DICE': {
            if (newState.rollCount < newState.maxRolls) {
                newState.rollCount++;
                newState.dice = newState.dice.map(d => 
                    d.isKept || d.isSpent ? d : { ...d, value: Math.floor(Math.random() * 6) + 1 }
                );
                addLogEntry(`Roll ${newState.rollCount}: [${newState.dice.filter(d=>!d.isKept && !d.isSpent).map(d=>d.value).join(', ')}]`);
            }
            newState.isProcessing = false;
            return newState;
        }
        
        case 'TOGGLE_DIE_KEPT': {
            const die = newState.dice.find(d => d.id === action.payload.id);
            if (die && !die.isSpent) {
                die.isKept = action.payload.keep;
            }
            newState.isProcessing = false;
            return newState;
        }
        
        case 'PLAY_CARD': {
            const { card, targetInstanceId, options = {} } = action.payload;
            const player = newState.players[newState.currentPlayerId];
            const opponent = newState.players[1 - newState.currentPlayerId];

            let cost: DiceCost[];
            let actionType: LastActionType;

            if (options.isReclaimed) {
                cost = card.abilities.reclaim.cost;
                actionType = LastActionType.RECLAIM;
                addLogEntry(`reclaims ${card.name}.`);
                player.graveyard = player.graveyard.filter(c => c.instanceId !== card.instanceId);
            } else if (options.isEvoked) {
                cost = card.abilities.evoke.cost;
                actionType = LastActionType.EVOKE;
                addLogEntry(`evokes ${card.name}.`);
                player.hand = player.hand.filter(c => c.instanceId !== card.instanceId);
            } else if (options.isAmplified) {
                cost = (card.dice_cost || []).concat(card.abilities.amplify.cost || []);
                actionType = LastActionType.PLAY;
                addLogEntry(`plays ${card.name} (Amplified).`);
                player.hand = player.hand.filter(c => c.instanceId !== card.instanceId);
            } else if (options.isAugmented) {
                cost = card.abilities.augment.cost;
                actionType = LastActionType.PLAY;
                addLogEntry(`augments with ${card.name}.`);
                player.hand = player.hand.filter(c => c.instanceId !== card.instanceId);
            } else {
                cost = card.dice_cost;
                actionType = LastActionType.PLAY;
                addLogEntry(`plays ${card.name}.`);
                player.hand = player.hand.filter(c => c.instanceId !== card.instanceId);
            }
            
            const { diceToSpend } = checkDiceCost({ ...card, dice_cost: cost }, newState.dice);
            const spentDiceIds = new Set(diceToSpend.map(d => d.id));
            newState.dice.forEach(d => { if(spentDiceIds.has(d.id)) d.isSpent = true; });
            newState.lastActionDetails = { type: actionType, spentDiceIds: Array.from(spentDiceIds) };
            
            const cardToPlay: CardInGame = { ...card, isReclaimed: options.isReclaimed };
            if (cardToPlay.abilities?.consume) {
                cardToPlay.counters = cardToPlay.abilities.consume.initial;
            }

            if (card.type === CardType.UNIT) {
                cardToPlay.turnPlayed = newState.turn;
                player.units.push(cardToPlay);
            }
            else if (card.type === CardType.LOCATION) player.locations.push(cardToPlay);
            else if (card.type === CardType.ARTIFACT) player.artifacts.push(cardToPlay);
            else { // Event or Evoked
                 if (options.isEvoked) {
                    player.graveyard.push(cardToPlay); // Evoked card goes to graveyard
                }
            }

            let target: CardInGame | null = null;
            if (targetInstanceId) {
                for (const p of newState.players) {
                    const found = [...p.units, ...p.locations, ...p.artifacts].find(c => c.instanceId === targetInstanceId);
                    if (found) {
                        target = found;
                        break;
                    }
                }
            }
            
            let effectsToApply = { ...cardToPlay.abilities };
            if (options.isAmplified && card.abilities.amplify.effect) {
                effectsToApply = { ...effectsToApply, ...card.abilities.amplify.effect };
            }
            if(options.isEvoked && card.abilities.evoke.effect) {
                effectsToApply = card.abilities.evoke.effect;
            }

            let afterEffectState = applyCardEffects(newState, { effect: effectsToApply, sourceCard: cardToPlay, target }, log);
            
            if (card.type === CardType.EVENT && !options.isEvoked) {
                 afterEffectState.players[newState.currentPlayerId].graveyard.push(cardToPlay);
            }
            
            afterEffectState = processDestroyedUnits(afterEffectState, log);
            
            afterEffectState.isProcessing = false;
            log.forEach(addLogEntry);

            return afterEffectState;
        }

        case 'ACTIVATE_ABILITY': {
            const player = newState.players[newState.currentPlayerId];
            const card = [...player.units, ...player.artifacts].find(c => c.instanceId === action.payload.cardInstanceId);
            if (card && card.abilities?.activate) {
                if(card.type === CardType.UNIT && card.turnPlayed === newState.turn && !cardHasAbility(card, 'charge')) {
                    return newState; // Summoning sickness
                }

                const cost = card.abilities.activate.cost;
                const { diceToSpend } = checkDiceCost({ ...card, dice_cost: cost }, newState.dice);
                const spentDiceIds = new Set(diceToSpend.map(d => d.id));
                newState.dice.forEach(d => { if(spentDiceIds.has(d.id)) d.isSpent = true; });
                newState.lastActionDetails = { type: LastActionType.ACTIVATE, spentDiceIds: Array.from(spentDiceIds) };
                
                if (card.abilities.consume && card.counters) {
                    card.counters -= 1;
                }

                addLogEntry(`${player.name} activates ${card.name}.`);
                let afterEffectState = applyCardEffects(newState, { effect: card.abilities.activate.effect, sourceCard: card, target: null }, log);
                afterEffectState = processDestroyedUnits(afterEffectState, log);

                if (card.abilities.consume && (card.counters ?? 0) <= 0) {
                     if (card.type === CardType.UNIT) {
                        player.units = player.units.filter(u => u.instanceId !== card.instanceId);
                    } else if (card.type === CardType.ARTIFACT) {
                        player.artifacts = player.artifacts.filter(a => a.instanceId !== card.instanceId);
                    }
                    player.graveyard.push(card);
                    log.push(`${card.name} is spent and moved to the graveyard.`);
                }
                
                afterEffectState.isProcessing = false;
                log.forEach(addLogEntry);
                return afterEffectState;
            }
            return newState;
        }

        case 'DECLARE_BLOCKS': {
            const assignments = action.payload.assignments;
            const attackerPlayer = newState.players[newState.currentPlayerId];
            const defenderPlayer = newState.players[1 - newState.currentPlayerId];
            const combatInfo = new Map<string, { destroyer: CardInGame, destroyerPlayer: Player }>();

            newState.combatants?.forEach(combatant => {
                const blockerId = Object.keys(assignments).find(key => assignments[key] === combatant.attackerId);
                if (blockerId) combatant.blockerId = blockerId;
            });

            const allAttackers = newState.combatants!.map(c => attackerPlayer.units.find(u => u.instanceId === c.attackerId)!).filter(Boolean);

            for (const attacker of allAttackers) {
                const combat = newState.combatants!.find(c => c.attackerId === attacker.instanceId);
                const isPhasing = cardHasAbility(attacker, 'phasing');
                const isBlocked = combat?.blockerId && !isPhasing;
                const attackerStats = getEffectiveStats(attacker, attackerPlayer, { isStrikePhase: true });

                if (isBlocked) {
                    const blocker = defenderPlayer.units.find(u => u.instanceId === combat!.blockerId!)!;
                    const blockerStats = getEffectiveStats(blocker, defenderPlayer, { isStrikePhase: true });

                    let attackerDamageToTake = blockerStats.strength;
                    let blockerDamageToTake = attackerStats.strength;

                    if (cardHasAbility(attacker, 'shield') && !attacker.shieldUsedThisTurn && attackerDamageToTake > 0) {
                        log.push(`${attacker.name}'s Shield blocks incoming damage.`);
                        attackerDamageToTake = 0;
                        attacker.shieldUsedThisTurn = true;
                    }
                    if (cardHasAbility(blocker, 'shield') && !blocker.shieldUsedThisTurn && blockerDamageToTake > 0) {
                        log.push(`${blocker.name}'s Shield blocks incoming damage.`);
                        blockerDamageToTake = 0;
                        blocker.shieldUsedThisTurn = true;
                    }

                    attacker.damage += attackerDamageToTake;
                    blocker.damage += blockerDamageToTake;
                    log.push(`${attacker.name} (${attackerStats.strength}/${attackerStats.durability - attacker.damage + attackerDamageToTake}) battles ${blocker.name} (${blockerStats.strength}/${blockerStats.durability - blocker.damage + blockerDamageToTake}).`);

                    if (cardHasAbility(attacker, 'venomous') && blockerDamageToTake > 0) {
                        blocker.damage = 999;
                        log.push(`${attacker.name}'s Venomous ability marks ${blocker.name} for destruction.`);
                    }
                    if (cardHasAbility(blocker, 'venomous') && attackerDamageToTake > 0) {
                        attacker.damage = 999;
                        log.push(`${blocker.name}'s Venomous ability marks ${attacker.name} for destruction.`);
                    }
                    
                    if (getEffectiveStats(attacker, attackerPlayer).durability - attacker.damage <= 0) combatInfo.set(attacker.instanceId, { destroyer: blocker, destroyerPlayer: defenderPlayer });
                    if (getEffectiveStats(blocker, defenderPlayer).durability - blocker.damage <= 0) combatInfo.set(blocker.instanceId, { destroyer: attacker, destroyerPlayer: attackerPlayer });

                } else {
                    if (attackerStats.strength > 0) {
                        const damageType = isPhasing ? "Phasing" : "direct";
                        defenderPlayer.morale -= attackerStats.strength;
                        log.push(`${attacker.name} strikes ${defenderPlayer.name} for ${attackerStats.strength} ${damageType} Morale damage.`);
                        if (cardHasAbility(attacker, 'siphon')) {
                            const siphonAmount = attacker.abilities.siphon;
                            attackerPlayer.morale += siphonAmount;
                            log.push(`${attacker.name}'s Siphon heals ${attackerPlayer.name} for ${siphonAmount} Morale.`);
                        }
                    }
                }
                attacker.hasStruck = true;
            }

            newState = processDestroyedUnits(newState, log, combatInfo);
            newState.phase = TurnPhase.END;
            newState.isProcessing = true;
            log.forEach(addLogEntry);
            return newState;
        }

        case 'AI_ACTION': {
            newState.isProcessing = false;
            return newState;
        }
        
        case 'CLEAR_LAST_TRIGGERED_CARD': {
            newState.lastTriggeredCardId = null;
            return newState;
        }
        
        default:
            return state;
    }
}


export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, getInitialState());
  return { state, dispatch };
};