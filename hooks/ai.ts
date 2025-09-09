


import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost } from '../game/types';
import { getEffectiveStats, cardHasAbility } from '../game/utils';
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
type AIDifficulty = 'easy' | 'hard';
const aiConfig: { difficulty: AIDifficulty } = { 
    difficulty: 'hard' 
};
// ------------------------


// Assesses the threat level of a single unit on the board.
const getUnitThreat = (unit: CardInGame, owner: Player, opponent: Player): number => {
    const { durability, strength } = getEffectiveStats(unit, owner, { isStrikePhase: true });
    
    let threat = strength * 1.5 + durability * 0.5;

    // Keyword threat assessment
    if (unit.abilities?.phasing) threat += strength * 2.0;
    if (unit.abilities?.siphon) threat += (unit.abilities.siphon || 0) * 2.5;
    if (unit.abilities?.immutable) threat += 15;
    if (unit.abilities?.venomous) threat += 8;
    if (unit.abilities?.executioner) threat += 6;
    if (unit.abilities?.haunt) threat += (unit.abilities.haunt || 0);
    if (unit.abilities?.stealth || (unit.abilities?.breach && !unit.hasStruck)) threat += 4;
    if (unit.abilities?.shield && !unit.shieldUsedThisTurn) threat += 3;
    if (unit.abilities?.entrenched) threat += durability * 1.5;
    
    if (unit.abilities?.rally) {
        const otherRallyUnits = owner.units.filter(u => u.instanceId !== unit.instanceId && u.abilities?.rally).length;
        threat += (otherRallyUnits + 1) * 2;
    }
    
    if (unit.abilities?.fragile) threat *= 0.75;

    if (durability > 0 && unit.damage > 0) {
      threat *= (1 - (unit.damage / durability) * 0.75);
    }
    
    return Math.max(0, threat);
}


const getCardScore = (card: CardInGame, aiPlayer: Player, opponentPlayer: Player, turn: number, target?: CardInGame | null): number => {
    let score = 0;
    const isLowHealth = aiPlayer.morale < 10;
    const opponentBoardThreat = opponentPlayer.units.reduce((sum, u) => sum + getUnitThreat(u, opponentPlayer, aiPlayer), 0);
    const opponentHasStrongBoard = opponentBoardThreat > 10 || opponentPlayer.units.length > 2;

    if(target) {
        const targetIsOpponent = opponentPlayer.units.some(u => u.instanceId === target.instanceId);
        let targetThreat = getUnitThreat(target, targetIsOpponent ? opponentPlayer : aiPlayer, targetIsOpponent ? aiPlayer : opponentPlayer);
        if (target.abilities?.phasing) targetThreat *= 1.5;
        if (target.abilities?.siphon) targetThreat *= 1.3;
        
        if (card.abilities?.damage || card.abilities?.snipe) {
            let damage = card.abilities.damage || card.abilities.snipe || 0;
            const { durability } = getEffectiveStats(target, opponentPlayer);
            score += targetThreat * 1.2;
            if (durability - target.damage <= damage) {
                score += targetThreat * 1.5 + (target.abilities?.fragile ? 10 : 0);
            }
        }
        if (card.abilities?.banish) {
            score += targetThreat * 3.0; // Increased priority
        }
        if (card.abilities?.corrupt || card.abilities?.weaken) {
            const reduction = card.abilities.corrupt || card.abilities.weaken || 0;
            score += Math.min(getEffectiveStats(target, opponentPlayer).strength, reduction) * 2.5;
        }
        if (card.abilities?.recall && target.damage > 0) {
            score += 5 + getUnitThreat(target, aiPlayer, opponentPlayer) * 0.8;
        }
        if (card.abilities?.augment) {
            score += 8 + targetThreat * 0.5; // Augmenting a high-threat unit is good
        }
    }
    
    if (card.abilities?.barrage && opponentPlayer.units.length > 0) {
        const potentialDamage = opponentPlayer.units.reduce((acc, unit) => {
            if (unit.abilities?.immutable) return acc;
            return acc + (card.abilities?.barrage || 0);
        }, 0);
        score += potentialDamage * (opponentHasStrongBoard ? 2.5 : 1.5);
    }

    if (card.abilities?.exhaust) {
        // Exhaust is more valuable if the opponent has a large hand or few cards left in deck.
        const handValue = Math.max(0, opponentPlayer.hand.length - 2) * 2;
        const deckValue = opponentPlayer.deck.length < 5 ? 15 : 5;
        score += 15 + handValue + deckValue;
    }
    if (card.abilities?.discard) score += card.abilities.discard * Math.min(opponentPlayer.hand.length, 4) * 1.5;
    if (card.abilities?.purge && opponentPlayer.graveyard.length > 1) score += Math.min(card.abilities.purge, opponentPlayer.graveyard.length) * 2.5;
    if (card.abilities?.disrupt) score += 12;
    if (card.abilities?.obliterate) {
        const selfUnitsToObliterate = aiPlayer.units.filter(u => u.instanceId !== card.instanceId && !u.abilities?.immutable);
        const opponentUnitsToObliterate = opponentPlayer.units.filter(u => !u.abilities?.immutable);
        
        const selfHarm = selfUnitsToObliterate.length;
        const opponentHarm = opponentUnitsToObliterate.length;

        const moraleDamage = opponentUnitsToObliterate.reduce((sum, unit) => sum + (unit.moraleValue || 0), 0);

        let obliterateScore = (opponentHarm - selfHarm) * 15 + moraleDamage * 2;
        // It's a bad play if it hurts you more UNLESS the morale damage is a game-changer.
        if (opponentHarm <= selfHarm && moraleDamage < 10) { 
            obliterateScore = -20;
        }
        score += obliterateScore;
    }
    if (card.abilities?.vanish) score += 8;
    if (card.abilities?.warp) score += 30;
    if (card.abilities?.echo) score += 18;
    if (card.abilities?.draw) score += card.abilities.draw * (aiPlayer.hand.length < 7 ? 5 : 2.5);
    if (card.abilities?.gain_morale) score += card.abilities.gain_morale * 1.2;
    if (card.abilities?.fortify || (card.type === CardType.UNIT && (card.abilities?.shield || card.abilities?.entrenched))) {
        if (isLowHealth || opponentBoardThreat > 12) score += 15 + (opponentBoardThreat / 2);
    }
    if (card.abilities?.landmark && !aiPlayer.locations.some(l => l.abilities?.landmark)) score += 5;
    if (card.type === CardType.UNIT) {
        score += 5 + getUnitThreat(card, aiPlayer, opponentPlayer) * 0.5;
        if (aiPlayer.units.length < 2) {
            score += 10; // Prioritize board presence
        }
    }
    if (card.abilities?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.abilities.overload.per || 2)) * card.abilities.overload.amount * 1.2;
    if (card.abilities?.phasing) score += getEffectiveStats(card, aiPlayer).strength * 1.5;
    if (card.abilities?.synergy) {
         const cardSet = card.abilities.synergy.card_set;
         const synergyCount = [...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts]
                .filter(c => c.instanceId !== card.instanceId && c.card_set === cardSet)
                .length;
         if (synergyCount > 0) score += synergyCount * 3;
    }
    score += card.moraleValue ?? 0;
    if (card.abilities?.malice) score -= card.abilities.malice * 2.5;
    if (card.abilities?.bounty) score -= card.abilities.bounty.amount * 2.5;
    if (card.abilities?.instability) score -= 10;

    return score;
}

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
        return total + (cost.count || 0);
    }, 0);
};


// Determines which dice are the most valuable to keep by looking at the top potential plays
const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, opponentPlayer: Player, turn: number): Die[] => {
    if (hand.length === 0) return [];
    
    const diceToConsider = dice.filter(d => !d.isSpent);

    if (aiConfig.difficulty === 'easy') {
        const valuableDice = new Map<number, Die>();
        const diceByValue = new Map<number, Die[]>();
        for (const die of diceToConsider) {
            if (!diceByValue.has(die.value)) diceByValue.set(die.value, []);
            diceByValue.get(die.value)!.push(die);
        }
        // Keep any pairs, as they are harder to roll into.
        for (const group of diceByValue.values()) {
            if (group.length >= 2) {
                group.forEach(d => valuableDice.set(d.id, d));
            }
        }
        return Array.from(valuableDice.values());
    }
    
    // Hard AI: Analyze hand for best possible plays
    const sortedHand = [...hand]
        .sort((a, b) => getCardScore(b, aiPlayer, opponentPlayer, turn) - getCardScore(a, aiPlayer, opponentPlayer, turn));
    
    const topCards = sortedHand;
    if (topCards.length === 0) return [];

    const allValuableDice = new Map<number, Die>();

    // Find valuable dice for the top potential plays
    topCards.forEach(card => {
        const costToUse = card.abilities?.wild 
            ? card.dice_cost.map(c => c.type === DiceCostType.EXACT_VALUE ? { ...c, type: DiceCostType.ANY_X_DICE } : c)
            : card.dice_cost;
        const valuableDiceForCard = costToUse.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
        valuableDiceForCard.forEach(d => allValuableDice.set(d.id, d));
    });

    // Also prioritize keeping existing combinations (pairs, triples) as they are hard to roll
    const diceByValue = new Map<number, Die[]>();
    for (const die of diceToConsider) {
        if (!diceByValue.has(die.value)) diceByValue.set(die.value, []);
        diceByValue.get(die.value)!.push(die);
    }
    for (const group of diceByValue.values()) {
        if (group.length >= 2) {
            group.forEach(d => allValuableDice.set(d.id, d));
        }
    }
    
    return Array.from(allValuableDice.values());
}


export const getAiAction = (state: GameState, aiPlayerId: number): AIAction | null => {
    const { phase, dice, rollCount, players, turn, combatants, currentPlayerId } = state;
    
    const aiPlayer = players[aiPlayerId];
    const opponentPlayer = players[1 - aiPlayerId];
    
    const availableDice = dice.filter(d => !d.isSpent);

    if (phase === TurnPhase.AI_MULLIGAN) {
        const playerToDecide = players.find(p => !p.hasMulliganed);
        if (!playerToDecide) return { type: 'ADVANCE_PHASE' }; // Both have decided, advance state
        
        const hand = playerToDecide.hand;
        if (hand.length === 0) return { type: 'AI_MULLIGAN', payload: { mulligan: false } };

        const hasUnit = hand.some(c => c.type === CardType.UNIT);
        const costOfCards = hand.map(c => countDiceForCost(c.dice_cost));
        const avgCost = costOfCards.reduce((a, b) => a + b, 0) / (costOfCards.length || 1);
        const hasPlayableEarlyCard = costOfCards.some(c => c <= 2); // Playable with 1-2 dice
        const isBrickHand = avgCost > 3.5 && !hasPlayableEarlyCard;

        // Keep if: has a unit AND is not a brick hand.
        const shouldMulligan = !hasUnit || isBrickHand;
        
        return { type: 'AI_MULLIGAN', payload: { mulligan: shouldMulligan } };
    }
    
    if (phase === TurnPhase.BLOCK && currentPlayerId !== aiPlayerId) {
        const attackers = combatants!.map(c => opponentPlayer.units.find(u => u.instanceId === c.attackerId)!).filter(Boolean);
        let availableBlockers = aiPlayer.units.filter(u => !cardHasAbility(u, 'entrenched'));
        const assignments: { [blockerId: string]: string } = {};

        const unblockableAttackers = attackers.filter(a => cardHasAbility(a, 'phasing'));
        const blockableAttackers = attackers.filter(a => !cardHasAbility(a, 'phasing'));

        // Sort attackers by threat so we deal with the most dangerous ones first.
        blockableAttackers.sort((a, b) => getUnitThreat(b, opponentPlayer, aiPlayer) - getUnitThreat(a, opponentPlayer, aiPlayer));
        
        // --- Main Blocking Loop ---
        // For each attacker, find the best blocker.
        for (const attacker of blockableAttackers) {
            if (availableBlockers.length === 0) break;

            let bestBlocker: CardInGame | null = null;
            let bestScore = -1000; // Start with a very low score

            const attackerStats = getEffectiveStats(attacker, opponentPlayer, { isStrikePhase: true });

            for (const blocker of availableBlockers) {
                const blockerStats = getEffectiveStats(blocker, aiPlayer, { isStrikePhase: true });

                const attackerDies = blockerStats.strength >= attackerStats.durability - attacker.damage;
                const blockerDies = attackerStats.strength >= blockerStats.durability - blocker.damage;

                let currentScore = 0;
                const attackerThreat = getUnitThreat(attacker, opponentPlayer, aiPlayer);
                const blockerThreat = getUnitThreat(blocker, aiPlayer, opponentPlayer);

                // Base score on threat exchange
                if (attackerDies && !blockerDies) { // Favorable trade: kill without dying
                    currentScore = attackerThreat * 1.5;
                } else if (attackerDies && blockerDies) { // Mutual destruction (trade)
                    currentScore = attackerThreat - blockerThreat;
                } else if (!attackerDies && blockerDies) { // Unfavorable trade: die without killing
                    currentScore = -blockerThreat * 1.5;
                } else { // Both survive (chump block)
                    currentScore = -1; // Slightly negative to discourage chump blocking unless necessary
                }

                // Adjust score based on keywords
                if (blocker.abilities?.venomous && !attacker.abilities?.immutable) {
                    if (attackerStats.strength > 0 && !blocker.shieldUsedThisTurn) {
                        currentScore = Math.max(currentScore, attackerThreat - blockerThreat / 2);
                    }
                }
                if (blocker.abilities?.shield && !blocker.shieldUsedThisTurn) {
                    currentScore += 8;
                }
                if(blockerThreat > 15 && !attackerDies) { // Avoid blocking with a high-value unit if it won't kill the attacker
                    currentScore -= 10;
                }
                if(attackerDies && (attacker.abilities?.siphon || attacker.abilities?.venomous || attacker.abilities?.executioner)) {
                    currentScore += 10; // Prioritize killing units with dangerous abilities
                }

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestBlocker = blocker;
                }
            }
            
            const blockThreshold = aiConfig.difficulty === 'easy' ? -5 : -1;
            if (bestBlocker && bestScore > blockThreshold) {
                assignments[bestBlocker.instanceId] = attacker.instanceId;
                availableBlockers = availableBlockers.filter(b => b.instanceId !== bestBlocker!.instanceId);
            }
        }
        
        // --- Lethal Damage Check ---
        const unblockedDamageFromUnblockable = unblockableAttackers.reduce((sum, a) => sum + getEffectiveStats(a, opponentPlayer, { isStrikePhase: true }).strength, 0);
        const remainingBlockableAttackers = blockableAttackers.filter(a => !Object.values(assignments).includes(a.instanceId));
        const unblockedDamageFromBlockable = remainingBlockableAttackers.reduce((sum, a) => sum + getEffectiveStats(a, opponentPlayer, { isStrikePhase: true }).strength, 0);
        let totalIncomingDamage = unblockedDamageFromUnblockable + unblockedDamageFromBlockable;

        if (totalIncomingDamage >= aiPlayer.morale && availableBlockers.length > 0) {
            // We're facing lethal, must block as much as possible, even with bad trades.
            remainingBlockableAttackers.sort((a, b) => getEffectiveStats(b, opponentPlayer, { isStrikePhase: true }).strength - getEffectiveStats(a, opponentPlayer, { isStrikePhase: true }).strength);
            for (const attacker of remainingBlockableAttackers) {
                if (availableBlockers.length === 0) break;
                // Sacrifice lowest threat unit to block highest threat attacker
                availableBlockers.sort((a,b) => getUnitThreat(a, aiPlayer, opponentPlayer) - getUnitThreat(b, aiPlayer, opponentPlayer));
                const blockerToSacrifice = availableBlockers.shift()!;
                if (!assignments[blockerToSacrifice.instanceId]) {
                    assignments[blockerToSacrifice.instanceId] = attacker.instanceId;
                }
            }
        }
        
        return { type: 'DECLARE_BLOCKS', payload: { assignments } };
    }

    if (currentPlayerId !== aiPlayerId) return null; // Not this AI's turn to act
    if (phase === TurnPhase.BLOCK) return null; // Attacker is waiting

    if (phase === TurnPhase.ROLL_SPEND) {
        // Before the first roll of the turn, always roll.
        if (rollCount === 0) {
            return { type: 'ROLL_DICE' };
        }

        const possiblePlays: AIPossiblePlay[] = [];
        
        [...aiPlayer.artifacts, ...aiPlayer.units].forEach(card => {
            const canActivate = (card.type === CardType.ARTIFACT) || (card.turnPlayed < turn || cardHasAbility(card, 'charge'));
            if (canActivate && card.abilities?.activate && (!card.abilities.consume || (card.counters ?? 0) > 0) && checkDiceCost({ ...card, dice_cost: card.abilities.activate.cost }, availableDice).canPay) {
                possiblePlays.push({ action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } }, score: 10, description: `Activate ${card.name}` });
            }
        });
        
        aiPlayer.graveyard.forEach(card => {
            if (card.abilities?.reclaim && checkDiceCost({ ...card, dice_cost: card.abilities.reclaim.cost }, availableDice).canPay) {
                 possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, options: { isReclaimed: true } } }, score: getCardScore(card, aiPlayer, opponentPlayer, turn) * 0.9, description: `Reclaim ${card.name}`});
            }
        });
        
        aiPlayer.hand.forEach(card => {
            // Normal Play
            if (checkDiceCost(card, availableDice).canPay) {
                if (card.abilities?.requiresTarget) {
                    [...aiPlayer.units, ...opponentPlayer.units, ...aiPlayer.artifacts, ...opponentPlayer.artifacts].forEach(target => {
                        const targetOwner = players.find(p => [...p.units, ...p.artifacts, ...p.locations].some(u => u.instanceId === target.instanceId))!;
                        if (isCardTargetable(card, target, aiPlayer, targetOwner)) {
                             possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId } }, score: getCardScore(card, aiPlayer, opponentPlayer, turn, target), description: `Play ${card.name} on ${target.name}` });
                        }
                    });
                } else {
                    possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card } }, score: getCardScore(card, aiPlayer, opponentPlayer, turn), description: `Play ${card.name}` });
                }
            }

            // Amplify Play
            if (card.abilities?.amplify) {
                const combinedCost = { ...card, dice_cost: (card.dice_cost || []).concat(card.abilities.amplify.cost || []) };
                if (checkDiceCost(combinedCost, availableDice).canPay) {
                    const score = getCardScore(card, aiPlayer, opponentPlayer, turn) + 15; // Amplify is powerful
                    const amplifiedCard = { ...card, abilities: { ...card.abilities, requiresTarget: card.abilities.requiresTarget || card.abilities.amplify.requiresTarget } };
                    if (amplifiedCard.abilities.requiresTarget) {
                        [...aiPlayer.units, ...opponentPlayer.units, ...aiPlayer.artifacts, ...opponentPlayer.artifacts].forEach(target => {
                            const targetOwner = players.find(p => [...p.units, ...p.artifacts, ...p.locations].some(u => u.instanceId === target.instanceId))!;
                            if (isCardTargetable(amplifiedCard, target, aiPlayer, targetOwner)) {
                                possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAmplified: true } } }, score, description: `Amplify ${card.name} on ${target.name}` });
                            }
                        });
                    } else {
                        possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } }, score, description: `Amplify ${card.name}` });
                    }
                }
            }

            // Evoke Play
            if (card.abilities?.evoke && checkDiceCost({ ...card, dice_cost: card.abilities.evoke.cost }, availableDice).canPay) {
                let score = 5;
                const effect = card.abilities.evoke.effect;
                if (effect && effect.type === 'draw_card') {
                    score += (7 - aiPlayer.hand.length) * 2; // More valuable when hand is small
                }
                // Discourage evoking if better plays exist by comparing it to the card's base value
                score = Math.min(score, getCardScore(card, aiPlayer, opponentPlayer, turn) - 5);
                possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, options: { isEvoked: true } } }, score, description: `Evoke ${card.name}` });
            }

            // Augment Play
            if (card.abilities?.augment && checkDiceCost({ ...card, dice_cost: card.abilities.augment.cost }, availableDice).canPay) {
                aiPlayer.units.forEach(target => {
                     if (isCardTargetable(card, target, aiPlayer, aiPlayer)) {
                         possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAugmented: true } } }, score: getCardScore(card, aiPlayer, opponentPlayer, turn, target), description: `Augment ${target.name} with ${card.name}` });
                     }
                });
            }
        });
        
        if (possiblePlays.length > 0) {
            possiblePlays.sort((a, b) => b.score - a.score);
            const playThreshold = rollCount >= state.maxRolls ? 0.1 : 2.5;
            if (possiblePlays[0].score > playThreshold) return possiblePlays[0].action;
        }

        if (rollCount < state.maxRolls) {
            const diceToKeep = determineBestDiceToKeep(aiPlayer.hand, dice, aiPlayer, opponentPlayer, turn);
            const diceToKeepIds = new Set(diceToKeep.map(d => d.id));
            for(const die of dice) {
                if (!die.isSpent && die.isKept !== diceToKeepIds.has(die.id)) {
                    return { type: 'TOGGLE_DIE_KEPT', payload: { id: die.id, keep: diceToKeepIds.has(die.id) } };
                }
            }
            return { type: 'ROLL_DICE' };
        }

        return { type: 'ADVANCE_PHASE' };
    }
    
    if (phase === TurnPhase.STRIKE) {
        const unitsThatCanStrike = aiPlayer.units.filter(u => !cardHasAbility(u, 'entrenched') && (u.turnPlayed < turn || cardHasAbility(u, 'charge')));
        if (unitsThatCanStrike.length === 0) return { type: 'ADVANCE_PHASE', payload: { strike: false } };
        
        const totalAIStrikeThreat = unitsThatCanStrike.reduce((sum, unit) => sum + getEffectiveStats(unit, aiPlayer, { isStrikePhase: true }).strength, 0);
        if (totalAIStrikeThreat >= opponentPlayer.morale) return { type: 'ADVANCE_PHASE', payload: { strike: true } };
        
        const totalHumanBoardStrength = opponentPlayer.units.reduce((sum, u) => sum + getEffectiveStats(u, opponentPlayer).strength, 0);
        const shouldStrike = totalAIStrikeThreat > totalHumanBoardStrength || aiPlayer.units.length >= opponentPlayer.units.length + 1;
        
        return { type: 'ADVANCE_PHASE', payload: { strike: shouldStrike } };
    }

    if (phase === TurnPhase.DRAW || phase === TurnPhase.END || phase === TurnPhase.START) {
        return { type: 'ADVANCE_PHASE' };
    }

    // Failsafe action to prevent the AI from ever getting stuck.
    return { type: 'ADVANCE_PHASE' };
}
