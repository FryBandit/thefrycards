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
  | { type: 'ADVANCE_PHASE'; payload?: { strike: boolean } }
  | { type: 'DECLARE_BLOCKS'; payload: { assignments: { [blockerId: string]: string } } }
  | { type: 'ROLL_DICE' }
  | { type: 'TOGGLE_DIE_KEPT'; payload: { id: number, keep: boolean } }
  | { type: 'PLAY_CARD'; payload: { card: CardInGame, targetInstanceId?: string, options?: { isEvoked?: boolean; isReclaimed?: boolean; isAmplified?: boolean; isAugmented?: boolean; } } }
  | { type: 'ACTIVATE_ABILITY'; payload: { cardInstanceId: string, targetInstanceId?: string } }
  | { type: 'AI_ACTION' };


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
    isMoraleFortified: false,
    skipNextDrawPhase: 0,
    fatigueCounter: 0,
    hasMulliganed: false,
  };
};

const drawCards = (player: Player, count: number): { player: Player, drawnToHand: CardInGame[], overdrawnToGraveyard: CardInGame[], fatigueDamage: number[] } => {
    const newPlayer = {...player};
    newPlayer.hand = [...newPlayer.hand];
    newPlayer.deck = [...newPlayer.deck];
    newPlayer.graveyard = [...newPlayer.graveyard]; // Make sure we can modify it

    const drawnToHand: CardInGame[] = [];
    const overdrawnToGraveyard: CardInGame[] = [];
    const fatigueDamage: number[] = [];
    const MAX_HAND_SIZE = 7;

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
    if (targetCard.abilities?.immutable) return false;
    const isOpponentTarget = sourcePlayer.id !== targetPlayer.id;
    if (isOpponentTarget && targetingCard.type === CardType.EVENT && (targetCard.abilities?.stealth || (targetCard.abilities?.breach && !targetCard.hasStruck))) return false;
    
    if (targetingCard.abilities?.banish) {
        return isOpponentTarget && targetCard.type === CardType.UNIT && getEffectiveStats(targetCard, targetPlayer).durability <= targetingCard.abilities.banish.maxDurability;
    }
    if (targetingCard.abilities?.corrupt || targetingCard.abilities?.voidTarget || targetingCard.abilities?.weaken || targetingCard.abilities?.damage || targetingCard.abilities?.snipe) {
        return isOpponentTarget;
    }
    if (targetingCard.abilities?.recall) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT;
    }
    if (targetingCard.abilities?.augment) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT;
    }
    return true; // Default case if no specific targeting rule applies
};


const cardHasAbility = (card: CardInGame, ability: string): boolean => {
    const lowerCaseAbility = ability.toLowerCase();
    if ((card.abilities as any)?.[lowerCaseAbility]) return true;
    if (card.attachments?.length) {
        return card.attachments.some(att => att.abilities?.augment?.effect?.grants?.some((g: string) => g.toLowerCase() === lowerCaseAbility));
    }
    return false;
};

const gameReducer = (state: GameState, action: Action): GameState => {
  try {
    if (state.winner && action.type !== 'START_GAME') return state;
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    const log = (message: string) => newState.log.push(message);
    const logAction = (message: string) => {
        let lastHistoryEntry = newState.actionHistory[newState.actionHistory.length - 1];
        if (!lastHistoryEntry || lastHistoryEntry.turn !== newState.turn || lastHistoryEntry.playerId !== newState.currentPlayerId) {
            newState.actionHistory.push({ turn: newState.turn, playerId: newState.currentPlayerId, actions: [message] });
        } else {
            lastHistoryEntry.actions.push(message);
        }
    };
    
    const damagePlayer = (player: Player, amount: number, source: string, type: 'damage' | 'loss' = 'damage') => {
        if (player.isMoraleFortified && type === 'damage') {
            log(`${player.name}'s Morale is fortified!`);
            return;
        }
        
        const allPlayerCardsOnBoard = [...player.units, ...player.locations, ...player.artifacts];
        const fortifyValue = allPlayerCardsOnBoard
            .filter(c => c.abilities?.fortify)
            .reduce((max, c) => Math.max(max, c.abilities!.fortify!.value), 0);

        if (type === 'damage' && fortifyValue > 0 && player.morale - amount < fortifyValue) {
            const damagePrevented = amount - (player.morale - fortifyValue);
            log(`Fortify prevents ${damagePrevented} damage!`);
            player.morale = fortifyValue;
            return;
        }
        player.morale -= amount;
        log(`${player.name} loses ${amount} Morale from ${source}!`);
    }

    const dealDamageToUnit = (target: CardInGame, amount: number, sourceCard: CardInGame | null, targetOwner: Player, isCombatDamage: boolean = false) => {
        if (target.abilities?.immutable) {
            log(`${target.name} is Immutable and ignores damage.`);
            return;
        }
        if (cardHasAbility(target, 'shield') && !target.shieldUsedThisTurn) {
            target.shieldUsedThisTurn = true;
            log(`${target.name}'s Shield prevents the damage!`);
            return;
        }
        let finalAmount = (cardHasAbility(target, 'fragile') && sourceCard && !isCombatDamage) ? amount * 2 : amount;
        target.damage += finalAmount;
        log(`${sourceCard?.name || 'Effect'} deals ${finalAmount} damage to ${target.name}.`);
        if (sourceCard && cardHasAbility(sourceCard, 'venomous') && finalAmount > 0) {
            target.damage = getEffectiveStats(target, targetOwner).durability;
            log(`${sourceCard.name}'s Venomous ability marks ${target.name} for destruction!`);
        }
    };
    
    const banishCard = (card: CardInGame, owner: Player, opponent: Player) => {
        const zones: (keyof Player)[] = ['units', 'locations', 'artifacts'];
        let found = false;
        for (const zone of zones) {
            const cardIndex = (owner[zone] as CardInGame[]).findIndex(c => c.instanceId === card.instanceId);
            if (cardIndex > -1) {
                (owner[zone] as CardInGame[]).splice(cardIndex, 1);
                found = true;
                break;
            }
        }
        if (found) {
            owner.oblivion.push(card);
            log(`${card.name} was Banished to Oblivion.`);
            if (card.type === CardType.UNIT) {
                damagePlayer(owner, card.moraleValue ?? 0, `${card.name}'s banishment`, 'loss');
            }
        }
    }


    const checkForDestroyedCards = (sourcePlayerId: number, sourceCard?: CardInGame): boolean => {
        let anyChangeInLoop = false;
        let loopAgain = true;
        while (loopAgain) {
            loopAgain = false;
            for (let i = 0; i < 2; i++) {
                let destroyedInPass;
                do {
                    destroyedInPass = false;
                    const player = newState.players[i];
                    const opponent = newState.players[1 - i];
                    const potentiallyDestroyed = [...player.units.map(c=>({c, z:'units'})), ...player.artifacts.map(c=>({c, z:'artifacts'}))];
                    const destroyedItem = potentiallyDestroyed.find(item => item.c.damage >= getEffectiveStats(item.c, player).durability);

                    if (destroyedItem) {
                        loopAgain = anyChangeInLoop = destroyedInPass = true;
                        const { c: destroyedCard, z: zone } = destroyedItem;
                        player[zone] = player[zone].filter(card => card.instanceId !== destroyedCard.instanceId) as any;

                        if (destroyedCard.attachments && destroyedCard.attachments.length > 0) {
                            log(`${destroyedCard.name}'s attachments fall off and are sent to the graveyard.`);
                            player.graveyard.push(...destroyedCard.attachments);
                        }

                        if (destroyedCard.isReclaimed || destroyedCard.isToken) {
                            player.oblivion.push(destroyedCard);
                            log(`${destroyedCard.name} was destroyed and sent to Oblivion.`);
                        } else {
                            player.graveyard.push(destroyedCard);
                            log(`${destroyedCard.name} was destroyed.`);
                        }

                        const activePlayerEffects: (() => void)[] = [];
                        const nonActivePlayerEffects: (() => void)[] = [];
                        const addEffect = (isOwnerActive: boolean, effect: () => void) => (isOwnerActive ? activePlayerEffects : nonActivePlayerEffects).push(effect);
                        
                        if (sourceCard?.abilities?.executioner && player.id !== sourcePlayerId) addEffect(sourcePlayerId === newState.currentPlayerId, () => damagePlayer(player, sourceCard.abilities.executioner.amount, `${sourceCard.name}'s Executioner`));
                        if (destroyedCard.abilities?.bounty && player.id !== sourcePlayerId) addEffect(player.id === newState.currentPlayerId, () => { opponent.morale += destroyedCard.abilities.bounty.amount; log(`${opponent.name} gains ${destroyedCard.abilities.bounty.amount} Morale from Bounty.`); });
                        if (destroyedCard.abilities?.malice) addEffect(player.id === newState.currentPlayerId, () => damagePlayer(player, destroyedCard.abilities.malice, `${destroyedCard.name}'s Malice`, 'loss'));
                        if (destroyedCard.abilities?.martyrdom) addEffect(player.id === newState.currentPlayerId, () => { const { effect } = destroyedCard.abilities.martyrdom; if (effect.type === 'DRAW_CARD') { const {player:p, fatigueDamage} = drawCards(player, effect.value); newState.players[i] = p; fatigueDamage.forEach(d => damagePlayer(p, d, 'Fatigue')); } });
                        if (destroyedCard.abilities?.haunt) addEffect(player.id === newState.currentPlayerId, () => damagePlayer(opponent, destroyedCard.abilities.haunt, `${destroyedCard.name}'s Haunt`, 'loss'));
                        
                        [...activePlayerEffects, ...nonActivePlayerEffects].forEach(e => e());
                        
                        if (zone === 'units' && player.id !== sourcePlayerId) {
                            damagePlayer(player, destroyedCard.moraleValue ?? 0, `${destroyedCard.name}'s destruction`, 'loss');
                        }
                    }
                } while(destroyedInPass);
            }
            if (newState.players[0].morale <= 0) newState.winner = newState.players[1];
            if (newState.players[1].morale <= 0) newState.winner = newState.players[0];
            if (newState.winner) loopAgain = false;
        }
        return anyChangeInLoop;
    }

    const resolveObliterate = (sourceCard: CardInGame, player: Player, opponent: Player) => {
        log(`${sourceCard.name} voids all other units!`);
        const opponentUnitsToVoid = opponent.units.filter(u => !u.abilities?.immutable);
        const playerUnitsToVoid = player.units.filter(u => u.instanceId !== sourceCard.instanceId && !u.abilities?.immutable);
        
        opponentUnitsToVoid.forEach(u => banishCard(u, opponent, player));
        playerUnitsToVoid.forEach(u => banishCard(u, player, opponent));
    };

    const resolveArrivalAbilities = (card: CardInGame, player: Player, opponent: Player) => {
        if (card.abilities?.echo && card.type === CardType.UNIT) {
            log(`${card.name} Echoes, creating a token copy!`);
            player.units.push({ ...card, instanceId: `${card.id}-token-${Date.now()}`, isToken: true, attachments: [] });
        }
        if (card.abilities?.exhaust) {
            opponent.skipNextDrawPhase++;
            log(`${opponent.name} will skip their next Draw Phase!`);
        }
        if(card.abilities?.draw) {
            const { player: p, fatigueDamage } = drawCards(player, card.abilities.draw);
            player = p;
            fatigueDamage.forEach(dmg => damagePlayer(player, dmg, 'Fatigue'));
        }
        if (card.abilities?.barrage) {
            log(`${card.name}'s Barrage deals ${card.abilities.barrage} damage to all enemy units!`);
            opponent.units.forEach(unit => dealDamageToUnit(unit, card.abilities.barrage, card, opponent));
        }
        if (card.abilities?.obliterate) resolveObliterate(card, player, opponent);
        if (card.abilities?.prophecy) {
            newState.maxRolls += card.abilities.prophecy;
            log(`${player.name} gains ${card.abilities.prophecy} extra roll(s) from Prophecy.`);
        }
        if (card.abilities?.discard) {
            for (let i = 0; i < card.abilities.discard; i++) {
                if (opponent.hand.length > 0) {
                    const discarded = opponent.hand.splice(Math.floor(Math.random() * opponent.hand.length), 1)[0];
                    opponent.graveyard.push(discarded);
                    log(`${opponent.name} discards ${discarded.name}.`);
                }
            }
        }
        if (card.abilities?.disrupt) {
            opponent.diceModifier -= card.abilities.disrupt;
            log(`${opponent.name} will roll ${card.abilities.disrupt} fewer dice next turn.`);
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
        return { players: [player1, player2], currentPlayerId: 0, turn: 1, phase: TurnPhase.MULLIGAN, dice: Array.from({ length: 5 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false })), rollCount: 0, maxRolls: 3, log: ['Game initialized.'], winner: null, isProcessing: false, extraTurns: 0, lastActionDetails: null, actionHistory: [], combatants: null };
      }
      
      case 'PLAYER_MULLIGAN_CHOICE': {
          if (newState.phase !== TurnPhase.MULLIGAN) return state;
          const { mulligan } = action.payload;
          let player = newState.players[0];
          if (mulligan) {
              log(`You chose to mulligan.`);
              logAction('Mulliganed hand.');
              player.deck.push(...player.hand);
              player.hand = [];
              player.deck = shuffle(player.deck);
              player = drawCards(player, 3).player;
          } else { logAction('Kept hand.'); }
          player.hasMulliganed = true;
          newState.players[0] = player;
          newState.phase = TurnPhase.AI_MULLIGAN;
          newState.isProcessing = true;
          return newState;
      }

      case 'AI_MULLIGAN': {
          if (newState.phase !== TurnPhase.AI_MULLIGAN) return state;
          const { mulligan } = action.payload;
          let ai = newState.players[1];
          if (mulligan) {
              log(`CPU chose to mulligan.`);
              logAction('Mulliganed hand.');
              ai.deck.push(...ai.hand);
              ai.hand = [];
              ai.deck = shuffle(ai.deck);
              ai = drawCards(ai, 3).player;
          } else { logAction('Kept hand.'); }
          ai.hasMulliganed = true;
          newState.players[1] = ai;
          newState.phase = TurnPhase.START;
          newState.isProcessing = true;
          return newState;
      }

      case 'ROLL_DICE': {
        if (newState.rollCount >= newState.maxRolls) return state;
        const diceToRoll = newState.dice.filter(d => !d.isKept && !d.isSpent);
        diceToRoll.forEach(d => { d.value = Math.floor(Math.random() * 6) + 1; });
        newState.rollCount++;
        logAction(`Rolled dice.`);
        return newState;
      }
      case 'TOGGLE_DIE_KEPT':
        const die = newState.dice.find(d => d.id === action.payload.id);
        if (die && !die.isSpent && newState.rollCount > 0) die.isKept = action.payload.keep;
        return newState;
      
      case 'PLAY_CARD': {
        let player = newState.players[newState.currentPlayerId];
        let opponent = newState.players[1 - newState.currentPlayerId];
        const { card, targetInstanceId, options } = action.payload;
        let actionType: LastActionType = LastActionType.PLAY;
        if (options?.isReclaimed) actionType = LastActionType.RECLAIM;
        else if (options?.isEvoked) actionType = LastActionType.EVOKE;
        else if (options?.isAugmented) actionType = LastActionType.ACTIVATE;

        let costs = card.dice_cost;
        if (options?.isReclaimed) costs = card.abilities.reclaim.cost;
        if (options?.isEvoked) costs = card.abilities.evoke.cost;
        if (options?.isAugmented) costs = card.abilities.augment.cost;
        if (options?.isAmplified) costs = (costs || []).concat(card.abilities.amplify.cost || []);

        const costCheck = checkDiceCost({ dice_cost: costs, abilities: card.abilities }, newState.dice);
        if (!costCheck.canPay) return state;

        let target: CardInGame | undefined, targetOwner: Player | undefined;
        if (targetInstanceId) {
            for (const p of newState.players) {
                const found = [...p.units, ...p.locations, ...p.artifacts].find(c => c.instanceId === targetInstanceId);
                if (found) { target = found; targetOwner = p; break; }
            }
        }
        
        logAction(`Played ${card.name}${options?.isAmplified ? ' (Amplified)' : ''}${target ? ` targeting ${target.name}.` : '.'}`);
        newState.lastActionDetails = { type: actionType, spentDiceIds: costCheck.diceToSpend.map(d => d.id) };
        costCheck.diceToSpend.forEach(dts => { newState.dice.find(d => d.id === dts.id)!.isSpent = true; });
        
        if(options?.isReclaimed) {
          player.graveyard = player.graveyard.filter(c => c.instanceId !== card.instanceId);
          card.isReclaimed = true;
        } else {
          player.hand = player.hand.filter(c => c.instanceId !== card.instanceId);
        }

        if (card.abilities?.gain_morale) {
            player.morale += card.abilities.gain_morale;
            log(`${player.name} gains ${card.abilities.gain_morale} Morale from ${card.name}.`);
        }
        if (card.abilities?.instability) {
            player.diceModifier -= 1;
            log(`${player.name} feels Instability and will roll 1 fewer die next turn.`);
        }
        if (card.abilities?.warp) {
            newState.extraTurns += 1;
            log(`${player.name} Warps time, gaining an extra turn!`);
        }
        if (card.abilities?.purge) {
            for(let i=0; i<card.abilities.purge; i++) {
                if (opponent.graveyard.length > 0) {
                    const purged = opponent.graveyard.splice(Math.floor(Math.random() * opponent.graveyard.length), 1)[0];
                    opponent.oblivion.push(purged);
                    log(`${purged.name} was purged from ${opponent.name}'s graveyard.`);
                }
            }
        }
        
        if (options?.isAugmented && target) {
            target.attachments = target.attachments || [];
            target.attachments.push(card);
            log(`${card.name} augments ${target.name}.`);
            // Augment doesn't trigger arrival abilities for the artifact itself
            return newState;
        }

        if (card.abilities?.consume) {
            card.counters = card.abilities.consume.initial;
        }

        if (card.abilities?.vanish) {
            player.vanishZone.push({ card, turnsRemaining: card.abilities.vanish.turns });
            log(`${card.name} Vanishes. It will return in ${card.abilities.vanish.turns} turns.`);
        } else if (options?.isEvoked) {
            player.graveyard.push(card);
        } else if (card.type === CardType.EVENT) {
            player.graveyard.push(card);
            if (card.abilities?.chain_reaction) {
                let cardToChain: CardInGame | undefined = card;
                while (cardToChain) {
                    log(`${cardToChain.name} starts a Chain Reaction!`);
                    const { player: p, drawnToHand, fatigueDamage } = drawCards(player, 1);
                    player = p;
                    fatigueDamage.forEach(d => damagePlayer(player, d, 'Fatigue'));
                    cardToChain = undefined;

                    if (drawnToHand.length > 0) {
                        const nextCard = drawnToHand[0];
                        if (nextCard.type === CardType.EVENT) {
                            player.hand = player.hand.filter(c => c.instanceId !== nextCard.instanceId);
                            player.graveyard.push(nextCard);
                            
                            let canResolve = true;
                            let chainTarget: CardInGame | undefined;

                            if (nextCard.abilities?.requiresTarget) {
                                const validTargets = newState.players.flatMap(p => 
                                    [...p.units, ...p.locations, ...p.artifacts].filter(target =>
                                        isCardTargetable(nextCard, target, player, p)
                                    )
                                );
                                if (validTargets.length === 0) {
                                    log(`Chain Reaction fizzles: No valid targets for ${nextCard.name}.`);
                                    canResolve = false;
                                } else {
                                    chainTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                                    log(`${nextCard.name} randomly targets ${chainTarget.name}.`);
                                }
                            }

                            if (canResolve) {
                                log(`Chain Reaction triggers ${nextCard.name}!`);
                                const arrivalResultChained = resolveArrivalAbilities(nextCard, player, opponent);
                                player = arrivalResultChained.player;
                                opponent = arrivalResultChained.opponent;
                                if (chainTarget) {
                                    const chainTargetOwner = newState.players.find(p => [...p.units, ...p.artifacts, ...p.locations].some(c => c.instanceId === chainTarget!.instanceId))!;
                                    if (nextCard.abilities.damage) dealDamageToUnit(chainTarget, nextCard.abilities.damage, nextCard, chainTargetOwner);
                                    if (nextCard.abilities.banish) banishCard(chainTarget, chainTargetOwner, player);
                                }
                                if (nextCard.abilities?.chain_reaction) {
                                    cardToChain = nextCard;
                                }
                            }
                        } else {
                            log(`Chain reaction ends: ${nextCard.name} is added to hand.`);
                        }
                    }
                }
            }
        } else {
            if (card.abilities?.landmark) {
                const existingLandmark = player.locations.find(l => l.abilities?.landmark);
                if (existingLandmark) {
                    player.locations = player.locations.filter(l => l.instanceId !== existingLandmark.instanceId);
                    player.graveyard.push(existingLandmark);
                    log(`${existingLandmark.name} is destroyed by the new Landmark.`);
                }
            }
            player[card.type.toLowerCase()+'s'].push(card);
        }

        const arrivalResult = resolveArrivalAbilities(card, player, opponent);
        player = arrivalResult.player; opponent = arrivalResult.opponent;
        
        if (target && targetOwner) {
            if (card.abilities?.recall) {
                if (targetOwner.id === player.id) {
                    const unit = player.units.find(u => u.instanceId === target.instanceId)!;
                    
                    if (unit.attachments && unit.attachments.length > 0) {
                        log(`Attachments on ${unit.name} are sent to the graveyard.`);
                        player.graveyard.push(...unit.attachments);
                        unit.attachments = [];
                    }

                    player.units = player.units.filter(u => u.instanceId !== target.instanceId);
                    
                    if (unit.isToken || unit.isReclaimed) {
                        player.oblivion.push(unit);
                        log(`${unit.name} was recalled and sent to Oblivion.`);
                    } else {
                        const refreshedCard = { ...unit, damage: 0, strengthModifier: 0, durabilityModifier: 0, hasStruck: false, isToken: false, attachments: [], shieldUsedThisTurn: false, counters: undefined, isReclaimed: false };
                        player.hand.push(refreshedCard);
                        log(`${unit.name} was recalled to hand.`);
                    }
                }
            }
            if (card.abilities?.damage || card.abilities?.snipe) dealDamageToUnit(target, card.abilities.damage || card.abilities.snipe, card, targetOwner);
            if (card.abilities?.corrupt || card.abilities?.weaken) target.strengthModifier -= (card.abilities.corrupt || card.abilities.weaken);
            if (card.abilities?.banish) banishCard(target, targetOwner, player);
            
            if (options?.isAmplified && card.abilities?.amplify?.effect) {
                const effect = card.abilities.amplify.effect;
                if (effect.type === 'WEAKEN') {
                    target.strengthModifier -= effect.amount;
                    log(`${card.name}'s Amplified effect weakens ${target.name}.`);
                }
            }
        }
        
        checkForDestroyedCards(player.id, card);

        newState.players[newState.currentPlayerId] = player;
        newState.players[1-newState.currentPlayerId] = opponent;
        return newState;
      }

      case 'ACTIVATE_ABILITY': {
        const player = newState.players[newState.currentPlayerId];
        const card = [...player.units, ...player.artifacts, ...player.locations].find(c => c.instanceId === action.payload.cardInstanceId);
        if (!card || !card.abilities?.activate) return state;
        const costCheck = checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost }, newState.dice);
        if (!costCheck.canPay) return state;
        
        logAction(`Activated ${card.name}.`);
        newState.lastActionDetails = { type: LastActionType.ACTIVATE, spentDiceIds: costCheck.diceToSpend.map(d => d.id) };
        costCheck.diceToSpend.forEach(dts => { newState.dice.find(d => d.id === dts.id)!.isSpent = true; });
        if (card.abilities.consume) card.counters = (card.counters ?? 0) - 1;

        const effect = card.abilities.activate.effect;
        if (effect.type === 'draw_card') {
            const {player:p, fatigueDamage} = drawCards(player, effect.value);
            newState.players[newState.currentPlayerId] = p;
            fatigueDamage.forEach(d => damagePlayer(p, d, 'Fatigue'));
        }
        if (effect.type === 'reconstruct') {
            card.damage = 0;
            log(`${card.name} reconstructs, removing all damage.`);
        }
        if (effect.type === 'spike') {
            const dieToSpike = newState.dice.find(d => !d.isSpent && d.value < 6);
            if (dieToSpike) {
                dieToSpike.value++;
                log(`${card.name} spikes a die.`);
            }
        }
        if (card.abilities.consume && card.counters <= 0) {
            const zone = card.type === CardType.UNIT ? 'units' : 'artifacts';
            player[zone] = player[zone].filter(a => a.instanceId !== card.instanceId) as any;
            player.graveyard.push(card);
            log(`${card.name} has run out of counters and is destroyed.`);
        }
        return newState;
      }
      
      case 'DECLARE_BLOCKS': {
        const { assignments } = action.payload;
        const attackerPlayer = newState.players[newState.currentPlayerId];
        const defenderPlayer = newState.players[1 - newState.currentPlayerId];
        let unblockedDamage = 0;
        
        newState.combatants?.forEach(combatant => {
            const attacker = attackerPlayer.units.find(u => u.instanceId === combatant.attackerId);
            if (!attacker) return;
            attacker.hasStruck = true;
            const attackerStrength = getEffectiveStats(attacker, attackerPlayer, { isStrikePhase: true }).strength;

            if (cardHasAbility(attacker, 'phasing')) {
                log(`${attacker.name} is Phasing and its damage is unblockable!`);
                damagePlayer(defenderPlayer, attackerStrength, `${attacker.name}'s strike`);
                return;
            }

            const blockerId = Object.keys(assignments).find(key => assignments[key] === combatant.attackerId);
            if (blockerId) {
                const blocker = defenderPlayer.units.find(u => u.instanceId === blockerId)!;
                dealDamageToUnit(blocker, attackerStrength, attacker, defenderPlayer, true);
                dealDamageToUnit(attacker, getEffectiveStats(blocker, defenderPlayer).strength, blocker, attackerPlayer, true);
            } else {
                unblockedDamage += attackerStrength;
                if (cardHasAbility(attacker, 'siphon')) {
                    const siphonAmount = attacker.abilities.siphon;
                    attackerPlayer.morale += siphonAmount;
                    log(`${attacker.name}'s Siphon heals ${attackerPlayer.name} for ${siphonAmount} Morale.`);
                }
            }
        });

        if (unblockedDamage > 0) damagePlayer(defenderPlayer, unblockedDamage, `${attackerPlayer.name}'s strike`);
        checkForDestroyedCards(attackerPlayer.id);
        if (defenderPlayer.morale <= 0) newState.winner = attackerPlayer;
        newState.combatants = null;
        newState.phase = TurnPhase.END;
        newState.isProcessing = true;
        return newState;
      }

      case 'ADVANCE_PHASE': {
        let player = newState.players[newState.currentPlayerId];
        switch(newState.phase) {
          case TurnPhase.ROLL_SPEND: newState.phase = TurnPhase.DRAW; break;
          case TurnPhase.DRAW:
            if(player.skipNextDrawPhase > 0) {
              log(`${player.name} skips their Draw Phase.`);
              player.skipNextDrawPhase--;
            } else {
              const { player: p, fatigueDamage } = drawCards(player, 1);
              newState.players[newState.currentPlayerId] = p;
              if (fatigueDamage.length > 0) fatigueDamage.forEach(dmg => damagePlayer(p, dmg, 'Fatigue'));
            }
            newState.phase = TurnPhase.STRIKE;
            break;
          case TurnPhase.STRIKE:
            if (action.payload?.strike) {
                const attackers = player.units.filter(u => !u.abilities?.entrenched);
                if (attackers.length > 0) {
                    newState.phase = TurnPhase.BLOCK;
                    newState.combatants = attackers.map(u => ({ attackerId: u.instanceId, blockerId: null }));
                } else {
                    newState.phase = TurnPhase.END;
                }
            } else { newState.phase = TurnPhase.END; }
            break;
          case TurnPhase.END: {
              if (newState.extraTurns > 0) {
                  newState.extraTurns--;
                  log(`${player.name} starts their extra turn!`);
              } else {
                  newState.currentPlayerId = 1 - newState.currentPlayerId;
                  newState.turn += (newState.currentPlayerId === 0 ? 1 : 0);
              }
              newState.phase = TurnPhase.START;

              const nextPlayer = newState.players[newState.currentPlayerId];
              const opponentOfNextPlayer = newState.players[1 - newState.currentPlayerId];

              // Reset turn-based states for the new current player
              [...nextPlayer.units, ...nextPlayer.artifacts].forEach(c => {
                  c.shieldUsedThisTurn = false;
                  if (c.type === CardType.UNIT) {
                      (c as CardInGame).hasStruck = false;
                  }
              });
              
              newState.maxRolls = 3;
              log(`Turn ${newState.turn} - ${nextPlayer.name}'s turn.`);

              // Process start-of-turn effects
              if (nextPlayer.vanishZone.length > 0) {
                  const returningFromVanish: CardInGame[] = [];
                  nextPlayer.vanishZone = nextPlayer.vanishZone.filter(entry => {
                      entry.turnsRemaining--;
                      if (entry.turnsRemaining <= 0) {
                          returningFromVanish.push(entry.card);
                          return false;
                      }
                      return true;
                  });
                  if (returningFromVanish.length > 0) {
                       log("A card returns from the void!");
                       returningFromVanish.forEach(card => {
                           nextPlayer.units.push(card); // Assuming they are all units for now
                           const arrivalResult = resolveArrivalAbilities(card, nextPlayer, opponentOfNextPlayer);
                           newState.players[newState.currentPlayerId] = arrivalResult.player;
                           newState.players[1 - newState.currentPlayerId] = arrivalResult.opponent;
                       });
                  }
              }

              const locationsWithBlessing = nextPlayer.locations.filter(loc => loc.abilities?.blessing);
              if (locationsWithBlessing.length > 0) {
                  log(`Start of turn effects trigger for ${nextPlayer.name}.`);
              }

              locationsWithBlessing.forEach(location => {
                  const blessing = location.abilities.blessing;
                  log(`${nextPlayer.name}'s ${location.name} triggers its Blessing.`);

                  switch(blessing.effect.type) {
                      case 'DRAW_CARD': {
                          const { player: p, fatigueDamage } = drawCards(nextPlayer, blessing.effect.value);
                          newState.players[newState.currentPlayerId] = p;
                          fatigueDamage.forEach(d => damagePlayer(p, d, 'Fatigue'));
                          break;
                      }
                      case 'PROPHECY': {
                          newState.maxRolls += blessing.effect.value;
                          log(`${nextPlayer.name} gains ${blessing.effect.value} extra roll(s) this turn.`);
                          break;
                      }
                      case 'DISCARD': {
                          if (opponentOfNextPlayer.hand.length > 0) {
                              const cardToDiscard = opponentOfNextPlayer.hand.splice(Math.floor(Math.random() * opponentOfNextPlayer.hand.length), 1)[0];
                              opponentOfNextPlayer.graveyard.push(cardToDiscard);
                              log(`${opponentOfNextPlayer.name} discards ${cardToDiscard.name}.`);
                          }
                          break;
                      }
                      case 'RECYCLE_UNIT': {
                          const unitsInGraveyard = nextPlayer.graveyard.filter(c => c.type === CardType.UNIT);
                          if (unitsInGraveyard.length > 0) {
                              const cardIndex = Math.floor(Math.random() * unitsInGraveyard.length);
                              const cardToRecycle = unitsInGraveyard[cardIndex];
                              if (nextPlayer.hand.length < 7) {
                                  nextPlayer.graveyard = nextPlayer.graveyard.filter(c => c.instanceId !== cardToRecycle.instanceId);
                                  nextPlayer.hand.push(cardToRecycle);
                                  log(`${cardToRecycle.name} is returned to ${nextPlayer.name}'s hand from the graveyard.`);
                              } else {
                                  log(`${nextPlayer.name}'s hand is full, cannot recycle ${cardToRecycle.name}.`);
                              }
                          }
                          break;
                      }
                      case 'DECAY': {
                          if (opponentOfNextPlayer.units.length > 0) {
                              const target = opponentOfNextPlayer.units[Math.floor(Math.random() * opponentOfNextPlayer.units.length)];
                              dealDamageToUnit(target, 1, location, opponentOfNextPlayer);
                              log(`${location.name}'s Blessing applies Decay to ${target.name}.`);
                          }
                          break;
                      }
                  }
              });

              const cardsWithDecay = [...nextPlayer.units, ...nextPlayer.artifacts].filter(c => c.abilities?.decay);
              cardsWithDecay.forEach(card => {
                  dealDamageToUnit(card, 1, null, nextPlayer);
                  log(`${card.name} takes 1 damage from Decay.`);
              });

              if (cardsWithDecay.length > 0) {
                  checkForDestroyedCards(newState.currentPlayerId);
              }

              // Set up for the new turn
              newState.dice = Array.from({ length: 5 + nextPlayer.diceModifier }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false }));
              nextPlayer.diceModifier = 0;
              newState.rollCount = 0;
              break;
            }
          default: newState.phase = TurnPhase.ROLL_SPEND;
        }
        return { ...newState, isProcessing: true };
      }
      
      case 'AI_ACTION':
          newState.isProcessing = false;
          return newState;
      default: return state;
    }
  } catch(error) {
    console.error("FATAL ERROR in game reducer:", error);
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    newState.log.push(`!! SYSTEM CRITICAL ERROR: ${(error as Error).message} !!`);
    newState.isProcessing = false;
    return newState;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, getInitialLoadingState());
  const aiAction = useMemo(() => getAiAction(state), [state]);
  return { state, dispatch, aiAction };
};