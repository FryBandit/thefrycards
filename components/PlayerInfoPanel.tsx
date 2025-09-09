
import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';
import Tooltip from './Tooltip';

interface PlayerInfoPanelProps {
    player: Player;
    isCurrent: boolean;
    isOpponent?: boolean;
    onZoneClick: (zone: 'graveyard' | 'oblivion') => void;
}

const StatIcon: React.FC<{ animClass: string; title: string; value: number; icon: React.ReactNode; }> = ({ animClass, title, value, icon }) => (
    <div className={`flex items-center gap-2 w-16 h-8 bg-black/20 p-1 rounded ${animClass}`} title={title}>
        {icon}
        <span className="font-bold text-base">{value}</span>
    </div>
);

const ClickableStatIcon: React.FC<{ value: number; animClass: string; onClick: () => void; title: string; icon: React.ReactNode; }> = ({ value, animClass, onClick, title, icon }) => (
    <button onClick={onClick} className={`relative flex items-center gap-2 w-16 h-8 bg-black/20 p-1 rounded hover:bg-arcane-primary transition-colors border-2 border-transparent hover:border-vivid-cyan active:scale-95 ${animClass} ${value === 0 ? 'opacity-60' : ''}`} title={title}>
        {icon}
        <span className="font-bold text-base">{value}</span>
        {value > 0 && (
            <div className="absolute -top-1.5 -right-1.5 bg-vivid-yellow text-arcane-bg font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {value}
            </div>
        )}
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
    const handAnim = useStatAnimation(player.hand.length);
    const graveAnim = useStatAnimation(player.graveyard.length);
    const oblivionAnim = useStatAnimation(player.oblivion.length);

    const isMoraleFortified = [...player.units, ...player.locations, ...player.artifacts].some(c => c.abilities?.fortify);
    
    const statusEffects = [
        isMoraleFortified && { 
            key: 'fortify', 
            title: "Morale Fortified: Morale cannot be reduced below a certain value by damage.", 
            bgColor: "bg-blue-800/80", 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg> 
        },
        player.skipNextDrawPhase > 0 && { 
            key: 'exhaust', 
            title: `Exhausted: Will skip the next ${player.skipNextDrawPhase} draw phase(s).`, 
            bgColor: "bg-yellow-800/80", 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 0v12h4V4H8z" /></svg>, 
            value: player.skipNextDrawPhase 
        },
        player.diceModifier !== 0 && { 
            key: 'disrupt', 
            title: `Disrupted: Will roll ${Math.abs(player.diceModifier)} ${player.diceModifier > 0 ? 'more' : 'fewer'} dice next turn.`, 
            bgColor: player.diceModifier > 0 ? "bg-green-800/80" : "bg-red-800/80", 
            icon: <span className={`font-black ${player.diceModifier > 0 ? 'text-green-300' : 'text-red-300'} text-lg`}>⚅</span>, 
            value: player.diceModifier > 0 ? `+${player.diceModifier}` : player.diceModifier 
        },
        player.fatigueCounter > 0 && { 
            key: 'fatigue', 
            title: `Fatigue: Takes ${player.fatigueCounter + 1} damage on the next attempt to draw from an empty deck.`, 
            bgColor: "bg-purple-800/80", 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>, 
            value: player.fatigueCounter 
        }
    ].filter(Boolean);

    return (
    <div className={`w-full bg-arcane-surface/80 backdrop-blur-sm p-3 rounded-lg text-white flex flex-col gap-2 border-2 transition-all duration-500 ${isCurrent ? 'border-vivid-cyan shadow-vivid-cyan' : 'border-arcane-border'}`}>
        <div className={`flex items-start justify-between ${isOpponent ? 'flex-row-reverse' : ''}`}>
            <div>
                <h2 className={`text-2xl font-bold truncate ${isCurrent ? 'text-vivid-cyan' : ''} ${isOpponent ? 'text-right' : 'text-left'}`}>{player.name}</h2>
                <div className={`flex items-center gap-2 ${isOpponent ? 'flex-row-reverse' : ''}`}>
                    <p className={`text-4xl font-black text-vivid-pink ${moraleAnim}`}>{player.morale}</p>
                </div>
            </div>
        </div>

        <div className={`flex items-center gap-2 h-8 ${isOpponent ? 'justify-end' : 'justify-start'}`}>
            {statusEffects.map(effect => (
                 <Tooltip key={effect.key} content={<span className="font-sans text-sm">{effect.title}</span>}>
                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center ${effect.bgColor}`}>
                        {effect.icon}
                        {effect.value && (
                            <div className="absolute -top-1 -right-1 bg-vivid-yellow text-arcane-bg font-bold text-[10px] rounded-full w-4 h-4 flex items-center justify-center border-2 border-arcane-surface">
                                {effect.value}
                            </div>
                        )}
                    </div>
                </Tooltip>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <StatIcon animClass={handAnim} title={`Hand: ${player.hand.length} cards`} value={player.hand.length} icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2-2H4a2 2 0 01-2-2v-4z" />
                </svg>
            } />
            
            <StatIcon animClass={deckAnim} title={`Deck: ${player.deck.length} cards remaining`} value={player.deck.length} icon={
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm2 0v12h6V4H7z" />
                </svg>
            } />

            <ClickableStatIcon value={player.graveyard.length} animClass={graveAnim} onClick={() => onZoneClick('graveyard')} title="View Graveyard" icon={
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v2a1 1 0 11-2 0V9zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
            } />
            <ClickableStatIcon value={player.oblivion.length} animClass={oblivionAnim} onClick={() => onZoneClick('oblivion')} title="View Oblivion" icon={
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-75" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 4.332a6 6 0 118.485 8.485A6 6 0 014.332 4.332z" clipRule="evenodd" />
                </svg>
            } />
        </div>
    </div>
    );
};

export default PlayerInfoPanel;
