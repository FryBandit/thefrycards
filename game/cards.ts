import { CardDefinition, CardType } from './types';
import { supabase } from '../lib/supabaseClient';

export const fetchCardDefinitions = async (): Promise<CardDefinition[]> => {
    const { data, error } = await supabase
        .from('cards')
        .select('*');

    if (error) {
        console.error('Error fetching cards:', error);
        return [];
    }
    
    // Transform Supabase data to CardDefinition
    return data.map((card: any) => ({
        id: card.id,
        name: card.name,
        type: card.type as CardType,
        cost: card.cost, // Assuming 'cost' column is JSONB matching DiceCost[]
        strength: card.strength,
        durability: card.durability,
        commandNumber: card.command_number,
        text: card.text,
        keywords: card.keywords, // Assuming 'keywords' column is JSONB matching keywords object
        imageUrl: card.image_url,
    }));
};

// Helper to build a valid deck from the full card list
export const buildDeckFromCards = (allCards: CardDefinition[]): CardDefinition[] => {
    const findCard = (id: number): CardDefinition | undefined => {
        return allCards.find(c => c.id === id);
    };

    const deck: CardDefinition[] = [];
    const cardIds = [
        // 2 Locations
        11, 12,
        // 8 Units
        41, 31, 46, 17, 40, 43, 44, 45,
        // 5 Events
        42, 19, 38, 39, 16,
        // 2 Artifacts
        30, 24,
    ];

    for (const id of cardIds) {
        const card = findCard(id);
        if (card) {
            deck.push(card);
        } else {
            console.warn(`Card with ID ${id} not found for deck building.`);
        }
    }
    
    if (deck.length !== cardIds.length) {
        console.error("Deck is incomplete! Some cards were not found.");
    }

    return deck;
}
