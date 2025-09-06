
import { useReducer, useMemo } from 'react';
import { GameState, Player, CardInGame, TurnPhase, Die, CardType, DiceCostType, DiceCost, CardDefinition, LastActionType } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { buildDeckFromCards } from '../game/cards';
import { shuffle } from '../game/utils';
import { getAiAction } from './ai';

// Action Types
type Action =
  | { type: 'START_GAME'; payload: { allCards: CardDefinition[] } }
  | { type: 'PLAYER_MULLIGAN_CHOICE', payload: { mulligan: boolean } }
  | { type: 'AI_MULLIGAN'; payload: { mulligan: boolean } }
  | { type: 'ADVANCE_PHASE'; payload?: { assault: boolean } }
  | { type: 'DECLARE_BLOCKS'; payload: { assignments: { [blockerId: string]: string } } }
  | { type: 'ROLL_DICE' }
  | { type: 'TOGGLE_DIE_KEPT'; payload: { id: number, keep: boolean } }
  | { type: 'PLAY_CARD'; payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; isAugmented?: boolean; } } }
  | { type: 'ACTIVATE_ABILITY'; payload: { cardInstanceId: string } }
  | { type: 'AI_ACTION' };

// Helper Functions
// MOVED TO UTILS

const createInitialPlayer = (id: number, name: string, deck: CardDefinition[]): Player => {
  const shuffledDeck = shuffle(deck);
  return {
    id,
    name,
    command: 20,
    deck: shuffledDeck,
    hand: [],
    units: [],
    locations: [],
    artifacts: [],
    graveyard: [],
    void: [],
    riftwalkZone: [],
    diceModifier: 0,
    shieldUsedThisTurn: false,
    isCommandFortified: false,
    skipNextDrawPhase: false,
    fatigueCounter: 0,
    hasMulliganed: false,
  };
};

const drawCards = (player: Player, count: number): { player: Player, drawnCards: CardInGame[], fatigueDamage: number[] } => {
    const newPlayer = {...player};
    newPlayer.hand = [...newPlayer.hand]; // ensure mutable
    newPlayer.deck = [...newPlayer.deck]; // ensure mutable

    const drawnCards: CardInGame[] = [];
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
              hasAssaulted: false,
              attachments: [],
            };
            drawnCards.push(newCard);
        } else {
            newPlayer.fatigueCounter++;
            fatigueDamage.push(newPlayer.fatigueCounter);
        }
    }
    newPlayer.hand = [...newPlayer.hand, ...drawnCards];
    return { player: newPlayer, drawnCards, fatigueDamage };
}

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

    const validCombinations = combinations.filter(combo => combo.reduce((acc, die) => acc + die.value, 0) >= cost.value!);

    if (validCombinations.length === 0) return initialCostResult(availableDice);

    // Sort by sum (ascending), then by max die value (ascending) to use lowest dice possible
    validCombinations.sort((a, b) => {
        const sumA = a.reduce((acc, die) => acc + die.value, 0);
        const sumB = b.reduce((acc, die) => acc + die.value, 0);
        if (sumA !== sumB) {
            return sumA - sumB;
        }
        const maxA = Math.max(...a.map(d => d.value));
        const maxB = Math.max(...b.map(d => d.value));
        return maxA - maxB;
    });

    const bestCombination = validCombinations[0];
    const comboIds = new Set(bestCombination.map(d => d.id));
    return { 
        canPay: true, 
        diceToSpend: bestCombination, 
        remainingDice: availableDice.filter(d => !comboIds.has(d.id)) 
    };
};

const checkStraight = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const uniqueSorted = [...new Set(availableDice.map(d => d.value))].sort((a,b)=>a-b);
    if (uniqueSorted.length < cost.count!) return initialCostResult(availableDice);
    
    for (let i = 0; i <= uniqueSorted.length - cost.count!; i++) {
        let isStraight = true;
        for(let j=0; j < cost.count! - 1; j++) {
            if (uniqueSorted[i+j+1] !== uniqueSorted[i+j] + 1) {
                isStraight = false;
                break;
            }
        }
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
    const fourOfAKindVal = Object.keys(counts).find(k => counts[parseInt(k)] >= 4);

    if (pairs.length < 2 && !fourOfAKindVal) return initialCostResult(availableDice);
    
    let diceToSpend: Die[] = [];
    if (fourOfAKindVal) {
        diceToSpend = availableDice.filter(d => d.value === parseInt(fourOfAKindVal)).slice(0, 4);
    } else {
        diceToSpend = [
            ...availableDice.filter(d => d.value === pairs[0]).slice(0, 2),
            ...availableDice.filter(d => d.value === pairs[1]).slice(0, 2),
        ];
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
    const pairValStr = Object.keys(counts).find(k => counts[parseInt(k)] >= 2 && parseInt(k) !== threeVal);
    if (!pairValStr) return initialCostResult(availableDice);

    const diceToSpend = [
        ...availableDice.filter(d => d.value === threeVal).slice(0, 3),
        ...availableDice.filter(d => d.value === parseInt(pairValStr)).slice(0, 2)
    ];
    
    const spentIds = new Set(diceToSpend.map(d => d.id));
    return { canPay: true, diceToSpend, remainingDice: availableDice.filter(d => !spentIds.has(d.id)) };
};

const checkOddEven = (isOdd: boolean, cost: DiceCost, availableDice: Die[]): CostCheckResult => {
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
    if (availableDice.length < cost.count!) return initialCostResult(availableDice);
    
    // This is computationally expensive for large counts, but for card games (count typically 2-3) it's fine.
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

    const validCombinations = combinations.filter(combo => {
        const sum = combo.reduce((acc, die) => acc + die.value, 0);
        return sum >= cost.value! && sum <= cost.maxValue!;
    });

    if (validCombinations.length === 0) return initialCostResult(availableDice);
    
    // Heuristic: use the combination with the lowest sum to save higher dice.
    validCombinations.sort((a, b) => {
        const sumA = a.reduce((acc, die) => acc + die.value, 0);
        const sumB = b.reduce((acc, die) => acc + die.value, 0);
        return sumA - sumB;
    });

    const bestCombination = validCombinations[0];
    const comboIds = new Set(bestCombination.map(d => d.id));
    return { 
        canPay: true, 
        diceToSpend: bestCombination, 
        remainingDice: availableDice.filter(d => !comboIds.has(d.id)) 
    };
};

const checkSpread = (cost: DiceCost, availableDice: Die[]): CostCheckResult => {
    const lowDie = availableDice.find(d => d.value <= cost.lowValue!);
    if (!lowDie) return initialCostResult(availableDice);

    const highDie = availableDice.find(d => d.id !== lowDie.id && d.value >= cost.highValue!);
    if (!highDie) return initialCostResult(availableDice);

    return {
        canPay: true,
        diceToSpend: [lowDie, highDie],
        remainingDice: availableDice.filter(d => d.id !== lowDie.id && d.id !== highDie.id)
    };
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
        case DiceCostType.ODD_DICE: return checkOddEven(true, cost, availableDice);
        case DiceCostType.EVEN_DICE: return checkOddEven(false, cost, availableDice);
        case DiceCostType.NO_DUPLICATES: return checkNoDuplicates(cost, availableDice);
        case DiceCostType.SUM_BETWEEN: return checkSumBetween(cost, availableDice);
        case DiceCostType.SPREAD: return checkSpread(cost, availableDice);
        default: return initialCostResult(availableDice);
    }
}
// #endregion


// Cost Checking Logic
export const checkDiceCost = (card: { dice_cost: DiceCost[], abilities?: { [key: string]: any; } }, dice: Die[]): { canPay: boolean, diceToSpend: Die[] } => {
    let availableDice = dice.filter(d => !d.isSpent);
    
    // Handle Wild keyword: transform costs before checking
    const costToUse = card.abilities?.wild 
        ? card.dice_cost.map(c => c.type === DiceCostType.EXACT_VALUE ? { ...c, type: DiceCostType.ANY_X_DICE } : c)
        : card.dice_cost;
        
    if (!costToUse || costToUse.length === 0) return { canPay: true, diceToSpend: [] };
    
    let totalDiceToSpend: Die[] = [];
    let canPay = true;

    for(const cost of costToUse) {
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


export const isCardTargetable = (targetingCard: CardInGame, targetCard: CardInGame, sourcePlayer: Player, targetPlayer: Player): boolean => {
    if (!targetingCard) return false;

    // --- Absolute Protections ---
    if (targetCard.abilities?.immutable) return false;

    // --- Conditional Protections ---
    const isOpponentTarget = sourcePlayer.id !== targetPlayer.id;
    if (isOpponentTarget && targetingCard.type === CardType.EVENT) {
        if (targetCard.abilities?.stealth) return false;
        if (targetCard.abilities?.breach && !targetCard.hasAssaulted) return false;
    }

    // --- Ability-based Targeting Rules ---
    const abilities = targetingCard.abilities;
    // Stricter rules: these effects almost always target opponents.
    const mustTargetOpponent = abilities?.corrupt || abilities?.voidTarget;
    // Stricter rules: these effects almost always target friendlies.
    const mustTargetFriendly = abilities?.recall || abilities?.augment;

    if (mustTargetOpponent && !isOpponentTarget) {
        return false;
    }
    
    if (mustTargetFriendly && isOpponentTarget) {
        return false;
    }

    // --- Default Case ---
    // If no specific rules prevent targeting, it is allowed. This is more flexible for future abilities
    // and allows for advanced plays like using a damage ability on your own unit with Martyrdom.
    return true;
};


const cardHasAbility = (card: CardInGame, ability: string): boolean => {
    if ((card.abilities as any)?.[ability]) {
        return true;
    }
    if (card.attachments && card.attachments.length > 0) {
        return card.attachments.some(att => att.abilities?.augment?.effect?.grants?.includes(ability.toUpperCase()));
    }
    return false;
};

const gameReducer = (state: GameState, action: Action): GameState => {
  try {
    if (state.winner && action.type !== 'START_GAME') return state;

    // A note on state updates:
    // We use JSON.parse(JSON.stringify(state)) to create a deep copy of the state.
    // This is a simple and effective way to ensure immutability for a state object that is fully serializable, like ours.
    // While libraries like Immer can offer better performance for very large and complex states,
    // this approach avoids adding external dependencies and is sufficient for the current scale of the game.
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    
    const log = (message: string) => newState.log.push(message);

    const logAction = (message: string) => {
        let lastHistoryEntry = newState.actionHistory[newState.actionHistory.length - 1];

        if (!lastHistoryEntry || lastHistoryEntry.turn !== newState.turn || lastHistoryEntry.playerId !== newState.currentPlayerId) {
            newState.actionHistory.push({
                turn: newState.turn,
                playerId: newState.currentPlayerId,
                actions: [message],
            });
        } else {
            lastHistoryEntry.actions.push(message);
        }
    };
    
    const damagePlayer = (player: Player, amount: number, source: string, type: 'damage' | 'loss' = 'damage') => {
        if (player.isCommandFortified && type === 'damage') {
            log(`${player.name}'s Command is fortified and takes no damage from ${source}!`);
            return;
        }

        // Handle Fortify keyword
        if (type === 'damage') {
            const fortifyValue = player.locations
                .filter(l => l.abilities?.fortify)
                .reduce((max, l) => Math.max(max, l.abilities!.fortify!.value), 0);

            if (fortifyValue > 0 && player.command - amount < fortifyValue) {
                const prevented = player.command - fortifyValue;
                player.command = fortifyValue;
                log(`Fortify prevents ${amount - prevented} damage! ${player.name}'s Command is now ${player.command}.`);
                return;
            }
        }
        player.command -= amount;
        log(`${player.name} loses ${amount} Command from ${source}!`);
    }

    const dealDamageToUnit = (target: CardInGame, amount: number, sourceCard: CardInGame | null, targetOwner: Player) => {
        if (target.abilities?.immutable) {
            log(`${target.name} is Immutable and ignores damage from ${sourceCard?.name || 'Effect'}.`);
            return;
        }

        if (target.abilities?.shield && !target.shieldUsedThisTurn) {
            target.shieldUsedThisTurn = true;
            log(`${target.name}'s Shield prevents the damage from ${sourceCard?.name || 'Effect'}!`);
            return; // Prevent damage
        }

        let finalAmount = amount;

        if (target.abilities?.fragile && sourceCard?.type === CardType.EVENT) {
            finalAmount *= 2;
            log(`${target.name} is Fragile and takes double damage!`);
        }
        target.damage += finalAmount;
        log(`${sourceCard?.name || 'Effect'} deals ${finalAmount} damage to ${target.name}.`);

        if (sourceCard && cardHasAbility(sourceCard, 'venomous') && finalAmount > 0) {
            const { durability } = getEffectiveStats(target, targetOwner);
            target.damage = durability; // Mark for destruction
            log(`${sourceCard.name}'s Venomous ability marks ${target.name} for destruction!`);
        }
    };

    const checkForDestroyedUnits = (sourcePlayerId: number, sourceCard?: CardInGame): boolean => {
        let anyChangeInLoop = false;
        let loopAgain = true;
        let loopCount = 0;
        const MAX_CHAIN_REACTIONS = 20; // Prevent infinite loops

        while (loopAgain) {
             if (loopCount++ > MAX_CHAIN_REACTIONS) {
                log('!! System Warning: Exceeded maximum chain reaction limit. Halting destruction sequence.');
                console.error('Potential infinite loop detected in checkForDestroyedUnits. Breaking.');
                break;
            }
            loopAgain = false;
            for (let i = 0; i < 2; i++) {
                const player = newState.players[i];
                const opponent = newState.players[1 - i];
                const unitsToCheck = [...player.units];
                
                for (const unit of unitsToCheck) {
                    if (!player.units.some(u => u.instanceId === unit.instanceId)) continue;
                    
                    const { durability } = getEffectiveStats(unit, player);
                    if (unit.damage >= durability) {
                        loopAgain = true;
                        anyChangeInLoop = true;
                        
                        player.units = player.units.filter(u => u.instanceId !== unit.instanceId);
                        
                        if (unit.isScavenged || unit.isToken) {
                            player.void.push(unit);
                            log(`${unit.name} was destroyed and Voided (${unit.isToken ? 'Token' : 'Scavenged'}).`);
                        } else {
                            player.graveyard.push(unit);
                            log(`${unit.name} was destroyed.`);
                        }
                        
                        if (sourceCard?.abilities?.executioner && player.id !== sourcePlayerId) {
                            damagePlayer(player, sourceCard.abilities.executioner.amount, `${sourceCard.name}'s Executioner`, 'damage');
                        }
                        
                        let standardPenaltyApplies = true;
                        
                        if (unit.abilities?.bounty && player.id !== sourcePlayerId) {
                            opponent.command += unit.abilities.bounty.amount;
                            log(`${opponent.name} gains ${unit.abilities.bounty.amount} Command from ${unit.name}'s Bounty.`);
                        }
                        if (unit.abilities?.malice) {
                            damagePlayer(player, unit.abilities.malice, `${unit.name}'s Malice`, 'loss');
                        }
                        if (unit.abilities?.martyrdom) {
                            const effect = unit.abilities.martyrdom;
                            log(`${unit.name}'s Martyrdom triggers!`);
                            switch(effect.type) {
                                case 'DRAW_CARD': {
                                    const { player: p, fatigueDamage } = drawCards(newState.players[player.id], effect.value);
                                    newState.players[player.id] = p;
                                    if (fatigueDamage.length > 0) {
                                        fatigueDamage.forEach(dmg => {
                                            damagePlayer(p, dmg, 'Fatigue', 'damage');
                                            log(`${p.name} failed to draw and takes ${dmg} Fatigue damage!`);
                                        });
                                    }
                                    break;
                                }
                                case 'DEAL_DAMAGE_TO_OPPONENT':
                                    damagePlayer(opponent, effect.value, `${unit.name}'s Martyrdom`, 'damage');
                                    break;
                            }
                        }
                        if (unit.abilities?.haunt) {
                            damagePlayer(opponent, unit.abilities.haunt, `${unit.name}'s Haunt`, 'loss');
                            standardPenaltyApplies = false;
                        } 
                        
                        if (standardPenaltyApplies && player.id !== sourcePlayerId) {
                            damagePlayer(player, unit.commandNumber ?? 0, `${unit.name}'s destruction`, 'loss');
                        }
                    }
                }
            }
            
            if (newState.players[0].command <= 0) newState.winner = newState.players[1];
            if (newState.players[1].command <= 0) newState.winner = newState.players[0];
            if (newState.winner) loopAgain = false;
        }
        
        return anyChangeInLoop;
    }

    const resolveAnnihilate = (sourceCard: CardInGame, player: Player, opponent: Player) => {
        log(`${sourceCard.name}'s Annihilate voids all other units!`);
        const opponentUnitsToVoid = opponent.units.filter(u => !u.abilities?.immutable);
        const playerUnitsToVoid = player.units.filter(u => u.instanceId !== sourceCard.instanceId && !u.abilities?.immutable);
        
        opponent.units = opponent.units.filter(u => u.abilities?.immutable);
        player.units = player.units.filter(u => u.instanceId === sourceCard.instanceId || u.abilities?.immutable);
        
        playerUnitsToVoid.forEach(u => {
          player.void.push(u);
          log(`${u.name} is voided.`);
        });

        opponentUnitsToVoid.forEach(u => {
          opponent.void.push(u);
          log(`${u.name} is voided.`);
          damagePlayer(opponent, u.commandNumber ?? 0, `${u.name}'s voiding`, 'loss');
        });
    };

    const resolveArrivalAbilities = (card: CardInGame, player: Player, opponent: Player, amplified: boolean) => {
        // Echo keyword
        if (card.type === CardType.UNIT && card.abilities?.echo) {
            log(`${card.name} Echoes, creating a token copy!`);
            const tokenCopy: CardInGame = {
                ...card,
                instanceId: `${card.id}-token-${Date.now()}-${Math.random()}`,
                isToken: true,
                attachments: [],
            };
            player.units.push(tokenCopy);
        }

        // Keyword-based Effects
        if (card.abilities?.resonance) {
            if (player.deck.length > 0) {
                const topCardDef = player.deck[player.deck.length - 1]; // Peek at the top card
                log(`${card.name}'s Resonance reveals ${topCardDef.name}.`);
                if ((topCardDef.commandNumber ?? 0) >= card.abilities.resonance.value) {
                    log(`Resonance successful!`);
                    const effect = card.abilities.resonance.effect;
                    // Using a switch to be more extensible for future Resonance effects
                    switch(effect.type) {
                        case 'BUFF_STRENGTH': {
                            const cardInPlay = player.units.find(u => u.instanceId === card.instanceId);
                            if (cardInPlay) {
                                cardInPlay.strengthModifier += effect.amount;
                                log(`${card.name} gains +${effect.amount} Strength.`);
                            }
                            break;
                        }
                        // Other potential Resonance effects can be added here.
                    }
                } else {
                    log(`Resonance failed. Top card's Command Number was too low.`);
                }
                // The card is only revealed and remains on top of the deck.
            }
        }
        if (card.abilities?.stagnate) {
            opponent.skipNextDrawPhase = true;
            log(`${opponent.name} will skip their next Draw Phase due to Stagnate!`);
        }
         if(card.abilities?.fateweave && newState.rollCount < newState.maxRolls) {
            newState.maxRolls += card.abilities.fateweave;
            log(`${player.name} gains an extra roll from Fateweave!`);
        }
        if(card.abilities?.foresight && player.deck.length > 0) {
            const foresightValue = card.abilities.foresight.value || 1;
            const topCards = player.deck.slice(-foresightValue).reverse();
            if (topCards.length > 0) {
              const cardNames = topCards.map(c => c.name).join(', ');
              log(`Foresight reveals ${player.name}'s top ${topCards.length} card(s): ${cardNames}`);
            }
        }
        if(card.abilities?.draw) {
            const { player: p, fatigueDamage } = drawCards(player, card.abilities.draw);
            player = p;
            if (fatigueDamage.length > 0) {
                fatigueDamage.forEach(dmg => {
                    damagePlayer(player, dmg, 'Fatigue', 'damage');
                    log(`${player.name} failed to draw and takes ${dmg} Fatigue damage!`);
                });
            }
        }
        if (card.abilities?.barrage) {
            log(`${card.name}'s Barrage deals ${card.abilities.barrage} damage to all enemy units!`);
            opponent.units.forEach(unit => {
                if (unit.abilities?.breach && !unit.hasAssaulted) {
                    log(`${unit.name} is protected from ${card.name}'s Barrage by Breach.`);
                    return; 
                }
                dealDamageToUnit(unit, card.abilities.barrage, card, opponent);
            });
        }
        if (card.abilities?.purge) {
            log(`${card.name} purges ${card.abilities.purge} cards from ${opponent.name}'s graveyard.`);
            for (let i=0; i < card.abilities.purge; i++) {
                if (opponent.graveyard.length > 0) {
                    const randomIndex = Math.floor(Math.random() * opponent.graveyard.length);
                    const purgedCard = opponent.graveyard.splice(randomIndex, 1)[0];
                    opponent.void.push(purgedCard);
                    log(`Voided ${purgedCard.name}.`);
                }
            }
        }
        if (card.abilities?.sabotage) {
            opponent.diceModifier -= card.abilities.sabotage;
            log(`${opponent.name} will roll ${card.abilities.sabotage} fewer dice next turn!`);
        }
        if (card.abilities?.warp) {
            newState.extraTurns += 1;
            log(`${player.name} will take an extra turn!`);
        }
        if (card.abilities?.discard) {
            if (opponent.hand.length > 0) {
                const discardCount = card.abilities.discard;
                for(let i=0; i < discardCount; i++) {
                    if(opponent.hand.length === 0) break;
                    const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                    const discardedCard = opponent.hand.splice(randomIndex, 1)[0];
                    opponent.graveyard.push(discardedCard);
                    log(`${opponent.name} discards ${discardedCard.name}.`);
                }
            }
        }
         // Card-specific (unique) effects / High-rarity keywords
        if (card.abilities?.annihilate) {
            resolveAnnihilate(card, player, opponent);
        }
        return { player, opponent };
    }

    switch (action.type) {
      case 'START_GAME': {
        const p1Deck = buildDeckFromCards(action.payload.allCards);
        const p2Deck = buildDeckFromCards(action.payload.allCards);
        let player1 = createInitialPlayer(0, 'You', p1Deck);
        let player2 = createInitialPlayer(1, 'CPU', p2Deck);
        player1 = drawCards(player1, 3).player;
        player2 = drawCards(player2, 3).player;
        newState.lastActionDetails = null;

        return {
          players: [player1, player2],
          currentPlayerId: 0,
          turn: 1,
          phase: TurnPhase.MULLIGAN,
          dice: Array.from({ length: 5 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false })),
          rollCount: 0,
          maxRolls: 3,
          log: ['SYSTEM BOOT: Game initialized.'],
          winner: null,
          isProcessing: false,
          extraTurns: 0,
          lastActionDetails: null,
          actionHistory: [],
          combatants: null,
        };
      }
      
      case 'PLAYER_MULLIGAN_CHOICE': {
          if (newState.phase !== TurnPhase.MULLIGAN) return state;
          newState.lastActionDetails = null;
          const { mulligan } = action.payload;
          let player = newState.players[0];

          if (mulligan) {
              log(`You chose to mulligan.`);
              logAction('Mulliganed their hand.');
              const handToReturn = player.hand;
              const deckWithReturnedCards = shuffle([...player.deck, ...handToReturn]);
              player.deck = deckWithReturnedCards;
              player.hand = [];
              const { player: p1 } = drawCards(player, 3);
              player = p1;
          } else {
              log(`You kept your starting hand.`);
              logAction('Kept their hand.');
          }
          player.hasMulliganed = true;
          newState.players[0] = player;
          
          newState.phase = TurnPhase.AI_MULLIGAN;
          newState.isProcessing = true;
          return newState;
      }

      case 'AI_MULLIGAN': {
          if (newState.phase !== TurnPhase.AI_MULLIGAN) return state;
          newState.lastActionDetails = null;
          const { mulligan } = action.payload;
          let ai = newState.players[1];

          if (mulligan) {
              log(`CPU chose to mulligan.`);
              logAction('Mulliganed their hand.');
              const handToReturn = ai.hand;
              const deckWithReturnedCards = shuffle([...ai.deck, ...handToReturn]);
              ai.deck = deckWithReturnedCards;
              ai.hand = [];
              const { player: p2 } = drawCards(ai, 3);
              ai = p2;
          } else {
              log(`CPU kept its starting hand.`);
              logAction('Kept their hand.');
          }
          ai.hasMulliganed = true;
          newState.players[1] = ai;

          newState.phase = TurnPhase.START;
          newState.isProcessing = true;
          return newState;
      }

      case 'ROLL_DICE': {
        if (newState.rollCount >= newState.maxRolls) return state;
        newState.lastActionDetails = null;
        const diceToRoll = newState.dice.filter(d => !d.isKept && !d.isSpent);
        const rolledValues: number[] = [];
        diceToRoll.forEach(d => {
          const newValue = Math.floor(Math.random() * 6) + 1;
          newState.dice.find(nd => nd.id === d.id)!.value = newValue;
          rolledValues.push(newValue);
        });
        newState.rollCount++;
        log(`${newState.players[newState.currentPlayerId].name} rolled dice.`);
        logAction(`Rolled: [${rolledValues.join(', ')}]`);
        return newState;
      }
      case 'TOGGLE_DIE_KEPT':
        const die = newState.dice.find(d => d.id === action.payload.id);
        if (die && !die.isSpent && newState.rollCount > 0) {
          die.isKept = action.payload.keep;
        }
        return newState;
      
      case 'PLAY_CARD': {
        newState.lastActionDetails = null;
        let currentPlayer = newState.players[newState.currentPlayerId];
        let opponentPlayer = newState.players[1 - newState.currentPlayerId];
        
        const { card: cardToPlay, targetInstanceId, options } = action.payload;
        let actionType: LastActionType = LastActionType.PLAY;
        let costConfig = { dice_cost: cardToPlay.dice_cost, abilities: cardToPlay.abilities };
        
        if (options?.isChanneled) {
            actionType = LastActionType.CHANNEL;
            costConfig = { dice_cost: cardToPlay.abilities.channel.cost, abilities: cardToPlay.abilities };
        }
        if (options?.isScavenged) {
            actionType = LastActionType.SCAVENGE;
            costConfig = { dice_cost: cardToPlay.abilities.scavenge.cost, abilities: cardToPlay.abilities };
        }
        if (options?.isAmplified && cardToPlay.abilities?.amplify) {
            costConfig = { dice_cost: cardToPlay.dice_cost.concat(cardToPlay.abilities.amplify.cost), abilities: cardToPlay.abilities };
        }
        if (options?.isAugmented && cardToPlay.abilities?.augment) {
            costConfig = { dice_cost: cardToPlay.abilities.augment.cost, abilities: cardToPlay.abilities };
        }

        const costCheck = checkDiceCost(costConfig, newState.dice);
        if(!costCheck.canPay) return state;

        let logMessage = '';
        if (options?.isScavenged) {
            logMessage = `Scavenged ${cardToPlay.name}`;
        } else if (options?.isChanneled) {
            logMessage = `Channeled ${cardToPlay.name}`;
        } else if (options?.isAugmented) {
            logMessage = `Augmented with ${cardToPlay.name}`;
        } else {
            logMessage = `Played ${cardToPlay.name}`;
        }
        if (options?.isAmplified) {
            logMessage += ' (Amplified)';
        }
        if (targetInstanceId) {
            const targetOwner = newState.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(c => c.instanceId === targetInstanceId));
            const targetCard = targetOwner ? [...targetOwner.units, ...targetOwner.locations, ...targetOwner.artifacts].find(c => c.instanceId === targetInstanceId) : null;
            if (targetCard) {
                logMessage += ` targeting ${targetCard.name}.`;
            } else {
                logMessage += `.`;
            }
        } else {
            logMessage += `.`;
        }
        logAction(logMessage);

        newState.lastActionDetails = { type: actionType, spentDiceIds: costCheck.diceToSpend.map(d => d.id) };

        costCheck.diceToSpend.forEach(dts => {
            newState.dice.find(d => d.id === dts.id)!.isSpent = true;
        });
        
        const diceCostString = costCheck.diceToSpend.map(d => d.value).sort().join(', ');
        
        // Siphon on event logic
        if (cardToPlay.type === CardType.EVENT && cardToPlay.abilities?.siphon) {
            currentPlayer.command += cardToPlay.abilities.siphon;
            log(`${currentPlayer.name} gains ${cardToPlay.abilities.siphon} command from ${cardToPlay.name}.`);
        }
        
        // Remove card from its source location
        if(options?.isScavenged) {
          currentPlayer.graveyard = currentPlayer.graveyard.filter(c => c.instanceId !== cardToPlay.instanceId);
          cardToPlay.isScavenged = true;
          log(`${currentPlayer.name} Scavenged ${cardToPlay.name} (cost: ${diceCostString}).`);
        } else {
          currentPlayer.hand = currentPlayer.hand.filter(c => c.instanceId !== cardToPlay.instanceId);
           if (options?.isChanneled) {
                log(`${currentPlayer.name} Channeled ${cardToPlay.name} (cost: ${diceCostString}).`);
           } else {
                log(`${currentPlayer.name} played ${cardToPlay.name} (cost: ${diceCostString}).`);
           }
        }


        // Handle Channel effect
        if(options?.isChanneled) {
          const effect = cardToPlay.abilities.channel.effect;
          switch(effect.type) {
            case 'DRAW': {
              const { player: p, fatigueDamage } = drawCards(currentPlayer, effect.value);
              currentPlayer = p;
              if (fatigueDamage.length > 0) {
                  fatigueDamage.forEach(dmg => {
                    damagePlayer(currentPlayer, dmg, 'Fatigue', 'damage');
                    log(`${currentPlayer.name} failed to draw and takes ${dmg} Fatigue damage!`);
                  });
              }
              break;
            }
          }
          currentPlayer.graveyard.push(cardToPlay); // Channeled cards go to graveyard
          newState.players[newState.currentPlayerId] = currentPlayer;
          return newState;
        }

        // --- Card Placement ---
        const isOneShotAmplify = options?.isAmplified && cardToPlay.type !== CardType.EVENT && (cardToPlay.abilities.amplify?.effect?.type === 'DEAL_DAMAGE');

        if (isOneShotAmplify) {
            currentPlayer.graveyard.push(cardToPlay);
            log(`${cardToPlay.name} (Amplified) resolves and is sent to the graveyard.`);
        } else if (options?.isAugmented && cardToPlay.abilities?.augment && targetInstanceId) {
            const targetUnit = currentPlayer.units.find(u => u.instanceId === targetInstanceId);
            if (targetUnit) {
                targetUnit.attachments = targetUnit.attachments || [];
                targetUnit.attachments.push(cardToPlay);
                log(`${cardToPlay.name} augments ${targetUnit.name}.`);
            } else {
                currentPlayer.graveyard.push(cardToPlay); // Fizzle if target is gone
            }
        } else if (cardToPlay.abilities?.riftwalk) {
            log(`${cardToPlay.name} Riftwalks and will return in ${cardToPlay.abilities.riftwalk.turns} turn(s).`);
            currentPlayer.riftwalkZone.push({ card: cardToPlay, turnsRemaining: cardToPlay.abilities.riftwalk.turns });
        } else {
            switch(cardToPlay.type) {
                case CardType.UNIT: currentPlayer.units.push(cardToPlay); break;
                case CardType.LOCATION:
                    currentPlayer.locations.push(cardToPlay);
                    if (cardToPlay.abilities?.landmark) {
                        const otherLandmarks = currentPlayer.locations.filter(l => l.abilities?.landmark && l.instanceId !== cardToPlay.instanceId);
                        if (otherLandmarks.length > 0) {
                            const otherLandmarkIds = new Set(otherLandmarks.map(l => l.instanceId));
                            currentPlayer.locations = currentPlayer.locations.filter(l => !otherLandmarkIds.has(l.instanceId));
                            for (const removed of otherLandmarks) {
                                currentPlayer.graveyard.push(removed);
                                log(`${removed.name} was replaced by the new Landmark.`);
                            }
                        }
                    }
                    break;
                case CardType.ARTIFACT: 
                    if(cardToPlay.abilities?.consume) cardToPlay.counters = cardToPlay.abilities.consume.initial;
                    currentPlayer.artifacts.push(cardToPlay); 
                    break;
                case CardType.EVENT: 
                    currentPlayer.graveyard.push(cardToPlay);
                    if (cardToPlay.abilities?.chain_reaction) {
                        log(`${cardToPlay.name} starts a Chain Reaction!`);
                        const { player: p, drawnCards, fatigueDamage } = drawCards(currentPlayer, 1);
                        currentPlayer = p;

                        if (fatigueDamage.length > 0) {
                            fatigueDamage.forEach(dmg => {
                                damagePlayer(currentPlayer, dmg, 'Fatigue', 'damage');
                                log(`Chain Reaction fizzles: deck is empty. ${currentPlayer.name} takes ${dmg} Fatigue damage!`);
                            });
                        } else if (drawnCards.length > 0) {
                            const chainedCard = drawnCards[0];
                            log(`Chain Reaction triggers ${chainedCard.name}!`);
                            logAction(`Chain Reaction played ${chainedCard.name}.`);
                    
                            if (chainedCard.type === CardType.EVENT) {
                                currentPlayer.graveyard.push(chainedCard);
                                const arrivalResultChained = resolveArrivalAbilities(chainedCard, currentPlayer, opponentPlayer, false);
                                currentPlayer = arrivalResultChained.player;
                                opponentPlayer = arrivalResultChained.opponent;
                                if (chainedCard.abilities?.requiresTarget && (chainedCard.abilities.damage || chainedCard.abilities.snipe)) {
                                    const validTargets = opponentPlayer.units.filter(u => !u.abilities?.immutable && isCardTargetable(chainedCard, u, currentPlayer, opponentPlayer));
                                    if (validTargets.length > 0) {
                                        const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                                        log(`${chainedCard.name} randomly targets ${randomTarget.name}.`);
                                        dealDamageToUnit(randomTarget, chainedCard.abilities.damage || chainedCard.abilities.snipe, chainedCard, opponentPlayer);
                                    }
                                }
                            } else {
                                log(`Chain reaction fizzles: ${chainedCard.name} is not an event and is returned to the deck.`);
                                // Convert CardInGame back to CardDefinition before returning to deck.
                                const { id, name, type, dice_cost, strength, durability, commandNumber, text, abilities, imageUrl, faction, rarity, flavor_text, card_set, author } = chainedCard;
                                const originalCardDef: CardDefinition = { id, name, type, dice_cost, strength, durability, commandNumber, text, abilities, imageUrl, faction, rarity, flavor_text, card_set, author };
                                currentPlayer.deck.push(originalCardDef);
                            }
                        }
                    }
                    break;
            }
        }

        // Instability keyword
        if (cardToPlay.abilities?.instability) {
            currentPlayer.diceModifier -= 1;
            log(`${cardToPlay.name}'s Instability means ${currentPlayer.name} rolls one fewer die next turn.`);
        }

        const arrivalResult = resolveArrivalAbilities(cardToPlay, currentPlayer, opponentPlayer, !!options?.isAmplified);
        currentPlayer = arrivalResult.player;
        opponentPlayer = arrivalResult.opponent;

        // --- Targeted effects ---
        let target: CardInGame | undefined;
        let targetOwner: Player | undefined;
        if (targetInstanceId) {
            for (const p of newState.players) {
                const found = [...p.units, ...p.locations, ...p.artifacts].find(c => c.instanceId === targetInstanceId);
                if (found) {
                    target = found;
                    targetOwner = p;
                    break;
                }
            }
        }
        
        if (target && targetOwner) {
            if (cardToPlay.abilities?.recall) {
                if (targetOwner.id === currentPlayer.id) {
                    const targetIndex = currentPlayer.units.findIndex(u => u.instanceId === target.instanceId);
                    if (targetIndex > -1) {
                        const recalledUnit = currentPlayer.units.splice(targetIndex, 1)[0];
                        if (recalledUnit.isToken) {
                            currentPlayer.void.push(recalledUnit);
                            log(`${recalledUnit.name} was a Token and is Voided when Recalled.`);
                        } else {
                            log(`${recalledUnit.name} is Recalled to ${currentPlayer.name}'s hand.`);
                             if (recalledUnit.isScavenged) {
                                log('It retains its Scavenged property.');
                            }
                            const baseCard = {
                                ...recalledUnit,
                                damage: 0, strengthModifier: 0, durabilityModifier: 0, hasAssaulted: false,
                                isToken: false, attachments: [],
                            };
                            currentPlayer.hand.push(baseCard);
                        }
                    }
                }
            }
            if(cardToPlay.abilities?.voidTarget) {
              if (target.abilities?.immutable) {
                  log(`${target.name} is Immutable and cannot be voided.`);
              } else {
                  targetOwner.units = targetOwner.units.filter(u => u.instanceId !== targetInstanceId);
                  targetOwner.void.push(target);
                  log(`${target.name} was voided by ${cardToPlay.name}.`);
              }
            }
            const amplifiedDamageEffect = options?.isAmplified && cardToPlay.abilities.amplify?.effect.type === 'DEAL_DAMAGE';
            if (cardToPlay.abilities?.damage || cardToPlay.abilities?.snipe || amplifiedDamageEffect) {
                let damage = cardToPlay.abilities.damage || cardToPlay.abilities.snipe || 0;
                if (amplifiedDamageEffect) {
                    damage = cardToPlay.abilities.amplify.effect.amount;
                    log(`${cardToPlay.name} is Amplified!`);
                }
                dealDamageToUnit(target, damage, cardToPlay, targetOwner);
            }
            if (cardToPlay.abilities?.corrupt) {
                if (target.abilities?.immutable) {
                  log(`${target.name} is Immutable and cannot be corrupted.`);
                } else {
                  target.strengthModifier -= cardToPlay.abilities.corrupt;
                  log(`${target.name} gets -${cardToPlay.abilities.corrupt} Strength.`);
                }
            }
            if (options?.isAmplified && cardToPlay.abilities.amplify?.effect?.type === 'CORRUPT') {
                log(`${cardToPlay.name} is Amplified!`);
                const corruptAmount = cardToPlay.abilities.amplify.effect.amount;
                if (target.abilities?.immutable) {
                  log(`${target.name} is Immutable and cannot be corrupted.`);
                } else {
                  target.strengthModifier -= corruptAmount;
                  log(`${target.name} gets -${corruptAmount} Strength.`);
                }
            }
        }
        
        checkForDestroyedUnits(currentPlayer.id, cardToPlay);
        if (opponentPlayer.command <= 0) newState.winner = currentPlayer;

        newState.players[newState.currentPlayerId] = currentPlayer;
        newState.players[1-newState.currentPlayerId] = opponentPlayer;

        return newState;
      }

      case 'ACTIVATE_ABILITY': {
        newState.lastActionDetails = null;
        const { cardInstanceId } = action.payload;
        const currentPlayer = newState.players[newState.currentPlayerId];
        
        const card = [...currentPlayer.units, ...currentPlayer.locations, ...currentPlayer.artifacts].find(c => c.instanceId === cardInstanceId);
        
        if (!card || !card.abilities?.activate) return state;

        const costCheck = checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost }, newState.dice);
        if (!costCheck.canPay) return state;
        
        logAction(`Activated ${card.name}.`);
        newState.lastActionDetails = { type: LastActionType.ACTIVATE, spentDiceIds: costCheck.diceToSpend.map(d => d.id) };
        
        costCheck.diceToSpend.forEach(dts => {
            newState.dice.find(d => d.id === dts.id)!.isSpent = true;
        });

        log(`${currentPlayer.name} activated ${card.name}.`);

        if(card.abilities.consume) {
            card.counters = (card.counters ?? 0) - 1;
            log(`${card.name} has ${card.counters} counter(s) remaining.`);
        }

        switch(card.abilities.activate.effect.type) {
            case 'fortify_command':
                currentPlayer.isCommandFortified = true;
                log(`${currentPlayer.name}'s Command is fortified until their next turn!`);
                break;
            case 'spike': {
                const availableDice = newState.dice.filter(d => !d.isSpent && d.value < 6);
                if (availableDice.length > 0) {
                    const dieToSpike = availableDice.sort((a,b) => a.value - b.value)[0];
                    const originalValue = dieToSpike.value;
                    dieToSpike.value = Math.min(6, dieToSpike.value + card.abilities.activate.effect.value);
                    log(`Spiked a die from ${originalValue} to ${dieToSpike.value}.`);
                } else {
                    log(`No available dice to Spike.`);
                }
                break;
              }
            case 'reconstruct': {
                const unit = currentPlayer.units.find(u => u.instanceId === cardInstanceId);
                if(unit) {
                    unit.damage = 0;
                    log(`${unit.name} is fully reconstructed, removing all damage.`);
                }
                break;
            }
        }
        
        if (card.abilities.consume && card.counters <= 0) {
            log(`${card.name} is consumed and sent to the graveyard.`);
            currentPlayer.artifacts = currentPlayer.artifacts.filter(a => a.instanceId !== cardInstanceId);
            currentPlayer.graveyard.push(card);
        }

        return newState;
      }
      
      case 'DECLARE_BLOCKS': {
        const { assignments } = action.payload; // { [blockerId]: attackerId }
        const attackerPlayer = newState.players[newState.currentPlayerId];
        const defenderPlayer = newState.players[1 - newState.currentPlayerId];
        
        log(`${defenderPlayer.name} declares blockers.`);
        let blockLog: string[] = [];
        let unblockedDamage = 0;

        newState.combatants?.forEach(combatant => {
            const attacker = attackerPlayer.units.find(u => u.instanceId === combatant.attackerId);
            if (!attacker) return;

            attacker.hasAssaulted = true;
            const { strength: attackerStrength } = getEffectiveStats(attacker, attackerPlayer, { isAssaultPhase: true });
            
            const blockerId = Object.keys(assignments).find(key => assignments[key] === combatant.attackerId);
            
            if (blockerId) {
                combatant.blockerId = blockerId;
                const blocker = defenderPlayer.units.find(u => u.instanceId === blockerId);
                if (blocker) {
                    blockLog.push(`${blocker.name} blocks ${attacker.name}`);
                    const { strength: blockerStrength } = getEffectiveStats(blocker, defenderPlayer);
                    log(`${attacker.name} (${attackerStrength}) clashes with ${blocker.name} (${blockerStrength}).`);
                    dealDamageToUnit(blocker, attackerStrength, attacker, defenderPlayer);
                    dealDamageToUnit(attacker, blockerStrength, blocker, attackerPlayer);
                }
            } else {
                // Unblocked
                unblockedDamage += attackerStrength;
                if (attacker.abilities?.siphon) {
                    attackerPlayer.command += attacker.abilities.siphon;
                    log(`${attackerPlayer.name} gains ${attacker.abilities.siphon} Command from ${attacker.name}'s Siphon.`);
                }
            }
        });
        
        if (blockLog.length > 0) logAction(`Blocked with: ${blockLog.join(', ')}.`);
        else logAction(`Did not declare blockers.`);
        
        if (unblockedDamage > 0) {
            damagePlayer(defenderPlayer, unblockedDamage, `${attackerPlayer.name}'s assault`, 'damage');
        }
    
        checkForDestroyedUnits(attackerPlayer.id);
    
        if (defenderPlayer.command <= 0) newState.winner = attackerPlayer;
    
        newState.combatants = null;
        newState.phase = TurnPhase.END;
        newState.isProcessing = true; // BUG FIX: Ensure game loop continues after blocks are confirmed.
        return newState;
      }

      case 'ADVANCE_PHASE': {
        newState.lastActionDetails = null;
        let currentPlayer = newState.players[newState.currentPlayerId];
        let opponentPlayer = newState.players[1 - newState.currentPlayerId];

        switch(newState.phase) {
          case TurnPhase.START:
            currentPlayer.isCommandFortified = false;
            currentPlayer.units.forEach(u => {
                u.hasAssaulted = false; // Reset for Breach keyword
                u.shieldUsedThisTurn = false; // Reset Shield
            });
            // Riftwalk returns
            const returningFromRift = currentPlayer.riftwalkZone.filter(rw => {
                rw.turnsRemaining--;
                return rw.turnsRemaining <= 0;
            });
            if (returningFromRift.length > 0) {
                for (const item of returningFromRift) {
                    log(`${item.card.name} returns from the rift!`);
                    
                    // Reset card state before adding it back to the field, but preserve instanceId
                    const resetCard: CardInGame = {
                      ...item.card,
                      damage: 0,
                      strengthModifier: 0,
                      durabilityModifier: 0,
                      hasAssaulted: false,
                      shieldUsedThisTurn: false,
                      counters: item.card.abilities?.consume ? item.card.abilities.consume.initial : undefined,
                      attachments: [],
                    };

                    currentPlayer.units.push(resetCard);
                    const arrivalResult = resolveArrivalAbilities(resetCard, currentPlayer, opponentPlayer, false);
                    currentPlayer = arrivalResult.player;
                    opponentPlayer = arrivalResult.opponent;
                }
                currentPlayer.riftwalkZone = currentPlayer.riftwalkZone.filter(rw => rw.turnsRemaining > 0);
            }

            // Generator effects
            const cardsWithGenerator = [...currentPlayer.locations, ...currentPlayer.artifacts];
            cardsWithGenerator.forEach(cardWithGen => {
                if (cardWithGen.abilities?.generator) {
                    const effect = cardWithGen.abilities.generator;
                    log(`${cardWithGen.name}'s Generator ability triggers.`);
                    if(effect.type === 'GAIN_COMMAND') {
                        currentPlayer.command += effect.value;
                    }
                    if(effect.type === 'DRAW_CARD') {
                        const { player: p, fatigueDamage } = drawCards(currentPlayer, effect.value);
                        currentPlayer = p;
                        if (fatigueDamage.length > 0) {
                            fatigueDamage.forEach(dmg => {
                                damagePlayer(currentPlayer, dmg, 'Fatigue', 'damage');
                                log(`${currentPlayer.name} failed to draw and takes ${dmg} Fatigue damage!`);
                            });
                        }
                    }
                    if(effect.type === 'FORESIGHT') {
                        if (currentPlayer.deck.length > 0) {
                            const foresightValue = effect.value || 1;
                            const topCards = currentPlayer.deck.slice(-foresightValue).reverse();
                            if (topCards.length > 0) {
                                const cardNames = topCards.map(c => c.name).join(', ');
                                log(`Foresight from ${cardWithGen.name} reveals top ${topCards.length} card(s): ${cardNames}`);
                            }
                        }
                    }
                    if(effect.type === 'DECAY' && effect.requiresTarget) {
                        const opponent = newState.players[1 - newState.currentPlayerId];
                        const targetableUnits = opponent.units.filter(u => !u.abilities?.immutable);
                        if (targetableUnits.length > 0) {
                            const target = targetableUnits[Math.floor(Math.random() * targetableUnits.length)];
                            target.damage++;
                            log(`${cardWithGen.name} applies Decay to ${target.name}.`);
                        }
                    }
                    if(effect.type === 'SABOTAGE') {
                        const opponent = newState.players[1 - newState.currentPlayerId];
                        opponent.diceModifier -= effect.value;
                        log(`${cardWithGen.name} sabotages ${opponent.name}, who will roll ${effect.value} fewer dice next turn.`);
                    }
                    if(effect.type === 'FATEWEAVE') {
                         newState.maxRolls += effect.value;
                         log(`${cardWithGen.name}'s Generator grants an extra roll from Fateweave!`);
                    }
                    if(effect.type === 'RECYCLE_UNIT') {
                        const unitsInGrave = currentPlayer.graveyard.filter(c => c.type === CardType.UNIT);
                        if (unitsInGrave.length > 0) {
                            const randomIndex = Math.floor(Math.random() * unitsInGrave.length);
                            const cardToReturn = unitsInGrave[randomIndex];
                            currentPlayer.graveyard = currentPlayer.graveyard.filter(c => c.instanceId !== cardToReturn.instanceId);
                            // Reset card state before returning to hand
                            const freshCard = { ...cardToReturn, damage: 0, strengthModifier: 0, durabilityModifier: 0, hasAssaulted: false, isScavenged: false, isToken: false, attachments: [] };
                            currentPlayer.hand.push(freshCard);
                            log(`${cardWithGen.name} returns ${cardToReturn.name} from the graveyard to hand.`);
                        }
                    }
                }
            });
            // Decay effects
            currentPlayer.units.forEach(unit => {
                if(unit.abilities?.decay) {
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
              const { player: p, fatigueDamage } = drawCards(currentPlayer, 1);
              newState.players[newState.currentPlayerId] = p;
              if (fatigueDamage.length > 0) {
                  fatigueDamage.forEach(dmg => {
                    damagePlayer(p, dmg, 'Fatigue', 'damage');
                    log(`${p.name} has no cards left and takes ${dmg} Fatigue damage!`);
                  });
              } else {
                   log(`${p.name} drew a card.`);
              }
            }
            newState.phase = TurnPhase.ASSAULT;
            break;
          case TurnPhase.ASSAULT:
            if (action.payload?.assault) {
                const attackers = currentPlayer.units.filter(u => !u.abilities?.entrenched);
                
                const phasingAttackers = attackers.filter(u => u.abilities?.phasing);
                if (phasingAttackers.length > 0) {
                    const phasingDamage = phasingAttackers.reduce((sum, u) => sum + getEffectiveStats(u, currentPlayer, { isAssaultPhase: true }).strength, 0);
                    opponentPlayer.command -= phasingDamage;
                    log(`${currentPlayer.name}'s Phasing units deal ${phasingDamage} unpreventable Command damage!`);
                    phasingAttackers.forEach(u => u.hasAssaulted = true);
                }
                
                const normalAttackers = attackers.filter(u => !u.abilities?.phasing);
                if (normalAttackers.length > 0) {
                    log(`${currentPlayer.name} declares an attack with ${normalAttackers.length} unit(s).`);
                    logAction(`Declared an attack.`);
                    newState.phase = TurnPhase.BLOCK;
                    newState.combatants = normalAttackers.map(u => ({ attackerId: u.instanceId, blockerId: null }));
                } else {
                    log(`${currentPlayer.name} has no non-phasing units to assault with.`);
                    newState.phase = TurnPhase.END;
                }

                if (opponentPlayer.command <= 0) newState.winner = currentPlayer;
            } else {
              log(`${currentPlayer.name} skips the assault.`);
              logAction('Skipped the assault.');
              newState.phase = TurnPhase.END;
            }
            break;
          case TurnPhase.END:
              logAction('Ended their turn.');
              currentPlayer.shieldUsedThisTurn = false;
              if (newState.extraTurns > 0) {
                  newState.extraTurns--;
                  currentPlayer.units.forEach(u => u.hasAssaulted = false);
                  newState.phase = TurnPhase.ASSAULT;
                  newState.dice = Array.from({ length: 5 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
                  newState.rollCount = 3; // No rolls allowed in extra turn
                  log(`${currentPlayer.name} begins an extra turn, skipping to the Assault Phase.`);
              } else {
                  newState.currentPlayerId = 1 - newState.currentPlayerId;
                  newState.turn += (newState.currentPlayerId === 0 ? 1 : 0);
                  newState.phase = TurnPhase.START;
                  const nextPlayer = newState.players[newState.currentPlayerId];
                  const diceCount = 5 + nextPlayer.diceModifier;
                  nextPlayer.diceModifier = 0;
                  newState.dice = Array.from({ length: Math.max(0, diceCount) }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
                  newState.rollCount = 0;
                  newState.maxRolls = 3;
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
  } catch(error) {
    console.error("FATAL ERROR in game reducer:", error);
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    if (error instanceof Error) {
        newState.log.push(`!! SYSTEM CRITICAL ERROR: ${error.message} !!`);
    } else {
        newState.log.push(`!! SYSTEM CRITICAL UNKNOWN ERROR !!`);
    }
    newState.isProcessing = false; // Unlock UI to prevent freeze
    return newState;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, getInitialLoadingState());
  const aiAction = useMemo(() => getAiAction(state), [state]);
  return { state, dispatch, aiAction };
};