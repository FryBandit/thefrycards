import { CardDefinition, CardType, DiceCostType } from './types';

export const CARD_DEFINITIONS: CardDefinition[] = [
  // --- Units ---
  {
    id: 1,
    name: 'Chrome Ronin',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 2 }],
    strength: 1,
    durability: 2,
    commandNumber: 1,
    text: 'Assault (1): This unit gets +1 Strength during your turn.',
    keywords: { assault: 1 },
  },
  {
    id: 2,
    name: 'Glitch Runner',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 4 }],
    strength: 2,
    durability: 1,
    commandNumber: 2,
    text: 'Siphon (1): When this unit deals damage to the opponent, you gain 1 Command.',
    keywords: { siphon: 1 },
  },
  {
    id: 3,
    name: 'Corp Enforcer',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_DICE, count: 2 }],
    strength: 3,
    durability: 3,
    commandNumber: 4,
    text: 'Entrenched: This unit does not participate in Assaults.',
    keywords: { entrenched: true },
  },
  {
    id: 6,
    name: 'Code Weaver',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: 4,
    durability: 5,
    commandNumber: 8,
    text: 'Arrival: Fateweave (2) - Gain an additional roll this turn.',
    keywords: { fateweave: 1 },
  },
   {
    id: 15,
    name: 'System-Killer KAIJU',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: 10,
    durability: 10,
    commandNumber: 10,
    text: 'Annihilate - Arrival: Void all other units. Opponent loses Command for each of their units Voided this way.',
  },
  {
    id: 17,
    name: 'Command Sergeant',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: 2,
    durability: 3,
    commandNumber: 4,
    text: 'Rally: Other units you control have +1 Strength.',
    keywords: { rally: true },
  },
  {
    id: 18,
    name: 'Unstable Mutant',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 3 }],
    strength: 4,
    durability: 1,
    commandNumber: 2,
    text: 'Decay: At the start of your turn, this unit takes 1 damage.',
    keywords: { decay: true },
  },
  {
    id: 21,
    name: 'Shadow Infiltrator',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 5 }],
    strength: 2,
    durability: 3,
    commandNumber: 4,
    text: 'Stealth: This unit cannot be targeted by opponent\'s Events.',
    keywords: { stealth: true },
  },

  // --- Events ---
  {
    id: 7,
    name: 'Short Circuit',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 3 }],
    commandNumber: 2,
    text: 'Deal 2 damage to a target unit.',
    keywords: { damage: 2, requiresTarget: true },
  },
  {
    id: 10,
    name: 'ICE Wall',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 9, count: 2 }],
    commandNumber: 6,
    text: 'Sabotage (2): Target opponent must roll 2 fewer dice on their next turn.',
    keywords: { sabotage: 2 },
  },
   {
    id: 16,
    name: 'Overclock',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.STRAIGHT_3 }],
    commandNumber: 9,
    text: 'Warp: Take an extra turn after this one. You skip the Roll & Spend and Draw phases of that extra turn.',
    keywords: { warp: true },
  },
  {
    id: 19,
    name: 'System Corruption',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 3 }],
    commandNumber: 3,
    text: 'Corrupt (2): Target unit gets -2 Strength.',
    keywords: { corrupt: 2, requiresTarget: true },
  },
  {
    id: 20,
    name: 'Memory Wipe',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 7, count: 2 }],
    commandNumber: 5,
    text: 'Discard (1): Target opponent discards 1 card at random.',
    keywords: { discard: 1 },
  },
  {
    id: 22,
    name: 'Data Spike',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 1 }],
    commandNumber: 1,
    text: 'Draw 2 cards.',
    keywords: { draw: 2 },
  },
  {
    id: 23,
    name: 'Reality Fracture',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 11, count: 2 }],
    commandNumber: 7,
    text: 'Void target unit.',
    keywords: { voidTarget: true, requiresTarget: true },
  },

  // --- Locations ---
  {
    id: 11,
    name: 'Data Haven',
    type: CardType.LOCATION,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 5 }, { type: DiceCostType.EXACTLY_X, value: 5 }],
    commandNumber: 7,
    text: 'Generator: At the start of your turn, you gain 1 Command.',
  },
  {
    id: 12,
    name: 'Hardened Subnet',
    type: CardType.LOCATION,
    cost: [{ type: DiceCostType.ANY_X_DICE, count: 3 }],
    commandNumber: 8,
    text: 'Your units have +1 Durability.',
  },
  
  // --- Artifacts ---
  {
    id: 13,
    name: 'Targeting Matrix',
    type: CardType.ARTIFACT,
    cost: [{ type: DiceCostType.ANY_X_DICE, count: 1, value: 1 }],
    commandNumber: 3,
    text: 'Your units have +1 Strength.',
  },
   {
    id: 14,
    name: 'Aegis Protocol',
    type: CardType.ARTIFACT,
    cost: [{ type: DiceCostType.ANY_PAIR }],
    commandNumber: 5,
    text: 'Shielded: The first time one of your units would be destroyed each turn, it isn\'t.',
  },
  {
    id: 24,
    name: 'Repulsor Field',
    type: CardType.ARTIFACT,
    cost: [{ type: DiceCostType.ANY_X_DICE, count: 2 }],
    commandNumber: 4,
    text: 'Activate [Spend a 6]: Your Command cannot be reduced until your next turn.',
    keywords: { activate: { cost: [{ type: DiceCostType.EXACTLY_X, value: 6 }], effect: 'fortify_command' } },
  },
  // --- OLD "NEW" CARDS ---
  {
    id: 25,
    name: 'Grave Spectre',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 3 }],
    strength: 2,
    durability: 2,
    commandNumber: 3,
    text: 'Haunt (2): When this unit is destroyed, the opponent loses 2 Command.',
    keywords: { haunt: 2 },
  },
  {
    id: 26,
    name: 'Siege Automaton',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 10, count: 2 }],
    strength: 2,
    durability: 5,
    commandNumber: 7,
    text: 'Barrage (1): Arrival: Deal 1 damage to each enemy unit.',
    keywords: { barrage: 1 },
  },
  {
    id: 27,
    name: 'Phase Jumper',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: 3,
    durability: 2,
    commandNumber: 3,
    text: 'Breach: Cannot be targeted by opponent\'s Events until after it has participated in an Assault. Fragile: Takes double damage from Events.',
    keywords: { breach: true, fragile: true },
  },
  {
    id: 28,
    name: 'Archive Purge',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 2 }],
    commandNumber: 2,
    text: 'Purge (2): Void 2 random cards from the opponent\'s graveyard.',
    keywords: { purge: 2 },
  },
  {
    id: 29,
    name: 'Precognitive Scan',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 1 }],
    commandNumber: 1,
    text: 'Foresight (1): Look at the top card of your deck, then draw a card.',
    keywords: { foresight: 1, draw: 1 },
  },
  {
    id: 30,
    name: 'Dice Calibrator',
    type: CardType.ARTIFACT,
    cost: [{ type: DiceCostType.ANY_X_DICE, count: 1 }],
    commandNumber: 3,
    text: 'Activate [Spend a 1]: Spike (1) - Increase the value of one of your available dice by 1 (max 6).',
    keywords: { activate: { cost: [{ type: DiceCostType.EXACTLY_X, value: 1 }], effect: 'spike', value: 1 } },
  },
    // --- NEW KEYWORD CARDS ---
  {
    id: 31,
    name: 'Viper Assassin',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 8, count: 2 }],
    strength: 1,
    durability: 2,
    commandNumber: 5,
    text: 'Venomous. Arrival: Snipe (1) - Deal 1 damage to a target unit.',
    keywords: { venomous: true, snipe: 1, requiresTarget: true },
  },
  {
    id: 32,
    name: 'Phase Striker',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: 3,
    durability: 1,
    commandNumber: 4,
    text: 'Phasing: This unit\'s damage cannot be prevented.',
    keywords: { phasing: true },
  },
  {
    id: 33,
    name: 'Data Scapegoat',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 2 }],
    strength: 1,
    durability: 1,
    commandNumber: 1,
    text: 'Martyrdom: When this unit is destroyed, draw a card.',
    keywords: { martyrdom: { type: 'DRAW_CARD', value: 1 } },
  },
  {
    id: 34,
    name: 'Volatile Overcharger',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 5 }],
    strength: 6,
    durability: 3,
    commandNumber: 6,
    text: 'Malice (3): When this unit is destroyed, its controller loses 3 Command.',
    keywords: { malice: 3 },
  },
   {
    id: 35,
    name: 'Retaliation Bot',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 4 }],
    strength: 2,
    durability: 2,
    commandNumber: 3,
    text: 'Martyrdom: When this unit is destroyed, deal 2 damage to the opponent.',
    keywords: { martyrdom: { type: 'DEAL_DAMAGE_TO_OPPONENT', value: 2 } },
  },
   // --- GENERAL ACTION KEYWORD CARDS ---
  {
    id: 36,
    name: 'Glitch Cascade',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 8, count: 2 }],
    commandNumber: 5,
    text: 'Deal 3 damage to a target unit. Channel [Spend a 2]: Draw 1 card.',
    keywords: { damage: 3, requiresTarget: true, channel: { cost: [{ type: DiceCostType.EXACTLY_X, value: 2 }], effect: { type: 'DRAW', value: 1 } } }
  },
  {
    id: 37,
    name: 'Scrapheap Scuttler',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 3 }],
    strength: 2,
    durability: 2,
    commandNumber: 2,
    text: 'Scavenge [Pay a Pair]: You may play this card from your graveyard. If you do, Void it when it leaves the field.',
    keywords: { scavenge: { cost: [{ type: DiceCostType.ANY_PAIR }] } }
  },
  {
    id: 38,
    name: 'Emergency Teleport',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 3 }],
    commandNumber: 3,
    text: 'Recall target unit you control to your hand. It is returned to its base state.',
    keywords: { recall: true, requiresTarget: true }
  },
  {
    id: 39,
    name: 'DDoS Attack',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 9, count: 2 }],
    commandNumber: 6,
    text: 'Stagnate: Your opponent skips their next Draw Phase.',
    keywords: { stagnate: true }
  },
  // --- LATEST KEYWORD CARDS ---
  {
    id: 40,
    name: 'Bastion of the Ancients',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 11, count: 2 }],
    strength: 2,
    durability: 8,
    commandNumber: 9,
    text: 'Immutable. Entrenched.',
    keywords: { immutable: true, entrenched: true },
  },
  {
    id: 41,
    name: 'Oracle Engine',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.STRAIGHT_3 }],
    strength: 3,
    durability: 4,
    commandNumber: 6,
    text: 'Arrival: Resonance (5) - Reveal the top card of your deck. If its Command Number is 5 or greater, this unit gets +3 Strength.',
    keywords: { resonance: { value: 5, effect: { type: 'BUFF_STRENGTH', amount: 3 } } },
  },
  {
    id: 42,
    name: 'Power Surge',
    type: CardType.EVENT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 4 }],
    commandNumber: 4,
    text: 'Deal 2 damage to a target unit. Amplify [Spend a 6]: Deal 5 damage instead.',
    keywords: { damage: 2, requiresTarget: true, amplify: { cost: [{ type: DiceCostType.EXACTLY_X, value: 6 }], effect: { type: 'DEAL_DAMAGE', amount: 5 } } },
  },
  // --- NEW KEYWORD IMPLEMENTATION CARDS ---
  {
    id: 43,
    name: 'Archive Fiend',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.EXACTLY_X, value: 4 }],
    strength: 1,
    durability: 3,
    commandNumber: 4,
    text: 'Overload: This unit has +1 Strength for every 2 cards in your graveyard.',
    keywords: { overload: { per: 2, amount: 1 } },
  },
  {
    id: 44,
    name: 'Replicator Swarm',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.ANY_X_PLUS, value: 3 }],
    strength: 1,
    durability: 1,
    commandNumber: 2,
    text: 'Echo: When this unit enters the field, create a token copy of it. Tokens are Voided when they leave the field.',
    keywords: { echo: true },
  },
  {
    id: 45,
    name: 'Punisher Droid',
    type: CardType.UNIT,
    cost: [{ type: DiceCostType.SUM_OF_X_PLUS, value: 7, count: 2 }],
    strength: 2,
    durability: 2,
    commandNumber: 5,
    text: 'Arrival: Snipe (1). Executioner (2): When this unit destroys a unit with an ability, the opponent loses 2 Command.',
    keywords: { snipe: 1, executioner: { amount: 2 }, requiresTarget: true },
  },
];

const CARDS_BY_ID = new Map(CARD_DEFINITIONS.map(c => [c.id, c]));

const findCard = (id: number): CardDefinition => {
    const card = CARDS_BY_ID.get(id);
    if (!card) {
        throw new Error(`Card with ID ${id} not found in CARD_DEFINITIONS.`);
    }
    return card;
};

// Helper to build a valid deck
export const buildDeck = (): CardDefinition[] => {
    const deck: CardDefinition[] = [];
    
    // 2 Locations
    deck.push(findCard(11)); // Data Haven
    deck.push(findCard(12)); // Hardened Subnet
    
    // 8 Units
    deck.push(findCard(32)); // Phase Striker
    deck.push(findCard(31)); // Viper Assassin
    deck.push(findCard(37)); // Scrapheap Scuttler
    deck.push(findCard(17)); // Command Sergeant
    deck.push(findCard(40)); // Bastion of the Ancients
    deck.push(findCard(43)); // Archive Fiend (NEW)
    deck.push(findCard(44)); // Replicator Swarm (NEW)
    deck.push(findCard(45)); // Punisher Droid (NEW)
    
    // 5 Events
    deck.push(findCard(42)); // Power Surge
    deck.push(findCard(19)); // System Corruption
    deck.push(findCard(38)); // Emergency Teleport
    deck.push(findCard(39)); // DDoS Attack
    deck.push(findCard(16)); // Overclock
    
    // 2 Artifacts
    deck.push(findCard(30)); // Dice Calibrator
    deck.push(findCard(24)); // Repulsor Field

    return deck;
}