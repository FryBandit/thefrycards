import { CardDefinition, CardType, DiceCost } from './types';
import { supabase } from '../lib/supabaseClient';

// Helper to shuffle arrays
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const fetchCardDefinitions = async (): Promise<CardDefinition[]> => {
    // This type represents the raw data structure from the Supabase 'cards' table
    type RawCardData = {
      id: number;
      title: string;
      type: CardType;
      dice_cost: DiceCost[];
      strength?: number;
      durability?: number;
      command_number: number;
      abilities?: { [key: string]: any };
      image_url?: string;
      rarity?: string;
      flavor_text?: string;
      set?: string;
      author?: string;
      text: string;
      faction?: string;
    };

    const { data, error } = await supabase.from('cards').select('*');

    if (error) {
        console.error('Error fetching card definitions:', error);
        throw new Error(`Failed to fetch card definitions: ${error.message}`);
    }

    const rawCards = data as RawCardData[];

    if (!rawCards) {
        console.error('Invalid data format from Supabase:', data);
        throw new Error('Failed to parse card definitions from Supabase response.');
    }

    // Process the raw data to match the CardDefinition interface used in the game
    return rawCards.map(rawCard => {
        const { title, image_url, set, command_number, ...rest } = rawCard;
        const card: CardDefinition = {
            ...rest,
            name: title, // Rename 'title' to 'name' for consistency with the game's code
            imageUrl: image_url, // Rename 'image_url' to 'imageUrl'
            card_set: set, // Rename 'set' to 'card_set'
            commandNumber: command_number, // Rename 'command_number' to 'commandNumber'
            abilities: rawCard.abilities || {},
            dice_cost: rawCard.dice_cost || [],
        };
        return card;
    });
};

// Helper to build a valid, randomized deck from the full card list
export const buildDeckFromCards = (allCards: CardDefinition[]): CardDefinition[] => {
    const deck: CardDefinition[] = [];
    const requiredComposition = {
        [CardType.LOCATION]: 2,
        [CardType.UNIT]: 8,
        [CardType.EVENT]: 5,
        [CardType.ARTIFACT]: 2,
    };

    const totalCards = Object.values(requiredComposition).reduce((a, b) => a + b, 0);

    for (const [cardType, count] of Object.entries(requiredComposition)) {
        const availableCards = allCards.filter(c => c.type === (cardType as CardType));
        const shuffled = shuffle(availableCards);
        const cardsToAdd = shuffled.slice(0, count);

        if (cardsToAdd.length < count) {
            console.warn(`Not enough cards of type ${cardType} to build a full deck. Found ${cardsToAdd.length}, needed ${count}.`);
        }

        deck.push(...cardsToAdd);
    }

    if (deck.length < totalCards) {
        console.error(`Deck is incomplete! Only found ${deck.length}/${totalCards} cards.`);
        const remainingNeeded = totalCards - deck.length;
        const allOtherCards = allCards.filter(c => !deck.some(dc => dc.id === c.id));
        const fallbackCards = shuffle(allOtherCards).slice(0, remainingNeeded);
        deck.push(...fallbackCards);
    }

    return shuffle(deck); // Shuffle the final deck
};
