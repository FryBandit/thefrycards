

import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost } from '../game/types';
import { getEffectiveStats } from '../game/utils';
import { checkDiceCost, isCardTargetable } from './useGameState';
import { findValuableDiceForCost } from '../game/utils';

type AIAction = 
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isEvoked?: boolean; isReclaimed?: boolean; isAmplified?: boolean; isAugmented?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string } }
    | { type: 'AI_MULLIGAN', payload: { mulligan: boolean } }
    | { type: 'DECLARE_BLOCKS'; payload: { assignments: { [blockerId: string]: string } } }
    | { type: 'ADVANCE_PHASE', payload?: { strike: boolean } }
    | { type: 'AI_ACTION' };

type AIPossiblePlay = {
    action: AIAction;
    score: number;
    description: string;
};

// --- AI CONFIGURATION ---
// This can be exposed to a settings UI in the future to allow players to choose the difficulty.
type AIDifficulty = 'easy' | 'hard';
const aiConfig: { difficulty: AIDifficulty } = { 
    difficulty: 'hard' 
};
// ------------------------


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
    if (unit.abilities?.haunt) threat += unit.abilities.haunt; // Direct morale loss on death
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

    // Negative Keywords
    if (unit.abilities?.fragile) threat *= 0.75; // Less durable against events, so less of a stable threat.

    // A unit that's about to die is less of an immediate threat
    if (durability > 0 && unit.damage > 0) {
      threat *= (1 - (unit.damage / durability) * 0.75); // Reduce threat significantly if it's heavily damaged
    }
    
    return Math.max(0, threat);
}


const getCardScore = (card: CardInGame, aiPlayer: Player, humanPlayer: Player, turn: number, target?: CardInGame | null): number => {
    let score = 0;

    // --- SITUATIONAL AWARENESS ---
    const isLowHealth = aiPlayer.morale < 10;
    const opponentBoardThreat = humanPlayer.units.reduce((sum, u) => sum + getUnitThreat(u, humanPlayer, aiPlayer), 0);
    const opponentHasStrongBoard = opponentBoardThreat > 10 || humanPlayer.units.length > 2;

    // --- SITUATIONAL SCORING based on threats ---
    if(target) {
        const targetThreat = getUnitThreat(target, humanPlayer, aiPlayer);
        
        if (card.abilities?.damage || card.abilities?.snipe) {
            let damage = card.abilities.damage || card.abilities.snipe || 0;
            // Account for fragile
            if (target.abilities?.fragile) { // Fragile is now handled in dealDamageToUnit, but we can score it higher here.
                damage *= 1.5; // Not doubling, but valuing it more.
            }
            const { durability } = getEffectiveStats(target, humanPlayer);
            score += targetThreat * 1.2;
            if (durability - target.damage <= damage) {
                score += targetThreat * 1.5 + (target.abilities?.fragile ? 10 : 0); // Extra value for killing a high threat/fragile target
            }
        }
        if (card.abilities?.voidTarget) {
            score += targetThreat * 2.5; // Voiding is premium removal
        }
        if (card.abilities?.corrupt || card.abilities?.weaken) {
            const reduction = card.abilities.corrupt || card.abilities.weaken || 0;
            score += Math.min(getEffectiveStats(target, humanPlayer).strength, reduction) * 2.5;
        }
        if (card.abilities?.recall && target.damage > 0) {
            // Higher score for saving a valuable/damaged unit. Target here is friendly.
            score += 5 + getUnitThreat(target, aiPlayer, humanPlayer) * 0.8;
        }
        if (card.abilities?.augment) {
            // Augmenting a unit is a good tempo play. Target here is friendly.
            score += 8 + getUnitThreat(target, aiPlayer, humanPlayer) * 0.3;
        }
    }
    
    if (card.abilities?.barrage && humanPlayer.units.length > 0) {
        const potentialDamage = humanPlayer.units.reduce((acc, unit) => {
            if (unit.abilities?.immutable || (unit.abilities?.breach && !unit.hasStruck)) return acc;
            return acc + (card.abilities?.barrage || 0);
        }, 0);
        score += potentialDamage * (opponentHasStrongBoard ? 2.5 : 1.5);
    }


    // --- DISRUPTION ---
    if (card.abilities?.stagnate) score += 25;
    if (card.abilities?.discard) score += card.abilities.discard * Math.min(humanPlayer.hand.length, 4) * 1.5;
    if (card.abilities?.purge && humanPlayer.graveyard.length > 1) score += Math.min(card.abilities.purge, humanPlayer.graveyard.length) * 2.5;
    if (card.abilities?.disrupt) score += 12;


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
    if (card.abilities?.vanish) score += 8; // Good, but delayed
    if (card.abilities?.warp) score += 30; // Extra turn is huge
    if (card.abilities?.echo) score += 18; // Very high priority
    if (card.abilities?.draw) {
        // Base score for drawing cards is high.
        let drawScore = card.abilities.draw * 5;
        // Even if hand is full, drawing thins the deck and fuels the graveyard.
        if (aiPlayer.hand.length >= 7) {
            drawScore *= 0.5; // It's less good, but not worthless.
        }
        score += drawScore;
    }
    if (card.abilities?.gain_morale) {
        score += card.abilities.gain_morale * 1.2;
    }
   
    // --- DEFENSIVE / UTILITY ---
    if (card.abilities?.fortify || (card.type === CardType.UNIT && (card.abilities?.shield || card.abilities?.entrenched))) {
        if (isLowHealth || opponentBoardThreat > 12) {
            score += 15 + (opponentBoardThreat / 2);
        }
    }
    if (card.abilities?.landmark && !aiPlayer.locations.some(l => l.abilities?.landmark)) score += 5;

    // --- GENERAL KEYWORD VALUE ---
    if (card.abilities?.amplify) score += 5;
    if (card.abilities?.evoke) score += 4;
    if (card.abilities?.executioner) score += 5;
    if (card.abilities?.venomous && card.abilities?.snipe) score += 10;
    if (card.abilities?.immutable) score += 8;
    if (card.abilities?.prophecy || card.abilities?.fateweave) score += 5;
    if (card.abilities?.resonance) score += 5;
    if (card.abilities?.martyrdom) score += 4;
    if (card.abilities?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.abilities.overload.per || 2)) * card.abilities.overload.amount * 1.2;
    if (card.abilities?.phasing) score += (getEffectiveStats(card, aiPlayer).strength) * 1.5;
    if (card.abilities?.haunt) score += card.abilities.haunt;
    if (card.abilities?.siphon) score += card.abilities.siphon * 2;
    if (card.abilities?.synergy) {
        const cardSet = card.abilities.synergy.card_set;
        const synergyCountInPlay = [...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts]
            .filter(c => c.card_set === cardSet)
            .length;
        score += synergyCountInPlay * 3;
        
        const synergyCountInHand = aiPlayer.hand.filter(c => c.instanceId !== card.instanceId && c.card_set === cardSet).length;
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
    score += card.moraleValue ?? 0;
    
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
        if (cost.type === DiceCostType.SPREAD) return total + 2;
        // For EXACT_VALUE, SUM_OF_X, STRAIGHT, ANY_X, etc., use count property
        return total + (cost.count || 0);
    }, 0);
};


// Determines which dice are the most valuable to keep by looking at the top potential plays
const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, humanPlayer: Player, turn: number): Die[] => {
    if (hand.length === 0) return [];
    
    // Easy AI has a simpler, less optimal dice keeping strategy
    if (aiConfig.difficulty === 'easy') {
        const valuableDice = new Map<number, Die>();
        const diceToConsider = dice.filter(d => !d.isSpent);
        const diceByValue = new Map<number, Die[]>();
        for (const die of diceToConsider) {
            if (!diceByValue.has(die.value)) diceByValue.set(die.value, []);
            diceByValue.get(die.value)!.push(die);
        }
        // Keep high-value dice and any pairs.
        for (const group of diceByValue.values()) {
            if (group.length >= 2 || group[0].value >= 5) {
                group.forEach(d => valuableDice.set(d.id, d));
            }
        }
        return Array.from(valuableDice.values());
    }
    
    // Hard AI (original logic)
    const sortedHand = [...hand]
        .sort((a, b) => getCardScore(b, aiPlayer, humanPlayer, turn) - getCardScore(a, aiPlayer, humanPlayer, turn));
    
    const topCards = sortedHand.slice(0, 3);
    if (topCards.length === 0) return [];

    const allValuableDice = new Map<number, Die>();
    const diceToConsider = dice.filter(d => !d.isSpent);

    // Find valuable dice for the top potential plays
    topCards.forEach(card => {
        const costToUse = card.abilities?.wild 
            ? card.dice_cost.map(c => c.type === DiceCostType.EXACT_VALUE ? { ...c, type: DiceCostType.ANY_X_DICE } : c)
            : card.dice_cost;
        const valuableDiceForCard = costToUse.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
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

    const { phase, dice, rollCount, players, turn, combatants } = state;
    const aiPlayer = players[1];
    const humanPlayer = players[0];
    const availableDice = dice.filter(d => !d.isSpent);

    // --- Special Phase Handling ---
    // These phases require AI action even when it's not technically the AI's turn.
    // They must be checked before the currentPlayerId check to prevent the AI from stalling.
    if (phase === TurnPhase.AI_MULLIGAN) {
        const hand = aiPlayer.hand;
        if (hand.length === 0) return { type: 'AI_MULLIGAN', payload: { mulligan: false } }; // Should not happen

        const unitCount = hand.filter(c => c.type === CardType.UNIT).length;
        const curve = hand.map(c => countDiceForCost(c.dice_cost));
        const typeDiversity = new Set(hand.map(c => c.type)).size;

        const hasLowCurve = curve.some(c => c <= 2);
        const isBrickHand = curve.every(c => c >= 4);

        let score = 0;
        if (unitCount > 0) score += 4;
        if (hasLowCurve) score += 3;
        if (typeDiversity > 1) score += 2;
        if (unitCount > 1) score += 1;
        if (isBrickHand) score -= 5;
        if (unitCount === 0) score -= 5;
        
        // Add synergy scoring
        const cardSetsInHand = new Map<string, number>();
        let rallyCount = 0;
        hand.forEach(card => {
            if (card.card_set) {
                cardSetsInHand.set(card.card_set, (cardSetsInHand.get(card.card_set) || 0) + 1);
            }
            if (card.abilities?.rally) {
                rallyCount++;
            }
        });

        cardSetsInHand.forEach(count => {
            if (count > 1) {
                score += count * 2; // Reward for having multiple cards of the same card set
            }
        });

        if (rallyCount > 1) {
            score += rallyCount * 2.5; // Rally is a strong synergy
        }

        // Also check for powerful early game cards.
        const hasHighValueEarlyCard = hand.some(c => getCardScore(c, aiPlayer, humanPlayer, 1) > 20 && countDiceForCost(c.dice_cost) <= 2);
        if (hasHighValueEarlyCard) {
            score += 4;
        }

        const shouldMulligan = score < 7;

        console.log(`AI Mulligan Analysis: Score: ${score}. Decision: ${shouldMulligan ? 'Mulligan' : 'Keep'}`);
        return { type: 'AI_MULLIGAN', payload: { mulligan: shouldMulligan } };
    }
    
    // When the player attacks, the AI must declare blockers.
    if (phase === TurnPhase.BLOCK && state.currentPlayerId === 0) {
        const attackers = combatants!.map(c => humanPlayer.units.find(u => u.instanceId === c.attackerId)!);
        const availableBlockers = aiPlayer.units.filter(u => !u.abilities?.entrenched);

        const assignments: { [blockerId: string]: string } = {};

        // Prioritize blocking high-threat attackers
        attackers.sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer));
        
        for (const attacker of attackers) {
            if (!attacker) continue;
            let bestBlocker: CardInGame | null = null;
            let bestBlockerScore = -Infinity;

            for (const blocker of availableBlockers) {
                if (Object.keys(assignments).includes(blocker.instanceId)) continue;

                let score = 0;
                const { strength: attackerStrength } = getEffectiveStats(attacker, humanPlayer, { isStrikePhase: true });
                const { strength: blockerStrength, durability: blockerDurability } = getEffectiveStats(blocker, aiPlayer);

                // Favorable trade
                if (blockerStrength >= getEffectiveStats(attacker, humanPlayer).durability - attacker.damage && blockerDurability - blocker.damage > attackerStrength) {
                    score = 100 + getUnitThreat(attacker, humanPlayer, aiPlayer);
                }
                // Even trade
                else if (blockerStrength >= getEffectiveStats(attacker, humanPlayer).durability - attacker.damage) {
                    score = 50 + getUnitThreat(attacker, humanPlayer, aiPlayer) - getUnitThreat(blocker, aiPlayer, humanPlayer);
                }
                // Chump block
                else {
                    score = 10 + attackerStrength - getUnitThreat(blocker, aiPlayer, humanPlayer);
                }
                
                if (score > bestBlockerScore) {
                    bestBlocker = blocker;
                    bestBlockerScore = score;
                }
            }
            
            // Easy AI is more hesitant to block unless it's a great trade.
            const blockThreshold = aiConfig.difficulty === 'easy' ? 25 : 15;
            if (bestBlocker && bestBlockerScore > blockThreshold) {
                assignments[bestBlocker.instanceId] = attacker.instanceId;
            }
        }
        
        // Check if a block is required to prevent lethal damage.
        let unblockedDamage = 0;
        const assignedAttackers = new Set(Object.values(assignments));
        for (const attacker of attackers) {
            if (!assignedAttackers.has(attacker.instanceId)) {
                unblockedDamage += getEffectiveStats(attacker, humanPlayer, { isStrikePhase: true }).strength;
            }
        }

        if (unblockedDamage >= aiPlayer.morale) {
            const remainingBlockers = availableBlockers.filter(b => !Object.keys(assignments).includes(b.instanceId));
            const remainingAttackers = attackers.filter(a => !assignedAttackers.has(a.instanceId));
            remainingAttackers.sort((a,b) => getEffectiveStats(b, humanPlayer, {isStrikePhase: true}).strength - getEffectiveStats(a, humanPlayer, {isStrikePhase: true}).strength);
            
            // Assign remaining blockers to the strongest remaining attackers.
            for (const attacker of remainingAttackers) {
                if (remainingBlockers.length > 0) {
                    const blocker = remainingBlockers.pop()!;
                    assignments[blocker.instanceId] = attacker.instanceId;
                } else break;
            }
        }

        return { type: 'DECLARE_BLOCKS', payload: { assignments } };
    }

    // If it's not the AI's turn and not a special action phase, do nothing.
    if (state.currentPlayerId !== 1) {
        return null;
    }
    
    // --- AI's Turn Logic ---
    // From this point, currentPlayerId is guaranteed to be 1.

    // If AI is attacking and it's now the BLOCK phase, it must wait for the player.
    // Returning 'AI_ACTION' unlocks the UI for the player to declare blockers.
    if (phase === TurnPhase.BLOCK) {
        return { type: 'AI_ACTION' };
    }

    if (phase === TurnPhase.ROLL_SPEND) {
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
                if (effect === 'fortify_command' && aiPlayer.morale < 12) score = 18;
                if (effect === 'spike' && availableDice.some(d => d.value < 6)) score = 8;

                if (score > 0) {
                    const diceCount = countDiceForCost(cost);
                    const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                    possiblePlays.push({
                        action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } },
                        score: finalScore + 1,
                        description: `Activate ${card.name}`
                    });
                }
            }
        }
        
        // 2. Evaluate Reclaim
        aiPlayer.graveyard.filter(c => c.abilities?.reclaim).forEach(card => {
            const cost = card.abilities.reclaim.cost;
             if (checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                let score = getCardScore(card, aiPlayer, humanPlayer, turn) - 5;
                const diceCount = countDiceForCost(cost);
                const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                possiblePlays.push({
                    action: { type: 'PLAY_CARD', payload: { card, options: { isReclaimed: true } } },
                    score: finalScore + 1,
                    description: `Reclaim ${card.name}`
                });
             }
        });
        
        // 3. Evaluate Plays from Hand
        const allPossibleTargets: CardInGame[] = [
            ...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts,
            ...humanPlayer.units, ...humanPlayer.locations, ...humanPlayer.artifacts
        ];

        for (const card of aiPlayer.hand) {
            // A. Standard Play
            if (checkDiceCost(card, availableDice).canPay) {
                if (card.abilities?.requiresTarget) {
                    for (const target of allPossibleTargets) {
                        const targetOwner = players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(c => c.instanceId === target.instanceId))!;
                        if (isCardTargetable(card, target, aiPlayer, targetOwner)) {
                            let score = getCardScore(card, aiPlayer, humanPlayer, turn, target);
                            const diceCount = countDiceForCost(card.dice_cost);
                            const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                            possiblePlays.push({
                                action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId } },
                                score: finalScore + 1,
                                description: `Play ${card.name} targeting ${target.name}`
                            });
                        }
                    }
                } else {
                    let score = getCardScore(card, aiPlayer, humanPlayer, turn);
                    const diceCount = countDiceForCost(card.dice_cost);
                    const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                    possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card } }, score: finalScore + 1, description: `Play ${card.name}` });
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
                    const needsTarget = card.abilities.requiresTarget || card.abilities.amplify.effect?.type === 'DEAL_DAMAGE' || card.abilities.amplify.effect?.type === 'CORRUPT' || card.abilities.amplify.effect?.type === 'WEAKEN';

                    if (needsTarget) {
                        for (const target of allPossibleTargets) {
                             const targetOwner = players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(c => c.instanceId === target.instanceId))!;
                             if (isCardTargetable(amplifiedCard, target, aiPlayer, targetOwner)) {
                                 let score = getCardScore(amplifiedCard, aiPlayer, humanPlayer, turn, target) + 2;
                                 const diceCount = countDiceForCost(combinedCost);
                                 const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                                 possiblePlays.push({
                                     action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAmplified: true } } },
                                     score: finalScore + 1,
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
                             score: finalScore + 1,
                             description: `Amplify ${card.name}`
                         });
                     }
                }
            }
            
            // C. Evoke Play
            if (card.abilities?.evoke) {
                const cost = card.abilities.evoke.cost;
                if(checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                    let score = 0;
                    if (card.abilities.evoke.effect.type === 'DRAW') {
                         score = 4; // Base value for cycling a card
                        if (aiPlayer.hand.length < 5) {
                            score += 4; // More valuable if hand is not full
                        }
                    }
                    if (score > 1) {
                         const diceCount = countDiceForCost(cost);
                         const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                         possiblePlays.push({
                             action: { type: 'PLAY_CARD', payload: { card, options: { isEvoked: true } } },
                             score: finalScore + 1,
                             description: `Evoke ${card.name}`
                         });
                    }
                }
            }

            // D. Augment Play
            if (card.abilities?.augment) {
                const cost = card.abilities.augment.cost;
                if (checkDiceCost({ ...card, dice_cost: cost }, availableDice).canPay) {
                    for (const target of aiPlayer.units) {
                        let score = getCardScore(card, aiPlayer, humanPlayer, turn, target);
                        const diceCount = countDiceForCost(cost);
                        const finalScore = diceCount > 0 ? score / (diceCount * 0.8 + 0.2) : score * 1.2;
                        if (finalScore > 0) {
                            possiblePlays.push({
                                action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAugmented: true } } },
                                score: finalScore + 1,
                                description: `Augment ${target.name} with ${card.name}`
                            });
                        }
                    }
                }
            }
        }
        
        if (possiblePlays.length > 0) {
            possiblePlays.sort((a, b) => b.score - a.score);
            console.log("AI Possible Plays:", possiblePlays.map(p => `${p.description} (Score: ${p.score.toFixed(1)})`).join(', '));
            
            // On the last roll, be more willing to make a play.
            const isLastRoll = rollCount >= state.maxRolls;
            const playThreshold = isLastRoll ? 0.1 : (aiConfig.difficulty === 'easy' ? 8 : 3);
            
            if (possiblePlays[0].score > playThreshold) {
                return possiblePlays[0].action;
            }
        }

        if (rollCount < state.maxRolls) {
            if (rollCount > 0) {
                const diceToKeep = determineBestDiceToKeep(aiPlayer.hand, dice, aiPlayer, humanPlayer, turn);
                const diceToKeepIds = new Set(diceToKeep.map(d => d.id));

                for(const die of dice) {
                    if (die.isSpent) continue;
                    // On hard difficulty, also keep high-value dice even if not immediately useful.
                    const shouldKeep = diceToKeepIds.has(die.id) || (aiConfig.difficulty === 'hard' && die.value >= 5);
                    if (die.isKept !== shouldKeep) {
                        return { type: 'TOGGLE_DIE_KEPT', payload: { id: die.id, keep: shouldKeep } };
                    }
                }
            }
            
            return { type: 'ROLL_DICE' };
        }

        return { type: 'ADVANCE_PHASE' };
    }
    
    if (phase === TurnPhase.STRIKE) {
        const unitsThatCanStrike = aiPlayer.units.filter(u => !u.abilities?.entrenched);
        if (unitsThatCanStrike.length === 0) {
            return { type: 'ADVANCE_PHASE', payload: { strike: false } };
        }
    
        const totalAIStrikeThreat = unitsThatCanStrike.reduce((sum, unit) => {
            return sum + getEffectiveStats(unit, aiPlayer, { isStrikePhase: true }).strength;
        }, 0);
    
        // If attack is lethal, always take it.
        if (totalAIStrikeThreat >= humanPlayer.morale) {
            return { type: 'ADVANCE_PHASE', payload: { strike: true } };
        }
        
        const totalHumanBoardStrength = humanPlayer.units.reduce((sum, u) => sum + getEffectiveStats(u, humanPlayer).strength, 0);
        
        // Easy AI will only attack if it has a clear advantage.
        const strikeAdvantageMultiplier = aiConfig.difficulty === 'easy' ? 1.5 : 1.0;
        const shouldStrike = totalAIStrikeThreat > totalHumanBoardStrength * strikeAdvantageMultiplier || aiPlayer.units.length >= humanPlayer.units.length + 1;
        
        return { type: 'ADVANCE_PHASE', payload: { strike: shouldStrike } };
    }

    if (phase === TurnPhase.DRAW || phase === TurnPhase.END || phase === TurnPhase.START) {
        return { type: 'ADVANCE_PHASE' };
    }

    // Failsafe: If the AI's turn reaches this point, it's in an unhandled state.
    // Advance the phase to prevent a soft-lock, rather than returning null.
    console.warn(`AI action logic fell through to the end for phase: ${phase}. Advancing phase as a failsafe.`);
    return { type: 'ADVANCE_PHASE' };
}