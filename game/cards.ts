import { CardDefinition, CardType } from './types';
import { supabase } from '../lib/supabaseClient';

export const fetchCardDefinitions = async (): Promise<CardDefinition[]> => {
    const { data, error } = await supabase.functions.invoke('get-all-cards');

    if (error) {
        console.error('Error invoking get-all-cards function:', error);
        throw new Error(`Failed to fetch card definitions: ${error.message}`);
    }

    if (!data || !data.cards) {
        console.error('Invalid data format from function response:', data);
        throw new Error('Failed to parse card definitions from function response.');
    }

    // The data from the function is expected to be in the correct format.
    return data.cards;
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