
import { Die, DiceCost, DiceCostType, CardInGame, Player, CardType } from './types';

// Helper to shuffle arrays
export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Determines which dice are valuable to keep for a single given cost.
export const findValuableDiceForCost = (cost: DiceCost, dice: Die[]): Die[] => {
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
        
        case DiceCostType.ODD_DICE:
            return availableDice.filter(d => d.value % 2 === 1);
        case DiceCostType.EVEN_DICE:
            return availableDice.filter(d => d.value % 2 === 0);
        case DiceCostType.NO_DUPLICATES:
            // Any die could be part of a unique set, return them all sorted by value
            return [...availableDice].sort((a,b) => b.value - a.value);
        case DiceCostType.SUM_BETWEEN:
            // Similar to SUM_OF_X, keeping high dice is a good heuristic
            return [...availableDice].sort((a, b) => b.value - a.value).slice(0, cost.count);
        case DiceCostType.SPREAD:
            return availableDice.filter(d => d.value <= cost.lowValue! || d.value >= cost.highValue!);

        default:
            return [];
    }
}
// Shared game logic for calculating effective stats.
export const getEffectiveStats = (card: CardInGame, owner: Player, context: { isAssaultPhase?: boolean } = {}) => {
    if (card.type !== CardType.UNIT) {
        return { 
            strength: card.strength ?? 0, 
            durability: card.durability ?? 0,
            rallyBonus: 0,
        };
    }

    let strength = (card.strength ?? 0) + card.strengthModifier;
    let durability = (card.durability ?? 1) + card.durabilityModifier;
    
    // Overload keyword
    if (card.abilities?.overload) {
        const bonus = Math.floor(owner.graveyard.length / card.abilities.overload.per) * card.abilities.overload.amount;
        strength += bonus;
    }

    // Synergy keyword
    if (card.abilities?.synergy) {
        const faction = card.abilities.synergy.faction;
        const synergyCount = [...owner.units, ...owner.locations, ...owner.artifacts]
            .filter(c => c.instanceId !== card.instanceId && c.faction === faction)
            .length;
        if (synergyCount > 0) {
            const effect = card.abilities.synergy.effect;
            const totalBonus = synergyCount * effect.amount;
            if (effect.type === 'BUFF_STRENGTH') strength += totalBonus;
            if (effect.type === 'BUFF_DURABILITY') durability += totalBonus;
        }
    }

    // Augment keyword (from attachments)
    if (card.attachments && card.attachments.length > 0) {
        card.attachments.forEach(attachment => {
            if (attachment.abilities?.augment?.effect?.buffs) {
                attachment.abilities.augment.effect.buffs.forEach((buff: { type: string, amount: number }) => {
                    if (buff.type === 'STRENGTH') {
                        strength += buff.amount;
                    }
                    if (buff.type === 'DURABILITY') {
                        durability += buff.amount;
                    }
                });
            }
        });
    }

    // Buffs from player's other cards (Locations/Artifacts with passive buffs)
    owner.locations.forEach(loc => {
        if (loc.abilities?.passive_buff?.type === 'STRENGTH') {
            const buff = loc.abilities.passive_buff;
            // Faction-specific buff
            if (buff.faction) {
                if (card.faction === buff.faction) {
                    strength += buff.value;
                }
            } 
            // Global buff
            else {
                strength += buff.value;
            }
        }
    });
    owner.artifacts.forEach(art => {
        if (art.abilities?.passive_buff?.type === 'STRENGTH') {
            const buff = art.abilities.passive_buff;
            // Faction-specific buff
            if (buff.faction) {
                if (card.faction === buff.faction) {
                    strength += buff.value;
                }
            } 
            // Global buff
            else {
                strength += buff.value;
            }
        }
    });

    // Rally
    let rallyBonus = 0;
    if (card.abilities?.rally) {
        // A unit with Rally gets +1 strength for each OTHER friendly unit with Rally.
        const rallySources = owner.units.filter(u => u.abilities?.rally && u.instanceId !== card.instanceId).length;
        strength += rallySources;
        rallyBonus = rallySources;
    }

    // Assault phase specific buffs
    if (context.isAssaultPhase && card.abilities?.assault) {
        strength += card.abilities.assault;
    }
    return { strength, durability, rallyBonus };
};
