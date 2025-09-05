import { CardDefinition, CardType, DiceCost, DiceCostType } from './types';
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

const parseAbilities = (abilitiesString: string | undefined): { [key: string]: any } => {
    if (!abilitiesString) return {};
    const abilities: { [key: string]: any } = {};
    const parts = abilitiesString.split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
        const match = part.match(/(\w+)(?:\((\d+)\))?/);
        if (match) {
            const [, name, value] = match;
            abilities[name.toLowerCase()] = value !== undefined ? parseInt(value, 10) : true;
        }
    }
    return abilities;
};

const parseDiceCost = (diceCostString: string | undefined): DiceCost[] => {
    if (!diceCostString) return [];
    const costs: DiceCost[] = [];
    const parts = diceCostString.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (const part of parts) {
        const anyXDiceMatch = part.match(/^any (\d+)/);
        if (anyXDiceMatch) {
            costs.push({ type: DiceCostType.ANY_X_DICE, count: parseInt(anyXDiceMatch[1], 10) });
            continue;
        }
        const sumMatch = part.match(/^sum\((\d+),\s*(\d+)\)$/);
        if (sumMatch) {
            costs.push({ type: DiceCostType.SUM_OF_X_DICE, value: parseInt(sumMatch[1], 10), count: parseInt(sumMatch[2], 10) });
            continue;
        }
        const straightMatch = part.match(/^straight\((\d+)\)$/);
        if (straightMatch) {
            costs.push({ type: DiceCostType.STRAIGHT, count: parseInt(straightMatch[1], 10) });
            continue;
        }
        const exactMatch = part.match(/^(\d+)x(\d+)$/);
        if (exactMatch) {
            costs.push({ type: DiceCostType.EXACT_VALUE, count: parseInt(exactMatch[1], 10), value: parseInt(exactMatch[2], 10) });
            continue;
        }
        const minMatch = part.match(/^(\d+)\+$/);
        if (minMatch) {
            costs.push({ type: DiceCostType.MIN_VALUE, value: parseInt(minMatch[1], 10), count: 1 });
            continue;
        }
        
        switch(part) {
            case 'anypair': costs.push({ type: DiceCostType.ANY_PAIR }); break;
            case 'twopair': costs.push({ type: DiceCostType.TWO_PAIR }); break;
            case 'threeofakind': costs.push({ type: DiceCostType.THREE_OF_A_KIND }); break;
            case 'fourofakind': costs.push({ type: DiceCostType.FOUR_OF_A_KIND }); break;
            case 'fullhouse': costs.push({ type: DiceCostType.FULL_HOUSE }); break;
            default:
                console.warn(`Unrecognized dice cost part: ${part}`);
        }
    }
    return costs;
};

export const fetchCardDefinitions = async (): Promise<CardDefinition[]> => {
    // This type represents the raw data structure from the Supabase 'cards' table
    type RawCardData = {
      id: number;
      title: string;
      type: CardType;
      dice_cost: string;
      strength?: number;
      durability?: number;
      command_number: number;
      abilities?: string;
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
        
        let fullImageUrl: string | undefined = undefined;
        if (image_url) {
            try {
                // The `image_url` column likely stores the path to the file in a Supabase Storage bucket.
                // We need to construct the full public URL to display the image.
                const { data: imageUrlData } = supabase.storage.from('card-art').getPublicUrl(image_url);
                if (imageUrlData && imageUrlData.publicUrl) {
                    fullImageUrl = imageUrlData.publicUrl;
                } else {
                    console.warn(`Could not retrieve public URL for image: ${image_url} for card: ${rawCard.title}`);
                }
            } catch (e) {
                console.error(`An error occurred while getting public URL for ${image_url}`, e);
            }
        }

        const card: CardDefinition = {
            ...rest,
            name: title, // Rename 'title' to 'name' for consistency with the game's code
            imageUrl: fullImageUrl, // Use the fully constructed public URL
            card_set: set, // Rename 'set' to 'card_set'
            commandNumber: command_number, // Rename 'command_number' to 'commandNumber'
            abilities: parseAbilities(rawCard.abilities),
            dice_cost: parseDiceCost(rawCard.dice_cost),
        };
        return card;
    });
};

export const requiredComposition = {
    [CardType.LOCATION]: 2,
    [CardType.UNIT]: 8,
    [CardType.EVENT]: 5,
    [CardType.ARTIFACT]: 2,
};

// Helper to build a valid, randomized deck from the full card list
export const buildDeckFromCards = (allCards: CardDefinition[]): CardDefinition[] => {
    const deck: CardDefinition[] = [];

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
        console.error(`Deck is incomplete! Only found ${deck.length}/${totalCards} cards. This should not happen if pre-flight checks are working correctly.`);
    }

    return shuffle(deck); // Shuffle the final deck
};