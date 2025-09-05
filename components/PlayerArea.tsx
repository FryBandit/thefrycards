
import React from 'react';
import { Player } from '../game/types';
import Card from './Card';
import type { CardInGame } from '../game/types';


interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
  onCardClick: (card: CardInGame) => void;
  isCardPlayable: (card: CardInGame) => boolean;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, isOpponent = false, onCardClick, isCardPlayable }) => {
  const areaClasses = isOpponent ? "flex-col-reverse" : "flex-col";
  
  return (
    <div className={`flex w-full h-1/2 ${areaClasses}`}>
      {/* Field Area (Units, Locations, etc.) */}
      <div className="h-1/2 w-full bg-black/20 flex items-center justify-center p-2">
        <div className="flex gap-4">
          {player.units.map(card => (
            <Card key={card.instanceId} card={card} />
          ))}
           {player.locations.map(card => (
            <Card key={card.instanceId} card={card} />
          ))}
           {player.artifacts.map(card => (
            <Card key={card.instanceId} card={card} />
          ))}
        </div>
      </div>

      {/* Hand & Player Info Area */}
      <div className="h-1/2 w-full flex">
        <div className="w-1/4 h-full bg-st-patricks-blue/30 p-4 flex flex-col justify-between text-white">
          <div>
            <h2 className={`text-2xl font-bold ${isCurrentPlayer ? 'text-neon-cyan' : ''}`}>{player.name}</h2>
            <p className="text-4xl font-black text-red-400">{player.command} <span className="text-lg">Command</span></p>
          </div>
          <div className="space-y-2 text-sm">
            <p>Deck: {player.deck.length}</p>
            <p>Hand: {player.hand.length}</p>
            <p>Graveyard: {player.graveyard.length}</p>
          </div>
        </div>
        <div className="w-3/4 h-full bg-black/20 flex items-center justify-center p-2 space-x-2">
          {player.hand.map(card => (
            <div key={card.instanceId} className={isOpponent ? 'transform -translate-y-2' : ''}>
                 <Card
                    card={card}
                    inHand={!isOpponent}
                    isPlayable={!isOpponent && isCurrentPlayer && isCardPlayable(card)}
                    onClick={() => !isOpponent && onCardClick(card)}
                />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;
