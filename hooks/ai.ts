import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost, getEffectiveStats } from '../game/types';
import { checkDiceCost } from './useGameState';

type AIAction = 
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string } }
    | { type: 'ADVANCE_PHASE', payload?: { assault: boolean } }
    | { type: 'AI_MULLIGAN_CHOICE' };

type AIPossiblePlay = {
    action: AIAction;
    score: number;
    description: string;
};

// Assesses the threat level of a single unit on the board.
const getUnitThreat = (unit: CardInGame, owner: Player, opponent: Player): number => {
    let threat = 0;
    const { strength, durability } = getEffectiveStats(unit, owner);

    threat += strength; // Base threat is its damage potential
    if (strength > 4) threat += strength - 4; // High strength is extra threatening

    // Keyword threat assessment
    if (unit.abilities?.phasing) threat += strength * 2; // Unblockable damage is very high threat
    if (unit.abilities?.siphon) threat += unit.abilities.siphon * 3; // Life gain is a big swing
    if (unit.abilities?.immutable) threat += 10; // Very hard to remove
    if (unit.abilities?.overload) threat += Math.floor(owner.graveyard.length / (unit.abilities.overload.per || 1)) * unit.abilities.overload.amount;
    if (unit.abilities?.venomous) threat += 5 * Math.min(3, opponent.units.length); // More valuable if opponent has targets
    if (unit.abilities?.executioner) threat += 4 * Math.min(3, opponent.units.length);
    if (unit.abilities?.rally) threat += 3 * owner.units.length; // Buffs more of its own units
    if (unit.abilities?.haunt) threat += unit.abilities.haunt / 2;

    // Is it close to dying? Less of a threat if it can be easily removed in combat.
    if (durability > 0) {
      threat -= (unit.damage / durability) * 2;
    }
    
    return Math.max(0, threat);
}


const getCardScore = (card: CardInGame, aiPlayer: Player, humanPlayer: Player, turn: number): number => {
    let score = 0;

    // Threat assessment of opponent's board
    const opponentUnits = humanPlayer.units;
    const opponentThreats = opponentUnits.map(u => ({ unit: u, threat: getUnitThreat(u, humanPlayer, aiPlayer) })).sort((a,b) => b.threat - a.threat);
    const highestThreat = opponentThreats.length > 0 ? opponentThreats[0].threat : 0;
    const highestThreatUnit = opponentThreats.length > 0 ? opponentThreats[0].unit : null;

    // --- SITUATIONAL SCORING based on threats ---
    if (card.abilities?.damage || card.abilities?.snipe) {
        const damage = card.abilities.damage || card.abilities.snipe || 0;
        if (highestThreatUnit && damage > 0) {
            score += highestThreat * 0.75; // Value for damaging a high threat target
            const { durability } = getEffectiveStats(highestThreatUnit, humanPlayer);
            if (durability - highestThreatUnit.damage <= damage) {
                score += highestThreat * 1.5; // Extra value for killing a high threat target
            }
        }
    }
    if (card.abilities?.voidTarget && highestThreatUnit && !highestThreatUnit.abilities?.immutable) {
        score += highestThreat * 2.5; // Voiding is premium removal
    }
    if (card.abilities?.corrupt && highestThreatUnit && !highestThreatUnit.abilities?.immutable) {
        score += Math.min(getEffectiveStats(highestThreatUnit, humanPlayer).strength, card.abilities.corrupt) * 2;
    }
    if (card.abilities?.barrage && opponentUnits.length > 0) {
        const potentialDamage = opponentUnits.reduce((acc, unit) => {
            if (unit.abilities?.immutable || (unit.abilities?.breach && !unit.hasAssaulted)) return acc;
            return acc + (card.abilities?.barrage || 0);
        }, 0);
        if (opponentUnits.length < 2) {
             score += potentialDamage * 0.5; // Less value on small boards
        } else {
             score += potentialDamage * 2;
        }
    }


    // --- DISRUPTION ---
    if (card.abilities?.stagnate) {
        score += 20; // Increased priority
    }
    if (card.abilities?.discard) {
        score += card.abilities.discard * Math.min(humanPlayer.hand.length, 3); // More valuable if opponent has cards, capped to prevent over-valuing
    }
    if (card.abilities?.purge && humanPlayer.graveyard.length > 2) {
        score += Math.min(card.abilities.purge, humanPlayer.graveyard.length) * 2;
    }
    if (card.abilities?.sabotage) {
        score += 10;
    }


    // --- IMMEDIATE ADVANTAGE ---
    if (card.abilities?.annihilate) {
        if (humanPlayer.units.length < 3) {
            score = 1; // De-prioritize heavily on a small board
        } else {
            score += humanPlayer.units.length * 10; // Huge value
        }
    }
    if (card.abilities?.riftwalk) score += 8; // Good, but delayed
    if (card.abilities?.warp) score += 25; // Extra turn is huge
    if (card.abilities?.echo) score += 15; // Very high priority
    if (card.abilities?.draw) {
        score += (5 - Math.min(aiPlayer.hand.length, 4)) * card.abilities.draw * 2; // More valuable with fewer cards in hand
    }
    if (card.id === 15) { // System-Killer KAIJU
        if (opponentUnits.length > 1) {
            score += opponentUnits.length * 6; // Board wipe value
        } else {
            score = 1;
        }
    }

    // --- DEFENSIVE / UTILITY ---
    if (card.abilities?.fortify && aiPlayer.command < 12) score += 15; // High value when low on health
    if (card.abilities?.landmark && !aiPlayer.locations.some(l => l.abilities?.landmark)) score += 5;

    // --- GENERAL KEYWORD VALUE ---
    if (card.abilities?.amplify) score += 5; // Increased value for flexibility
    if (card.abilities?.channel) score += 4; // Valuable for flexibility and unbricking hands
    if (card.abilities?.executioner) score += 5;
    if (card.abilities?.venomous && card.abilities?.snipe) score += 10;
    if (card.abilities?.immutable) score += 8;
    if (card.abilities?.recall && aiPlayer.units.some(u => u.damage > 0)) score += 8;
    if (card.abilities?.fateweave) score += 5;
    if (card.abilities?.resonance) score += 5;
    if (card.abilities?.martyrdom) score += 4;
    if (card.abilities?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.abilities.overload.per || 2)) * card.abilities.overload.amount;
    if (card.abilities?.phasing) score += (getEffectiveStats(card, aiPlayer).strength) * 1.5;
    if (card.abilities?.haunt) score += card.abilities.haunt;
    if (card.abilities?.siphon) score += card.abilities.siphon * 2;
    if (card.abilities?.synergy) {
        const faction = card.abilities.synergy.faction;
        const synergyCountInPlay = [...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts]
            .filter(c => c.faction === faction)
            .length;
        score += synergyCountInPlay * 3;
        
        const synergyCountInHand = aiPlayer.hand.filter(c => c.instanceId !== card.instanceId && c.faction === faction).length;
        score += synergyCountInHand * 1.5; // encourage keeping synergy pieces together
    }


    // Card Type priorities
    if (card.type === CardType.UNIT) {
        score += 5;
        if (aiPlayer.units.length < 2) score += 5; // Encourage building a board early
    }
    if (card.type === CardType.EVENT) score += 2;
    if (card.type === CardType.LOCATION || card.type === CardType.ARTIFACT) {
        if (turn < 4) {
            score += 8; // Prioritize setting up early
        }
    }

    // Base value
    score += card.commandNumber;
    
    // Drawbacks
    if (card.abilities?.malice) score -= card.abilities.malice * 2;
    if (card.abilities?.decay) score -= 2;
    if (card.abilities?.bounty) score -= card.abilities.bounty.amount * 2.5;
    if (card.abilities?.instability) score -= 8;


    return score;
}

// Determines which dice are valuable to keep for a single given cost
const findValuableDiceForCost = (cost: DiceCost, dice: Die[]): Die[] => {
    if (!cost) return [];

    const availableDice = dice.filter(d => !d.isSpent);
    const diceByValue = new Map<number, Die[]>();
    for (const die of availableDice) {
        if (!diceByValue.has(die.value)) {
            diceByValue.set(die.value, []);
        }
        diceByValue.get(die.value)!.push(die);
    }
    
    switch (cost.type) {
        case DiceCostType.EXACT_VALUE:
            return diceByValue.get(cost.value!) || [];
            
        case DiceCostType.MIN_VALUE:
            return availableDice.filter(d => d.value >= cost.value!);

        case DiceCostType.ANY_PAIR:
            for (const dice of diceByValue.values()) {
                if (dice.length >= 2) return dice.slice(0, 2);
            }
            return [];

        case DiceCostType.THREE_OF_A_KIND:
            for (const dice of diceByValue.values()) {
                if (dice.length >= 3) return dice.slice(0, 3);
                if (dice.length === 2) return dice; // Keep pairs, hope to roll the third
            }
            return [];
        
        case DiceCostType.FOUR_OF_A_KIND:
            for (const dice of diceByValue.values()) {
                if (dice.length >= 4) return dice.slice(0, 4);
                if (dice.length >= 3) return dice.slice(0, 3);
                if (dice.length === 2) return dice;
            }
            return [];

        case DiceCostType.STRAIGHT: {
            const uniqueSorted = [...new Set(availableDice.map(d => d.value))].sort((a,b) => a-b);
            if (uniqueSorted.length < 2) return [];
            for (let i = 0; i < uniqueSorted.length - 1; i++) {
                if (uniqueSorted[i+1] === uniqueSorted[i] + 1) {
                    const d1 = availableDice.find(d => d.value === uniqueSorted[i])!;
                    const d2 = availableDice.find(d => d.value === uniqueSorted[i+1])!;
                    return [d1, d2]; // Keep first consecutive pair
                }
            }
            return [];
        }

        case DiceCostType.SUM_OF_X_DICE:
            return [...availableDice].sort((a, b) => b.value - a.value).slice(0, cost.count);
        
        case DiceCostType.ANY_X_DICE:
             return [...availableDice].sort((a, b) => b.value - a.value).slice(0, cost.count);

        default:
            return [];
    }
}

// Determines which dice are the most valuable to keep by looking at the top potential plays
const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, humanPlayer: Player, turn: number): Die[] => {
    if (hand.length === 0) return [];
    
    const sortedHand = [...hand]
        .sort((a, b) => getCardScore(b, aiPlayer, humanPlayer, turn) - getCardScore(a, aiPlayer, humanPlayer, turn));
    
    // Consider top 2 potential plays
    const topCards = sortedHand.slice(0, 2);
    if (topCards.length === 0) return [];

    const allValuableDice = new Map<number, Die>();
    const diceToConsider = dice.filter(d => !d.isSpent);

    // Find valuable dice for the primary goal card
    const primaryGoal = topCards[0];
    const primaryDice = primaryGoal.dice_cost.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
    primaryDice.forEach(d => allValuableDice.set(d.id, d));
    
    // Aggregate valuable dice from a secondary goal card
    if (topCards.length > 1) {
        const secondaryGoal = topCards[1];
        const secondaryDice = secondaryGoal.dice_cost.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
        secondaryDice.forEach(d => allValuableDice.set(d.id, d));
    }
    
    return Array.from(allValuableDice.values());
}

// Helper to find the best target for a damaging ability
const findBestDamageTarget = (card: CardInGame, damage: number, humanPlayer: Player, aiPlayer: Player): CardInGame | null => {
    const validTargets = humanPlayer.units.filter(u => !u.abilities?.immutable && !u.abilities?.stealth && (!u.abilities?.breach || u.hasAssaulted));
    if (validTargets.length === 0) return null;

    // Priority 1: Lethal targets, sorted by threat
    const lethalTargets = validTargets
        .filter(t => {
            const finalDamage = damage * (t.abilities?.fragile ? 2 : 1);
            return getEffectiveStats(t, humanPlayer).durability - t.damage <= finalDamage;
        })
        .sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer));

    if (lethalTargets.length > 0) return lethalTargets[0];

    // Priority 2: Highest threat target
    return [...validTargets].sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer))[0];
};

// Main function to decide the AI's next move
export const getAiAction = (state: GameState): AIAction | null => {
    if (state.phase === TurnPhase.AI_MULLIGAN) {
        return { type: 'AI_MULLIGAN_CHOICE' };
    }

    if (state.currentPlayerId !== 1 || !state.isProcessing || state.winner) {
        return null;
    }
    
    const { phase, dice, rollCount, players, turn } = state;
    const aiPlayer = players[1];
    const humanPlayer = players[0];
    const availableDice = dice.filter(d => !d.isSpent);

    if (phase === TurnPhase.ROLL_SPEND) {
        const possiblePlays: AIPossiblePlay[] = [];

        // 1. Evaluate Activations
        const activatableCards = [...aiPlayer.artifacts, ...aiPlayer.units, ...aiPlayer.locations].filter(c => c.abilities?.activate);
        for (const card of activatableCards) {
            if (checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost }, availableDice).canPay) {
                const effect = card.abilities.activate.effect.type;
                let score = 0;
                if (effect === 'reconstruct' && card.type === CardType.UNIT && card.damage > 0) {
                    score = 15 + getUnitThreat(card, aiPlayer, humanPlayer); // High value to save a unit
                }
                if (effect === 'fortify_command' && aiPlayer.command < 12) {
                    score = 18; // Very high value when low on health
                }
                if (effect === 'spike' && availableDice.some(d => d.value < 6)) {
                    score = 8; // Good utility
                }

                if (score > 0) {
                    possiblePlays.push({
                        action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } },
                        score,
                        description: `Activate ${card.name}`
                    });
                }
            }
        }
        
        // 2. Evaluate Scavenge
        const scavengeableCards = aiPlayer.graveyard.filter(c => c.abilities?.scavenge);
        for (const card of scavengeableCards) {
             if (checkDiceCost({ ...card, dice_cost: card.abilities.scavenge.cost }, availableDice).canPay) {
                let score = getCardScore(card, aiPlayer, humanPlayer, turn) - 5; // A bit less valuable since it's a one-shot
                possiblePlays.push({
                    action: { type: 'PLAY_CARD', payload: { card, options: { isScavenged: true } } },
                    score,
                    description: `Scavenge ${card.name}`
                });
             }
        }
        
        // 3. Evaluate Plays from Hand
        for (const card of aiPlayer.hand) {
            // A. Standard Play
            if (checkDiceCost(card, availableDice).canPay) {
                let score = getCardScore(card, aiPlayer, humanPlayer, turn);
                let action: AIAction | null = { type: 'PLAY_CARD', payload: { card } };

                if (card.abilities?.requiresTarget || card.abilities?.augment) {
                    let bestTarget: CardInGame | null = null;
                    if (card.abilities?.recall) {
                        bestTarget = [...aiPlayer.units].filter(u => u.damage > 0).sort((a,b) => getUnitThreat(b, aiPlayer, humanPlayer) - getUnitThreat(a, aiPlayer, humanPlayer))[0] ?? null;
                    } else if (card.abilities?.augment) {
                        bestTarget = [...aiPlayer.units].filter(u => !u.abilities?.immutable).sort((a,b) => getUnitThreat(b, aiPlayer, humanPlayer) - getUnitThreat(a, aiPlayer, humanPlayer))[0] ?? null;
                    } else {
                        const damage = card.abilities.damage || card.abilities.snipe || 0;
                        bestTarget = findBestDamageTarget(card, damage, humanPlayer, aiPlayer);
                    }

                    if (bestTarget) {
                        (action.payload as any).targetInstanceId = bestTarget.instanceId;
                    } else {
                        action = null; // No valid target, can't make this play
                    }
                }
                if (action) possiblePlays.push({ action, score, description: `Play ${card.name}` });
            }

            // B. Amplify Play
            if (card.abilities?.amplify && checkDiceCost({ ...card, dice_cost: card.dice_cost.concat(card.abilities.amplify.cost) }, availableDice).canPay) {
                let score = getCardScore(card, aiPlayer, humanPlayer, turn) + 10; // Bonus for powerful effect
                let action: AIAction | null = { type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } };
                const effect = card.abilities.amplify.effect;

                if (effect.type === 'DEAL_DAMAGE') {
                    const bestTarget = findBestDamageTarget(card, effect.amount, humanPlayer, aiPlayer);
                    if (bestTarget) {
                        (action.payload as any).targetInstanceId = bestTarget.instanceId;
                        const { durability } = getEffectiveStats(bestTarget, humanPlayer);
                        if (durability - bestTarget.damage <= effect.amount) {
                            score += getUnitThreat(bestTarget, humanPlayer, aiPlayer); // Huge bonus for killing a threat
                        }
                    } else {
                        action = null;
                    }
                }
                 if (action) possiblePlays.push({ action, score, description: `Amplify ${card.name}` });
            }

            // C. Channel Play
            if (card.abilities?.channel && checkDiceCost({ ...card, dice_cost: card.abilities.channel.cost }, availableDice).canPay) {
                let score = 8; // Base value for cycling a card
                if (aiPlayer.hand.length <= 3) score += 10; // Much more valuable with a small hand
                possiblePlays.push({
                    action: { type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } },
                    score,
                    description: `Channel ${card.name}`
                });
            }
        }
        
        // 4. Decide Best Action
        if (possiblePlays.length > 0) {
            const bestPlay = possiblePlays.sort((a, b) => b.score - a.score)[0];
            // console.log("AI Best Play:", bestPlay.description, "Score:", bestPlay.score);
            if (bestPlay.score > 1) { // Threshold to prevent making terrible plays
               return bestPlay.action;
            }
        }

        // 5. If no card is playable, decide whether to roll or keep
        if (rollCount < 3) {
            const bestDiceToKeep = determineBestDiceToKeep(aiPlayer.hand, availableDice, aiPlayer, humanPlayer, turn);
            const unkeptGoodDie = bestDiceToKeep.find(d => !d.isKept);

            if (unkeptGoodDie) {
                return { type: 'TOGGLE_DIE_KEPT', payload: { id: unkeptGoodDie.id, keep: true } };
            }

            return { type: 'ROLL_DICE' };
        }
        
        // 6. No more rolls, end the phase
        return { type: 'ADVANCE_PHASE' };
    }

    if (phase === TurnPhase.DRAW) {
        return { type: 'ADVANCE_PHASE' };
    }

    if (phase === TurnPhase.ASSAULT) {
        const attackingUnits = aiPlayer.units.filter(u => !u.abilities?.entrenched);
        if (attackingUnits.length === 0) {
            return { type: 'ADVANCE_PHASE', payload: { assault: false } };
        }
        
        const totalPotentialDamage = attackingUnits.reduce((sum, u) => sum + getEffectiveStats(u, aiPlayer, {isAssaultPhase: true}).strength, 0);
        
        // Always assault if it's lethal
        if (totalPotentialDamage >= humanPlayer.command) {
            return { type: 'ADVANCE_PHASE', payload: { assault: true } };
        }

        // Smarter logic for Breach keyword: don't expose valuable units for low damage
        const valuableBreachUnit = attackingUnits.find(u => u.abilities?.breach && getUnitThreat(u, aiPlayer, humanPlayer) > 8);
        if (valuableBreachUnit && totalPotentialDamage < 5) {
             // Don't expose a valuable unit for chip damage if the assault isn't game-changing
            return { type: 'ADVANCE_PHASE', payload: { assault: false } };
        }

        // Default to assaulting
        return { type: 'ADVANCE_PHASE', payload: { assault: true } };
    }

    if (phase === TurnPhase.END) {
        return { type: 'ADVANCE_PHASE' };
    }

    return null;
};