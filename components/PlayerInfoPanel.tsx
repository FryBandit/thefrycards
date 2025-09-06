import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'void') => void;
}

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, isCurrent, isOpponent = false, onZoneClick }) => {
    // Command Animation
    const [commandAnim, setCommandAnim] = useState('');
    const prevCommand = useRef(player.command);
    useEffect(() => {
        if (prevCommand.current !== player.command) {
            setCommandAnim(player.command < prevCommand.current ? 'animate-flash-red' : 'animate-flash-green');
            const timer = setTimeout(() => setCommandAnim(''), 800);
            prevCommand.current = player.command;
            return () => clearTimeout(timer);
        }
    }, [player.command]);
    
    // Deck Animation
    const [deckAnim, setDeckAnim] = useState('');
    const prevDeck = useRef(player.deck.length);
    useEffect(() => {
        if (prevDeck.current !== player.deck.length) {
            setDeckAnim('animate-pulse-yellow');
            const timer = setTimeout(() => setDeckAnim(''), 700);
            prevDeck.current = player.deck.length;
            return () => clearTimeout(timer);
        }
    }, [player.deck.length]);

    // Hand Animation
    const [handAnim, setHandAnim] = useState('');
    const prevHand = useRef(player.hand.length);
    useEffect(() => {
        if (prevHand.current !== player.hand.length) {
            setHandAnim('animate-pulse-yellow');
            const timer = setTimeout(() => setHandAnim(''), 700);
            prevHand.current = player.hand.length;
            return () => clearTimeout(timer);
        }
    }, [player.hand.length]);
    
    // Graveyard Animation
    const [graveAnim, setGraveAnim] = useState('');
    const prevGrave = useRef(player.graveyard.length);
    useEffect(() => {
        if (prevGrave.current !== player.graveyard.length) {
            setGraveAnim('animate-pulse-yellow');
            const timer = setTimeout(() => setGraveAnim(''), 700);
            prevGrave.current = player.graveyard.length;
            return () => clearTimeout(timer);
        }
    }, [player.graveyard.length]);
    
    // Void Animation
    const [voidAnim, setVoidAnim] = useState('');
    const prevVoid = useRef(player.void.length);
    useEffect(() => {
        if (prevVoid.current !== player.void.length) {
            setVoidAnim('animate-pulse-yellow');
            const timer = setTimeout(() => setVoidAnim(''), 700);
            prevVoid.current = player.void.length;
            return () => clearTimeout(timer);
        }
    }, [player.void.length]);


    return (
    <div className={`w-64 bg-cyber-surface/80 backdrop-blur-sm p-4 rounded-lg text-white h-full flex flex-col justify-between border-2 ${isCurrent ? 'border-neon-cyan shadow-neon-cyan animate-pulse-glow' : 'border-cyber-border'}`}>
        <div>
            <h2 className={`text-2xl font-bold truncate ${isCurrent ? 'text-neon-cyan' : ''} ${isOpponent ? 'text-right' : 'text-left'}`}>{player.name}</h2>
            <p className={`text-4xl font-black ${isOpponent ? 'text-right' : 'text-left'} text-neon-pink ${commandAnim}`}>{player.command} <span className="text-lg opacity-75">Command</span></p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold">
            <div className="bg-black/20 p-1 rounded">
                <div className={`font-bold text-lg text-neon-yellow ${deckAnim}`}>{player.deck.length}</div>
                <div className="opacity-75">Deck</div>
            </div>
            <div className="bg-black/20 p-1 rounded">
                <div className={`font-bold text-lg text-neon-yellow ${handAnim}`}>{player.hand.length}</div>
                <div className="opacity-75">Hand</div>
            </div>
            <button onClick={() => onZoneClick('graveyard')} className="bg-black/20 p-2 rounded hover:bg-cyber-primary transition-colors border-2 border-transparent hover:border-neon-cyan">
                <div className={`font-bold text-lg text-neon-yellow ${graveAnim}`}>{player.graveyard.length}</div>
                <div className="opacity-75">Grave</div>
            </button>
             <button onClick={() => onZoneClick('void')} className="bg-black/20 p-2 rounded hover:bg-cyber-primary transition-colors border-2 border-transparent hover:border-neon-cyan">
                <div className={`font-bold text-lg text-neon-yellow ${voidAnim}`}>{player.void.length}</div>
                <div className="opacity-75">Void</div>
            </button>
        </div>
    </div>
    );
};

export default PlayerInfoPanel;