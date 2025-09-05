
import { CardDefinition, CardType } from './types';
import { cardDefinitions } from './card-definitions';
import { shuffle } from './utils';

export const fetchCardDefinitions = async (): Promise<CardDefinition[]> => {
  // Return a resolved promise with the imported card data.
  // This removes the dependency on the Google Sheet and makes the card library local.
  return Promise.resolve(cardDefinitions);
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