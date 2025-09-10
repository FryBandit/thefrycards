import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../game/types';

interface PlayerInfoPanelProps {
    player: Player;
    isOpponent?: boolean;
}

const OrnateKnot: React.FC = () => (
    <div className="w-16 h-16 flex items-center justify-center my-2">
        <div className="w-12 h-12 rounded-full bg-stone-border border-4 border-stone-surface shadow-inner">
            <div className="w-full h-full relative flex items-center justify-center">
                <div className="absolute w-4 h-4 rounded-full border-2 border-stone-surface bg-stone-border transform rotate-45"></div>
                <div className="absolute w-2 h-2 rounded-full bg-stone-surface"></div>
            </div>
        </div>
    </div>
);

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, isOpponent = false }) => {
    const numbers = Array.from({ length: 21 }, (_, i) => 20 - i); // 20 down to 0
    const colorClass = isOpponent ? 'bg-glow-red' : 'bg-glow-blue';
    const shadowClass = isOpponent ? 'shadow-glow-red' : 'shadow-glow-blue';

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

    return (
        <div className="h-full w-full bg-stone-border/50 flex flex-col items-center justify-between p-1 rounded-lg">
            <OrnateKnot />
            <div className="flex-grow flex flex-col items-center justify-around w-full relative">
                <div className="absolute h-full w-1.5 bg-stone-surface/50 rounded-full top-0 left-1/2 -translate-x-1/2 overflow-hidden">
                     <div 
                        className={`absolute bottom-0 left-0 w-full ${colorClass} transition-all duration-500`}
                        style={{ height: `${Math.max(0, (player.morale / 20) * 100)}%` }}
                    ></div>
                </div>
                {numbers.map(num => {
                    const isCurrent = player.morale === num;
                    return (
                        <div key={num} className="relative w-full flex-1 flex items-center justify-center">
                           {isCurrent && (
                                <div className={`absolute w-8 h-8 rounded-md ${colorClass} ${shadowClass} transition-all duration-500 flex items-center justify-center z-10 transform rotate-45 ${moraleAnim}`}>
                                    <span className={`text-stone-bg font-black transform -rotate-45 text-lg`}>{num}</span>
                                </div>
                           )}
                           <span className={`font-cinzel text-stone-surface/60 font-bold text-base transition-opacity duration-300 ${isCurrent ? 'opacity-0' : 'opacity-100'}`}>{num}</span>
                        </div>
                    );
                })}
            </div>
            <OrnateKnot />
        </div>
    );
};

export default PlayerInfoPanel;