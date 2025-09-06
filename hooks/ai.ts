

import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { checkDiceCost, isCardTargetable } from './useGameState';
import { findValuableDiceForCost } from '../game/utils';

type AIAction = 
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string } }
    | { type: 'AI_MULLIGAN', payload: { mulligan: boolean } }
    | { type: 'ADVANCE_PHASE', payload?: { assault: boolean } };

type AIPossiblePlay = {
    action: AIAction;
    score: number;
    description: string;
};

// Assesses the threat level of a single unit on the board.
const getUnitThreat = (unit: CardInGame, owner: Player, opponent: Player): number => {
    // Use effective stats to account for buffs like Rally, Overload, etc.
    const { strength, durability } = getEffectiveStats(unit, owner);
    
    // Base threat from stats. Strength is more valuable than durability for pressure.
    let threat = strength * 1.5 + durability * 0.5;

    // Keyword threat assessment
    if (unit.abilities?.phasing) threat += strength * 1.5; // Phasing damage is unpreventable, very high threat
    if (unit.abilities?.siphon) threat += unit.abilities.siphon * 2.5; // Life swing is powerful
    if (unit.abilities?.immutable) threat += 15; // Extremely hard to remove
    if (unit.abilities?.venomous) threat += 8; // Can kill anything it touches
    if (unit.abilities?.executioner) threat += 6;
    if (unit.abilities?.haunt) threat += unit.abilities.haunt; // Direct command loss on death
    if (unit.abilities?.stealth || unit.abilities?.breach) threat += 4; // Harder to interact with
    if (unit.abilities?.shield) threat += 3; // One-time protection is good
    if (unit.abilities?.entrenched) threat += durability * 1.5; // Defensive threat, values durability more.
    
    // Synergistic threat
    if (unit.abilities?.rally) {
        // A rally unit's threat increases with the number of other rally units it buffs
        const otherRallyUnits = owner.units.filter(u => u.instanceId !== unit.instanceId && u.abilities?.rally).length;
        threat += (otherRallyUnits + 1) * 2;
    }
    
    // Overload is already baked into effective strength via getEffectiveStats

    // A unit that's about to die is less of an immediate threat
    if (durability > 0 && unit.damage > 0) {
      threat *= (1 - (unit.damage / durability) * 0.75); // Reduce threat significantly if it's heavily damaged
    }
    
    return Math.max(0, threat);
}


const getCardScore = (card: CardInGame, aiPlayer: Player, humanPlayer: Player, turn: number, target?: CardInGame | null): number => {
    let score = 0;

    // --- SITUATIONAL AWARENESS ---
    const isLowHealth = aiPlayer.command < 10;
    const opponentBoardThreat = humanPlayer.units.reduce((sum, u) => sum + getUnitThreat(u, humanPlayer, aiPlayer), 0);
    const opponentHasStrongBoard = opponentBoardThreat > 10 || humanPlayer.units.length > 2;

    // --- SITUATIONAL SCORING based on threats ---
    if(target) {
        const targetThreat = getUnitThreat(target, humanPlayer, aiPlayer);
        if (card.abilities?.damage || card.abilities?.snipe) {
            const damage = card.abilities.damage || card.abilities.snipe || 0;
            const { durability } = getEffectiveStats(target, humanPlayer);
            score += targetThreat * 1.2;
            if (durability - target.damage <= damage) {
                score += targetThreat * 1.5; // Extra value for killing a high threat target
            }
        }
        if (card.abilities?.voidTarget) {
            score += targetThreat * 2.5; // Voiding is premium removal
        }
        if (card.abilities?.corrupt) {
            score += Math.min(getEffectiveStats(target, humanPlayer).strength, card.abilities.corrupt) * 2.5;
        }
    }
    
    if (card.abilities?.barrage && humanPlayer.units.length > 0) {
        const potentialDamage = humanPlayer.units.reduce((acc, unit) => {
            if (unit.abilities?.immutable || (unit.abilities?.breach && !unit.hasAssaulted)) return acc;
            return acc + (card.abilities?.barrage || 0);
        }, 0);
        score += potentialDamage * (opponentHasStrongBoard ? 2.5 : 1.5);
    }


    // --- DISRUPTION ---
    if (card.abilities?.stagnate) score += 25;
    if (card.abilities?.discard) score += card.abilities.discard * Math.min(humanPlayer.hand.length, 4) * 1.5;
    if (card.abilities?.purge && humanPlayer.graveyard.length > 1) score += Math.min(card.abilities.purge, humanPlayer.graveyard.length) * 2.5;
    if (card.abilities?.sabotage) score += 12;


    // --- IMMEDIATE ADVANTAGE ---
    if (card.abilities?.annihilate) {
        const selfHarm = aiPlayer.units.filter(u => u.instanceId !== card.instanceId && !u.abilities?.immutable).length;
        const opponentHarm = humanPlayer.units.filter(u => !u.abilities?.immutable).length;
        if (opponentHarm > selfHarm) {
            score += (opponentHarm - selfHarm) * 15;
        } else {
            score = 1; // De-prioritize if it hurts us more
        }
    }
    if (card.abilities?.riftwalk) score += 8; // Good, but delayed
    if (card.abilities?.warp) score += 30; // Extra turn is huge
    if (card.abilities?.echo) score += 18; // Very high priority
    if (card.abilities?.draw) score += (6 - Math.min(aiPlayer.hand.length, 5)) * card.abilities.draw * 2;
   
    // --- DEFENSIVE / UTILITY ---
    if (card.abilities?.fortify || (card.type === CardType.UNIT && (card.abilities?.shield || card.abilities?.entrenched))) {
        if (isLowHealth || opponentBoardThreat > 12) {
            score += 15 + (opponentBoardThreat / 2);
        }
    }
    if (card.abilities?.landmark && !aiPlayer.locations.some(l => l.abilities?.landmark)) score += 5;

    // --- GENERAL KEYWORD VALUE ---
    if (card.abilities?.amplify) score += 5;
    if (card.abilities?.channel) score += 4;
    if (card.abilities?.executioner) score += 5;
    if (card.abilities?.venomous && card.abilities?.snipe) score += 10;
    if (card.abilities?.immutable) score += 8;
    if (card.abilities?.recall && aiPlayer.units.some(u => u.damage > 0)) score += 8;
    if (card.abilities?.fateweave) score += 5;
    if (card.abilities?.resonance) score += 5;
    if (card.abilities?.martyrdom) score += 4;
    if (card.abilities?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.abilities.overload.per || 2)) * card.abilities.overload.amount * 1.2;
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
        score += synergyCountInHand * 1.5;
    }


    // Card Type priorities
    if (card.type === CardType.UNIT) {
        score += 5;
        if (aiPlayer.units.length < 2 && turn < 5) score += 8;
        score += getUnitThreat(card, aiPlayer, humanPlayer) * 0.5; // Add a fraction of its own threat score
    }
    if (card.type === CardType.EVENT) score += 2;
    if (card.type === CardType.LOCATION || card.type === CardType.ARTIFACT) {
        if (turn < 4) score += 8;
    }

    // Base value
    score += card.commandNumber ?? 0;
    
    // Drawbacks
    if (card.abilities?.malice) score -= card.abilities.malice * 2;
    if (card.abilities?.decay) score -= 2;
    if (card.abilities?.bounty) score -= card.abilities.bounty.amount * 2.5;
    if (card.abilities?.instability) score -= 8;


    return score;
}

// Helper to count the number of dice a cost requires
const countDiceForCost = (costs: DiceCost[]): number => {
    if (!costs || costs.length === 0) return 0;
    return costs.reduce((total, cost) => {
        if (cost.type === DiceCostType.ANY_PAIR) return total + 2;
        if (cost.type === DiceCostType.THREE_OF_A_KIND) return total + 3;
        if (cost.type === DiceCostType.FOUR_OF_A_KIND) return total + 4;
        if (cost.type === DiceCostType.TWO_PAIR) return total + 4;
        if (cost.type === DiceCostType.FULL_HOUSE) return total + 5;
        if (cost.type === DiceCostType.MIN_VALUE) return total + 1;
        // For EXACT_VALUE, SUM_OF_X, STRAIGHT, ANY_X, use count property
        return total + (cost.count || 0);
    }, 0);
};


// Determines which dice are the most valuable to keep by looking at the top potential plays
const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, humanPlayer: Player, turn: number): Die[] => {
    if (hand.length === 0) return [];
    
    const sortedHand = [...hand]
        .sort((a, b) => getCardScore(b, aiPlayer, humanPlayer, turn) - getCardScore(a, aiPlayer, humanPlayer, turn));
    
    const topCards = sortedHand.slice(0, 3);
    if (topCards.length === 0) return [];

    const allValuableDice = new Map<number, Die>();
    const diceToConsider = dice.filter(d => !d.isSpent);

    // Find valuable dice for the top potential plays
    topCards.forEach(card => {
        const valuableDiceForCard = card.dice_cost.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
        valuableDiceForCard.forEach(d => allValuableDice.set(d.id, d));
    });

    // Prioritize keeping existing combinations (pairs, triples) as they are hard to roll
    const diceByValue = new Map<number, Die[]>();
    for (const die of diceToConsider) {
        if (!diceByValue.has(die.value)) {
            diceByValue.set(die.value, []);
        }
        diceByValue.get(die.value)!.push(die);
    }
    for (const group of diceByValue.values()) {
        if (group.length >= 2) {
            group.forEach(d => allValuableDice.set(d.id, d));
        }
    }
    
    return Array.from(allValuableDice.values());
}


// Main function to decide the AI's next move
export const getAiAction = (state: GameState): AIAction | null => {
    if (!state.isProcessing || state.winner) {
        return null;
    }

    if (state.phase !== TurnPhase.AI_MULLIGAN && state.currentPlayerId !== 1) {
        return null;
    }
    
    const { phase, dice, rollCount, players, turn } = state;
    const aiPlayer = players[1];
    const humanPlayer = players[0];
    const availableDice = dice.filter(d => !d.isSpent);

    if (phase === TurnPhase.AI_MULLIGAN) {
        const aiHand = aiPlayer.hand;
        const hasLowCost = aiHand.some(c => (c.commandNumber ?? 10) <= 3);
        const hasUnit = aiHand.some(c => c.type === CardType.UNIT);
        const shouldAiMulligan = !hasLowCost || !hasUnit;
        return { type: 'AI_MULLIGAN', payload: { mulligan: shouldAiMulligan } };
    }

    if (phase === TurnPhase.ROLL_SPEND) {
        // If no rolls have happened, the only valid action is to roll.
        if (rollCount === 0) {
            return { type: 'ROLL_DICE' };
        }

        const possiblePlays: AIPossiblePlay[] = [];

        // 1. Evaluate Activations
        const activatableCards = [...aiPlayer.artifacts, ...aiPlayer.units, ...aiPlayer.locations].filter(c => c.abilities?.activate);
        for (const card of activatableCards) {
            if (card.abilities.consume && (card.counters ?? 0) <= 0) continue;
            const cost = card.abilities.activate.cost;
            if (checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                const effect = card.abilities.activate.effect.type;
                let score = 0;
                if (effect === 'reconstruct' && card.type === CardType.UNIT && card.damage > 0) score = 15 + getUnitThreat(card, aiPlayer, humanPlayer);
                if (effect === 'fortify_command' && aiPlayer.command < 12) score = 18;
                if (effect === 'spike' && availableDice.some(d => d.value < 6)) score = 8;

                if (score > 0) {
                    const diceCount = countDiceForCost(cost);
                    const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                    possiblePlays.push({
                        action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } },
                        score: finalScore,
                        description: `Activate ${card.name}`
                    });
                }
            }
        }
        
        // 2. Evaluate Scavenge
        aiPlayer.graveyard.filter(c => c.abilities?.scavenge).forEach(card => {
            const cost = card.abilities.scavenge.cost;
             if (checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                let score = getCardScore(card, aiPlayer, humanPlayer, turn) - 5;
                const diceCount = countDiceForCost(cost);
                const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                possiblePlays.push({
                    action: { type: 'PLAY_CARD', payload: { card, options: { isScavenged: true } } },
                    score: finalScore,
                    description: `Scavenge ${card.name}`
                });
             }
        });
        
        // 3. Evaluate Plays from Hand
        const allPossibleTargets = [...aiPlayer.units, ...humanPlayer.units];
        for (const card of aiPlayer.hand) {
            // A. Standard Play
            if (checkDiceCost(card, availableDice).canPay) {
                if (card.abilities?.requiresTarget || card.abilities?.augment) {
                    for (const target of allPossibleTargets) {
                        const targetOwner = players.find(p => p.units.some(c => c.instanceId === target.instanceId))!;
                        if (isCardTargetable(card, target, aiPlayer, targetOwner)) {
                            let score = getCardScore(card, aiPlayer, humanPlayer, turn, target);
                            const diceCount = countDiceForCost(card.dice_cost);
                            const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                            possiblePlays.push({
                                action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId } },
                                score: finalScore,
                                description: `Play ${card.name} targeting ${target.name}`
                            });
                        }
                    }
                } else {
                    let score = getCardScore(card, aiPlayer, humanPlayer, turn);
                    const diceCount = countDiceForCost(card.dice_cost);
                    const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                    possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card } }, score: finalScore, description: `Play ${card.name}` });
                }
            }

            // B. Amplify Play
            if (card.abilities?.amplify) {
                const combinedCost = card.dice_cost.concat(card.abilities.amplify.cost);
                if (checkDiceCost({ ...card, dice_cost: combinedCost }, availableDice).canPay) {
                    const amplifiedCard = JSON.parse(JSON.stringify(card));
                    if (card.abilities.amplify.effect?.type === 'DEAL_DAMAGE') {
                        amplifiedCard.abilities.damage = card.abilities.amplify.effect.amount;
                        amplifiedCard.abilities.snipe = card.abilities.amplify.effect.amount;
                    }
                    const needsTarget = card.abilities.requiresTarget || card.abilities.amplify.effect?.type === 'DEAL_DAMAGE';

                    if (needsTarget) {
                        for (const target of allPossibleTargets) {
                             const targetOwner = players.find(p => p.units.some(c => c.instanceId === target.instanceId))!;
                             if (isCardTargetable(amplifiedCard, target, aiPlayer, targetOwner)) {
                                 let score = getCardScore(amplifiedCard, aiPlayer, humanPlayer, turn, target) + 2;
                                 const diceCount = countDiceForCost(combinedCost);
                                 const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                                 possiblePlays.push({
                                     action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAmplified: true } } },
                                     score: finalScore,
                                     description: `Amplify ${card.name} on ${target.name}`
                                 });
                             }
                        }
                    } else {
                         let score = getCardScore(amplifiedCard, aiPlayer, humanPlayer, turn) + 2;
                         const diceCount = countDiceForCost(combinedCost);
                         const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                         possiblePlays.push({
                             action: { type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } },
                             score: finalScore,
                             description: `Amplify ${card.name}`
                         });
                     }
                }
            }
            
            // C. Channel Play
            if (card.abilities?.channel) {
                const cost = card.abilities.channel.cost;
                if(checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                    let score = 0;
                    if (card.abilities.channel.effect.type === 'DRAW') score = (6 - Math.min(aiPlayer.hand.length, 5)) * 2.5;
                    if (score > 1) {
                         const diceCount = countDiceForCost(cost);
                         const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                         possiblePlays.push({
                             action: { type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } },
                             score: finalScore,
                             description: `Channel ${card.name}`
                         });
                    }
                }
            }
        }
        
        // --- DECISION MAKING ---
        if (possiblePlays.length > 0) {
            possiblePlays.sort((a, b) => b.score - a.score);
            console.log("AI Possible Plays:", possiblePlays.map(p => `${p.description} (Score: ${p.score.toFixed(1)})`).join(', '));
            if (possiblePlays[0].score > 3) { // Confidence threshold to act
                return possiblePlays[0].action;
            }
        }

        if (rollCount < state.maxRolls) {
            if (rollCount > 0) {
                const diceToKeep = determineBestDiceToKeep(aiPlayer.hand, dice, aiPlayer, humanPlayer, turn);
                const diceToKeepIds = new Set(diceToKeep.map(d => d.id));

                for(const die of dice) {
                    if (die.isSpent) continue;
                    const shouldKeep = diceToKeepIds.has(die.id) || die.value >= 5;
                    if (die.isKept !== shouldKeep) {
                        return { type: 'TOGGLE_DIE_KEPT', payload: { id: die.id, keep: shouldKeep } };
                    }
                }
            }
            
            return { type: 'ROLL_DICE' };
        }

        return { type: 'ADVANCE_PHASE' };
    }
    
    if (phase === TurnPhase.ASSAULT) {
        const unitsThatCanAssault = aiPlayer.units.filter(u => !u.abilities?.entrenched);
        if (unitsThatCanAssault.length === 0) {
            return { type: 'ADVANCE_PHASE', payload: { assault: false } };
        }

        const totalPotentialDamage = unitsThatCanAssault.reduce((sum, unit) => {
            return sum + getEffectiveStats(unit, aiPlayer, { isAssaultPhase: true }).strength;
        }, 0);

        if (totalPotentialDamage >= humanPlayer.command) {
            return { type: 'ADVANCE_PHASE', payload: { assault: true } };
        }

        const breachUnit = unitsThatCanAssault.find(u => u.abilities?.breach && !u.hasAssaulted);
        if (breachUnit && humanPlayer.hand.length >= 3) {
            const breachUnitThreat = getUnitThreat(breachUnit, aiPlayer, humanPlayer);
            if (breachUnitThreat > 12 && aiPlayer.command <= humanPlayer.command) {
                 return { type: 'ADVANCE_PHASE', payload: { assault: false } }; // Play defensively to protect high-value unit
            }
        }

        const humanThreats = humanPlayer.units.map(u => getUnitThreat(u, humanPlayer, aiPlayer));
        const aiThreats = aiPlayer.units.filter(u => !u.abilities?.entrenched).map(u => getUnitThreat(u, aiPlayer, humanPlayer));
        const totalHumanThreat = humanThreats.reduce((a, b) => a + b, 0);
        const totalAIAssaultThreat = aiThreats.reduce((a, b) => a + b, 0);
        
        const shouldAssault = totalAIAssaultThreat > totalHumanThreat || humanPlayer.command <= 10 || aiPlayer.units.length > humanPlayer.units.length;
        
        return { type: 'ADVANCE_PHASE', payload: { assault: shouldAssault } };
    }

    if (phase === TurnPhase.DRAW || phase === TurnPhase.END || phase === TurnPhase.START) {
        return { type: 'ADVANCE_PHASE' };
    }

    return null;
}