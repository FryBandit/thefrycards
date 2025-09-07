

export const KEYWORD_DEFINITIONS: { [key: string]: string } = {
  // High-Rarity & Mythic
  'Obliterate': 'When a unit with Obliterate enters the battlefield, it sends all other units to Oblivion. The opponent loses Morale equal to the Morale Value of each of their banished units. Immutable units are immune. Obliterate bypasses on-destruction effects like Haunt or Martyrdom.',
  'Vanish': 'When a unit with this keyword enters the battlefield, it is sent to Oblivion. It then returns to the battlefield under your control at the start of your Xth next turn, triggering any Arrival abilities again.',

  // Location & Artifact
  'Augment': 'An artifact with this keyword can be attached to a unit you control by paying a specified dice cost, granting it a bonus.',
  'Consume': 'An artifact with this keyword enters play with X "charge counters." Its activated ability requires removing a counter as a cost, and it is sacrificed when it has no counters left.',
  'Fortify': 'A location with this keyword prevents your Morale total from being reduced below X by damage. This does not prevent Morale loss from effects like Malice or a unit\'s destruction penalty.',
  'Blessing': 'At the start of your turn, a location with this keyword provides a recurring effect (e.g., drawing a card, gaining Morale).',
  'Landmark': 'A player can only control one card with the Landmark keyword at a time. Playing a new Landmark will destroy the one you already control.',
  
  // Negative Keywords
  'Bounty': 'A negative keyword. When a unit with Bounty is destroyed by an opponent, that opponent gains X Morale.',
  'Instability': 'A negative keyword. When you play a card with this keyword, you roll one fewer command die on your next turn. This effect can stack.',
  'Malice': 'When this unit is destroyed, its controller loses X Morale.',
  'Decay': 'At the start of your turn, this unit takes 1 damage.',

  // Unit-specific keywords
  'Reconstruct': 'A unit with this keyword has an activated ability that allows the player to pay a dice cost to remove all damage from it.',
  'Synergy': 'A card with this keyword gains a bonus to its stats for each other card you control from the specified faction. This is a self-buff.',
  'Wild': 'The cost for a card with this keyword can be paid with a die of any value, making it much easier to play.',

  // Action Keywords
  'Amplify': 'Offers tactical flexibility. You may play the card for its base effect, or pay an additional Amplify cost to get a more powerful version of the effect.',
  'Evoke': 'Play a card for an alternate, usually cheaper, cost to get a different, smaller effect. This provides flexibility, allowing you to use a situational card for a simple effect like drawing a card if you can\'t use its main ability.',
  'Recall': 'An effect that returns one of your units from the field to your hand. This is a powerful way to save a damaged unit, remove negative effects from it, or re-use its powerful "Arrival" abilities.',
  'Reclaim': 'Play a card directly from your graveyard by paying its Reclaim cost. A reclaimed card is sent to Oblivion (removed from the game permanently) when it leaves the field, preventing it from being used again.',
  'Exhaust': 'A potent disruption effect that forces your opponent to skip their next Draw Phase, denying them resources.',
  
  // Core Gameplay Keywords
  'Strike': 'This unit gets +X Strength during your Strike Phase.',
  'Barrage': 'Arrival: Deal X damage to each enemy unit.',
  'Breach': 'This unit cannot be targeted by opponent\'s Events until after it has participated in a Strike.',
  'Echo': 'When this unit enters the field, create a token copy of it. Tokens are sent to Oblivion when they leave the field.',
  'Entrenched': 'This unit does not participate in Strikes.',
  'Executioner': 'When this unit destroys a unit with one of its abilities, the opponent loses X Morale.',
  'Prophecy': 'Arrival: Gain X additional dice rolls this turn.',
  'Fragile': 'This unit takes double damage from Events.',
  'Haunt': 'When this unit is destroyed, the opponent loses X Morale.',
  'Immutable': 'The ultimate protection. A card with Immutable cannot be targeted, damaged, destroyed, or otherwise affected by an opponent\'s cards or abilities. It can only be defeated in combat.',
  'Martyrdom': 'When this unit is destroyed, a bonus effect triggers (e.g., draw a card, deal damage to opponent).',
  'Overload': 'This unit gains bonus Strength based on the number of cards in your graveyard.',
  'Phasing': 'This unit\'s damage during a Strike cannot be prevented and is dealt directly to the opponent\'s Morale.',
  'Rally': 'This unit gains +1 Strength for each other friendly unit you control with the Rally keyword.',
  'Resonance': 'A high-risk, high-reward ability. Upon playing the card, you reveal the top card of your deck. If its Morale Value is X or higher, a bonus effect triggers.',
  'Siphon': 'When this unit deals damage to the opponent during a Strike, you gain X Morale.',
  'Stealth': 'This unit cannot be targeted by opponent\'s Events.',
  'Venomous': 'When this unit deals damage to another unit, the damaged unit is marked for destruction.',
  'Shield': 'Prevents the next instance of damage this unit would take this turn. Resets at the start of its controller\'s turn.',
  
  // Event Keywords
  'Chain Reaction': 'This card\'s effect may trigger additional, chained effects when played.',
  'Weaken': 'An Event effect that gives a target unit -X Strength.',
  'Discard': 'An Event effect that forces the opponent to discard X cards at random.',
  'Purge': 'An Event effect that sends X random cards from the opponent\'s graveyard to Oblivion.',
  'Warp': 'An Event effect that lets you take an extra turn after this one.',
  'Disrupt': 'Arrival: Your opponent rolls X fewer dice on their next turn.',
  'Draw': 'Arrival: Draw X card(s).',
  'Banish': 'An effect that moves a target from the field to the Oblivion zone.',

  // Ability Keywords
  'Spike': 'An activated ability that increases the value of one of your available dice.',
};
