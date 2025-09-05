import React from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'void') => void;
}

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, isCurrent, isOpponent = false, onZoneClick }) => (
    <div className={`w-64 bg-cyber-surface/80 backdrop-blur-sm p-4 rounded-lg text-white h-full flex flex-col justify-between border-2 ${isCurrent ? 'border-neon-cyan shadow-neon-cyan animate-pulse-glow' : 'border-cyber-border'}`}>
        <div>
            <h2 className={`text-2xl font-bold truncate ${isCurrent ? 'text-neon-cyan' : ''}`}>{player.name}</h2>
            <p className={`text-4xl font-black ${isOpponent ? 'text-right' : 'text-left'} text-neon-pink`}>{player.command} <span className="text-lg opacity-75">Command</span></p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold">
            <div className="bg-black/20 p-1 rounded">
                <div className="font-bold text-lg text-neon-yellow">{player.deck.length}</div>
                <div className="opacity-75">Deck</div>
            </div>
            <div className="bg-black/20 p-1 rounded">
                <div className="font-bold text-lg text-neon-yellow">{player.hand.length}</div>
                <div className="opacity-75">Hand</div>
            </div>
            <button onClick={() => onZoneClick('graveyard')} className="bg-black/20 p-1 rounded hover:bg-cyber-primary transition-colors">
                <div className="font-bold text-lg text-neon-yellow">{player.graveyard.length}</div>
                <div className="opacity-75">Grave</div>
            </button>
             <button onClick={() => onZoneClick('void')} className="bg-black/20 p-1 rounded hover:bg-cyber-primary transition-colors">
                <div className="font-bold text-lg text-neon-yellow">{player.void.length}</div>
                <div className="opacity-75">Void</div>
            </button>
        </div>
    </div>
);

export default PlayerInfoPanel;