import { CardDefinition, CardType, DiceCostType, DiceCost } from './types';

export const cardDefinitions: CardDefinition[] = [
  // --- CORE SET ---

  // Common Units
  {
    id: 1,
    name: 'Cyber Enforcer',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 4, count: 1 }],
    strength: 3,
    durability: 3,
    commandNumber: 2,
    text: 'A formidable presence on the battlefield.',
    abilities: {},
    faction: 'Cybernetic Guard',
    rarity: 'Common',
    flavor_text: 'Justice is swift and cybernetic.',
    card_set: 'Core Set',
    author: 'AI Artist',
    imageUrl: 'https://images.pexels.com/photos/8412213/pexels-photo-8412213.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
  },
  {
    id: 2,
    name: 'Scout Drone',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: 1,
    durability: 2,
    commandNumber: 1,
    text: 'Arrival: Foresight (1).',
    abilities: { foresight: 1 },
    faction: 'Syndicate',
    rarity: 'Common',
    flavor_text: 'Information is the first weapon drawn.',
    card_set: 'Core Set',
    author: 'AI Artist',
  },
  {
    id: 3,
    name: 'Glitch Runner',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 1, count: 1 }, { type: DiceCostType.EXACT_VALUE, value: 2, count: 1 }],
    strength: 2,
    durability: 1,
    commandNumber: 1,
    text: 'Stealth. Malice (1).',
    abilities: { stealth: true, malice: 1 },
    faction: 'Anarchs',
    rarity: 'Common',
    flavor_text: 'They move unseen through corrupted data streams.',
    card_set: 'Core Set',
  },

  // Uncommon Units
  {
    id: 4,
    name: 'Aegis Sentinel',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, value: 8, count: 2 }],
    strength: 2,
    durability: 5,
    commandNumber: 3,
    text: 'Shield. Entrenched.',
    abilities: { shield: true, entrenched: true },
    faction: 'Cybernetic Guard',
    rarity: 'Uncommon',
    card_set: 'Core Set',
  },
  {
    id: 5,
    name: 'Code Splicer',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: 3,
    durability: 2,
    commandNumber: 2,
    text: 'Arrival: Sabotage (1).',
    abilities: { sabotage: 1 },
    faction: 'Syndicate',
    rarity: 'Uncommon',
    flavor_text: '"Your firewalls are merely suggestions."',
    card_set: 'Core Set',
  },
  {
    id: 6,
    name: 'Rift Strider',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 5, count: 2 }],
    strength: 5,
    durability: 4,
    commandNumber: 4,
    text: 'Riftwalk (1).',
    abilities: { riftwalk: { turns: 1 } },
    faction: 'Anarchs',
    rarity: 'Uncommon',
    flavor_text: 'It doesn\'t break reality, it just borrows it for a moment.',
    card_set: 'Core Set',
    imageUrl: 'https://images.pexels.com/photos/3828945/pexels-photo-3828945.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
  },
  
  // Rare Units
  {
    id: 7,
    name: 'Synergy Core',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, value: 10, count: 2 }],
    strength: 2,
    durability: 4,
    commandNumber: 3,
    text: 'Synergy (Cybernetic Guard): Gains +1 Strength for each other Cybernetic Guard card you control.',
    abilities: { synergy: { faction: 'Cybernetic Guard', effect: { type: 'BUFF_STRENGTH', amount: 1 } } },
    faction: 'Cybernetic Guard',
    rarity: 'Rare',
    card_set: 'Core Set',
  },
   {
    id: 15,
    name: 'System-Killer KAIJU',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: 6,
    durability: 6,
    commandNumber: 5,
    text: 'Arrival: Barrage (2). Instability.',
    abilities: { barrage: 2, instability: true },
    faction: 'Anarchs',
    rarity: 'Rare',
    flavor_text: 'A virus so large it has a physical form.',
    card_set: 'Core Set',
    imageUrl: 'https://images.pexels.com/photos/87009/earth-earth-at-night-night-lights-87009.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
  },
   {
    id: 19,
    name: 'Grave Robber',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 3 }],
    commandNumber: 1,
    strength: 1,
    durability: 1,
    text: 'Scavenge [6]. Overload: Gains +1 strength for every 3 cards in your graveyard.',
    abilities: {
        scavenge: { cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 6 }] },
        overload: { per: 3, amount: 1 }
    },
    faction: 'Anarchs',
    rarity: 'Rare'
  },
  
  // Mythic Units
  {
    id: 8,
    name: 'The Annihilator',
    type: CardType.UNIT,
    dice_cost: [{ type: DiceCostType.FULL_HOUSE }],
    strength: 8,
    durability: 8,
    commandNumber: 6,
    text: 'Immutable. Annihilate.',
    abilities: { immutable: true, annihilate: true },
    faction: 'Anarchs',
    rarity: 'Mythic',
    card_set: 'Core Set',
    imageUrl: 'https://images.pexels.com/photos/17483868/pexels-photo-17483868/free-photo-of-an-abstract-artwork-with-a-black-background.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
  },

  // Events
  {
    id: 9,
    name: 'System Crash',
    type: CardType.EVENT,
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, value: 7, count: 2 }],
    commandNumber: 2,
    text: 'RequiresTarget. Damage (3) a target unit.',
    abilities: { requiresTarget: true, damage: 3 },
    faction: 'Anarchs',
    rarity: 'Common',
    card_set: 'Core Set',
  },
  {
    id: 10,
    name: 'Data Spike',
    type: CardType.EVENT,
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, count: 1 }],
    commandNumber: 1,
    text: 'Draw (1).',
    abilities: { draw: 1 },
    faction: 'Syndicate',
    rarity: 'Common',
    card_set: 'Core Set',
    flavor_text: 'A sudden influx of pure, unfiltered information.',
  },
  {
      id: 16,
      name: 'Emergency Recall',
      type: CardType.EVENT,
      dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 1, count: 1 }],
      commandNumber: 1,
      text: 'RequiresTarget. Recall a target unit you control.',
      abilities: { requiresTarget: true, recall: true },
      faction: 'Cybernetic Guard',
      rarity: 'Uncommon'
  },
   {
      id: 17,
      name: 'Calculated Purge',
      type: CardType.EVENT,
      dice_cost: [{ type: DiceCostType.ANY_PAIR }],
      commandNumber: 2,
      text: 'Purge (3).',
      abilities: { purge: 3 },
      faction: 'Syndicate',
      rarity: 'Uncommon',
      flavor_text: 'Some data is too dangerous to exist. Some is just noise. We delete both.'
  },
  {
    id: 18,
    name: 'Logic Bomb',
    type: CardType.EVENT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 2, value: 3 }],
    commandNumber: 2,
    text: 'Stagnate.\nChannel [1]: Draw (1).',
    abilities: { 
        stagnate: true,
        channel: {
            cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 1 }],
            effect: { type: 'DRAW', value: 1 }
        }
    },
    faction: 'Syndicate',
    rarity: 'Rare'
  },

  // Locations
  {
    id: 11,
    name: 'Data Haven',
    type: CardType.LOCATION,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 5, count: 1 }],
    durability: 4,
    commandNumber: 2,
    text: 'Generator: At the start of your turn, gain 1 Command.',
    abilities: { generator: { type: 'GAIN_COMMAND', value: 1 } },
    faction: 'Syndicate',
    rarity: 'Uncommon',
    card_set: 'Core Set',
  },
  {
    id: 12,
    name: 'Hardened Subnet',
    type: CardType.LOCATION,
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    durability: 3,
    commandNumber: 2,
    text: 'Your units have +1 Durability.',
    abilities: {}, // This is a passive effect handled in `getEffectiveStats`
    faction: 'Cybernetic Guard',
    rarity: 'Uncommon',
    card_set: 'Core Set',
  },
  {
    id: 20,
    name: 'Command Fortress',
    type: CardType.LOCATION,
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, value: 9, count: 2 }],
    durability: 5,
    commandNumber: 4,
    text: 'Landmark. Fortify (5).',
    abilities: { landmark: true, fortify: { value: 5 } },
    faction: 'Cybernetic Guard',
    rarity: 'Rare'
  },

  // Artifacts
  {
    id: 13,
    name: 'Targeting Matrix',
    type: CardType.ARTIFACT,
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, value: 2, count: 1 }, { type: DiceCostType.EXACT_VALUE, value: 2, count: 1 }],
    durability: 2,
    commandNumber: 2,
    text: 'Your units have +1 Strength.',
    abilities: {}, // This is a passive effect handled in `getEffectiveStats`
    faction: 'Syndicate',
    rarity: 'Uncommon',
    card_set: 'Core Set',
  },
  {
    id: 14,
    name: 'Aegis Protocol',
    type: CardType.ARTIFACT,
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    durability: 1,
    commandNumber: 3,
    text: 'Once per turn, if one of your units would be destroyed, you may prevent it.',
    abilities: {}, // This is a passive effect handled in `checkForDestroyedUnits`
    faction: 'Cybernetic Guard',
    rarity: 'Rare',
    card_set: 'Core Set',
  },
  {
    id: 21,
    name: 'Spike Core',
    type: CardType.ARTIFACT,
    dice_cost: [{ type: DiceCostType.STRAIGHT, count: 3 }],
    durability: 3,
    commandNumber: 3,
    text: 'Consume (3).\nActivate [Any 1 die]: Spike (2) an available die.',
    abilities: {
        consume: { initial: 3 },
        activate: {
            cost: [{ type: DiceCostType.ANY_X_DICE, count: 1 }],
            effect: { type: 'spike', value: 2 }
        }
    },
    faction: 'Syndicate',
    rarity: 'Rare'
  },
  {
    id: 22,
    name: 'Modular Plating',
    type: CardType.ARTIFACT,
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, count: 1 }],
    durability: 1,
    commandNumber: 1,
    text: 'Augment [2]: Augmented unit gains +1/+1.',
    abilities: {
        augment: { cost: [{ type: DiceCostType.EXACT_VALUE, value: 2, count: 1 }] }
    },
    faction: 'Cybernetic Guard',
    rarity: 'Common'
  },
];