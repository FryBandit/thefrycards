import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'void') => void;
}

const StatDisplay: React.FC<{ value: number; animClass: string; children: React.ReactNode; }> = ({ value, animClass, children }) => (
    <div className="flex flex-col items-center justify-center bg-black/20 p-1 rounded w-full h-full">
        {children}
        <div className={`font-bold text-lg text-neon-yellow ${animClass}`}>{value}</div>
    </div>
);

const ClickableStatDisplay: React.FC<{ value: number; animClass: string; onClick: () => void; children: React.ReactNode; }> = ({ value, animClass, onClick, children }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-black/20 p-1 rounded hover:bg-cyber-primary transition-colors border-2 border-transparent hover:border-neon-cyan w-full h-full">
        {children}
        <div className={`font-bold text-lg text-neon-yellow ${animClass}`}>{value}</div>
    </button>
);


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
    <div className={`w-64 bg-cyber-surface/80 backdrop-blur-sm p-3 rounded-lg text-white h-full flex flex-col justify-between border-2 ${isCurrent ? 'border-neon-cyan shadow-neon-cyan animate-pulse-glow' : 'border-cyber-border'}`}>
        <div>
            <h2 className={`text-xl font-bold truncate ${isCurrent ? 'text-neon-cyan' : ''} ${isOpponent ? 'text-right' : 'text-left'}`}>{player.name}</h2>
            <p className={`text-4xl font-black ${isOpponent ? 'text-right' : 'text-left'} text-neon-pink ${commandAnim}`}>{player.command} <span className="text-base opacity-75">CMD</span></p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold">
            <StatDisplay value={player.deck.length} animClass={deckAnim}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm2 0v12h6V4H7z" />
                </svg>
                <div className="opacity-75">Deck</div>
            </StatDisplay>
             <StatDisplay value={player.hand.length} animClass={handAnim}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
                </svg>
                <div className="opacity-75">Hand</div>
            </StatDisplay>
            <ClickableStatDisplay value={player.graveyard.length} animClass={graveAnim} onClick={() => onZoneClick('graveyard')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v2a1 1 0 11-2 0V9zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <div className="opacity-75">Grave</div>
            </ClickableStatDisplay>
            <ClickableStatDisplay value={player.void.length} animClass={voidAnim} onClick={() => onZoneClick('void')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 4.332a6 6 0 118.485 8.485A6 6 0 014.332 4.332z" clipRule="evenodd" />
                </svg>
                <div className="opacity-75">Void</div>
            </ClickableStatDisplay>
        </div>
    </div>
    );
};

export default PlayerInfoPanel;