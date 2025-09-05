// FIX: Imported DiceCostType to resolve reference errors.
import { GameState, CardInGame, Die, TurnPhase, CardType, Player, DiceCostType, DiceCost, getEffectiveStats } from '../game/types';
import { checkDiceCost } from './useGameState';

type AIAction = 
    | { type: 'ROLL_DICE' }
    | { type: 'TOGGLE_DIE_KEPT', payload: { id: number, keep: boolean } }
    | { type: 'PLAY_CARD', payload: { card: CardInGame, targetInstanceId?: string, options?: { isChanneled?: boolean; isScavenged?: boolean; isAmplified?: boolean; } } }
    | { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: string } }
    | { type: 'ADVANCE_PHASE', payload?: { assault: boolean } };


// Finds the best card for the AI to try and play
const determineGoalCard = (hand: CardInGame[]): CardInGame | null => {
    if (hand.length === 0) return null;
    // Simple priority: Play highest command number Unit first, then other types.
    const sortedHand = [...hand].sort((a, b) => {
        if (a.type === CardType.UNIT && b.type !== CardType.UNIT) return -1;
        if (a.type !== CardType.UNIT && b.type === CardType.UNIT) return 1;
        
        const aScore = a.commandNumber - (a.keywords?.malice || 0);
        const bScore = b.commandNumber - (b.keywords?.malice || 0);

        return bScore - aScore;
    });
    return sortedHand[0];
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

// Determines which dice are the most valuable to keep for a given goal card by looking at all its costs
const findBestDiceToKeep = (goalCard: CardInGame, dice: Die[]): Die[] => {
    if (!goalCard.cost || goalCard.cost.length === 0) return [];
    
    const allValuableDice = goalCard.cost.flatMap(cost => findValuableDiceForCost(cost, dice));
    
    // Return unique dice based on ID
    return Array.from(new Map(allValuableDice.map(d => [d.id, d])).values());
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
            .filter(c => c.keywords?.scavenge && checkDiceCost({ cost: c.keywords.scavenge.cost }, availableDice).canPay)
            .sort((a,b) => b.commandNumber - a.commandNumber); // Prioritize higher value units
        
        if (scavengeableCards.length > 0) {
            return { type: 'PLAY_CARD', payload: { card: scavengeableCards[0], options: { isScavenged: true } } };
        }

        // 0. Check for activations
        const activatableCards = [...aiPlayer.artifacts, ...aiPlayer.units, ...aiPlayer.locations].filter(c => c.keywords?.activate);
        for (const card of activatableCards) {
            const activationCost = card.keywords.activate.cost;
            if (checkDiceCost({ cost: activationCost }, availableDice).canPay) {
                // Activate Repulsor Field defensively
                if (card.keywords.activate.effect === 'fortify_command') {
                    return { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId }};
                }
                 // Activate Dice Calibrator if it might help and there's a die to improve
                if (card.keywords.activate.effect === 'spike' && availableDice.some(d => d.value < 6)) {
                    return { type: 'ACTIVATE_ABILITY', payload: { cardInstanceId: card.instanceId }};
                }
            }
        }

        // 0.5 Check for high-value amplify plays
        for (const card of aiPlayer.hand) {
            if (card.keywords?.amplify) {
                const combinedCost = { cost: card.cost.concat(card.keywords.amplify.cost) };
                if (checkDiceCost(combinedCost, availableDice).canPay) {
                    const validTargets = humanPlayer.units.filter(u => !u.keywords?.immutable && !u.keywords?.stealth && (!u.keywords?.breach || u.hasAssaulted));
                    if (card.keywords.amplify.effect.type === 'DEAL_DAMAGE' && validTargets.length > 0) {
                        const amplifiedDamage = card.keywords.amplify.effect.amount;
                        const lethalTargets = validTargets.filter(t => getEffectiveStats(t, humanPlayer).durability - t.damage <= amplifiedDamage);
                        if (lethalTargets.length > 0) {
                            const bestTarget = [...lethalTargets].sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
                            return { type: 'PLAY_CARD', payload: { card, targetInstanceId: bestTarget.instanceId, options: { isAmplified: true } } };
                        }
                    }
                }
            }
        }


        // 1. Check if any card can be played with current dice
        for (const card of aiPlayer.hand) {
            // Check Channel first, as it's often a utility play
            if (card.keywords?.channel && checkDiceCost({ cost: card.keywords.channel.cost }, availableDice).canPay) {
                // If hand is small, prioritize drawing
                if (aiPlayer.hand.length <= 2) {
                     return { type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } };
                }
            }
        }
        
        const playableCards = aiPlayer.hand
            .filter(card => checkDiceCost(card, availableDice).canPay)
            .sort((a,b) => {
                 const getCardScore = (card: CardInGame): number => {
                    let score = 0;
                    // Keyword priorities
                    if (card.keywords?.warp) score += 20; // Extra turn is huge
                    if (card.keywords?.echo) score += 15; // Very high priority
                    if (card.keywords?.stagnate) score += 10;
                    if (card.keywords?.barrage) score += 5 + humanPlayer.units.length * 2; // Scales with targets
                    if (card.keywords?.executioner && (card.keywords.damage || card.keywords.snipe)) {
                        const damage = card.keywords.damage || card.keywords.snipe || 0;
                        const hasLethalTarget = humanPlayer.units.some(u => !u.keywords?.immutable && getEffectiveStats(u, humanPlayer).durability - u.damage <= damage);
                        if(hasLethalTarget) score += 12; // High priority if it can kill something
                        else score += 5;
                    }
                    if (card.keywords?.venomous && card.keywords?.snipe) score += 10; // Lethal removal
                    if (card.keywords?.immutable) score += 8; // Very durable
                    if (card.keywords?.recall && aiPlayer.units.some(u => u.damage > 0)) score += 8; // Good if we can save someone
                    if (card.keywords?.draw) score += 6;
                    if (card.keywords?.fateweave) score += 5;
                    if (card.keywords?.corrupt) score += 5;
                    if (card.keywords?.resonance) score += 5;
                    if (card.keywords?.purge && humanPlayer.graveyard.length > 2) score += 5;
                    if (card.keywords?.martyrdom) score += 4;
                    if (card.keywords?.amplify) score += 3;
                    if (card.keywords?.overload) score += Math.floor(aiPlayer.graveyard.length / (card.keywords.overload.per || 2)) * card.keywords.overload.amount; // More accurate scaling
                    if (card.keywords?.phasing) score += (getEffectiveStats(card, aiPlayer).strength) * 1.5;
                    if (card.keywords?.haunt) score += card.keywords.haunt;
                    if (card.keywords?.siphon) score += card.keywords.siphon * 2;


                    // Card Type priorities
                    if (card.type === CardType.UNIT) score += 5;
                    if (card.type === CardType.EVENT) score += 2;

                    // Base value
                    score += card.commandNumber;
                    
                    // Drawbacks
                    if (card.keywords?.malice) score -= card.keywords.malice * 2;
                    if (card.keywords?.decay) score -= 2;

                    return score;
                }
                return getCardScore(b) - getCardScore(a);
            });
        
        if (playableCards.length > 0) {
            for (const cardToPlay of playableCards) {
                const needsTarget = cardToPlay.keywords?.requiresTarget;
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
                    
                    const validTargets = humanPlayer.units.filter(u => !u.keywords?.immutable && !u.keywords?.stealth && (!u.keywords?.breach || u.hasAssaulted));
                    if (validTargets.length > 0) {
                        // Priority 0: Venomous Snipe on highest durability target
                        if (cardToPlay.keywords?.venomous && cardToPlay.keywords?.snipe) {
                             const target = [...validTargets].sort((a, b) => getEffectiveStats(b, humanPlayer).durability - getEffectiveStats(a, humanPlayer).durability)[0];
                             return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: target.instanceId } };
                        }
                        
                        // Priority 1: Voiding a high-strength unit
                        if (cardToPlay.keywords?.voidTarget) {
                            const target = [...validTargets].sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
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
                                .sort((a, b) => {
                                    // Prioritize higher threat (strength + fragile bonus) among lethal targets
                                    const threatA = (a.strength || 0) + (a.keywords?.fragile ? 3 : 0);
                                    const threatB = (b.strength || 0) + (b.keywords?.fragile ? 3 : 0);
                                    return threatB - threatA;
                                });

                            if (lethalTargets.length > 0) {
                                return { type: 'PLAY_CARD', payload: { card: cardToPlay, targetInstanceId: lethalTargets[0].instanceId } };
                            }
                        }

                        // Priority 3: Fallback to highest threat for debuffs or non-lethal damage
                        const target = [...validTargets].sort((a, b) => {
                            const threatA = (a.strength || 0) + (a.keywords?.fragile ? 3 : 0);
                            const threatB = (b.strength || 0) + (b.keywords?.fragile ? 3 : 0);
                            return threatB - threatA;
                        })[0];
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
            const goalCard = determineGoalCard(aiPlayer.hand);

            if (goalCard) {
                const bestDiceToKeep = findBestDiceToKeep(goalCard, availableDice);
                const unkeptGoodDie = bestDiceToKeep.find(d => !d.isKept);

                if (unkeptGoodDie) {
                    return { type: 'TOGGLE_DIE_KEPT', payload: { id: unkeptGoodDie.id, keep: true } };
                }
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
        const hasAttackingUnits = aiPlayer.units.some(u => !u.keywords?.entrenched);
        // Basic logic: always assault if possible.
        return { type: 'ADVANCE_PHASE', payload: { assault: hasAttackingUnits } };
    }

    if (phase === TurnPhase.END) {
        return { type: 'ADVANCE_PHASE' };
    }

    return null;
};