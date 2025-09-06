

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

export enum LastActionType {
    PLAY = 'play',
    CHANNEL = 'channel',
    SCAVENGE = 'scavenge',
    ACTIVATE = 'activate',
}

export interface ActionHistoryEntry {
  turn: number;
  playerId: number;
  actions: string[];
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
  lastActionDetails?: { type: LastActionType; spentDiceIds: number[] } | null;
  actionHistory: ActionHistoryEntry[];
}