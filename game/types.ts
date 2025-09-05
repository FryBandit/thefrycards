


export enum CardType {
  UNIT = 'Unit',
  EVENT = 'Event',
  LOCATION = 'Location',
  ARTIFACT = 'Artifact',
}

export enum DiceCostType {
  ANY_X_PLUS = 'ANY_X_PLUS',
  EXACTLY_X = 'EXACTLY_X',
  ANY_PAIR = 'ANY_PAIR',
  SUM_OF_X_PLUS = 'SUM_OF_X_PLUS',
  ANY_X_DICE = 'ANY_X_DICE',
  THREE_OF_A_KIND = 'THREE_OF_A_KIND',
  FOUR_OF_A_KIND = 'FOUR_OF_A_KIND',
  STRAIGHT_3 = 'STRAIGHT_3',
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
  cost: DiceCost[];
  strength?: number;
  durability?: number;
  commandNumber: number;
  text: string;
  keywords?: { [key: string]: any; immutable?: boolean; resonance?: { value: number; effect: { type: 'BUFF_STRENGTH', amount: number } }; amplify?: { cost: DiceCost[], effect: { type: 'DEAL_DAMAGE', amount: number } }; overload?: { per: number, amount: number }; echo?: boolean; executioner?: { amount: number }; shield?: boolean; };
  imageUrl?: string;
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
  diceModifier: number;
  shieldUsedThisTurn: boolean;
  isCommandFortified: boolean;
  skipNextDrawPhase: boolean;
}

export enum TurnPhase {
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
    if (card.keywords?.overload) {
        const bonus = Math.floor(owner.graveyard.length / card.keywords.overload.per) * card.keywords.overload.amount;
        strength += bonus;
    }

    // Buffs from player's other cards
    if (owner.artifacts.some(a => a.id === 13)) strength += 1; // Targeting Matrix
    if (owner.locations.some(l => l.id === 12)) durability += 1; // Hardened Subnet
    
    // Rally
    const rallySources = owner.units.filter(u => u.keywords?.rally && u.instanceId !== card.instanceId).length;
    strength += rallySources;

    // Assault phase specific buffs
    if (context.isAssaultPhase && card.keywords?.assault) {
        strength += card.keywords.assault;
    }
    return { strength, durability, rallyBonus: rallySources };
};