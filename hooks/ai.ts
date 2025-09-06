
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
    let threat = 0;
    const { strength, durability } = getEffectiveStats(unit, owner);

    threat += strength; // Base threat is its damage potential
    if (strength > 4) threat += strength - 4; // High strength is extra threatening

    // Keyword threat assessment
    if (unit.abilities?.phasing) threat += strength * 2; // Unblockable damage is very high threat
    if (unit.abilities?.siphon) threat += unit.abilities.siphon * 3; // Life gain is a big swing
    if (unit.abilities?.immutable) threat += 10 + strength; // Very hard to remove
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


const getCardScore = (card: CardInGame, aiPlayer: Player, humanPlayer: Player, turn: number, target?: CardInGame | null): number => {
    let score = 0;

    // --- SITUATIONAL AWARENESS ---
    const isLowHealth = aiPlayer.command < 10;
    const opponentHasStrongBoard = humanPlayer.units.length > 2 || humanPlayer.units.some(u => getUnitThreat(u, humanPlayer, aiPlayer) > 8);

    // --- SITUATIONAL SCORING based on threats ---
    if(target) {
        const targetThreat = getUnitThreat(target, target.id === aiPlayer.id ? aiPlayer : humanPlayer, target.id === aiPlayer.id ? humanPlayer : aiPlayer);
        if (card.abilities?.damage || card.abilities?.snipe) {
            const damage = card.abilities.damage || card.abilities.snipe || 0;
            const { durability } = getEffectiveStats(target, humanPlayer);
            if (durability - target.damage <= damage) {
                score += targetThreat * 1.5; // Extra value for killing a high threat target
            } else {
                score += targetThreat * 0.75; // Value for damaging a high threat target
            }
        }
        if (card.abilities?.voidTarget) {
            score += targetThreat * 2.5; // Voiding is premium removal
        }
        if (card.abilities?.corrupt) {
            score += Math.min(getEffectiveStats(target, humanPlayer).strength, card.abilities.corrupt) * 2;
        }
    }
    
    if (card.abilities?.barrage && humanPlayer.units.length > 0) {
        const potentialDamage = humanPlayer.units.reduce((acc, unit) => {
            if (unit.abilities?.immutable || (unit.abilities?.breach && !unit.hasAssaulted)) return acc;
            return acc + (card.abilities?.barrage || 0);
        }, 0);
        if (humanPlayer.units.length < 2) {
             score += potentialDamage * 0.5; // Less value on small boards
        } else {
             score += potentialDamage * 2;
        }
        if (opponentHasStrongBoard) {
            score += potentialDamage * 1.5; // More valuable against established boards
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
        if (humanPlayer.units.length < 3 && aiPlayer.units.length > 0) {
            score = 1; // De-prioritize heavily on a small board
        } else if (opponentHasStrongBoard) {
            score += humanPlayer.units.length * 15; // HUGE value if opponent is winning on board
        } else {
            score += humanPlayer.units.length * 8;
        }
    }
    if (card.abilities?.riftwalk) score += 8; // Good, but delayed
    if (card.abilities?.warp) score += 25; // Extra turn is huge
    if (card.abilities?.echo) score += 15; // Very high priority
    if (card.abilities?.draw) {
        score += (5 - Math.min(aiPlayer.hand.length, 4)) * card.abilities.draw * 2; // More valuable with fewer cards in hand
    }
   
    // --- DEFENSIVE / UTILITY ---
    if (card.abilities?.fortify && isLowHealth) score += 20;
    if (card.type === CardType.UNIT && card.abilities?.shield && isLowHealth) score += 10;
    if (card.type === CardType.UNIT && card.abilities?.entrenched && isLowHealth) score += 8;
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
        if (aiPlayer.units.length < 2 && turn < 5) score += 8; // Strongly encourage building a board early
        const { strength, durability } = getEffectiveStats(card, aiPlayer);
        score += (strength + durability) * 0.5;
    }
    if (card.type === CardType.EVENT) score += 2;
    if (card.type === CardType.LOCATION || card.type === CardType.ARTIFACT) {
        if (turn < 4) {
            score += 8; // Prioritize setting up early
        }
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


// Main function to decide the AI's next move
export const getAiAction = (state: GameState): AIAction | null => {
    if (!state.isProcessing || state.winner) {
        return null;
    }

    // The AI can only act during its turn (currentPlayerId: 1) or during its specific mulligan phase.
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
        const possiblePlays: AIPossiblePlay[] = [];

        // 1. Evaluate Activations
        const activatableCards = [...aiPlayer.artifacts, ...aiPlayer.units, ...aiPlayer.locations].filter(c => c.abilities?.activate);
        for (const card of activatableCards) {
            if (card.abilities.consume && (card.counters ?? 0) <= 0) continue;
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
        const allPossibleTargets = [...aiPlayer.units, ...aiPlayer.locations, ...aiPlayer.artifacts, ...humanPlayer.units, ...humanPlayer.locations, ...humanPlayer.artifacts];
        for (const card of aiPlayer.hand) {
            // A. Standard Play
            if (checkDiceCost(card, availableDice).canPay) {
                if (card.abilities?.requiresTarget || card.abilities?.augment) {
                    for (const target of allPossibleTargets) {
                        const targetOwner = players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(c => c.instanceId === target.instanceId))!;
                        if (isCardTargetable(card, target, aiPlayer, targetOwner)) {
                            let score = getCardScore(card, aiPlayer, humanPlayer, turn, target);
                            possiblePlays.push({
                                action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId } },
                                score,
                                description: `Play ${card.name} targeting ${target.name}`
                            });
                        }
                    }
                } else {
                    let score = getCardScore(card, aiPlayer, humanPlayer, turn);
                    possiblePlays.push({ action: { type: 'PLAY_CARD', payload: { card } }, score, description: `Play ${card.name}` });
                }
            }

            // B. Amplify Play
            if (card.abilities?.amplify && checkDiceCost({ ...card, dice_cost: card.dice_cost.concat(card.abilities.amplify.cost) }, availableDice).canPay) {
                const amplifiedCard = JSON.parse(JSON.stringify(card));
                if (card.abilities.amplify.effect?.type === 'DEAL_DAMAGE') {
                    amplifiedCard.abilities.damage = card.abilities.amplify.effect.amount;
                    amplifiedCard.abilities.snipe = card.abilities.amplify.effect.amount;
                }
                const needsTarget = card.abilities.requiresTarget || card.abilities.amplify.effect?.type === 'DEAL_DAMAGE';

                if (needsTarget) {
                    for (const target of allPossibleTargets) {
                         const targetOwner = players.find(p => [...p.units, ...p.locations, ...p.artifacts].some(c => c.instanceId === target.instanceId))!;
                         if (isCardTargetable(amplifiedCard, target, aiPlayer, targetOwner)) {
                             let score = getCardScore(amplifiedCard, aiPlayer, humanPlayer, turn, target);
                             score += 2; // Small bonus for using a more powerful, flexible mode
                             possiblePlays.push({
                                 action: { type: 'PLAY_CARD', payload: { card, targetInstanceId: target.instanceId, options: { isAmplified: true } } },
                                 score,
                                 description: `Amplify ${card.name} on ${target.name}`
                             });
                         }
                    }
                } else {
                     let score = getCardScore(amplifiedCard, aiPlayer, humanPlayer, turn);
                     score += 2; // Small bonus for using a more powerful, flexible mode
                     possiblePlays.push({
                         action: { type: 'PLAY_CARD', payload: { card, options: { isAmplified: true } } },
                         score,
                         description: `Amplify ${card.name}`
                     });
                 }
            }
            
            // C. Channel Play
            if (card.abilities?.channel && checkDiceCost({ ...card, dice_cost: card.abilities.channel.cost }, availableDice).canPay) {
                 let score = 0;
                 if (card.abilities.channel.effect.type === 'DRAW') {
                    score = (5 - Math.min(aiPlayer.hand.length, 5)) * 2; // more valuable when hand is empty
                 }
                 if (score > 1) {
                     possiblePlays.push({
                         action: { type: 'PLAY_CARD', payload: { card, options: { isChanneled: true } } },
                         score,
                         description: `Channel ${card.name}`
                     });
                 }
            }
        }
        
        // --- DECISION MAKING ---
        if (possiblePlays.length > 0) {
            possiblePlays.sort((a, b) => b.score - a.score);
            console.log("AI Possible Plays:", possiblePlays.map(p => `${p.description} (Score: ${p.score.toFixed(1)})`).join(', '));
            return possiblePlays[0].action;
        }

        if (rollCount < state.maxRolls) {
            // The game rules only allow keeping dice after the first roll (rollCount > 0).
            // The AI must perform its first roll before deciding which dice to keep.
            if (rollCount > 0) {
                const diceToKeep = determineBestDiceToKeep(aiPlayer.hand, dice, aiPlayer, humanPlayer, turn);
                const diceToKeepIds = new Set(diceToKeep.map(d => d.id));

                for(const die of dice) {
                    if (die.isSpent) continue;
                    const shouldKeep = diceToKeepIds.has(die.id) || die.value >= 5; // General heuristic: keep high rolls
                    if (die.isKept !== shouldKeep) {
                        return { type: 'TOGGLE_DIE_KEPT', payload: { id: die.id, keep: shouldKeep } };
                    }
                }
            }
            
            // If it's the first roll, or all dice are set as desired, roll.
            return { type: 'ROLL_DICE' };
        }

        return { type: 'ADVANCE_PHASE' };
    }
    
    if (phase === TurnPhase.ASSAULT) {
        const humanThreats = humanPlayer.units.map(u => getUnitThreat(u, humanPlayer, aiPlayer));
        const aiThreats = aiPlayer.units.filter(u => !u.abilities?.entrenched).map(u => getUnitThreat(u, aiPlayer, humanPlayer));
        
        const totalHumanThreat = humanThreats.reduce((a, b) => a + b, 0);
        const totalAIAssaultThreat = aiThreats.reduce((a, b) => a + b, 0);
        
        // Simple logic: attack if it's a good trade or pushes for lethal.
        const shouldAssault = totalAIAssaultThreat > totalHumanThreat || humanPlayer.command <= totalAIAssaultThreat || aiPlayer.units.length > humanPlayer.units.length;
        
        return { type: 'ADVANCE_PHASE', payload: { assault: shouldAssault } };
    }

    if (phase === TurnPhase.DRAW || phase === TurnPhase.END || phase === TurnPhase.START) {
        return { type: 'ADVANCE_PHASE' };
    }

    return null;
}
