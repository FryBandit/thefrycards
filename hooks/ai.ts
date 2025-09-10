import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost } from '../game/types';
import { getEffectiveStats, cardHasAbility } from '../game/utils';
import { checkDiceCost, isCardTargetable } from './useGameState';
import { findValuableDiceForCost } from '../game/utils';

type AIAction =
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isEvoked?: boolean; isReclaimed?: boolean; isAmplified?: boolean; isAugmented?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string, targetInstanceId?: string } }
    | { type: 'MULLIGAN_CHOICE', payload: { mulligan: boolean, playerId: number } }
    | { type: 'DECLARE_BLOCKS'; payload: { assignments: { [blockerId: string]: string } } }
    | { type: 'ADVANCE_PHASE', payload?: { strike: boolean } }
    | { type: 'AI_ACTION' };

type AIPossiblePlay = {
    action: AIAction;
    score: number;
    description: string;
    diceCost: Die[];
    costDefinition: DiceCost[];
};

// --- AI CONFIGURATION ---
type AIDifficulty = 'easy' | 'hard';
const aiConfig: { difficulty: AIDifficulty } = {
    difficulty: 'hard'
};
// ------------------------

const getUnitThreat = (unit: CardInGame, owner: Player, opponent: Player): number => {
    const { durability, strength } = getEffectiveStats(unit, owner, { isStrikePhase: true });

    let threat = strength * 1.5 + durability;

    if (cardHasAbility(unit, 'phasing')) threat += strength * 2.0;
    if (cardHasAbility(unit, 'siphon')) threat += (unit.abilities.siphon || 0) * 2.5;
    if (cardHasAbility(unit, 'immutable')) threat += 15;
    if (cardHasAbility(unit, 'venomous')) threat += 8;
    if (cardHasAbility(unit, 'executioner')) threat += 6;
    if (cardHasAbility(unit, 'haunt')) threat += (unit.abilities.haunt || 0) * 1.5;
    if (cardHasAbility(unit, 'stealth') || (cardHasAbility(unit, 'breach') && !unit.hasStruck)) threat += 4;
    if (cardHasAbility(unit, 'shield') && !unit.shieldUsedThisTurn) threat += 3;
    if (cardHasAbility(unit, 'entrenched')) threat += durability * 1.5;
    if (cardHasAbility(unit, 'charge')) threat += 4;
    if (cardHasAbility(unit, 'rally')) threat += owner.units.filter(u => cardHasAbility(u, 'rally')).length * 2;
    if (cardHasAbility(unit, 'synergy')) threat += 5; // Base value for synergy potential

    if (cardHasAbility(unit, 'fragile')) threat *= 0.7;
    if (cardHasAbility(unit, 'decay')) threat *= 0.8;

    if (durability > 0 && unit.damage > 0) {
      threat *= (1 - (unit.damage / durability) * 0.5);
    }

    return Math.max(0, threat);
}

const getCardScore = (card: CardInGame, gameState: GameState, aiPlayerId: number, target?: CardInGame | null): number => {
    const aiPlayer = gameState.players[aiPlayerId];
    const opponentPlayer = gameState.players[1 - aiPlayerId];

    let score = 0;
    const isLowHealth = aiPlayer.morale < 10;
    const opponentBoardThreat = opponentPlayer.units.reduce((sum, u) => sum + getUnitThreat(u, opponentPlayer, aiPlayer), 0);

    if (target) {
        const targetIsOpponent = opponentPlayer.units.some(u => u.instanceId === target.instanceId);
        const targetOwner = targetIsOpponent ? opponentPlayer : aiPlayer;
        const targetThreat = getUnitThreat(target, targetOwner, targetIsOpponent ? aiPlayer : opponentPlayer);

        if (card.abilities?.damage || card.abilities?.snipe) {
            let damage = (card.abilities.damage || card.abilities.snipe || 0);
            if (cardHasAbility(target, 'fragile')) damage *= 2;
            const { durability } = getEffectiveStats(target, targetOwner);
            const lethal = (durability - target.damage) <= damage;
            score += Math.min(damage, durability - target.damage) * 2.0 + targetThreat * 0.5;
            if (lethal) score += targetThreat * 1.5 + (target.moraleValue || 0);
        }
        if (card.abilities?.banish) score += targetThreat * 3.0 + (target.moraleValue || 0) * 1.5;
        if (card.abilities?.corrupt || card.abilities?.weaken) {
            const reduction = card.abilities.corrupt || card.abilities.weaken || 0;
            score += reduction * 2.5 + targetThreat * 0.5;
        }
        if (card.abilities?.recall && target.damage > 0) score += 5 + getUnitThreat(target, aiPlayer, opponentPlayer) * 0.8;
        if (card.abilities?.augment) score += 8 + targetThreat * 0.5;
    }

    if (card.abilities?.barrage && opponentPlayer.units.length > 0) score += opponentPlayer.units.reduce((acc, u) => acc + Math.min((card.abilities.barrage || 0), getEffectiveStats(u, opponentPlayer).durability - u.damage) * 2, 0);
    if (card.abilities?.exhaust) score += 15 + Math.max(0, opponentPlayer.hand.length - 2) * 2;
    if (card.abilities?.discard) score += (card.abilities.discard || 0) * Math.min(opponentPlayer.hand.length, 4) * 1.5;
    if (card.abilities?.purge && opponentPlayer.graveyard.length > 1) score += Math.min((card.abilities.purge || 0), opponentPlayer.graveyard.length) * 2.5;
    if (card.abilities?.disrupt) score += 12;
    if (card.abilities?.obliterate) {
        const selfHarm = aiPlayer.units.filter(u => !cardHasAbility(u, 'immutable')).reduce((sum, u) => sum + getUnitThreat(u, aiPlayer, opponentPlayer), 0);
        const opponentHarm = opponentPlayer.units.filter(u => !cardHasAbility(u, 'immutable')).reduce((sum, u) => sum + getUnitThreat(u, opponentPlayer, aiPlayer), 0);
        const moraleDamage = opponentPlayer.units.filter(u => !cardHasAbility(u, 'immutable')).reduce((sum, unit) => sum + (unit.moraleValue || 0), 0);
        score += (opponentHarm - selfHarm) * 1.2 + moraleDamage * 2;
    }
    if (card.abilities?.vanish) score += 8;
    if (card.abilities?.warp) score += 30;
    if (card.abilities?.echo) score += 18;
    if (card.abilities?.draw) score += (card.abilities.draw || 0) * (8 - aiPlayer.hand.length);
    if (card.abilities?.gain_morale) score += (card.abilities.gain_morale || 0) * (isLowHealth ? 2 : 1.2);
    if (card.abilities?.fortify || (card.type === CardType.UNIT && (cardHasAbility(card, 'shield') || cardHasAbility(card, 'entrenched')))) {
        if (isLowHealth || opponentBoardThreat > 12) score += 15 + (opponentBoardThreat / 2);
    }
    if (card.abilities?.landmark && !aiPlayer.locations.some(l => cardHasAbility(l, 'landmark'))) score += 5;
    if (card.type === CardType.UNIT) {
        score += 5 + getUnitThreat(card, aiPlayer, opponentPlayer) * 0.5;
        if (aiPlayer.units.length < 2) score += 10;
    }

    score += card.moraleValue ?? 0;
    if (card.abilities?.malice) score -= (card.abilities.malice || 0) * 2.5;
    if (card.abilities?.bounty) score -= (card.abilities.bounty.amount || 0) * 2.5;
    if (card.abilities?.instability) score -= 10;
    if (card.abilities?.fragile) score -= 5;

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

const evaluateHandForMulligan = (hand: CardInGame[]): boolean => {
    if (hand.length === 0) return false;
    let score = 0;
    const unitCount = hand.filter(c => c.type === CardType.UNIT).length;
    if (unitCount === 0) score -= 50;
    else if (unitCount === 1) score += 10;
    else score += 20;

    const costs = hand.map(c => countDiceForCost(c.dice_cost));
    const cheapCards = costs.filter(c => c <= 2).length;
    if (cheapCards === 0) score -= 30;
    else score += cheapCards * 15;
    
    const mulliganThreshold = 10;
    return score < mulliganThreshold;
}

const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, opponentPlayer: Player): Die[] => {
    const diceToConsider = dice.filter(d => !d.isSpent);
    
    const sortedHand = [...hand]
        .filter(c => countDiceForCost(c.dice_cost) <= diceToConsider.length)
        .sort((a, b) => getCardScore(b, {players: [aiPlayer, opponentPlayer]} as GameState, aiPlayer.id) - getCardScore(a, {players: [aiPlayer, opponentPlayer]} as GameState, aiPlayer.id));
    
    const allValuableDice = new Map<number, Die>();

    // Check top 2 cards in hand for potential plays
    for (const card of sortedHand.slice(0, 2)) {
        const costToUse = card.dice_cost || [];
        const valuableDiceForCard = costToUse.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
        valuableDiceForCard.forEach(d => allValuableDice.set(d.id, d));
    }

    // Always keep pairs, threes, etc. as they are flexible
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

const findBestPlay = (state: GameState, aiPlayerId: number): AIPossiblePlay | null => {
    const aiPlayer = state.players[aiPlayerId];
    const availableDice = state.dice.filter(d => !d.isSpent);
    const allPossibleTargets = [...state.players[0].units, ...state.players[1].units, ...state.players[0].artifacts, ...state.players[1].artifacts];

    const possiblePlays: AIPossiblePlay[] = [];

    // Activations
    [...aiPlayer.artifacts, ...aiPlayer.units].forEach(card => {
        const canActivate = (card.type === CardType.ARTIFACT) || (card.turnPlayed < state.turn || cardHasAbility(card, 'charge'));
        if (canActivate && card.abilities?.activate && (!card.abilities.consume || (card.counters ?? 0) > 0)) {
            const cost = card.abilities.activate.cost || [];
            const { canPay, diceToSpend } = checkDiceCost({ ...card, dice_cost: cost }, availableDice);
            if (canPay) {
                const ability = card.abilities.activate;
                const effectCard = { ...card, abilities: ability.effect, dice_cost: [] };

                if (ability.requiresTarget) {
                    allPossibleTargets.forEach(target => {
                        const targetOwner = state.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(u => u.instanceId === target.instanceId))!;
                        if (isCardTargetable(effectCard, target, aiPlayer, targetOwner)) {
                            possiblePlays.push({ action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId, targetInstanceId: target.instanceId } }, score: 10 + getCardScore(effectCard, state, aiPlayerId, target), description: `Activate ${card.name} on ${target.name}`, diceCost: diceToSpend, costDefinition: cost });
                        }
                    });
                } else {
                    possiblePlays.push({ action: { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId } }, score: 10 + getCardScore(effectCard, state, aiPlayerId), description: `Activate ${card.name}`, diceCost: diceToSpend, costDefinition: cost });
                }
            }
        }
    });

    // Cards from hand
    aiPlayer.hand.forEach(card => {
        const playTypes = [
            { type: 'play', cost: card.dice_cost, options: {}, scoreModifier: 0 },
            { type: 'amplify', cost: card.abilities?.amplify ? (card.dice_cost || []).concat(card.abilities.amplify.cost || []) : null, options: { isAmplified: true }, scoreModifier: 15 },
            { type: 'evoke', cost: card.abilities?.evoke?.cost, options: { isEvoked: true }, scoreModifier: 5 },
            { type: 'augment', cost: card.abilities?.augment?.cost, options: { isAugmented: true }, scoreModifier: 0 }
        ];

        for (const play of playTypes) {
            if (!play.cost) continue;
            const { canPay, diceToSpend } = checkDiceCost({ ...card, dice_cost: play.cost }, availableDice);
            if (canPay) {
                const cardForEval = { ...card, abilities: { ...card.abilities, ...(play.type === 'amplify' ? card.abilities.amplify.effect : {}) } };
                const requiresTarget = card.abilities.requiresTarget || (play.type === 'amplify' && card.abilities.amplify.requiresTarget) || play.type === 'augment';
                if (requiresTarget) {
                    const potentialTargets = play.type === 'augment' ? aiPlayer.units : allPossibleTargets;
                    potentialTargets.forEach(target => {
                        const targetOwner = state.players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(u => u.instanceId === target.instanceId))!;
                        if (isCardTargetable(cardForEval, target, aiPlayer, targetOwner)) {
                            possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: play.options } }, score: getCardScore(cardForEval, state, aiPlayerId, target) + play.scoreModifier, description: `${play.type} ${card.name} on ${target.name}`, diceCost: diceToSpend, costDefinition: play.cost });
                        }
                    });
                } else {
                    possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, options: play.options } }, score: getCardScore(cardForEval, state, aiPlayerId) + play.scoreModifier, description: `${play.type} ${card.name}`, diceCost: diceToSpend, costDefinition: play.cost });
                }
            }
        }
    });

    // Reclaim from graveyard
    aiPlayer.graveyard.forEach(card => {
        if (card.abilities?.reclaim) {
            const cost = card.abilities.reclaim.cost;
            const { canPay, diceToSpend } = checkDiceCost({ ...card, dice_cost: cost }, availableDice);
            if(canPay) {
                possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card, options: { isReclaimed: true } } }, score: getCardScore(card, state, aiPlayerId) * 0.9, description: `Reclaim ${card.name}`, diceCost: diceToSpend, costDefinition: cost });
            }
        }
    });

    if (possiblePlays.length === 0) return null;

    possiblePlays.sort((a, b) => b.score - a.score);
    return possiblePlays[0];
};

const evaluateStrike = (state: GameState, aiPlayerId: number): boolean => {
    const aiPlayer = state.players[aiPlayerId];
    const opponentPlayer = state.players[1 - aiPlayerId];

    const attackers = aiPlayer.units.filter(u => !cardHasAbility(u, 'entrenched') && (u.turnPlayed < state.turn || cardHasAbility(u, 'charge')));
    if (attackers.length === 0) return false;

    const availableBlockers = opponentPlayer.units.filter(u => !cardHasAbility(u, 'entrenched'));

    let unblockedDamage = 0;
    let favorableTrades = 0;
    let unfavorableTrades = 0;

    for (const attacker of attackers) {
        const attackerStats = getEffectiveStats(attacker, aiPlayer, { isStrikePhase: true });
        if (cardHasAbility(attacker, 'phasing') || availableBlockers.length === 0) {
            unblockedDamage += attackerStats.strength;
            continue;
        }

        const attackerThreat = getUnitThreat(attacker, aiPlayer, opponentPlayer);
        
        // Find best blocker for this attacker from opponent's perspective
        const bestBlocker = availableBlockers
            .map(blocker => {
                const blockerStats = getEffectiveStats(blocker, opponentPlayer, { isStrikePhase: true });
                const attackerDies = blockerStats.strength >= attackerStats.durability - attacker.damage;
                const blockerDies = attackerStats.strength >= blockerStats.durability - blocker.damage;
                const score = (attackerDies ? -attackerThreat : 0) + (blockerDies ? getUnitThreat(blocker, opponentPlayer, aiPlayer) : 0);
                return { blocker, score };
            })
            .sort((a, b) => b.score - a.score)[0];
        
        // If the best block is still bad for the opponent, they likely won't block
        if (!bestBlocker || bestBlocker.score < -5) {
            unblockedDamage += attackerStats.strength;
        } else {
            // Simulate the trade
            if (bestBlocker.score > 0) favorableTrades++; else unfavorableTrades++;
        }
    }

    if (unblockedDamage >= opponentPlayer.morale) return true; // Lethal

    const strikeScore = unblockedDamage * 1.5 + favorableTrades * 5 - unfavorableTrades * 3;
    const boardAdvantage = aiPlayer.units.length > opponentPlayer.units.length;
    const healthAdvantage = aiPlayer.morale > opponentPlayer.morale;

    if (boardAdvantage && healthAdvantage) return strikeScore > -5; // Be aggressive
    return strikeScore > 5; // Default: strike if it seems good
};

export const getAiAction = (state: GameState, aiPlayerId: number): AIAction | null => {
    const { phase, dice, rollCount, players, turn, combatants, currentPlayerId } = state;
    const aiPlayer = players[aiPlayerId];
    const opponentPlayer = players[1 - aiPlayerId];

    if (phase === TurnPhase.MULLIGAN) {
        const playerToDecide = players.find(p => !p.hasMulliganed);
        if (!playerToDecide || playerToDecide.id !== aiPlayerId) return null;
        return { type: 'MULLIGAN_CHOICE', payload: { mulligan: evaluateHandForMulligan(playerToDecide.hand), playerId: aiPlayerId } };
    }
    
    if (phase === TurnPhase.BLOCK && currentPlayerId !== aiPlayerId) {
        const attackers = combatants!.map(c => opponentPlayer.units.find(u => u.instanceId === c.attackerId)!).filter(Boolean);
        let availableBlockers = aiPlayer.units.filter(u => !cardHasAbility(u, 'entrenched'));
        const assignments: { [blockerId: string]: string } = {};

        attackers.sort((a, b) => getUnitThreat(b, opponentPlayer, aiPlayer) - getUnitThreat(a, opponentPlayer, aiPlayer));
        
        for (const attacker of attackers) {
            if (availableBlockers.length === 0) break;
            if (cardHasAbility(attacker, 'phasing')) continue;

            const attackerStats = getEffectiveStats(attacker, opponentPlayer, { isStrikePhase: true });
            const attackerThreat = getUnitThreat(attacker, opponentPlayer, aiPlayer);

            const bestBlockerChoice = availableBlockers.map(blocker => {
                const blockerStats = getEffectiveStats(blocker, aiPlayer, { isStrikePhase: true });
                const blockerThreat = getUnitThreat(blocker, aiPlayer, opponentPlayer);
                const attackerDies = blockerStats.strength >= attackerStats.durability - attacker.damage || cardHasAbility(blocker, 'venomous');
                const blockerDies = attackerStats.strength >= blockerStats.durability - blocker.damage || cardHasAbility(attacker, 'venomous');
                let score = 0;
                if (attackerDies) score += attackerThreat;
                if (blockerDies) score -= blockerThreat;
                return { blocker, score };
            }).sort((a, b) => b.score - a.score)[0];
            
            if (bestBlockerChoice && bestBlockerChoice.score > -2) {
                assignments[bestBlockerChoice.blocker.instanceId] = attacker.instanceId;
                availableBlockers = availableBlockers.filter(b => b.instanceId !== bestBlockerChoice.blocker.instanceId);
            }
        }
        
        let totalIncomingDamage = combatants!
            .filter(c => !Object.values(assignments).includes(c.attackerId))
            .reduce((sum, c) => {
                const attacker = opponentPlayer.units.find(u => u.instanceId === c.attackerId);
                return attacker ? sum + getEffectiveStats(attacker, opponentPlayer, { isStrikePhase: true }).strength : sum;
            }, 0);

        // Desperation blocks if lethal is coming
        if (totalIncomingDamage >= aiPlayer.morale && availableBlockers.length > 0) {
            const remainingAttackers = attackers.filter(a => !Object.values(assignments).includes(a.instanceId));
            remainingAttackers.sort((a, b) => getEffectiveStats(b, opponentPlayer, { isStrikePhase: true }).strength - getEffectiveStats(a, opponentPlayer, { isStrikePhase: true }).strength);
            for (const attacker of remainingAttackers) {
                if (availableBlockers.length === 0) break;
                const blockerToSacrifice = availableBlockers.shift()!;
                if (!assignments[blockerToSacrifice.instanceId]) {
                    assignments[blockerToSacrifice.instanceId] = attacker.instanceId;
                }
            }
        }
        
        return { type: 'DECLARE_BLOCKS', payload: { assignments } };
    }

    if (currentPlayerId !== aiPlayerId) return null;

    if (phase === TurnPhase.ROLL_SPEND) {
        if (rollCount === 0) return { type: 'ROLL_DICE' };

        const bestPlay = findBestPlay(state, aiPlayerId);
        const playThreshold = aiConfig.difficulty === 'hard' ? 8 : 4;

        if (rollCount < state.maxRolls) {
            if (bestPlay && bestPlay.score > playThreshold) {
                return bestPlay.action;
            }

            let diceToKeep = determineBestDiceToKeep(aiPlayer.hand, dice, aiPlayer, opponentPlayer);
            const availableDiceCount = dice.filter(d => !d.isSpent).length;
            
            // If AI wants to keep all dice but has no play, force it to re-roll the least valuable one.
            if (diceToKeep.length === availableDiceCount && !bestPlay && diceToKeep.length > 0) {
                // Create a mutable copy to sort and modify
                const sortedDiceToKeep = [...diceToKeep].sort((a,b) => a.value - b.value); 
                const leastValuableDieId = sortedDiceToKeep[0].id;
                diceToKeep = diceToKeep.filter(d => d.id !== leastValuableDieId);
            }
            
            const diceToKeepIds = new Set(diceToKeep.map(d => d.id));
            
            const dieToToggle = dice.find(d => !d.isSpent && d.isKept !== diceToKeepIds.has(d.id));

            if (dieToToggle) {
                return { type: 'TOGGLE_DIE_KEPT', payload: { id: dieToToggle.id, keep: diceToKeepIds.has(dieToToggle.id) } };
            }

            // If all dice are set correctly, and there are dice to roll, then roll.
            if (dice.some(d => !d.isSpent && !d.isKept)) {
                return { type: 'ROLL_DICE' };
            }
        }
        
        // After final roll (or if all dice are kept), take any decent play.
        if (bestPlay && bestPlay.score > 1) {
            return bestPlay.action;
        }
        
        return { type: 'ADVANCE_PHASE' };
    }
    
    if (phase === TurnPhase.STRIKE) {
        return { type: 'ADVANCE_PHASE', payload: { strike: evaluateStrike(state, aiPlayerId) } };
    }

    if (phase === TurnPhase.DRAW || phase === TurnPhase.END || phase === TurnPhase.START) {
        return { type: 'ADVANCE_PHASE' };
    }
    
    return null; // AI has no action for other phases, will be advanced by failsafe
}