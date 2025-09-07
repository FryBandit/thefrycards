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
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center w-12 h-12 bg-black/20 p-1 rounded hover:bg-arcane-primary transition-colors border-2 border-transparent hover:border-vivid-cyan active:scale-95 ${animClass} ${value === 0 ? 'opacity-60' : ''}`} title={title}>
        {children}
        {value > 0 && (
            <div className="absolute -top-1 -right-1 bg-vivid-yellow text-arcane-bg font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {value}
            </div>
        )}
    </button>
);

const StatusEffectIcon: React.FC<{ title: string, bgColor: string, icon: React.ReactNode }> = ({ title, bgColor, icon }) => (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bgColor}`} title={title}>
        {icon}
    </div>
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
    const handAnim = useStatAnimation(player.hand.length);
    const graveAnim = useStatAnimation(player.graveyard.length);
    const oblivionAnim = useStatAnimation(player.oblivion.length);

    const isMoraleFortified = [...player.units, ...player.locations, ...player.artifacts].some(c => c.abilities?.fortify);

    return (
    <div className={`w-full bg-arcane-surface/80 backdrop-blur-sm p-2 rounded-lg text-white flex items-center justify-between border-2 transition-all duration-500 ${isCurrent ? 'border-vivid-cyan shadow-vivid-cyan' : 'border-arcane-border'}`}>
        <div className={`flex items-center gap-3 ${isOpponent ? 'flex-row-reverse' : ''}`}>
            <div>
                <h2 className={`text-lg font-bold truncate ${isCurrent ? 'text-vivid-cyan' : ''} ${isOpponent ? 'text-right' : 'text-left'}`}>{player.name}</h2>
                <div className="flex items-center gap-2">
                    <p className={`text-3xl font-black text-vivid-pink ${moraleAnim}`}>{player.morale}</p>
                     {/* Status Effects */}
                    <div className={`flex gap-1.5 text-xs font-bold uppercase tracking-wider text-center ${isOpponent ? 'flex-row-reverse' : ''}`}>
                        {isMoraleFortified && <StatusEffectIcon title="Morale Fortified" bgColor="bg-blue-800/80" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>} />}
                        {player.skipNextDrawPhase > 0 && <StatusEffectIcon title={`Will skip next ${player.skipNextDrawPhase} draw phase(s)`} bgColor="bg-yellow-800/80" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 0v12h4V4H8z" /></svg>} />}
                        {player.diceModifier < 0 && <StatusEffectIcon title={`Will roll ${player.diceModifier} fewer dice`} bgColor="bg-red-800/80" icon={<span className="font-black text-red-300 text-sm">{player.diceModifier}</span>} />}
                    </div>
                </div>
            </div>
           
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
            <StatIcon animClass={handAnim} title={`Hand: ${player.hand.length} cards`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                <div className="opacity-75">{player.hand.length}</div>
            </StatIcon>
            
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