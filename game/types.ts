
export enum CardType {
  UNIT = 'Unit',
  EVENT = 'Event',
  LOCATION = 'Location',
  ARTIFACT = 'Artifact',
}

export enum DiceCostType {
  EXACT_VALUE = 'EXACT_VALUE',
  MIN_VALUE = 'MIN_VALUE',
  ANY_PAIR = 'ANY_PAIR',
  SUM_OF_X_DICE = 'SUM_OF_X_DICE',
  THREE_OF_A_KIND = 'THREE_OF_A_KIND',
  FOUR_OF_A_KIND = 'FOUR_OF_A_KIND',
  STRAIGHT = 'STRAIGHT',
  ANY_X_DICE = 'ANY_X_DICE',
  TWO_PAIR = 'TWO_PAIR',
  FULL_HOUSE = 'FULL_HOUSE',
}

export interface DiceCost {
  type: DiceCostType;
  value?: number;
  count?: number;
}

export interface CardDefinition {
  id: number;
  name: string;
  type: CardType;
  dice_cost: DiceCost[];
  strength?: number;
  durability?: number;
  commandNumber?: number;
  text: string;
  abilities: { [key: string]: any; };
  imageUrl?: string;
  faction?: string;
  rarity?: string;
  flavor_text?: string;
  card_set?: string;
  author?: string;
}

export interface CardInGame extends CardDefinition {
  instanceId: string;
  damage: number;
  strengthModifier: number;
  durabilityModifier: number;
  hasAssaulted: boolean;
  isScavenged?: boolean;
  isToken?: boolean;
  shieldUsedThisTurn?: boolean;
  counters?: number; // For Consume
  attachments?: CardInGame[]; // For Augment
}

export interface Player {
  id: number;
  name:string;
  command: number;
  deck: CardDefinition[];
  hand: CardInGame[];
  units: CardInGame[];
  locations: CardInGame[];
  artifacts: CardInGame[];
  graveyard: CardInGame[];
  void: CardInGame[];
  riftwalkZone: { card: CardInGame, turnsRemaining: number }[]; // For Riftwalk
  diceModifier: number;
  shieldUsedThisTurn: boolean;
  isCommandFortified: boolean;
  skipNextDrawPhase: boolean;
  fatigueCounter: number;
  hasMulliganed: boolean;
}

export enum TurnPhase {
  MULLIGAN = 'Mulligan',
  AI_MULLIGAN = 'AI Mulligan',
  START = 'Start',
  ROLL_SPEND = 'Roll & Spend',
  DRAW = 'Draw',
  ASSAULT = 'Assault',
  END = 'End',
}

export interface Die {
  id: number;
  value: number;
  isKept: boolean;
  isSpent: boolean;
}

export interface GameState {
  players: [Player, Player];
  currentPlayerId: number;
  turn: number;
  phase: TurnPhase;
  dice: Die[];
  rollCount: number;
  maxRolls: number;
  log: string[];
  winner: Player | null;
  isProcessing: boolean;
  extraTurns: number;
  lastActionDetails?: { type: string, spentDiceIds: number[] } | null;
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
        // Generic buff from any attachment for now, can be specified later
        strength += card.attachments.length;
        durability += card.attachments.length;
    }

    // Buffs from player's other cards
    if (owner.artifacts.some(a => a.id === 13)) strength += 1; // Targeting Matrix
    if (owner.locations.some(l => l.id === 12)) durability += 1; // Hardened Subnet
    
    // Rally
    const rallySources = owner.units.filter(u => u.abilities?.rally && u.instanceId !== card.instanceId).length;
    strength += rallySources;

    // Assault phase specific buffs
    if (context.isAssaultPhase && card.abilities?.assault) {
        strength += card.abilities.assault;
    }
    return { strength, durability, rallyBonus: rallySources };
};