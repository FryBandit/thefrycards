

import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost, getEffectiveStats } from '../game/types';
import { checkDiceCost } from './useGameState';

type AIAction = 
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string } }
    | { type: 'ADVANCE_PHASE', payload?: { assault: boolean } };


// Assesses the threat level of a single unit on the board.
const getUnitThreat = (unit: CardInGame, owner: Player, opponent: Player): number => {
    let threat = 0;
    const { strength, durability } = getEffectiveStats(unit, owner);

    threat += strength; // Base threat is its damage potential
    if (strength > 4) threat += strength - 4; // High strength is extra threatening

    // Keyword threat assessment
    if (unit.keywords?.phasing) threat += strength * 2; // Unblockable damage is very high threat
    if (unit.keywords?.siphon) threat += unit.keywords.siphon * 3; // Life gain is a big swing
    if (unit.keywords?.immutable) threat += 10; // Very hard to remove
    if (unit.keywords?.overload) threat += Math.floor(owner.graveyard.length / (unit.keywords.overload.per || 1)) * unit.keywords.overload.amount;
    if (unit.keywords?.venomous) threat += 5 * Math.min(3, opponent.units.length); // More valuable if opponent has targets
    if (unit.keywords?.executioner) threat += 4 * Math.min(3, opponent.units.length);
    if (unit.keywords?.rally) threat += 3 * owner.units.length; // Buffs more of its own units
    if (unit.keywords?.haunt) threat += unit.keywords.haunt / 2;

    // Is it close to dying? Less of a threat if it can be easily removed in combat.
    if (durability > 0) {
      threat -= (unit.damage / durability) * 2;
    }
    
    return Math.max(0, threat);
}


const getCardScore = (card: CardInGame, aiPlayer: Player, humanPlayer: Player): number => {
    let score = 0;

    // Threat assessment of opponent's board
    const opponentUnits = humanPlayer.units;
    const opponentThreats = opponentUnits.map(u => ({ unit: u, threat: getUnitThreat(u, humanPlayer, aiPlayer) })).sort((a,b) => b.threat - a.threat);
    const highestThreat = opponentThreats.length > 0 ? opponentThreats[0].threat : 0;
    const highestThreatUnit = opponentThreats.length > 0 ? opponentThreats[0].unit : null;

    // --- SITUATIONAL SCORING based on threats ---
    if (card.keywords?.damage || card.keywords?.snipe) {
        const damage = card.keywords.damage || card.keywords.snipe || 0;
        if (highestThreatUnit && damage > 0) {
            score += highestThreat * 0.75; // Value for damaging a high threat target
            const { durability } = getEffectiveStats(highestThreatUnit, humanPlayer);
            if (durability - highestThreatUnit.damage <= damage) {
                score += highestThreat * 1.5; // Extra value for killing a high threat target
            }
        }
    }
    if (card.keywords?.voidTarget && highestThreatUnit && !highestThreatUnit.keywords?.immutable) {
        score += highestThreat * 2.5; // Voiding is premium removal
    }
    if (card.keywords?.corrupt && highestThreatUnit && !highestThreatUnit.keywords?.immutable) {
        score += Math.min(getEffectiveStats(highestThreatUnit, humanPlayer).strength, card.keywords.corrupt) * 2;
    }
    if (card.keywords?.barrage && opponentUnits.length > 0) {
        const potentialDamage = opponentUnits.reduce((acc, unit) => {
            if (unit.keywords?.immutable || (unit.keywords?.breach && !unit.hasAssaulted)) return acc;
            return acc + (card.keywords?.barrage || 0);
        }, 0);
        score += potentialDamage * 1.5;
    }


    // --- DISRUPTION ---
    if (card.keywords?.stagnate) {
        score += 15; // Increased priority
    }
    if (card.keywords?.discard) {
        score += card.keywords.discard * Math.min(humanPlayer.hand.length, 3); // More valuable if opponent has cards, capped to prevent over-valuing
    }
    if (card.keywords?.purge && humanPlayer.graveyard.length > 2) {
        score += Math.min(card.keywords.purge, humanPlayer.graveyard.length) * 2;
    }
    if (card.keywords?.sabotage) {
        score += 10;
    }


    // --- IMMEDIATE ADVANTAGE ---
    if (card.keywords?.annihilate) score += opponentUnits.length * 8; // Huge value
    if (card.keywords?.riftwalk) score += 8; // Good, but delayed
    if (card.keywords?.warp) score += 25; // Extra turn is huge
    if (card.keywords?.echo) score += 15; // Very high priority
    if (card.keywords?.draw) {
        score += (5 - Math.min(aiPlayer.hand.length, 4)) * card.keywords.draw * 2; // More valuable with fewer cards in hand
    }
    if (card.id === 15) { // System-Killer KAIJU
        score += opponentUnits.length * 5; // Board wipe value
    }

    // --- DEFENSIVE / UTILITY ---
    if (card.keywords?.fortify && aiPlayer.command < 12) score += 15; // High value when low on health
    if (card.keywords?.landmark && !aiPlayer.locations.some(l => l.keywords?.landmark)) score += 5;

    // --- GENERAL KEYWORD VALUE ---
    if (card.keywords?.executioner) score += 5;
    if (card.keywords?.venomous && card.keywords?.snipe) score += 10;
    if (card.keywords?.immutable) score += 8;
    if (card.keywords?.recall && aiPlayer.units.some(u => u.damage > 0)) score += 8;
    if (card.keywords?.fateweave) score += 5;
    if (card.keywords?.resonance) score += 5;
    if (card.keywords?.martyrdom) score += 4;
    if (card.keywords?.amplify) score += 3;
    if (card.keywords?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.keywords.overload.per || 2)) * card.keywords.overload.amount;
    if (card.keywords?.phasing) score += (getEffectiveStats(card, aiPlayer).strength) * 1.5;
    if (card.keywords?.haunt) score += card.keywords.haunt;
    if (card.keywords?.siphon) score += card.keywords.siphon * 2;
    if (card.keywords?.synergy) {
        const faction = card.keywords.synergy.faction;
        const synergyCount = [...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts]
            .filter(c => c.faction === faction)
            .length;
        score += synergyCount * 3;
    }


    // Card Type priorities
    if (card.type === CardType.UNIT) {
        score += 5;
        if (aiPlayer.units.length < 2) score += 5; // Encourage building a board early
    }
    if (card.type === CardType.EVENT) score += 2;

    // Base value
    score += card.commandNumber;
    
    // Drawbacks
    if (card.keywords?.malice) score -= card.keywords.malice * 2;
    if (card.keywords?.decay) score -= 2;
    if (card.keywords?.bounty) score -= card.keywords.bounty.amount * 2.5;
    if (card.keywords?.instability) score -= 8;


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
        case DiceCostType.EXACTLY_X:
            return diceByValue.get(cost.value!) || [];
            
        case DiceCostType.ANY_X_PLUS:
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

        case DiceCostType.STRAIGHT_3: {
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

        case DiceCostType.SUM_OF_X_PLUS:
            return [...availableDice].sort((a, b) => b.value - a.value).slice(0, cost.count);
        
        case DiceCostType.ANY_X_DICE:
             return [...availableDice].sort((a, b) => b.value - a.value).slice(0, cost.count);

        default:
            return [];
    }
}

// Determines which dice are the most valuable to keep by looking at the top potential plays
const determineBestDiceToKeep = (hand: CardInGame[], dice: Die[], aiPlayer: Player, humanPlayer: Player): Die[] => {
    if (hand.length === 0) return [];
    
    const sortedHand = [...hand]
        .sort((a, b) => getCardScore(b, aiPlayer, humanPlayer) - getCardScore(a, aiPlayer, humanPlayer));
    
    // Consider top 2 potential plays
    const topCards = sortedHand.slice(0, 2);
    if (topCards.length === 0) return [];

    const allValuableDice = new Map<number, Die>();
    const diceToConsider = dice.filter(d => !d.isSpent);

    // Find valuable dice for the primary goal card
    const primaryGoal = topCards[0];
    const primaryDice = primaryGoal.cost.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
    primaryDice.forEach(d => allValuableDice.set(d.id, d));
    
    // Aggregate valuable dice from a secondary goal card
    if (topCards.length > 1) {
        const secondaryGoal = topCards[1];
        const secondaryDice = secondaryGoal.cost.flatMap(cost => findValuableDiceForCost(cost, diceToConsider));
        secondaryDice.forEach(d => allValuableDice.set(d.id, d));
    }
    
    return Array.from(allValuableDice.values());
}

// Main function to decide the AI's next move
export const getAiAction = (state: GameState): AIAction | null => {
    if (state.currentPlayerId !== 1 || !state.isProcessing || state.winner) {
        return null;
    }
    
    const { phase, dice, rollCount, players } = state;
    const aiPlayer = players[1];
    const humanPlayer = players[0];
    const availableDice = dice.filter(d => !d.isSpent);

    if (phase === TurnPhase.ROLL_SPEND) {
        // -1. Check for scavenge plays
        const scavengeableCards = aiPlayer.graveyard
            .filter(c => c.keywords?.scavenge && checkDiceCost({ ...c, cost: c.keywords.scavenge.cost }, availableDice).canPay)
            .sort((a,b) => b.commandNumber - a.commandNumber); // Prioritize higher value units
        
        if (scavengeableCards.length > 0) {
            return { type: 'PLAY_CARD', payload: { card: scavengeableCards[0], options: { isScavenged: true } } };
        }

        // 0. Check for activations
        const activatableCards = [...aiPlayer.artifacts, ...aiPlayer.units, ...aiPlayer.locations].filter(c => c.keywords?.activate);
        for (const card of activatableCards) {
            const activationCost = card.keywords.activate.cost;
            if (checkDiceCost({ ...card, cost: activationCost }, availableDice).canPay) {
                const effect = card.keywords.activate.effect.type;
                 // Always reconstruct a valuable damaged unit
                if (effect === 'reconstruct' && card.type === CardType.UNIT && card.damage > 0 && (card.strength || 0) > 2) {
                    return { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId }};
                }
                // Activate Repulsor Field defensively if command is low
                if (effect === 'fortify_command' && aiPlayer.command < 10) {
                    return { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId }};
                }
                 // Activate Dice Calibrator if it might help and there's a die to improve
                if (effect === 'spike' && availableDice.some(d => d.value < 6)) {
                    return { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId }};
                }
            }
        }

        // 0.5 Check for high-value amplify plays
        for (const card of aiPlayer.hand) {
            if (card.keywords?.amplify) {
                const combinedCost = { ...card, cost: card.cost.concat(card.keywords.amplify.cost) };
                if (checkDiceCost(combinedCost, availableDice).canPay) {
                    const validTargets = humanPlayer.units.filter(u => !u.keywords?.immutable && !u.keywords?.stealth && (!u.keywords?.breach || u.hasAssaulted));
                    if (card.keywords.amplify.effect.type === 'DEAL_DAMAGE' && validTargets.length > 0) {
                        const amplifiedDamage = card.keywords.amplify.effect.amount;
                        const lethalTargets = validTargets.filter(t => getEffectiveStats(t, humanPlayer).durability - t.damage <= amplifiedDamage);
                        if (lethalTargets.length > 0) {
                            const bestTarget = [...lethalTargets].sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer))[0];
                            return { type: 'PLAY_CARD', payload: { card, targetInstanceId: bestTarget.instanceId, options: { isAmplified: true } } };
                        }
                    }
                }
            }
        }


        // 1. Check if any card can be played with current dice
        for (const card of aiPlayer.hand) {
            // Check Channel first, as it's often a utility play
            if (card.keywords?.channel && checkDiceCost({ ...card, cost: card.keywords.channel.cost }, availableDice).canPay) {
                // If hand is small, prioritize drawing
                if (aiPlayer.hand.length <= 2) {
                     return { type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } };
                }
            }
        }
        
        const playableCards = aiPlayer.hand
            .filter(card => checkDiceCost(card, availableDice).canPay)
            .sort((a,b) => getCardScore(b, aiPlayer, humanPlayer) - getCardScore(a, aiPlayer, humanPlayer));
        
        if (playableCards.length > 0) {
            for (const cardToPlay of playableCards) {
                const needsTarget = cardToPlay.keywords?.requiresTarget || cardToPlay.keywords?.augment;
                if (needsTarget) {
                    if (cardToPlay.keywords?.recall) {
                        const damagedUnits = aiPlayer.units
                            .filter(u => u.damage > 0)
                            .sort((a, b) => b.commandNumber - a.commandNumber);
                        if (damagedUnits.length > 0) {
                            return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: damagedUnits[0].instanceId } };
                        }
                        continue; // No good recall target, try next card
                    }

                    if (cardToPlay.keywords?.augment) {
                         const bestUnitToAugment = aiPlayer.units
                            .filter(u => !u.keywords?.immutable) // Don't augment already super-protected units
                            .sort((a,b) => getUnitThreat(b, aiPlayer, humanPlayer) - getUnitThreat(a, aiPlayer, humanPlayer))[0];
                         if (bestUnitToAugment) {
                             return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: bestUnitToAugment.instanceId }};
                         }
                         continue;
                    }
                    
                    const validTargets = humanPlayer.units.filter(u => !u.keywords?.immutable && !u.keywords?.stealth && (!u.keywords?.breach || u.hasAssaulted));
                    if (validTargets.length > 0) {
                        // Priority 0: Venomous Snipe on highest durability target
                        if (cardToPlay.keywords?.venomous && cardToPlay.keywords?.snipe) {
                             const target = [...validTargets].sort((a, b) => getEffectiveStats(b, humanPlayer).durability - getEffectiveStats(a, humanPlayer).durability)[0];
                             return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: target.instanceId } };
                        }
                        
                        // Priority 1: Voiding a high-threat unit
                        if (cardToPlay.keywords?.voidTarget) {
                            const target = [...validTargets].sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer))[0];
                            return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: target.instanceId } };
                        }

                        // Priority 2: Finishing off a unit with damage
                        const cardDamage = cardToPlay.keywords?.damage || cardToPlay.keywords?.snipe || 0;
                        if (cardDamage > 0) {
                            const lethalTargets = validTargets
                                .filter(t => {
                                    const finalDamage = cardDamage * (t.keywords?.fragile ? 2 : 1);
                                    return getEffectiveStats(t, humanPlayer).durability - t.damage <= finalDamage;
                                })
                                .sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer));

                            if (lethalTargets.length > 0) {
                                return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: lethalTargets[0].instanceId } };
                            }
                        }

                        // Priority 3: Fallback to highest threat for debuffs or non-lethal damage
                        const target = [...validTargets].sort((a, b) => getUnitThreat(b, humanPlayer, aiPlayer) - getUnitThreat(a, humanPlayer, aiPlayer))[0];
                        return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: target.instanceId } };
                    }
                    continue; // Can't play this card (no valid targets), try the next one
                }

                // For any other card that doesn't need a special check
                return { type: 'PLAY_CARD', payload: { card: cardToPlay } };
            }
        }

        // 2. If no card is playable, decide whether to roll or keep
        if (rollCount < 3) {
            const bestDiceToKeep = determineBestDiceToKeep(aiPlayer.hand, availableDice, aiPlayer, humanPlayer);
            const unkeptGoodDie = bestDiceToKeep.find(d => !d.isKept);

            if (unkeptGoodDie) {
                return { type: 'TOGGLE_DIE_KEPT', payload: { id: unkeptGoodDie.id, keep: true } };
            }

            return { type: 'ROLL_DICE' };
        }
        
        // 3. No more rolls, end the phase
        return { type: 'ADVANCE_PHASE' };
    }

    if (phase === TurnPhase.DRAW) {
        return { type: 'ADVANCE_PHASE' };
    }

    if (phase === TurnPhase.ASSAULT) {
        const attackingUnits = aiPlayer.units.filter(u => !u.keywords?.entrenched);
        if (attackingUnits.length === 0) {
            return { type: 'ADVANCE_PHASE', payload: { assault: false } };
        }
        
        const totalPotentialDamage = attackingUnits.reduce((sum, u) => sum + getEffectiveStats(u, aiPlayer, {isAssaultPhase: true}).strength, 0);
        
        // Always assault if it's lethal
        if (totalPotentialDamage >= humanPlayer.command) {
            return { type: 'ADVANCE_PHASE', payload: { assault: true } };
        }

        // Smarter logic for Breach keyword: don't expose valuable units for low damage
        const valuableBreachUnit = attackingUnits.find(u => u.keywords?.breach && getUnitThreat(u, aiPlayer, humanPlayer) > 8);
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
