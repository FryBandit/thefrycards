import { CardDefinition, CardType, DiceCostType, DiceCost } from './types';

export const cardDefinitions: CardDefinition[] = [
  // --- CORE SET ---
  {
    id: 1,
    name: "Lost Signal",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 3 }],
    strength: undefined,
    durability: undefined,
    text: "Target opponent discards 1 card.",
    abilities: { "discard": { "value": 1 }, "requiresTarget": true },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "The stars used to speak. Now, it's just static.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3f14d43b-c6d3-4127-ada6-8b5178280105/0_2.png"
  },
  {
    id: 2,
    name: "Echoes in the Void",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 2 }],
    strength: undefined,
    durability: undefined,
    text: "Foresight 1 (Look at the top card of your deck).",
    abilities: { "foresight": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "We thought we were alone until the whispers started.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/f267e837-3627-4551-a920-fb5f88cb7862/0_3.png"
  },
  {
    id: 3,
    name: "The Drifter",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 4 }],
    strength: 1,
    durability: 2,
    commandNumber: 3,
    text: "Stealth (Cannot be targeted by opponent's Events).",
    abilities: { "stealth": true },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "He’s not part of the crew... is he?",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/c759fe6f-5b1f-41b1-be84-a70d20a405a7/0_2.png"
  },
  {
    id: 4,
    name: "Solar Flare",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 4 }],
    strength: undefined,
    durability: undefined,
    text: "Decay (This card is destroyed at the end of your turn).",
    abilities: { "decay": true },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "Light’s supposed to be good. Not this time.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/e61578ec-04db-4f77-9043-b36a0c716500/0_3.png"
  },
  {
    id: 5,
    name: "Evelyn, The Observer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 5 }],
    strength: 2,
    durability: 1,
    commandNumber: 3,
    text: "Foresight 1 (Look at the top card of your deck).",
    abilities: { "foresight": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "She watches the void. The void watches back.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/7800d9b2-e07a-4acc-8073-3e9a515eb06e/0_2.png"
  },
  {
    id: 6,
    name: "Unseen Entities",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 1 }],
    strength: undefined,
    durability: undefined,
    text: "Corrupt 1 (Add 1 Void card to the opponent's deck).",
    abilities: { "corrupt": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "You feel watched. Always.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/8c4364d5-b169-443a-8edb-7c81e22ceab7/0_2.png"
  },
  {
    id: 7,
    name: "The Cold Doesn't Care",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 6 }],
    strength: undefined,
    durability: undefined,
    text: "Stagnate (Opponent skips their next Draw Phase).",
    abilities: { "stagnate": true },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "Space doesn’t kill you fast. It’s patient.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/ed78ce83-aab5-4cb1-9584-c1b6083488bb/0_3.png"
  },
  {
    id: 8,
    name: "Message from the Stars",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: undefined,
    durability: undefined,
    text: "Generator: At the start of your turn, Foresight 1.",
    abilities: { "generator": { "effect": { "foresight": 1 } } },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "They’re sending us coordinates. But why?",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/961fa923-ecf2-498a-9c8c-2056dffba430/0_2.png"
  },
  {
    id: 9,
    name: "Joshua, The Dreamer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 7, "count": 2 }],
    strength: 2,
    durability: 3,
    commandNumber: 5,
    text: "Fateweave 1 (Look at the top card of your deck. You may put it on the bottom).",
    abilities: { "fateweave": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "Space makes you dream, but not all dreams are safe.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/092b8060-d741-42c1-a024-7fc582a1ef60/0_2.png"
  },
  {
    id: 10,
    name: "Cracked Reality",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Sabotage 1 (Opponent rolls 1 fewer die next turn).",
    abilities: { "sabotage": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "Space bends. So does the mind.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3ed2bfa9-4ecd-4a2b-a085-9ab42f59874e/0_3.png"
  },
  {
    id: 11,
    name: "Void Wanderer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 6, "count": 2 }],
    strength: 3,
    durability: 2,
    commandNumber: 4,
    text: "Phasing (This unit is removed from the game for one turn and returns at the start of your next turn).",
    abilities: { "phasing": true },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "She’s not lost. She just prefers the emptiness.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/7e826378-bcbf-4cdf-8c9a-2afaab3ad2c3/0_0.png"
  },
  {
    id: 12,
    name: "The Hunger",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: undefined,
    durability: undefined,
    text: "Corrupt 3. Siphon 3.",
    abilities: { "corrupt": { "value": 3 }, "siphon": { "value": 3 } },
    faction: "Space Horror",
    rarity: "Super-Rare",
    flavor_text: "The darkness wants more than just light.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/a4f8ace0-9061-43e0-8d0e-67198402d6fc/0_3.png"
  },
  {
    id: 13,
    name: "Hollow Starlight",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: undefined,
    durability: undefined,
    text: "Generator: At the start of your turn, apply Decay to a target unit.",
    abilities: { "generator": { "effect": "decay" } },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "It looks like a star, but it’s just... wrong.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/b740dad2-19e8-4c16-8385-2c5c62877a52/0_2.png"
  },
  {
    id: 14,
    name: "The Watcher Awakens",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 2, value: 5 }],
    strength: 4,
    durability: 5,
    commandNumber: 8,
    text: "Arrival: Draw 1 card. Immutable.",
    abilities: { "arrival": { "draw": 1 }, "immutable": true },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "It’s not that we found them. They let us.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/b701c199-5a4d-4766-ab86-6000aab36c09/0_0.png"
  },
  {
    id: 15,
    name: "The Ship's Last Breath",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 10, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Martyrdom: Draw 2 cards. Decay.",
    abilities: { "martyrdom": { "draw": 2 }, "decay": true },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "A ship isn’t just metal. It knows when it’s dying.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/6ea384ba-5267-47d7-a5ae-7ed4a64c3630/0_2.png"
  },
  {
    id: 16,
    name: "The Devourer of Moons",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: 5,
    durability: 4,
    commandNumber: 8,
    text: "Barrage (Deals damage to all enemy units on arrival). Siphon 2.",
    abilities: { "barrage": true, "siphon": { "value": 2 } },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "It doesn’t hunger for food. It hungers for everything.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/20981778-c099-4cca-bc1f-896d05821dc3/0_3.png"
  },
  {
    id: 17,
    name: "Stardust Memories",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 9, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Recall a unit.",
    abilities: { "recall": true, "requiresTarget": true },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "All those who left before us... they're still here.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3c8ab8e1-ddd7-4418-897c-a4bb7ada86f2/0_3.png"
  },
  {
    id: 18,
    name: "Nova Rebirth",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 3 }],
    strength: undefined,
    durability: undefined,
    text: "Scavenge (Play this card from your graveyard).",
    abilities: { "scavenge": { "cost": [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 12, "count": 2 }] } },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "From destruction, something darker is born.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/abd8d0b0-4b9a-4728-b649-551d6bb6366a/0_0.png"
  },
  {
    id: 19,
    name: "Ember, Last Pilot",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.STRAIGHT, "count": 3 }],
    strength: 6,
    durability: 5,
    commandNumber: 9,
    text: "Stealth. Assault 2.",
    abilities: { "stealth": true, "assault": { "value": 2 } },
    faction: "Space Horror",
    rarity: "Super-Rare",
    flavor_text: "Flying into the dark, and I’m the only one left.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/7abb8736-15f5-4d18-b7e0-f3ecf7f92985/0_0.png"
  },
  {
    id: 20,
    name: "Nightmare Nebula",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 2, value: 6 }],
    strength: undefined,
    durability: undefined,
    text: "Generator: Target opponent discards 1 card. Haunt 1.",
    abilities: { "generator": { "effect": "discard", "value": 1 }, "haunt": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "Don’t fall asleep. The stars will find you.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/cd9b7d16-2ae3-4fc1-837f-329f2e3e223d/0_2.png"
  },
  {
    id: 21,
    name: "Wylex, The Forgotten",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: 5,
    durability: 7,
    commandNumber: 9,
    text: "Riftwalk 2. Malice 3.",
    abilities: { "riftwalk": { "duration": 2 }, "malice": { "value": 3 } },
    faction: "Space Horror",
    rarity: "Super-Rare",
    flavor_text: "Not even my home planet remembers why I'm here.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/81f04579-2af1-4ac0-8a54-59f7d3aae374/0_3.png"
  },
  {
    id: 22,
    name: "Chrono Rift",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    dice_cost: [],
    strength: undefined,
    durability: undefined,
    text: "Instability. Generator: Draw 1 card.",
    abilities: { "instability": true, "generator": { "effect": "draw", "value": 1 } },
    faction: "Space Horror",
    rarity: "Super-Rare",
    flavor_text: "Time doesn’t move right out here.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/e238ba98-7623-41e9-8387-7d8f3a9055dd/0_2.png"
  },
  {
    id: 23,
    name: "The Last Transmission",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.STRAIGHT, "count": 4 }],
    strength: undefined,
    durability: undefined,
    text: "Chain Reaction (This card's effect triggers additional effects).",
    abilities: { "chain_reaction": true },
    faction: "Space Horror",
    rarity: "Super-Rare",
    flavor_text: "This is Captain Oran, and we are not alone.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/b289bfd0-6cfc-4298-84f6-48a47e37ab55/0_2.png"
  },
  {
    id: 24,
    name: "Shadow of the Dreadnought",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 20, "count": 3 }],
    strength: undefined,
    durability: undefined,
    text: "Landmark. Generator: Sabotage 1.",
    abilities: { "landmark": true, "generator": { "effect": "sabotage", "value": 1 } },
    faction: "Space Horror",
    rarity: "Mythic",
    flavor_text: "The ship looms in the dark, crew long gone but not forgotten.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/766953b0-6e17-4efd-be65-dd51be8750f1/0_2.png"
  },
  {
    id: 25,
    name: "The Void Mother",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: 7,
    durability: 10,
    commandNumber: 10,
    text: "Annihilate. Siphon 3.",
    abilities: { "annihilate": true, "siphon": { "value": 3 } },
    faction: "Space Horror",
    rarity: "Mythic",
    flavor_text: "She cradles the stars and devours their children.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/video/3060b379-ecd8-4d63-b605-e6425b2cda22/3.mp4"
  },
  {
    id: 26,
    name: "Singularity of Fear",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 4 }],
    strength: undefined,
    durability: undefined,
    text: "Void all units. Purge. Target opponent discards 3 cards.",
    abilities: { "void": true, "purge": true, "discard": { "value": 3 } },
    faction: "Space Horror",
    rarity: "Mythic",
    flavor_text: "All the terror in the universe, compressed into one point.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/dddf864a-2f3f-4dbb-9f85-e5dd446115fb/0_0.png"
  },
  {
    id: 27,
    name: "Omen of the Starborn",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: undefined,
    durability: undefined,
    text: "Warp (Take an extra turn after this one).",
    abilities: { "warp": true },
    faction: "Space Horror",
    rarity: "Mythic",
    flavor_text: "They come not to visit, but to reclaim.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/39141111-38ba-4054-a255-3bbcc6a832c9/0_2.png"
  },
  {
    id: 28,
    name: "The Cosmic Harbinger",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 11, "count": 2 }],
    strength: 3,
    durability: 6,
    commandNumber: 7,
    text: "Executioner (Destroys a unit if it deals damage to it).",
    abilities: { "executioner": true },
    faction: "Space Horror",
    rarity: "Rare",
    flavor_text: "It marks the end. And the beginning.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/30105fb4-0bc3-450c-b178-3345a7ca85e3/0_0.png"
  },
  {
    id: 29,
    name: "Eternal Eclipse",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: undefined,
    durability: undefined,
    text: "Stagnate. Sabotage 1.",
    abilities: { "stagnate": true, "sabotage": { "value": 1 } },
    faction: "Space Horror",
    rarity: "Uncommon",
    flavor_text: "The stars blinked out. Then they never returned.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/9a5a35ce-4723-495f-878a-b6b8b9796924/0_0.png"
  },
  {
    id: 30,
    name: "The Young Explorer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 3 }],
    strength: 1,
    durability: 1,
    commandNumber: 2,
    text: "Fragile (This unit is destroyed after it attacks).",
    abilities: { "fragile": true },
    faction: "Space Horror",
    rarity: "Common",
    flavor_text: "They were so eager to touch the stars. Now, they fear the dark.",
    card_set: "Space Horror",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/4ce664da-f90e-4698-a32b-0baf79e595d7/0_3.png"
  },
  {
    id: 69,
    name: "Jenna, The Chromatic Upriser",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 22, "count": 3 }],
    strength: 6,
    durability: 8,
    commandNumber: 10,
    text: "Rally. Shield.",
    abilities: { "rally": true, "shield": true },
    faction: "Rainbow Riot Squad",
    rarity: "Mythic",
    flavor_text: "First they banned the murals. Then they banned the colors. That's when we decided to become the art.",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3124f5cc-6c24-4480-909d-415157f303ff/0_0.png"
  },
  {
    id: 74,
    name: "Underground Rainbow",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 2, value: 6 }],
    strength: undefined,
    durability: undefined,
    text: "Synergy (Gains a bonus for each other card of the same faction).",
    abilities: { "synergy": { "faction": "Rainbow Riot Squad" } },
    faction: "Rainbow Riot Squad",
    rarity: "Rare",
    flavor_text: "The subway was their first mistake. Never give artists a canvas that connects the whole city.",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/34f66d6c-de29-4100-b3c6-406ed5937e33/0_2.png"
  },
  {
    id: 77,
    name: "Street Spirit",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 4 }],
    strength: 5,
    durability: 9,
    commandNumber: 10,
    text: "Overload (Gains bonus Strength based on cards in your graveyard).",
    abilities: { "overload": true },
    faction: "Rainbow Riot Squad",
    rarity: "Mythic",
    flavor_text: "Every dropped paint cap, every empty can, every faded tag - they all leave a little magic behind.",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/1324acda-0c13-4d8e-8168-92b3f831cc3f/0_1.png"
  },
  {
    id: 82,
    name: "Urban Legends",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 6 }],
    strength: undefined,
    durability: undefined,
    text: "Scavenge.",
    abilities: { "scavenge": { "cost": [{ type: DiceCostType.ANY_PAIR }] } },
    faction: "Rainbow Riot Squad",
    rarity: "Common",
    flavor_text: "They've been doing it for millennia",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/4446273b-3cf5-4caa-89f3-9b9fdf9195df/0_3.png"
  },
  {
    id: 83,
    name: "Monochrome Officer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: 8,
    durability: 8,
    commandNumber: 10,
    text: "Immutable. Executioner.",
    abilities: { "immutable": true, "executioner": true },
    faction: "Rainbow Riot Squad",
    rarity: "Mythic",
    flavor_text: "Guys... are you sure gray is all that bad?",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/08a2e456-6bba-48e9-8ffa-28300636ca6e/0_0.png"
  },
  {
    id: 85,
    name: "ChromaVoid",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 24, "count": 3 }],
    strength: undefined,
    durability: undefined,
    text: "Annihilate (Voids all other units on arrival).",
    abilities: { "annihilate": true },
    faction: "Rainbow Riot Squad",
    rarity: "Mythic",
    flavor_text: "This is what they want - a world without wavelength, without voice, without soul.",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/d547ebb7-c7f2-41c6-94e3-0b4603eeb6d6/0_0.png"
  },
  {
    id: 88,
    name: "Wall Whisperer",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 8, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Recall a target unit.",
    abilities: { "recall": { "requiresTarget": true } },
    faction: "Rainbow Riot Squad",
    rarity: "Uncommon",
    flavor_text: "The concrete remembers every color it's ever worn.",
    card_set: "Rainbow Riot Squad",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/4669cd9e-4207-4c01-b65c-b808b0275c38/0_0.png"
  },
  {
    id: 102,
    name: "Necromancy 101",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 7, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Generator: You may Scavenge one card from your graveyard each turn.",
    abilities: { "generator": { "effect": "scavenge" } },
    faction: "Undead College",
    rarity: "Uncommon",
    flavor_text: "Raising the dead is easy. Getting them to pay attention is the hard part.",
    card_set: "Undead College",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/8de2bc37-70d6-423b-b6e3-a240af57f8c9/0_3.png"
  },
  {
    id: 120,
    name: "Literary Blood Bath",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 3 }],
    strength: undefined,
    durability: undefined,
    text: "Consume 2.",
    abilities: { "consume": { "value": 2 } },
    faction: "Undead College",
    rarity: "Rare",
    flavor_text: "Return by due date... or else.",
    card_set: "Undead College",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/28a3d289-cffd-470e-b02e-30d1ac9e21a9/0_0.png"
  },
  {
    id: 152,
    name: "Moonless Malice",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 20, "count": 3 }],
    strength: 8,
    durability: 6,
    commandNumber: 10,
    text: "Phasing. Executioner.",
    abilities: { "phasing": true, "executioner": true },
    faction: "Creatures of the Night",
    rarity: "Mythic",
    flavor_text: "Not all black dogs are omens. Some are promises.",
    card_set: "Creatures of the Night",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/8e748696-1f6d-4160-a141-b5f11382b719/0_3.png"
  },
  {
    id: 174,
    name: "Crenellation Creeper",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 23, "count": 3 }],
    strength: 5,
    durability: 10,
    commandNumber: 10,
    text: "Entrenched. Fortify 15.",
    abilities: { "entrenched": true, "fortify": { "value": 15 } },
    faction: "Creatures of the Night",
    rarity: "Mythic",
    flavor_text: "The castle stood for centuries. Now we know what was holding it up.",
    card_set: "Creatures of the Night",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/88794e59-b292-4f22-a55c-0cd5514382eb/0_1.png"
  },
  {
    id: 240,
    name: "The Shepherd Paradox",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 21, "count": 3 }],
    strength: 6,
    durability: 8,
    commandNumber: 10,
    text: "Executioner. Rally.",
    abilities: { "executioner": true, "rally": true },
    faction: "Biotica Fantasia",
    rarity: "Mythic",
    flavor_text: "To create the perfect flock, must one first become the wolf?",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3d355029-3231-498e-bd28-791c8bbefba3/0_0.png"
  },
  {
    id: 250,
    name: "Lord of the Bramble",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 23, "count": 3 }],
    strength: 8,
    durability: 7,
    commandNumber: 10,
    text: "Barrage. Decay.",
    abilities: { "barrage": true, "decay": true },
    faction: "Biotica Fantasia",
    rarity: "Mythic",
    flavor_text: "His armor is hatred, his weapon is spite, his kingdom is rot.",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/667789bb-e27d-4610-8bef-a9d5a53b421e/0_0.png"
  },
{
    id: 251,
    name: "Waking Dream",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 6, "count": 2 }],
    strength: undefined,
    durability: undefined,
    text: "Siphon 2.",
    abilities: { "siphon": { "value": 2 } },
    faction: "Biotica Fantasia",
    rarity: "Uncommon",
    flavor_text: "The scent of pollen, the warmth of color, the slow surrender to sleep.",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/19735d4a-ce5b-4bfa-ab67-b6452252c493/0_0.png"
  },
  {
    id: 252,
    name: "The Ascending Path",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 5 }],
    strength: undefined,
    durability: undefined,
    text: "Generator: At the start of your turn, Fateweave 1.",
    abilities: { "generator": { "effect": { "fateweave": 1 } } },
    faction: "Artifice & Ruin",
    rarity: "Common",
    flavor_text: "Many climb. Few arrive. None return unchanged.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/0cead90a-9d8a-43c2-8048-047560038f09/0_0.png"
  },
  {
    id: 253,
    name: "Primordial Forest",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.LOCATION,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_PAIR }],
    strength: undefined,
    durability: undefined,
    text: "Generator: At the start of your turn, Rally.",
    abilities: { "generator": { "effect": "rally" } },
    faction: "Artifice & Ruin",
    rarity: "Uncommon",
    flavor_text: "Before words, before gods, there was only bark, root, and shadow.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/aae70056-b607-4e5c-a491-06073792d420/0_0.png"
  },
  {
    id: 254,
    name: "Trophy Collector",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 8, "count": 2 }],
    strength: 3,
    durability: 3,
    commandNumber: 5,
    text: "Bounty 2.",
    abilities: { "bounty": { "value": 2 } },
    faction: "Biotica Fantasia",
    rarity: "Uncommon",
    flavor_text: "Each skull tells a story of a hunt, a struggle, a final breath.",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/885fb0c2-f827-4fb2-8619-19b6d11c26e3/0_0.png"
  },
  {
    id: 255,
    name: "Kindling Fiend",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 2, value: 2 }],
    strength: 5,
    durability: 2,
    commandNumber: 7,
    text: "Fragile. Assault 2.",
    abilities: { "fragile": true, "assault": { "value": 2 } },
    faction: "Biotica Fantasia",
    rarity: "Rare",
    flavor_text: "Born in the hearth, lives for the pyre.",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/8ceac519-a7c6-4dac-8e18-c08b67cfc424/0_0.png"
  },
  {
    id: 256,
    name: "Conduit of Ire",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.ARTIFACT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.THREE_OF_A_KIND }],
    strength: undefined,
    durability: undefined,
    text: "Augment. Amplify.",
    abilities: { "augment": { "cost": [{ type: DiceCostType.ANY_PAIR }] }, "amplify": { "cost": [{ type: DiceCostType.MIN_VALUE, "count": 1, "value": 6 }] } },
    faction: "Artifice & Ruin",
    rarity: "Rare",
    flavor_text: "Grasp it, and feel the forest's fury surge through your veins.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/0bfeb5e7-71b2-4f0c-aea0-d81c1709230b/0_0.png"
  },
  {
    id: 257,
    name: "Global Headache",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.ANY_X_DICE, "count": 2 }],
    strength: 2,
    durability: 3,
    commandNumber: 4,
    text: "Target opponent discards 1 card.",
    abilities: { "discard": { "value": 1 }, "requiresTarget": true },
    faction: "Artifice & Ruin",
    rarity: "Uncommon",
    flavor_text: "Too much information. Too much noise. Too much everything.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/085862ed-c373-45ab-b5eb-197d3724f5e1/0_0.png"
  },
  {
    id: 258,
    name: "Abyssal Snapclaw",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.MIN_VALUE, count: 1, value: 6 }],
    strength: 3,
    durability: 1,
    commandNumber: 3,
    text: "",
    abilities: {},
    faction: "Biotica Fantasia",
    rarity: "Common",
    flavor_text: "Its claw can crush submarines or gently pluck a single glowing krill.",
    card_set: "Biotica Fantasia",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/9e0a2373-2734-4609-9400-491301fa0c64/0_0.png"
  },
  {
    id: 259,
    name: "Zone Custodian",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.EXACT_VALUE, count: 1, value: 4 }],
    strength: 1,
    durability: 2,
    commandNumber: 2,
    text: "Shield.",
    abilities: { "shield": true },
    faction: "Artifice & Ruin",
    rarity: "Common",
    flavor_text: "His suit keeps the bad air out. What does it keep in?",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/c1b685af-dbd4-4819-89f1-3ab6d99d9926/0_0.png"
  },
  {
    id: 260,
    name: "Furnace Automaton",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.SUM_OF_X_DICE, "sum": 7, "count": 2 }],
    strength: 2,
    durability: 4,
    commandNumber: 5,
    text: "Decay.",
    abilities: { "decay": true },
    faction: "Artifice & Ruin",
    rarity: "Uncommon",
    flavor_text: "It feeds the fire, never questioning the purpose of the flames.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/3a9a746f-394e-41d0-9407-91351b3752ed/0_0.png"
  },
  {
    id: 261,
    name: "Mind Expansion",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.EVENT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.STRAIGHT, "count": 3 }],
    strength: undefined,
    durability: undefined,
    text: "Draw 3 cards.",
    abilities: { "draw": { "value": 3 } },
    faction: "Artifice & Ruin",
    rarity: "Rare",
    flavor_text: "Let go of the shore. The current knows the way.",
    card_set: "Artifice & Ruin",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/bdbb7490-0538-4698-9d0e-cf6b9b99ff8e/0_0.png"
  },
  {
    id: 262,
    name: "Ocnog, The Wonder",
    // FIX: Replaced string literal with CardType enum member.
    type: CardType.UNIT,
    // FIX: Replaced string literal with DiceCostType enum member.
    dice_cost: [{ type: DiceCostType.FOUR_OF_A_KIND }],
    strength: 10,
    durability: 10,
    commandNumber: 10,
    text: "Annihilate. Warp.",
    abilities: { "annihilate": true, "warp": true },
    faction: "Volume #2",
    rarity: "Mythic",
    flavor_text: "Born from the dust of imagination",
    card_set: "Volume #2",
    author: "Fry",
    imageUrl: "https://cdn.midjourney.com/video/0a7f029f-4455-44bf-94f7-789ff22f2770/1.mp4"
  }
]
