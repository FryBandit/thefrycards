
import { useReducer, useMemo } from 'react';
import { GameState, Player, CardInGame, TurnPhase, Die, CardType, DiceCostType, DiceCost, getEffectiveStats, CardDefinition } from '../game/types';
import { buildDeckFromCards } from '../game/cards';
import { getAiAction } from './ai';

// Action Types
type Action =
  | { type: 'START_GAME'; payload: { allCards: CardDefinition[] } }
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
  };
};

const drawCards = (player: Player, count: number): { player: Player, drawnCards: CardInGame[], failedDraws: number } => {
    const newPlayer = {...player};
    newPlayer.hand = [...newPlayer.hand]; // ensure mutable
    newPlayer.deck = [...newPlayer.deck]; // ensure mutable

    const drawnCards: CardInGame[] = [];
    let failedDraws = 0;

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
            failedDraws++;
        }
    }
    newPlayer.hand = [...newPlayer.hand, ...drawnCards];
    return { player: newPlayer, drawnCards, failedDraws };
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
});


// Cost Checking Logic
export const checkDiceCost = (card: { cost: DiceCost[], keywords?: { [key: string]: any; } }, dice: Die[]): { canPay: boolean, diceToSpend: Die[] } => {
    let availableDice = dice.filter(d => !d.isSpent);
    
    // Handle Wild keyword: transform costs before checking
    const costToUse = card.keywords?.wild 
        ? card.cost.map(c => c.type === DiceCostType.EXACTLY_X ? { type: DiceCostType.ANY_X_DICE, count: 1 } : c)
        : card.cost;
        
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
        case DiceCostType.TWO_PAIR: {
            const counts: {[key: number]: number} = {};
            for (const val of diceValues) { counts[val] = (counts[val] || 0) + 1; }
            const pairs = Object.keys(counts).filter(k => counts[parseInt(k)] >= 2);
            if (pairs.length < 2) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            
            const diceToSpend: Die[] = [];
            let tempDice = [...availableDice];

            const val1 = parseInt(pairs[0]);
            let dieIndex1 = tempDice.findIndex(d => d.value === val1);
            diceToSpend.push(tempDice.splice(dieIndex1, 1)[0]);
            let dieIndex2 = tempDice.findIndex(d => d.value === val1);
            diceToSpend.push(tempDice.splice(dieIndex2, 1)[0]);
            
            const val2 = parseInt(pairs[1]);
            let dieIndex3 = tempDice.findIndex(d => d.value === val2);
            diceToSpend.push(tempDice.splice(dieIndex3, 1)[0]);
            let dieIndex4 = tempDice.findIndex(d => d.value === val2);
            diceToSpend.push(tempDice.splice(dieIndex4, 1)[0]);

            return { canPay: true, diceToSpend, remainingDice: tempDice };
        }
        case DiceCostType.FULL_HOUSE: {
            const counts: {[key: number]: number} = {};
            for (const val of diceValues) { counts[val] = (counts[val] || 0) + 1; }
            
            const threeValStr = Object.keys(counts).find(k => counts[parseInt(k)] >= 3);
            if (!threeValStr) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
            
            const threeVal = parseInt(threeValStr);
            const pairValStr = Object.keys(counts).find(k => counts[parseInt(k)] >= 2 && parseInt(k) !== threeVal);
            if (!pairValStr) return { canPay: false, diceToSpend: [], remainingDice: availableDice };

            const pairVal = parseInt(pairValStr);

            const threeOfAKindDice = availableDice.filter(d => d.value === threeVal).slice(0, 3);
            const pairDice = availableDice.filter(d => d.value === pairVal).slice(0, 2);
            
            const diceToSpend = [...threeOfAKindDice, ...pairDice];
            const spentIds = new Set(diceToSpend.map(d => d.id));
            const remainingDice = availableDice.filter(d => !spentIds.has(d.id));

            return { canPay: true, diceToSpend, remainingDice };
        }
        case DiceCostType.STRAIGHT_4: {
             const uniqueSorted = [...new Set(diceValues)];
             if (uniqueSorted.length < 4) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
             for (let i = 0; i <= uniqueSorted.length - 4; i++) {
                 if (uniqueSorted[i+1] === uniqueSorted[i] + 1 && uniqueSorted[i+2] === uniqueSorted[i] + 2 && uniqueSorted[i+3] === uniqueSorted[i] + 3) {
                     const vals = uniqueSorted.slice(i, i+4);
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
        case DiceCostType.STRAIGHT_5: {
             const uniqueSorted = [...new Set(diceValues)];
             if (uniqueSorted.length < 5) return { canPay: false, diceToSpend: [], remainingDice: availableDice };
             for (let i = 0; i <= uniqueSorted.length - 5; i++) {
                 if (uniqueSorted[i+1] === uniqueSorted[i] + 1 && uniqueSorted[i+2] === uniqueSorted[i] + 2 && uniqueSorted[i+3] === uniqueSorted[i] + 3 && uniqueSorted[i+4] === uniqueSorted[i] + 4) {
                     const vals = uniqueSorted.slice(i, i+5);
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

export const isCardTargetable = (targetingCard: CardInGame, targetCard: CardInGame, sourcePlayer: Player, targetPlayer: Player): boolean => {
    if (!targetingCard) return false;
    
    const isOpponentTarget = sourcePlayer.id !== targetPlayer.id;

    // Handle recall (targets own units)
    if (targetingCard.keywords?.recall) {
        return !isOpponentTarget && targetPlayer.units.some(u => u.instanceId === targetCard.instanceId);
    }
    // Handle augment (targets own units)
    if (targetingCard.keywords?.augment) {
        return !isOpponentTarget && targetCard.type === CardType.UNIT && targetPlayer.units.some(u => u.instanceId === targetCard.instanceId);
    }
    
    // Handle standard targeting (targets opponent units)
    if (isOpponentTarget && targetCard.type === CardType.UNIT) {
        // Check for protections
        if (targetCard.keywords?.immutable) return false;
        if (targetCard.keywords?.stealth) return false;
        if (targetCard.keywords?.breach && !targetCard.hasAssaulted) return false;
        
        return true;
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
    
    const damagePlayer = (player: Player, amount: number, source: string, type: 'damage' | 'loss' = 'damage') => {
        if (player.isCommandFortified) {
            log(`${player.name}'s Command is fortified and takes no damage from ${source}!`);
            return;
        }

        // Handle Fortify keyword
        if (type === 'damage') {
            const fortifyValue = player.locations
                .filter(l => l.keywords?.fortify)
                .reduce((max, l) => Math.max(max, l.keywords!.fortify!.value), 0);

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
        if (target.keywords?.immutable) {
            log(`${target.name} is Immutable and ignores damage from ${sourceCard?.name || 'Effect'}.`);
            return;
        }

        if (target.keywords?.shield && !target.shieldUsedThisTurn) {
            target.shieldUsedThisTurn = true;
            log(`${target.name}'s Shield prevents the damage from ${sourceCard?.name || 'Effect'}!`);
            return; // Prevent damage
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
                          damagePlayer(player, sourceCard.keywords.executioner.amount, `${sourceCard.name}'s Executioner`, 'damage');
                        }

                        let standardPenaltyApplies = true;

                        // --- On-destruction keyword triggers ---
                        if (unit.keywords?.bounty && player.id !== sourcePlayerId) {
                            opponent.command += unit.keywords.bounty.amount;
                            log(`${opponent.name} gains ${unit.keywords.bounty.amount} Command from ${unit.name}'s Bounty.`);
                        }
                        if (unit.keywords?.malice) {
                            damagePlayer(player, unit.keywords.malice, `${unit.name}'s Malice`, 'loss');
                        }
                        if (unit.keywords?.martyrdom) {
                            const effect = unit.keywords.martyrdom;
                            log(`${unit.name}'s Martyrdom triggers!`);
                            switch(effect.type) {
                                case 'DRAW_CARD': {
                                    const { player: p, drawnCards, failedDraws } = drawCards(newState.players[player.id], effect.value);
                                    newState.players[player.id] = p;
                                    if (drawnCards.length > 0) log(`${p.name} draws ${drawnCards.length} card(s).`);
                                    if (failedDraws > 0) {
                                      damagePlayer(newState.players[player.id], failedDraws, 'Fatigue', 'damage');
                                    }
                                    break;
                                  }
                                case 'DEAL_DAMAGE_TO_OPPONENT':
                                    damagePlayer(opponent, effect.value, `${unit.name}'s Martyrdom`, 'damage');
                                    break;
                            }
                        }
                        if (unit.keywords?.haunt) {
                          damagePlayer(opponent, unit.keywords.haunt, `${unit.name}'s Haunt`, 'loss');
                          standardPenaltyApplies = false; // Haunt overrides standard penalty.
                        } 
                        
                        if (standardPenaltyApplies && player.id !== sourcePlayerId) {
                           // Rule: owner of unit loses command if destroyed by an opponent.
                           damagePlayer(player, unit.commandNumber, `${unit.name}'s destruction`, 'loss');
                        }
                    }
                }
            }
        }
        if (newState.players[0].command <= 0) newState.winner = newState.players[1];
        if (newState.players[1].command <= 0) newState.winner = newState.players[0];
        return changed;
    }

    const resolveArrivalAbilities = (card: CardInGame, player: Player, opponent: Player, amplified: boolean) => {
        // Echo keyword
        if (card.type === CardType.UNIT && card.keywords?.echo) {
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
        if (card.keywords?.resonance) {
            if (player.deck.length > 0) {
                const topCard = player.deck[player.deck.length - 1];
                log(`${card.name}'s Resonance reveals ${topCard.name}.`);
                if (topCard.commandNumber >= card.keywords.resonance.value) {
                    const effect = card.keywords.resonance.effect;
                    if (effect.type === 'BUFF_STRENGTH') {
                        const cardInPlay = player.units.find(u => u.instanceId === card.instanceId);
                        if (cardInPlay) cardInPlay.strengthModifier += effect.amount;
                        log(`Resonance successful! ${card.name} gains +${effect.amount} Strength.`);
                    }
                } else {
                    log(`Resonance failed. Top card's Command Number was too low.`);
                }
            }
        }
        if (card.keywords?.stagnate) {
            opponent.skipNextDrawPhase = true;
            log(`${opponent.name} will skip their next Draw Phase due to Stagnate!`);
        }
        if(card.keywords?.fateweave) {
            if(newState.rollCount > 0) {
            newState.maxRolls += card.keywords.fateweave;
            log(`${player.name} gains an extra roll from Fateweave!`);
            }
        }
        if(card.keywords?.foresight && player.deck.length > 0) {
            log(`Foresight reveals ${player.name}'s top card: ${player.deck[player.deck.length - 1].name}`);
        }
        if(card.keywords?.draw) {
            const { player: p, drawnCards, failedDraws } = drawCards(player, card.keywords.draw);
            player = p;
            if (drawnCards.length > 0) log(`${player.name} draws ${drawnCards.length} card(s).`);
            if (failedDraws > 0) {
                damagePlayer(player, failedDraws, 'Fatigue', 'damage');
            }
        }
        if (card.keywords?.barrage) {
            log(`${card.name}'s Barrage deals ${card.keywords.barrage} damage to all enemy units!`);
            opponent.units.forEach(unit => {
                if (unit.keywords?.breach && !unit.hasAssaulted) {
                    log(`${unit.name} is protected from ${card.name}'s Barrage by Breach.`);
                    return; 
                }
                dealDamageToUnit(unit, card.keywords.barrage, card, opponent);
            });
        }
        if (card.keywords?.purge) {
            log(`${card.name} purges ${card.keywords.purge} cards from ${opponent.name}'s graveyard.`);
            for (let i=0; i < card.keywords.purge; i++) {
                if (opponent.graveyard.length > 0) {
                    const randomIndex = Math.floor(Math.random() * opponent.graveyard.length);
                    const purgedCard = opponent.graveyard.splice(randomIndex, 1)[0];
                    opponent.void.push(purgedCard);
                    log(`Voided ${purgedCard.name}.`);
                }
            }
        }
        if (card.keywords?.sabotage) {
            opponent.diceModifier -= card.keywords.sabotage;
            log(`${opponent.name} will roll ${card.keywords.sabotage} fewer dice next turn!`);
        }
        if (card.keywords?.warp) {
            newState.extraTurns += 1;
            log(`${player.name} will take an extra turn!`);
        }
        if (card.keywords?.discard) {
            if (opponent.hand.length > 0) {
                const discardCount = card.keywords.discard;
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
        if (card.keywords?.annihilate) {
            log(`${card.name}'s Annihilate voids all other units!`);
            const opponentUnitsToVoid = opponent.units.filter(u => !u.keywords?.immutable);
            const playerUnitsToVoid = player.units.filter(u => u.instanceId !== card.instanceId && !u.keywords?.immutable);
            
            const opponentUnitsKept = opponent.units.filter(u => u.keywords?.immutable);
            const playerUnitsKept = player.units.filter(u => u.instanceId === card.instanceId || u.keywords?.immutable);

            player.units = playerUnitsKept;
            opponent.units = opponentUnitsKept;
            
            playerUnitsToVoid.forEach(u => {
              player.void.push(u);
              log(`${u.name} is voided.`);
            });

            opponentUnitsToVoid.forEach(u => {
              opponent.void.push(u);
              log(`${u.name} is voided.`);
              damagePlayer(opponent, u.commandNumber, `${u.name}'s voiding`, 'loss');
            });
        }
        switch(card.id) {
            case 15: { // System-Killer KAIJU (also has annihilate, but for legacy)
                log(`KAIJU's Annihilate voids all other units!`);
                const opponentUnitsToVoid = opponent.units.filter(u => !u.keywords?.immutable);
                const playerUnitsToVoid = player.units.filter(u => u.instanceId !== card.instanceId && !u.keywords?.immutable);
                
                const opponentUnitsKept = opponent.units.filter(u => u.keywords?.immutable);
                const playerUnitsKept = player.units.filter(u => u.instanceId === card.instanceId || u.keywords?.immutable);

                player.units = playerUnitsKept;
                opponent.units = opponentUnitsKept;
                
                playerUnitsToVoid.forEach(u => {
                  player.void.push(u);
                  log(`${u.name} is voided.`);
                });

                opponentUnitsToVoid.forEach(u => {
                  opponent.void.push(u);
                  log(`${u.name} is voided.`);
                  damagePlayer(opponent, u.commandNumber, `${u.name}'s voiding`, 'loss');
                });
                break;
            }
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

        return {
          players: [player1, player2],
          currentPlayerId: 0,
          turn: 1,
          phase: TurnPhase.START,
          dice: Array.from({ length: 5 }, (_, i) => ({ id: i, value: 1, isKept: false, isSpent: false })),
          rollCount: 0,
          maxRolls: 3,
          log: ['SYSTEM BOOT: Game initialized.'],
          winner: null,
          isProcessing: true,
          extraTurns: 0,
        };
      }

      case 'ROLL_DICE':
        if (newState.rollCount >= newState.maxRolls) return state;
        const diceToRoll = newState.dice.filter(d => !d.isKept && !d.isSpent);
        diceToRoll.forEach(d => {
          newState.dice.find(nd => nd.id === d.id)!.value = Math.floor(Math.random() * 6) + 1;
        });
        newState.rollCount++;
        log(`${newState.players[newState.currentPlayerId].name} rolled dice.`);
        return newState;

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
        
        let costConfig = { cost: cardToPlay.cost, keywords: cardToPlay.keywords };
        if (options?.isChanneled) costConfig = { cost: cardToPlay.keywords.channel.cost, keywords: cardToPlay.keywords };
        if (options?.isScavenged) costConfig = { cost: cardToPlay.keywords.scavenge.cost, keywords: cardToPlay.keywords };
        if (options?.isAmplified) costConfig = { cost: cardToPlay.cost.concat(cardToPlay.keywords.amplify.cost), keywords: cardToPlay.keywords };
        if (cardToPlay.keywords?.augment) costConfig = { cost: cardToPlay.keywords.augment.cost, keywords: cardToPlay.keywords };

        const costCheck = checkDiceCost(costConfig, newState.dice);
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
            case 'DRAW': {
              const { player: p, drawnCards, failedDraws } = drawCards(currentPlayer, effect.value);
              currentPlayer = p;
              if (drawnCards.length > 0) log(`${currentPlayer.name} draws ${drawnCards.length} card(s).`);
              if (failedDraws > 0) {
                  damagePlayer(currentPlayer, failedDraws, 'Fatigue', 'damage');
              }
              break;
            }
          }
          currentPlayer.graveyard.push(cardToPlay); // Channeled cards go to graveyard
          newState.players[newState.currentPlayerId] = currentPlayer;
          return newState;
        }

        // Place card in play or graveyard
        if (cardToPlay.keywords?.riftwalk) {
            log(`${cardToPlay.name} Riftwalks and will return in ${cardToPlay.keywords.riftwalk.turns} turn(s).`);
            currentPlayer.riftwalkZone.push({ card: cardToPlay, turnsRemaining: cardToPlay.keywords.riftwalk.turns });
        } else if (cardToPlay.keywords?.augment && targetInstanceId) {
            const targetUnit = currentPlayer.units.find(u => u.instanceId === targetInstanceId);
            if(targetUnit) {
                targetUnit.attachments = targetUnit.attachments || [];
                targetUnit.attachments.push(cardToPlay);
                log(`${cardToPlay.name} augments ${targetUnit.name}.`);
            } else {
                 currentPlayer.graveyard.push(cardToPlay); // Fizzle if target is gone
            }
        } else {
            switch(cardToPlay.type) {
                case CardType.UNIT: currentPlayer.units.push(cardToPlay); break;
                case CardType.LOCATION: 
                    if (cardToPlay.keywords?.landmark) {
                        const existingLandmarkIndex = currentPlayer.locations.findIndex(l => l.keywords?.landmark);
                        if (existingLandmarkIndex > -1) {
                            const removed = currentPlayer.locations.splice(existingLandmarkIndex, 1)[0];
                            currentPlayer.graveyard.push(removed);
                            log(`${removed.name} was replaced by the new Landmark.`);
                        }
                    }
                    currentPlayer.locations.push(cardToPlay); 
                    break;
                case CardType.ARTIFACT: 
                    if(cardToPlay.keywords?.consume) cardToPlay.counters = cardToPlay.keywords.consume.initial;
                    currentPlayer.artifacts.push(cardToPlay); 
                    break;
                case CardType.EVENT: currentPlayer.graveyard.push(cardToPlay); break;
            }
        }

        // Instability keyword
        if (cardToPlay.keywords?.instability) {
            currentPlayer.diceModifier -= 1;
            log(`${cardToPlay.name}'s Instability means ${currentPlayer.name} rolls one fewer die next turn.`);
        }

        const arrivalResult = resolveArrivalAbilities(cardToPlay, currentPlayer, opponentPlayer, !!options?.isAmplified);
        currentPlayer = arrivalResult.player;
        opponentPlayer = arrivalResult.opponent;

        // Targeted effects
        if (cardToPlay.keywords?.recall && targetInstanceId) {
            const targetIndex = currentPlayer.units.findIndex(u => u.instanceId === targetInstanceId);
            if (targetIndex > -1) {
                const target = currentPlayer.units[targetIndex];
                log(`${target.name} is Recalled to ${currentPlayer.name}'s hand.`);
                const baseCard = {
                    ...target,
                    damage: 0,
                    strengthModifier: 0,
                    durabilityModifier: 0,
                    hasAssaulted: false,
                    isScavenged: false, 
                    isToken: false, 
                    attachments: [],
                }
                currentPlayer.units.splice(targetIndex, 1);
                currentPlayer.hand.push(baseCard);
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
        
        checkForDestroyedUnits(currentPlayer.id, cardToPlay);
        if (opponentPlayer.command <= 0) newState.winner = currentPlayer;

        newState.players[newState.currentPlayerId] = currentPlayer;
        newState.players[1-newState.currentPlayerId] = opponentPlayer;

        return newState;
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

        if(card.keywords.consume) {
            card.counters = (card.counters || 1) - 1;
            log(`${card.name} has ${card.counters} counter(s) remaining.`);
        }

        switch(card.keywords.activate.effect.type) {
            case 'fortify_command':
                currentPlayer.isCommandFortified = true;
                log(`${currentPlayer.name}'s Command is fortified until their next turn!`);
                break;
            case 'spike': {
                const availableDice = newState.dice.filter(d => !d.isSpent && d.value < 6);
                if (availableDice.length > 0) {
                    const dieToSpike = availableDice.sort((a,b) => a.value - b.value)[0];
                    const originalValue = dieToSpike.value;
                    dieToSpike.value = Math.min(6, dieToSpike.value + card.keywords.activate.effect.value);
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
        
        if (card.keywords.consume && card.counters <= 0) {
            log(`${card.name} is consumed and sent to the graveyard.`);
            currentPlayer.artifacts = currentPlayer.artifacts.filter(a => a.instanceId !== cardInstanceId);
            currentPlayer.graveyard.push(card);
        }

        return newState;
      }

      case 'ADVANCE_PHASE': {
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
                    currentPlayer.units.push(item.card);
                    const arrivalResult = resolveArrivalAbilities(item.card, currentPlayer, opponentPlayer, false);
                    currentPlayer = arrivalResult.player;
                    opponentPlayer = arrivalResult.opponent;
                }
                currentPlayer.riftwalkZone = currentPlayer.riftwalkZone.filter(rw => rw.turnsRemaining > 0);
            }

            // Generator effects
            currentPlayer.locations.forEach(loc => {
                if (loc.id === 11) { // Data Haven (legacy)
                    currentPlayer.command++;
                    log(`${currentPlayer.name} gained 1 command from Data Haven.`);
                }
                if (loc.keywords?.generator) {
                    const effect = loc.keywords.generator;
                    log(`${loc.name}'s Generator ability triggers.`);
                    if(effect.type === 'GAIN_COMMAND') {
                        currentPlayer.command += effect.value;
                    }
                    if(effect.type === 'DRAW_CARD') {
                        const { player: p, failedDraws } = drawCards(currentPlayer, effect.value);
                        currentPlayer = p;
                        if (failedDraws > 0) damagePlayer(currentPlayer, failedDraws, 'Fatigue', 'damage');
                    }
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
              const { player: p, drawnCards, failedDraws } = drawCards(currentPlayer, 1);
              newState.players[newState.currentPlayerId] = p;
              if (drawnCards.length > 0) {
                   log(`${p.name} drew a card.`);
              }
              if (failedDraws > 0) {
                  damagePlayer(newState.players[newState.currentPlayerId], failedDraws, 'Fatigue', 'damage');
                  log(`${p.name} has no cards left and takes ${failedDraws} Fatigue damage!`);
              }
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
                  opponentPlayer.command -= phasingDamage; // Phasing is unpreventable, bypasses damagePlayer for fortify check
                  log(`${currentPlayer.name}'s Phasing units deal ${phasingDamage} unpreventable Command damage!`);
              }
              if (totalDamage > 0) {
                  damagePlayer(opponentPlayer, totalDamage, `${currentPlayer.name}'s assault`, 'damage');
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
