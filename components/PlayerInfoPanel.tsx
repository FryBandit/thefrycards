
import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'oblivion') => void;
}

const StatDisplay: React.FC<{ value: number; animClass: string; children: React.ReactNode; }> = ({ value, animClass, children }) => (
    <div className="flex flex-col items-center justify-center bg-black/20 p-1 rounded w-full h-full">
        {children}
        <div className={`font-bold text-lg md:text-xl text-vivid-yellow ${animClass}`}>{value}</div>
    </div>
);

const ClickableStatDisplay: React.FC<{ value: number; animClass: string; onClick: () => void; children: React.ReactNode; }> = ({ value, animClass, onClick, children }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-black/20 p-1 rounded hover:bg-arcane-primary transition-colors border-2 border-transparent hover:border-vivid-cyan active:scale-95 w-full h-full">
        {children}
        <div className={`font-bold text-lg md:text-xl text-vivid-yellow ${animClass}`}>{value}</div>
    </button>
);


const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, isCurrent, isOpponent = false, onZoneClick }) => {
    // Morale Animation
    const [moraleAnim, setMoraleAnim] = useState('');
    const prevMorale = useRef(player.morale);
    useEffect(() => {
        if (prevMorale.current !== player.morale) {
            setMoraleAnim(player.morale < prevMorale.current ? 'animate-flash-red' : 'animate-flash-green');
            const timer = setTimeout(() => setMoraleAnim(''), 800);
            prevMorale.current = player.morale;
            return () => clearTimeout(timer);
        }
    }, [player.morale]);
    
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
    
    // Oblivion Animation
    const [oblivionAnim, setOblivionAnim] = useState('');
    const prevOblivion = useRef(player.oblivion.length);
    useEffect(() => {
        if (prevOblivion.current !== player.oblivion.length) {
            setOblivionAnim('animate-pulse-yellow');
            const timer = setTimeout(() => setOblivionAnim(''), 700);
            prevOblivion.current = player.oblivion.length;
            return () => clearTimeout(timer);
        }
    }, [player.oblivion.length]);


    return (
    <div className={`w-40 md:w-64 bg-arcane-surface/80 backdrop-blur-sm p-2 md:p-3 rounded-lg text-white h-full flex flex-col justify-between border-2 ${isCurrent ? 'border-vivid-cyan shadow-vivid-cyan animate-pulse-glow' : 'border-arcane-border'}`}>
        <div>
            <h2 className={`text-lg md:text-xl font-bold truncate ${isCurrent ? 'text-vivid-cyan' : ''} ${isOpponent ? 'text-right' : 'text-left'}`}>{player.name}</h2>
            <p className={`text-3xl md:text-4xl font-black ${isOpponent ? 'text-right' : 'text-left'} text-vivid-pink ${moraleAnim}`}>{player.morale} <span className="text-sm md:text-base opacity-75">MOR</span></p>
        </div>
        <div className="grid grid-cols-2 gap-1 md:gap-2 text-center text-xs font-semibold">
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
            <ClickableStatDisplay value={player.oblivion.length} animClass={oblivionAnim} onClick={() => onZoneClick('oblivion')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 4.332a6 6 0 118.485 8.485A6 6 0 014.332 4.332z" clipRule="evenodd" />
                </svg>
                <div className="opacity-75">Oblivion</div>
            </ClickableStatDisplay>
        </div>
    </div>
    );
};

export default PlayerInfoPanel;