
import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'oblivion') => void;
}

const StatIcon: React.FC<{ animClass: string; title: string; children: React.ReactNode; }> = ({ animClass, title, children }) => (
    <div className={`flex flex-col items-center justify-center w-12 h-12 bg-black/20 p-1 rounded ${animClass}`} title={title}>
        {children}
    </div>
);

const ClickableStatIcon: React.FC<{ value: number; animClass: string; onClick: () => void; title: string; children: React.ReactNode; }> = ({ value, animClass, onClick, title, children }) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center w-12 h-12 bg-black/20 p-1 rounded hover:bg-arcane-primary transition-colors border-2 border-transparent hover:border-vivid-cyan active:scale-95 ${animClass}`} title={title}>
        {children}
        <div className="absolute -top-1 -right-1 bg-vivid-yellow text-arcane-bg font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {value}
        </div>
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
    
    // Animation hooks for stats
    const useStatAnimation = (value: number) => {
        const [animClass, setAnimClass] = useState('');
        const prevValue = useRef(value);
        useEffect(() => {
            if (prevValue.current !== value) {
                setAnimClass('animate-pulse-yellow');
                const timer = setTimeout(() => setAnimClass(''), 700);
                prevValue.current = value;
                return () => clearTimeout(timer);
            }
        }, [value]);
        return animClass;
    };
    
    const deckAnim = useStatAnimation(player.deck.length);
    const graveAnim = useStatAnimation(player.graveyard.length);
    const oblivionAnim = useStatAnimation(player.oblivion.length);

    return (
    <div className={`w-full bg-arcane-surface/80 backdrop-blur-sm p-2 rounded-lg text-white flex items-center justify-between border-2 transition-all duration-500 ${isCurrent ? 'border-vivid-cyan shadow-vivid-cyan' : 'border-arcane-border'}`}>
        <div className={`flex items-center gap-4 ${isOpponent ? 'flex-row-reverse' : ''}`}>
            <div className={isOpponent ? 'text-right' : 'text-left'}>
                <h2 className={`text-lg font-bold truncate ${isCurrent ? 'text-vivid-cyan' : ''}`}>{player.name}</h2>
                <p className={`text-3xl font-black text-vivid-pink ${moraleAnim}`}>{player.morale}</p>
            </div>
            {/* Status Effects */}
            <div className={`flex gap-1 text-xs font-bold uppercase tracking-wider text-center ${isOpponent ? 'flex-row-reverse' : ''}`}>
                {player.isMoraleFortified && <div className="bg-blue-800/50 text-blue-300 px-2 py-0.5 rounded animate-pulse" title="Morale Fortified">Fortified</div>}
                {player.skipNextDrawPhase && <div className="bg-yellow-800/50 text-yellow-300 px-2 py-0.5 rounded" title="Will skip next draw">Stagnated</div>}
                {player.diceModifier < 0 && <div className="bg-red-800/50 text-red-300 px-2 py-0.5 rounded" title={`Will roll ${player.diceModifier} dice`}>{player.diceModifier} Dice</div>}
            </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
            <StatIcon animClass={deckAnim} title={`Deck: ${player.deck.length} cards remaining`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm2 0v12h6V4H7z" />
                </svg>
                <div className="opacity-75">{player.deck.length}</div>
            </StatIcon>

            <ClickableStatIcon value={player.graveyard.length} animClass={graveAnim} onClick={() => onZoneClick('graveyard')} title="View Graveyard">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v2a1 1 0 11-2 0V9zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="sr-only">Graveyard</span>
            </ClickableStatIcon>
            <ClickableStatIcon value={player.oblivion.length} animClass={oblivionAnim} onClick={() => onZoneClick('oblivion')} title="View Oblivion">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 4.332a6 6 0 118.485 8.485A6 6 0 014.332 4.332z" clipRule="evenodd" />
                </svg>
                <span className="sr-only">Oblivion</span>
            </ClickableStatIcon>
        </div>
    </div>
    );
};

export default PlayerInfoPanel;
