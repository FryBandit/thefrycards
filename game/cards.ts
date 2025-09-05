
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
    // The raw data from Supabase is expected to have 'abilities' as a JSON object
    // and 'dice_cost' as a JSON array. The CardDefinition type has been updated to reflect this.
    type RawCardData = Omit<CardDefinition, 'abilities' | 'dice_cost'> & {
      abilities?: { [key: string]: any }; // This is now the source of abilities
      dice_cost?: DiceCost[]; // New field
      cost?: DiceCost[]; // Old field for fallback
    };

    const { data, error } = await supabase.functions.invoke('get-all-cards');


    if (error) {
        console.error('Error invoking get-all-cards function:', error);
        throw new Error(`Failed to fetch card definitions: ${error.message}`);
    }
    
    const rawCards = data?.cards as RawCardData[];

    if (!rawCards) {
        console.error('Invalid data format from function response:', data);
        throw new Error('Failed to parse card definitions from function response.');
    }

    // Process the raw data to match the CardDefinition type
    return rawCards.map(rawCard => {
        const { abilities, dice_cost, cost, ...rest } = rawCard;
        const card: CardDefinition = { 
            ...rest, 
            abilities: abilities || {},
            dice_cost: dice_cost || cost || [],
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
        // As a fallback, fill the rest with random cards to prevent crashes
        const remainingNeeded = totalCards - deck.length;
        const allOtherCards = allCards.filter(c => !deck.some(dc => dc.id === c.id));
        const fallbackCards = shuffle(allOtherCards).slice(0, remainingNeeded);
        deck.push(...fallbackCards);
    }

    return shuffle(deck); // Shuffle the final deck
}