
import { CardDefinition, CardType, DiceCost, DiceCostType } from './types';

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
    // Split by comma, but not inside parentheses to handle sum(x, y)
    const parts = diceCostString.split(/,\s*(?![^()]*\))/g).map(s => s.trim().toLowerCase()).filter(Boolean);

    for (const part of parts) {
        // e.g., any_x_dice(2)
        const anyXDiceMatch = part.match(/^any_x_dice\((\d+)\)$/);
        if (anyXDiceMatch) {
            costs.push({ type: DiceCostType.ANY_X_DICE, count: parseInt(anyXDiceMatch[1], 10) });
            continue;
        }

        // e.g., sum(7, 2)
        const sumMatch = part.match(/^sum\((\d+),\s*(\d+)\)$/);
        if (sumMatch) {
            costs.push({ type: DiceCostType.SUM_OF_X_DICE, value: parseInt(sumMatch[1], 10), count: parseInt(sumMatch[2], 10) });
            continue;
        }

        // e.g., straight(4)
        const straightMatch = part.match(/^straight\((\d+)\)$/);
        if (straightMatch) {
            costs.push({ type: DiceCostType.STRAIGHT, count: parseInt(straightMatch[1], 10) });
            continue;
        }

        // e.g., 1x6
        const exactMatch = part.match(/^(\d+)x(\d+)$/);
        if (exactMatch) {
            costs.push({ type: DiceCostType.EXACT_VALUE, count: parseInt(exactMatch[1], 10), value: parseInt(exactMatch[2], 10) });
            continue;
        }

        // e.g., min(3)
        const minMatch = part.match(/^min\((\d+)\)$/);
        if (minMatch) {
            costs.push({ type: DiceCostType.MIN_VALUE, value: parseInt(minMatch[1], 10), count: 1 });
            continue;
        }
        
        // e.g., any_pair, two_pair
        switch(part.replace(/_/g, '')) {
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
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTNT7Jh9iVqAvbycdK3bZ38-fuTBwriRZY0OOXvKhIbOFri_gUbkZCNnoYHFVezTGqOAiH0p680-gSc/pub?gid=48412514&single=true&output=tsv';

    try {
        const response = await fetch(sheetUrl, { cache: 'no-store' }); // Use no-store to get latest version
        if (!response.ok) {
            throw new Error(`Failed to fetch card data: ${response.status} ${response.statusText}`);
        }
        const tsvData = await response.text();
        const rows = tsvData.split('\r\n').map(row => row.split('\t'));

        if (rows.length < 2) {
            throw new Error('No card data rows found in the spreadsheet.');
        }

        const headers = rows[0].map(h => h.trim());
        const cardDataRows = rows.slice(1);

        const rawCards = cardDataRows.map(row => {
            const card: { [key: string]: string } = {};
            headers.forEach((header, i) => {
                card[header] = row[i];
            });
            return card;
        });

        // Process the raw data to match the CardDefinition interface
        return rawCards
            .map(rawCard => {
                if (!rawCard.id || !rawCard.title) return null; // Skip empty rows

                const getNumber = (key: string, defaultValue: number | undefined = undefined): number | undefined => {
                    const value = rawCard[key];
                    if (value === null || value === undefined || value.trim() === '') return defaultValue;
                    const num = parseInt(value, 10);
                    return isNaN(num) ? defaultValue : num;
                };

                const card: CardDefinition = {
                    id: getNumber('id')!,
                    name: rawCard.title,
                    type: (rawCard.type as CardType) || CardType.UNIT,
                    dice_cost: parseDiceCost(rawCard.dice_cost),
                    strength: getNumber('strength'),
                    durability: getNumber('durability'),
                    commandNumber: getNumber('command_number')!,
                    text: rawCard.text || '',
                    abilities: parseAbilities(rawCard.abilities),
                    imageUrl: rawCard.image_url && rawCard.image_url.trim() !== '' ? rawCard.image_url.trim() : undefined,
                    faction: rawCard.faction || undefined,
                    rarity: rawCard.rarity || undefined,
                    flavor_text: rawCard.flavor_text || undefined,
                    card_set: rawCard.set || undefined,
                    author: rawCard.author || undefined,
                };
                return card;
            })
            .filter((card): card is CardDefinition => card !== null); // Filter out any null entries from empty rows

    } catch (error) {
        console.error('Error fetching or parsing card definitions from Google Sheet:', error);
        throw new Error(`Failed to process card definitions: ${error instanceof Error ? error.message : String(error)}`);
    }
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
